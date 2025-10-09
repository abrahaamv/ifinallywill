/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import { authSessions, db, eq, users } from '@platform/db';
import type * as schema from '@platform/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// Import cookie types to enable FastifyRequest.cookies property
import '@fastify/cookie';

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
 * - session: Auth.js session (null if not authenticated)
 * - tenantId: Current tenant ID (from session, empty string if not authenticated)
 * - userId: Current user ID (from session, empty string if not authenticated)
 * - role: User's role in current tenant ('owner' | 'admin' | 'member', 'member' if not authenticated)
 * - db: Database instance (for tenant-scoped queries)
 */
export interface Context {
  session: Session | null;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  db: NodePgDatabase<typeof schema>;
}

/**
 * tRPC context type (for procedure middleware)
 */
export type TRPCContext = Context;

/**
 * Create tRPC context from Fastify request
 *
 * PRODUCTION IMPLEMENTATION:
 * 1. Extracts session cookie from Fastify request
 * 2. Looks up session in authSessions table
 * 3. Joins with users table to get full user context
 * 4. Returns authenticated context or safe defaults for unauthenticated requests
 */
export async function createContext(opts: {
  req: FastifyRequest;
  res: FastifyReply;
}): Promise<Context> {
  // Extract session token from cookies
  // Auth.js uses different cookie names based on environment:
  // - Development: authjs.session-token
  // - Production: __Secure-authjs.session-token
  const sessionToken =
    opts.req.cookies?.['authjs.session-token'] ||
    opts.req.cookies?.['__Secure-authjs.session-token'];

  // If no session token, return unauthenticated context
  if (!sessionToken) {
    return {
      session: null,
      tenantId: '',
      userId: '',
      role: 'member',
      db,
    };
  }

  try {
    // Look up session in authSessions table
    const [sessionRecord] = await db
      .select({
        sessionToken: authSessions.sessionToken,
        userId: authSessions.userId,
        expires: authSessions.expires,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          tenantId: users.tenantId,
          role: users.role,
        },
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(eq(authSessions.sessionToken, sessionToken))
      .limit(1);

    // If session not found or expired, return unauthenticated context
    if (!sessionRecord || new Date() > sessionRecord.expires) {
      return {
        session: null,
        tenantId: '',
        userId: '',
        role: 'member',
        db,
      };
    }

    // Return full authenticated context with tenant isolation
    return {
      session: {
        user: {
          id: sessionRecord.user.id,
          email: sessionRecord.user.email,
          name: sessionRecord.user.name || undefined,
          image: sessionRecord.user.image || undefined,
          tenantId: sessionRecord.user.tenantId,
          role: sessionRecord.user.role,
        },
        expires: sessionRecord.expires.toISOString(),
      },
      tenantId: sessionRecord.user.tenantId,
      userId: sessionRecord.user.id,
      role: sessionRecord.user.role,
      db,
    };
  } catch (error) {
    // Log error and return unauthenticated context
    console.error('Error fetching session:', error);
    return {
      session: null,
      tenantId: '',
      userId: '',
      role: 'member',
      db,
    };
  }
}
