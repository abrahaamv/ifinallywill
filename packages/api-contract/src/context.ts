/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import { db } from '@platform/db';
import type * as schema from '@platform/db/src/schema';
import type { VoyageEmbeddingProvider } from '@platform/knowledge';
import { createModuleLogger } from '@platform/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';

const logger = createModuleLogger('trpc-context');

/**
 * Auth.js User type
 * Extended with platform-specific fields
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  tenantId?: string; // Platform extension: user's primary tenant
  role?: 'owner' | 'admin' | 'member';
}

/**
 * Auth.js Session type
 * Matches the structure from Auth.js sessions
 */
export interface Session {
  user: User;
  expires: string;
}

/**
 * tRPC Context
 *
 * Available in all tRPC procedures and includes:
 * - req: Fastify request object (for CSRF validation)
 * - session: Auth.js session (null if not authenticated)
 * - tenantId: Current tenant ID (from session, empty string if not authenticated)
 * - userId: Current user ID (from session, empty string if not authenticated)
 * - role: User's role in current tenant ('owner' | 'admin' | 'member', 'member' if not authenticated)
 * - db: Database instance (for tenant-scoped queries)
 * - redis: Redis client for caching (Phase 12 Week 2-3)
 * - embeddingProvider: Voyage embedding provider for semantic search (Phase 12 Week 2-3)
 */
export interface Context {
  req: FastifyRequest;
  session: Session | null;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  db: PostgresJsDatabase<typeof schema>;
  redis?: Redis;
  embeddingProvider?: VoyageEmbeddingProvider;
}

/**
 * tRPC context type (for procedure middleware)
 */
export type TRPCContext = Context;

/**
 * Helper: Get session from Fastify request
 *
 * Makes internal HTTP fetch to /api/auth/session endpoint instead of calling Auth.js directly.
 * This ensures proper routing through Fastify's auth plugin handler.
 */
async function getSession(request: FastifyRequest): Promise<Session | null> {
  try {
    // Construct internal fetch URL using host header
    const host = request.headers.host || 'localhost:3001';
    const protocol = request.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const url = `${protocol}://${host}/api/auth/session`;

    // Make internal fetch with cookies from original request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        cookie: request.headers.cookie || '',
        // Forward other relevant headers
        'user-agent': request.headers['user-agent'] || 'Internal',
      },
    });

    if (response.status === 200) {
      const session = await response.json();
      // Use optional chaining to handle null sessions gracefully
      return session?.user ? (session as Session) : null;
    }

    return null;
  } catch (error) {
    // Only log errors that aren't simply unauthenticated requests
    if (error instanceof Error && !error.message.includes('null') && !error.message.includes('ECONNREFUSED')) {
      logger.error('Failed to get session', { error });
    }
    return null;
  }
}

/**
 * Create tRPC context from Fastify request
 *
 * Extracts Auth.js session from request cookies and builds context object.
 * Called on every tRPC request via Fastify adapter.
 *
 * Phase 12 Week 3: Enhanced with Redis and Voyage embedding provider for RAG caching
 */
export async function createContext({
  req,
  redis,
  embeddingProvider,
}: {
  req: FastifyRequest;
  res: FastifyReply;
  redis?: Redis;
  embeddingProvider?: VoyageEmbeddingProvider;
}): Promise<Context> {
  // Get Auth.js session from request cookies
  const session = await getSession(req);

  // Extract tenant and user info from session
  const tenantId = session?.user?.tenantId || '';
  const userId = session?.user?.id || '';
  const role = session?.user?.role || 'member';

  return {
    req,
    session,
    tenantId,
    userId,
    role,
    db,
    redis,
    embeddingProvider,
  };
}
