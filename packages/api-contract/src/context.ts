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
 * - tenantId: Current tenant ID (from session)
 * - userId: Current user ID (from session)
 * - role: User's role in current tenant ('owner' | 'admin' | 'member')
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
 * In production, this should:
 * 1. Extract session from Auth.js
 * 2. Extract tenant context from session or request headers
 * 3. Validate tenant membership and permissions
 */
export async function createContext(): Promise<Context> {
  // TODO: Implement actual authentication context creation
  // For now, return mock context for development with real database

  return {
    session: null,
    tenantId: 'mock-tenant-id',
    userId: 'mock-user-id',
    role: 'admin',
    db, // Real Drizzle database client
  };
}
