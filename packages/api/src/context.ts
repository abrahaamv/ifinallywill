/**
 * tRPC Context with Auth.js Integration (Phase 3)
 *
 * Provides request-scoped authentication and tenant context for all tRPC procedures.
 *
 * Context flow:
 * 1. Extract session from Auth.js
 * 2. Validate tenant ID and set RLS context
 * 3. Extract user role for RBAC
 * 4. Provide AuthContext + db to procedures
 *
 * CRITICAL FOR SECURITY:
 * - authMiddleware sets `SET LOCAL app.current_tenant_id` for RLS
 * - Each request gets isolated tenant context
 * - No manual tenant filtering needed (RLS enforces automatically)
 */

import { authMiddleware, AuthError } from '@platform/auth';
import { db } from '@platform/db';
import { TRPCError } from '@trpc/server';
import type { Session } from 'next-auth';

/**
 * tRPC Context Interface
 *
 * Available in all tRPC procedures via `ctx` parameter.
 */
export interface Context {
	/** Authenticated user session (null if not authenticated) */
	session: Session | null;
	/** Tenant ID from session (null if not authenticated) */
	tenantId: string | null;
	/** User ID from session (null if not authenticated) */
	userId: string | null;
	/** User role: owner > admin > member (null if not authenticated) */
	role: 'owner' | 'admin' | 'member' | null;
	/** Database instance with RLS policies active */
	db: typeof db;
}

/**
 * Create tRPC context for each request
 *
 * Runs for EVERY tRPC request:
 * 1. Attempts to authenticate via Auth.js
 * 2. If authenticated, sets tenant context for RLS
 * 3. Provides auth context to procedures
 *
 * Note: This doesn't throw on missing auth - procedures use middleware
 * like requireAuth(), requireTenant(), requireRole() to enforce auth.
 *
 * @param opts - tRPC request options with req/res
 * @returns Promise<Context>
 */
export async function createContext(opts: { req: Request }): Promise<Context> {
	try {
		// Attempt to authenticate and set tenant context
		const authContext = await authMiddleware(opts.req);

		// Successfully authenticated - return full context
		return {
			session: authContext.session,
			tenantId: authContext.tenantId,
			userId: authContext.userId,
			role: authContext.role,
			db,
		};
	} catch (error) {
		// Authentication failed - return unauthenticated context
		// Procedures can check ctx.session to enforce auth
		if (error instanceof AuthError) {
			// Expected auth errors (no session, invalid tenant, etc.)
			return {
				session: null,
				tenantId: null,
				userId: null,
				role: null,
				db,
			};
		}

		// Unexpected errors - log and re-throw
		console.error('Unexpected error in createContext:', error);
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to create request context',
			cause: error,
		});
	}
}

/**
 * Type helper for accessing context in procedures
 */
export type TRPCContext = Awaited<ReturnType<typeof createContext>>;
