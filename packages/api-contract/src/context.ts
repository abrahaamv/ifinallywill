/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@platform/db';

// TODO: Replace with actual Auth.js Session type when integrated
type Session = Record<string, any>;

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
  // For now, return mock context for development

  // Mock database instance (will be replaced with actual DB connection)
  const mockDb = {} as NodePgDatabase<typeof schema>;

  return {
    session: null,
    tenantId: 'mock-tenant-id',
    userId: 'mock-user-id',
    role: 'admin',
    db: mockDb,
  };
}
