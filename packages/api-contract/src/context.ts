/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import { Auth } from '@auth/core';
import { authConfig } from '@platform/auth';
import { db } from '@platform/db';
import type * as schema from '@platform/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

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
 * Helper: Get session from Fastify request
 *
 * Calls Auth.js internal session API to retrieve current session from cookies
 */
async function getSession(request: FastifyRequest): Promise<Session | null> {
  try {
    const url = new URL('/api/auth/session', `http://${request.headers.host}`);

    const authRequest = new Request(url, {
      method: 'GET',
      headers: request.headers as HeadersInit,
    });

    const response = await Auth(authRequest, authConfig);

    if (response.status === 200) {
      const session = await response.json();
      return session.user ? (session as Session) : null;
    }

    return null;
  } catch (error) {
    console.error('[Context] Failed to get session:', error);
    return null;
  }
}

/**
 * Create tRPC context from Fastify request
 *
 * Extracts Auth.js session from request cookies and builds context object.
 * Called on every tRPC request via Fastify adapter.
 */
export async function createContext({
  req,
}: {
  req: FastifyRequest;
  res: FastifyReply;
}): Promise<Context> {
  // Get Auth.js session from request cookies
  const session = await getSession(req);

  // Extract tenant and user info from session
  const tenantId = session?.user?.tenantId || '';
  const userId = session?.user?.id || '';
  const role = session?.user?.role || 'member';

  return {
    session,
    tenantId,
    userId,
    role,
    db,
  };
}
