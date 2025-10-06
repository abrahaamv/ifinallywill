/**
 * @platform/api - Fastify + tRPC API Server
 *
 * Provides type-safe API endpoints with authentication and tenant isolation.
 */

// Export tRPC context
export { createContext } from "./context";
export type { Context, TRPCContext } from "./context";

// Export authentication middleware
export {
	requireAuth,
	requireTenant,
	requireRole,
	hasRole,
} from "./middleware/auth";

// Export tenant context helpers
export {
	setTenantContext,
	clearTenantContext,
	getCurrentTenantContext,
	verifyTenantContext,
} from "./middleware/tenant-context";
