import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../context";

/**
 * Authentication Middleware for tRPC
 *
 * Provides helper functions to protect tRPC procedures with authentication
 * and authorization checks.
 */

/**
 * Ensure user is authenticated
 *
 * Throws UNAUTHORIZED error if session is not present
 *
 * @param ctx - tRPC context
 * @returns Session object
 */
export function requireAuth(ctx: TRPCContext) {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}

	return ctx.session;
}

/**
 * Ensure user has tenant context
 *
 * Throws UNAUTHORIZED error if tenant ID is not set in session
 *
 * @param ctx - tRPC context
 * @returns Object with session and tenantId
 */
export function requireTenant(ctx: TRPCContext) {
	const session = requireAuth(ctx);

	if (!ctx.tenantId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message:
				"Tenant context not found - user may not be associated with a tenant",
		});
	}

	return {
		session,
		tenantId: ctx.tenantId,
	};
}

/**
 * Ensure user has specific role
 *
 * Role hierarchy: owner > admin > member
 *
 * @param ctx - tRPC context
 * @param requiredRole - Minimum role required
 * @returns Session object
 */
export function requireRole(
	ctx: TRPCContext,
	requiredRole: "owner" | "admin" | "member",
) {
	const session = requireAuth(ctx);

	const userRole = (session.user as { role?: string }).role;

	// Role hierarchy
	const roleHierarchy = {
		owner: 3,
		admin: 2,
		member: 1,
	};

	const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
	const requiredLevel = roleHierarchy[requiredRole];

	if (userLevel < requiredLevel) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `${requiredRole} role required for this operation`,
		});
	}

	return session;
}

/**
 * Check if user has specific role (without throwing)
 *
 * @param ctx - tRPC context
 * @param requiredRole - Role to check
 * @returns True if user has required role
 */
export function hasRole(
	ctx: TRPCContext,
	requiredRole: "owner" | "admin" | "member",
): boolean {
	if (!ctx.session?.user) {
		return false;
	}

	const userRole = (ctx.session.user as { role?: string }).role;

	const roleHierarchy = {
		owner: 3,
		admin: 2,
		member: 1,
	};

	const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
	const requiredLevel = roleHierarchy[requiredRole];

	return userLevel >= requiredLevel;
}
