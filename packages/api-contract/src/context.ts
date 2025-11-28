/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 * Supports both Auth.js sessions and service-to-service JWT authentication.
 */

import { db } from '@platform/db';
import type * as schema from '@platform/db/src/schema';
import type { VoyageEmbeddingProvider } from '@platform/knowledge';
import { createModuleLogger } from '@platform/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import type { StorageService } from './services/storage';

const logger = createModuleLogger('trpc-context');

/**
 * Service account JWT claims
 */
interface ServiceTokenClaims {
  sub: string;
  service: boolean;
  tenantId?: string;
  iat: number;
  exp: number;
}

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
 * - storage: S3 storage service for file uploads (Phase 11 Week 5)
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
  storage?: StorageService;
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
 * Helper: Validate service-to-service JWT token
 *
 * Used by internal services (LiveKit agent, etc.) to authenticate API requests.
 * Service tokens include tenant context in JWT claims.
 *
 * Security:
 * - Validates token signature using SERVICE_JWT_SECRET
 * - Checks token expiration
 * - Extracts tenant context from claims
 */
function validateServiceToken(request: FastifyRequest): ServiceTokenClaims | null {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const secret = process.env.SERVICE_JWT_SECRET || process.env.BACKEND_API_KEY;

    if (!secret) {
      logger.warn('SERVICE_JWT_SECRET not configured - service authentication disabled');
      return null;
    }

    // Verify and decode token
    const decoded = jwt.verify(token, secret) as ServiceTokenClaims;

    // Validate required claims
    if (!decoded.service || decoded.sub !== 'livekit-agent') {
      logger.warn('Invalid service token claims', { sub: decoded.sub, service: decoded.service });
      return null;
    }

    logger.debug('Service token validated', { sub: decoded.sub, tenantId: decoded.tenantId });
    return decoded;
  } catch (error) {
    // Handle JWT errors by checking error name (more robust than instanceof for ESM)
    const err = error as Error & { name?: string };
    if (err.name === 'TokenExpiredError') {
      logger.debug('Service token expired');
    } else if (err.name === 'JsonWebTokenError') {
      logger.debug('Invalid service token', { error: err.message });
    } else {
      logger.debug('Service token validation error', { error: err.message });
    }
    return null;
  }
}

/**
 * Create tRPC context from Fastify request
 *
 * Authentication priority:
 * 1. Auth.js session (browser/dashboard requests)
 * 2. Service JWT token (internal services like LiveKit agent)
 *
 * Called on every tRPC request via Fastify adapter.
 *
 * Phase 12 Week 3: Enhanced with Redis and Voyage embedding provider for RAG caching
 * Phase 11 Week 5: Enhanced with S3 storage service for file uploads
 */
export async function createContext({
  req,
  redis,
  embeddingProvider,
  storage,
}: {
  req: FastifyRequest;
  res: FastifyReply;
  redis?: Redis;
  embeddingProvider?: VoyageEmbeddingProvider;
  storage?: StorageService;
}): Promise<Context> {
  // Try Auth.js session first (browser/dashboard requests)
  const session = await getSession(req);

  if (session?.user) {
    // Authenticated via Auth.js session
    return {
      req,
      session,
      tenantId: session.user.tenantId || '',
      userId: session.user.id || '',
      role: session.user.role || 'member',
      db,
      redis,
      embeddingProvider,
      storage,
    };
  }

  // Try service-to-service JWT authentication (LiveKit agent, etc.)
  const serviceToken = validateServiceToken(req);

  if (serviceToken?.tenantId) {
    // Authenticated via service token - create synthetic session
    const serviceSession: Session = {
      user: {
        id: `service:${serviceToken.sub}`,
        tenantId: serviceToken.tenantId,
        role: 'admin', // Service accounts get admin access
      },
      expires: new Date(serviceToken.exp * 1000).toISOString(),
    };

    logger.debug('Service account authenticated', {
      sub: serviceToken.sub,
      tenantId: serviceToken.tenantId,
    });

    return {
      req,
      session: serviceSession,
      tenantId: serviceToken.tenantId,
      userId: `service:${serviceToken.sub}`,
      role: 'admin',
      db,
      redis,
      embeddingProvider,
      storage,
    };
  }

  // No authentication - return empty context (will fail on protected procedures)
  return {
    req,
    session: null,
    tenantId: '',
    userId: '',
    role: 'member',
    db,
    redis,
    embeddingProvider,
    storage,
  };
}
