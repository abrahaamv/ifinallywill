import type { Session } from "next-auth";
import { getSession, getTenantId } from "@platform/auth";
import { db } from "@platform/db";
import { setTenantContext } from "./middleware/tenant-context";

/**
 * tRPC Context
 *
 * Provides authentication session and tenant context for all tRPC procedures.
 *
 * Context flow:
 * 1. Extract session from request (via Auth.js)
 * 2. Extract tenant ID from session
 * 3. Set PostgreSQL session variable for RLS
 * 4. Provide session, tenantId, and db to procedures
 */

export interface Context {
	/** Authenticated user session (null if not authenticated) */
	session: Session | null;
	/** Tenant ID from session (null if not authenticated or tenant not set) */
	tenantId: string | null;
	/** Database instance (use with caution - RLS applied via tenantId) */
	db: typeof db;
}

/**
 * Create tRPC context for each request
 *
 * This runs for EVERY tRPC request and provides:
 * - User session (from Auth.js)
 * - Tenant context (for multi-tenant isolation)
 * - Database instance (with RLS policies active)
 *
 * @returns Promise<Context>
 */
export async function createContext(): Promise<Context> {
	// Get authenticated session from Auth.js
	const session = await getSession();

	// Extract tenant ID from session
	const tenantId = await getTenantId();

	// Set PostgreSQL session variable for RLS
	// CRITICAL: This MUST happen before any database queries
	if (tenantId) {
		await setTenantContext(tenantId);
	}

	return {
		session,
		tenantId,
		db,
	};
}

/**
 * Type helper for accessing context in procedures
 */
export type TRPCContext = Awaited<ReturnType<typeof createContext>>;
