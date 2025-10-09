/**
 * tRPC Context (moved from @platform/api to avoid cyclic dependency)
 *
 * Provides authentication state and tenant context for tRPC procedures.
 */

import { auth } from '@platform/auth';
import { db, eq, users } from '@platform/db';
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
 * PRODUCTION IMPLEMENTATION:
 * 1. Gets Auth.js session from request
 * 2. Extracts tenant context from user record in database
 * 3. Returns authenticated context or safe defaults for unauthenticated requests
 */
export async function createContext(): Promise<Context> {
  // Get Auth.js session (works with both OAuth and credentials)
  const session = await auth();

  // If no session, return safe defaults (unauthenticated state)
  if (!session?.user?.email) {
    return {
      session: null,
      tenantId: '',
      userId: '',
      role: 'member',
      db,
    };
  }

  // Fetch full user record from database to get tenant context
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  // If user doesn't exist in database yet (OAuth first-time login), return partial session
  if (!userRecord) {
    return {
      session: {
        user: {
          id: '',
          email: session.user.email,
          name: session.user.name || undefined,
          image: session.user.image || undefined,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
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
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || undefined,
        image: userRecord.image || undefined,
        tenantId: userRecord.tenantId,
        role: userRecord.role,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    tenantId: userRecord.tenantId,
    userId: userRecord.id,
    role: userRecord.role,
    db,
  };
}
