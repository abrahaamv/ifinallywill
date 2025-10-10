/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import { db } from '@platform/db';
import type * as schema from '@platform/db';
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
 * Create tRPC context from request
 *
 * This will be called on each request to build the context object.
 * Currently returns unauthenticated context - will be implemented with Auth.js integration.
 */
export async function createContext(): Promise<Context> {
  // TODO: Implement Auth.js session extraction
  // Use getSession() helper from @platform/api/plugins/auth
  // For now, return unauthenticated context

  return {
    session: null,
    tenantId: '',
    userId: '',
    role: 'member',
    db,
  };
}
