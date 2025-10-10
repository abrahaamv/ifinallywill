import { Auth } from '@auth/core';
import fastifyFormbody from '@fastify/formbody';
import { authConfig } from '@platform/auth';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Auth.js Fastify Plugin - Phase 8 Security Implementation
 *
 * Integrates Auth.js with Fastify for session-based authentication.
 *
 * CRITICAL: Auth.js handles ALL cookies independently
 * - DO NOT use @fastify/cookie (conflicts with Auth.js cookie handling)
 * - DO NOT use @fastify/csrf-protection (Auth.js has built-in CSRF)
 * - Vite proxy makes all requests same-origin (no CORS issues)
 *
 * Security Features:
 * - Secure session cookies managed by Auth.js
 * - CSRF protection via Auth.js double-submit cookie pattern
 * - Session token validation
 * - Inactivity timeout (30 minutes)
 * - Absolute timeout (8 hours)
 *
 * Reference: Research 10-07-2025 - Auth.js CSRF with Fastify cross-origin
 */

export async function authPlugin(app: FastifyInstance) {
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

      // Get request body based on content type
      let body: BodyInit | undefined;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers['content-type'] || '';

        if (contentType.includes('application/x-www-form-urlencoded')) {
          // For form data, convert parsed body back to URLSearchParams
          // Fastify's formbody already parsed it, so we reconstruct it
          body = new URLSearchParams(request.body as Record<string, string>).toString();
        } else if (contentType.includes('application/json')) {
          // For JSON, stringify the body
          body = JSON.stringify(request.body);
        } else {
          // For other types, try to stringify
          body = JSON.stringify(request.body);
        }
      }

      // Create Web API Request from Fastify request
      const authRequest = new Request(url, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body,
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
      const responseBody = await authResponse.text();
      return reply.send(responseBody);
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
  // Session validation will be handled by Auth.js directly
  // No need to parse cookies here - Auth.js reads cookies from headers

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
