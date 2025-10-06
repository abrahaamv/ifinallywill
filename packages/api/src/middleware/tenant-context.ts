import { db } from "@platform/db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Set PostgreSQL session variable for Row-Level Security (RLS)
 *
 * CRITICAL: This MUST be called before ANY database query to ensure tenant isolation.
 * PostgreSQL RLS policies use app.current_tenant_id to filter all tenant-scoped tables.
 *
 * @param tenantId - UUID of the tenant context
 */
export async function setTenantContext(tenantId: string) {
	try {
		// Set PostgreSQL session variable for RLS policies
		// This affects ALL subsequent queries in the current transaction
		await db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
	} catch (error) {
		console.error("Failed to set tenant context:", error);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to set tenant context",
			cause: error,
		});
	}
}

/**
 * Clear tenant context (for testing or connection pooling)
 *
 * Note: In production with PgBouncer transaction pooling,
 * this is handled automatically by server_reset_query = DISCARD ALL
 */
export async function clearTenantContext() {
	try {
		await db.execute(sql`RESET app.current_tenant_id`);
	} catch (error) {
		console.error("Failed to clear tenant context:", error);
		// Don't throw - this is cleanup, not critical path
	}
}

/**
 * Get current tenant context (for debugging/verification)
 *
 * @returns Current tenant ID or null if not set
 */
export async function getCurrentTenantContext(): Promise<string | null> {
	try {
		const result = await db.execute<{ current_setting: string }>(
			sql`SELECT current_setting('app.current_tenant_id', true) as current_setting`,
		);

		const setting = result[0]?.current_setting;
		return setting && setting !== "" ? setting : null;
	} catch (error) {
		console.error("Failed to get tenant context:", error);
		return null;
	}
}

/**
 * Verify tenant context is set correctly
 *
 * Throws if tenant context is not set or doesn't match expected value
 *
 * @param expectedTenantId - Expected tenant ID
 */
export async function verifyTenantContext(expectedTenantId: string) {
	const currentTenantId = await getCurrentTenantContext();

	if (!currentTenantId) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Tenant context not set - security violation",
		});
	}

	if (currentTenantId !== expectedTenantId) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Tenant context mismatch - security violation",
		});
	}
}
