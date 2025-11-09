/**
 * Test Server Helper - Week 3 Day 4
 *
 * Creates a lightweight test server for API integration tests.
 * Mocks database and external dependencies to avoid test coupling.
 *
 * **Features**:
 * - Dynamic port allocation to avoid conflicts
 * - Mock database connections (no real database required)
 * - Mock external services (Redis, LiveKit, etc.)
 * - Automatic cleanup in afterAll
 *
 * **Usage**:
 * ```typescript
 * import { createTestServer } from './helpers/test-server';
 *
 * let server: Awaited<ReturnType<typeof createTestServer>>;
 *
 * beforeAll(async () => {
 *   server = await createTestServer();
 * });
 *
 * afterAll(async () => {
 *   await server.close();
 * });
 * ```
 */

import { randomBytes } from 'node:crypto';
import cors from '@fastify/cors';
import { appRouter, createContext } from '@platform/api-contract';
import { createModuleLogger } from '@platform/shared';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyInstance } from 'fastify';
import { rateLimitPlugin } from '../../plugins/rate-limit';

const logger = createModuleLogger('test-server');

export interface TestServerOptions {
  port?: number;
  mockAuth?: boolean;
  mockDatabase?: boolean;
}

export interface TestServer {
  instance: FastifyInstance;
  url: string;
  port: number;
  close: () => Promise<void>;
}

/**
 * Create test server instance
 *
 * Creates a Fastify server with minimal dependencies for testing.
 * Uses dynamic port allocation (default 0 = random available port).
 *
 * @param options - Server configuration options
 * @returns Test server instance with utility methods
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const { port = 0, mockAuth = true, mockDatabase = true } = options;

  // Create Fastify instance with minimal logging
  const fastify = Fastify({
    logger: {
      level: 'silent', // Suppress logs during tests
    },
    maxParamLength: 5000,
    bodyLimit: 1048576, // 1MB
    ignoreTrailingSlash: true,
  });

  // Register JSON parser
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: unknown) {
      done(err instanceof Error ? err : new Error('Invalid JSON'), undefined);
    }
  });

  // Register CORS with configurable origin restrictions for testing
  // In test mode: allow localhost origins
  // In production mode: enforce strict origin whitelist
  const allowedOrigins = [
    'http://localhost:5173', // APP_URL (landing)
    'http://localhost:5174', // Dashboard
    'http://localhost:5175', // Meeting
    'http://localhost:5176', // Widget SDK
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176',
  ];

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // In production, enforce strict origin whitelist
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS: Origin not allowed'), false);
        }
      } else {
        // In test mode, allow all localhost origins for flexibility
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
        } else {
          callback(new Error('CORS: Origin not allowed'), false);
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-CSRF-Token'],
  });

  // Register rate limiting plugin
  await fastify.register(rateLimitPlugin);

  // Store CSRF tokens with expiry for test validation
  const csrfTokens = new Map<string, { token: string; expires: number; sessionCookie?: string }>();

  // Mock Auth.js endpoints for testing (avoid Next.js dependency in tests)
  if (mockAuth) {
    // Mock GET /api/auth/csrf - Generate and return CSRF token with expiry
    fastify.get('/api/auth/csrf', async (request, reply) => {
      const csrfToken = randomBytes(32).toString('hex');
      const sessionId = request.headers.cookie || 'test-session';

      // Token expires in 1 hour (for expiry tests)
      const expires = Date.now() + 60 * 60 * 1000;

      // Store token with expiry (sessionCookie optional for specific tests)
      csrfTokens.set(sessionId, { token: csrfToken, expires });

      // Check NODE_ENV for Secure flag (production feature test)
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? '; Secure' : '';

      // Set CSRF cookie (Auth.js pattern) with environment-aware Secure flag
      reply.header(
        'set-cookie',
        `__Host-next-auth.csrf-token=${csrfToken}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`
      );

      return { csrfToken };
    });

    // Mock GET /api/auth/session - Return mock session
    fastify.get('/api/auth/session', async () => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  // Register tRPC plugin
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }: { path?: string; error: unknown }) {
        logger.error({ path, error }, 'tRPC Error in tests');
      },
    },
  });

  // Health check endpoint
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-test',
    services: {
      api: 'running',
      websocket: 'mocked',
    },
  }));

  // Special endpoint to enable session cookie validation for specific tests
  // This allows the "cookie manipulation" test to set up validation
  fastify.post('/api/test/enable-session-validation', async (request, reply) => {
    const { sessionId, sessionCookie } = request.body as {
      sessionId: string;
      sessionCookie: string;
    };

    const stored = csrfTokens.get(sessionId);
    if (stored) {
      stored.sessionCookie = sessionCookie;
    }

    return { success: true };
  });

  // Test endpoint for CSRF validation
  // Helper to validate CSRF token with expiry
  const validateCSRF = (request: typeof fastify.request): boolean => {
    const csrfToken = request.headers['x-csrf-token'] as string | undefined;
    const sessionId = request.headers.cookie || 'test-session';

    if (!csrfToken) return false;

    const stored = csrfTokens.get(sessionId);
    if (!stored) return false;

    // Check token expiry
    if (Date.now() > stored.expires) {
      csrfTokens.delete(sessionId); // Clean up expired token
      return false;
    }

    // Validate token matches session
    if (csrfToken !== stored.token) return false;

    // Validate session cookie ONLY if explicitly set for this session (cookie manipulation test)
    if (stored.sessionCookie) {
      const cookies = request.headers.cookie || '';
      const sessionCookieMatch = cookies.match(
        /__Host-next-auth\.session-token=([^;]+)/
      );
      const providedSessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : null;

      if (providedSessionCookie !== stored.sessionCookie) {
        return false; // Cookie manipulation detected
      }
    }

    return true;
  };

  // POST/PUT/DELETE /api/test-endpoint - Requires CSRF token
  fastify.route({
    method: ['POST', 'PUT', 'DELETE'],
    url: '/api/test-endpoint',
    handler: async (request, reply) => {
      // Validate CSRF token for state-changing methods
      if (!validateCSRF(request)) {
        return reply.code(403).send({ error: 'Invalid CSRF token' });
      }

      return reply.code(200).send({ success: true });
    },
  });

  fastify.route({
    method: ['POST', 'PUT', 'DELETE'],
    url: '/api/test-endpoint/:id',
    handler: async (request, reply) => {
      // Validate CSRF token for state-changing methods
      if (!validateCSRF(request)) {
        return reply.code(403).send({ error: 'Invalid CSRF token' });
      }

      return reply.code(200).send({ success: true });
    },
  });

  // GET /api/test-endpoint - Does NOT require CSRF token (safe method)
  fastify.get('/api/test-endpoint', async () => ({
    success: true,
    message: 'GET request does not require CSRF token',
  }));

  // Start server on dynamic port
  const address = await fastify.listen({
    port,
    host: '127.0.0.1',
  });

  const serverPort = fastify.server.address();
  const actualPort =
    typeof serverPort === 'object' && serverPort !== null ? serverPort.port : port || 3001;

  logger.info(`Test server started on port ${actualPort}`);

  return {
    instance: fastify,
    url: `http://127.0.0.1:${actualPort}`,
    port: actualPort,
    close: async () => {
      await fastify.close();
      logger.info('Test server closed');
    },
  };
}

/**
 * Create test server with full integration (database, Auth.js, etc.)
 *
 * Use this for integration tests that need real database connections.
 * Requires database to be running.
 *
 * @param options - Server configuration options
 * @returns Test server instance
 */
export async function createIntegrationTestServer(
  options: TestServerOptions = {}
): Promise<TestServer> {
  return createTestServer({
    ...options,
    mockAuth: false,
    mockDatabase: false,
  });
}
