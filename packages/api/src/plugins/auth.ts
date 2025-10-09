import { Auth } from '@auth/core';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import { authConfig } from '@platform/auth';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Auth.js Fastify Plugin - Phase 8 Security Implementation
 *
 * Integrates Auth.js with Fastify for session-based authentication.
 *
 * Critical Fix (Phase 8 Blocker #1):
 * - Registers @fastify/formbody to parse POST requests
 * - Without formbody, credential provider throws 500 errors
 *
 * Security Features:
 * - Secure session cookies (httpOnly, sameSite, secure in production)
 * - CSRF protection via Auth.js
 * - Session token validation
 * - Inactivity timeout (30 minutes)
 * - Absolute timeout (8 hours)
 *
 * Reference: docs/research/10-07-2025/research-10-07-2025.md lines 106-192
 */

export async function authPlugin(app: FastifyInstance) {
  // Register cookie support for session management
  await app.register(fastifyCookie, {
    secret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
    hook: 'onRequest', // Parse cookies on every request
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  });

  // Register formbody parser (CRITICAL for Auth.js credential provider)
  // Without this, POST /api/auth/callback/credentials fails with 500
  await app.register(fastifyFormbody);

  /**
   * Auth.js request handler
   *
   * Handles all /api/auth/* routes:
   * - GET /api/auth/signin - Sign in page
   * - POST /api/auth/signin - Sign in action
   * - GET /api/auth/signout - Sign out page
   * - POST /api/auth/signout - Sign out action
   * - GET /api/auth/session - Get current session
   * - GET /api/auth/csrf - Get CSRF token
   * - POST /api/auth/callback/:provider - OAuth callbacks
   */
  app.all('/api/auth/*', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract Auth.js path from request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Create Web API Request from Fastify request
      const authRequest = new Request(url, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? JSON.stringify(request.body)
            : undefined,
      });

      // Call Auth.js with our configuration
      const authResponse = await Auth(authRequest, authConfig);

      // Forward Auth.js response to Fastify
      reply.status(authResponse.status);

      // Copy headers from Auth.js response
      authResponse.headers.forEach((value: string, key: string) => {
        reply.header(key, value);
      });

      // Send response body
      const body = await authResponse.text();
      return reply.send(body);
    } catch (error: unknown) {
      app.log.error({ error }, 'Auth error');
      return reply.status(500).send({
        error: 'Authentication error',
        message: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
      });
    }
  });

  /**
   * Session validation middleware
   *
   * Adds session information to request object for use in tRPC context
   * Can be used as a preHandler hook for protected routes
   */
  app.decorateRequest('session', null);

  app.addHook('preHandler', async (request) => {
    // Check if session exists via cookie
    const sessionToken =
      request.cookies['next-auth.session-token'] ||
      request.cookies['__Secure-next-auth.session-token'];

    if (sessionToken) {
      // Session validation is handled by Auth.js
      // tRPC context will use Auth.js session getter
      (request as { session?: unknown }).session = { token: sessionToken };
    }
  });

  app.log.info('Auth plugin registered: /api/auth/*');
}

/**
 * Helper: Get session from request
 *
 * Usage in tRPC context:
 * ```typescript
 * const session = await getSession(request);
 * if (!session) throw new TRPCError({ code: 'UNAUTHORIZED' });
 * ```
 */
export async function getSession(request: FastifyRequest) {
  const url = new URL('/api/auth/session', `http://${request.headers.host}`);

  const authRequest = new Request(url, {
    method: 'GET',
    headers: request.headers as HeadersInit,
  });

  const response = await Auth(authRequest, authConfig);

  if (response.status === 200) {
    const session = await response.json();
    return session.user ? session : null;
  }

  return null;
}
