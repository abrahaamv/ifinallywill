/**
 * Tenant Context Extraction Utilities
 *
 * Extract tenant information from Auth.js sessions for RLS policy enforcement.
 * CRITICAL for Phase 3 integration with PostgreSQL Row-Level Security.
 */

import type { Session } from 'next-auth';

/**
 * Extract tenant ID from authenticated session
 *
 * This is the PRIMARY method for setting `app.current_tenant_id` session variable
 * in PostgreSQL connections. MUST be called at the start of every request handler.
 *
 * @param session - Auth.js session object
 * @returns Tenant ID string or null if not authenticated
 *
 * @example
 * ```typescript
 * import { auth } from '@platform/auth';
 * import { extractTenantFromSession } from '@platform/auth';
 * import { sql } from '@platform/db/client';
 *
 * export async function handler(req: Request) {
 *   const session = await auth();
 *   const tenantId = extractTenantFromSession(session);
 *
 *   if (!tenantId) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *
 *   // Set tenant context for RLS policies
 *   await sql.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
 *
 *   // All subsequent queries will be automatically filtered by tenant_id
 *   const users = await sql`SELECT * FROM users`; // Only returns current tenant's users
 * }
 * ```
 */
export function extractTenantFromSession(session: Session | null): string | null {
  if (!session?.user?.tenantId) {
    return null;
  }

  return session.user.tenantId;
}

/**
 * Validate tenant ID format (UUID v4)
 *
 * Prevents SQL injection by ensuring tenant ID is a valid UUID.
 * MUST be called before using tenant ID in SQL queries.
 *
 * @param tenantId - Tenant ID to validate
 * @returns True if valid UUID v4 format, false otherwise
 *
 * @example
 * ```typescript
 * const tenantId = extractTenantFromSession(session);
 * if (!tenantId || !isValidTenantId(tenantId)) {
 *   throw new Error('Invalid tenant ID');
 * }
 * ```
 */
export function isValidTenantId(tenantId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Extract user role from session
 *
 * Used for authorization checks beyond tenant isolation.
 *
 * @param session - Auth.js session object
 * @returns User role ('owner' | 'admin' | 'member') or null
 *
 * @example
 * ```typescript
 * const role = extractRoleFromSession(session);
 * if (role !== 'owner' && role !== 'admin') {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */
export function extractRoleFromSession(
  session: Session | null
): 'owner' | 'admin' | 'member' | null {
  if (!session?.user?.role) {
    return null;
  }

  return session.user.role;
}

/**
 * Check if user has required role
 *
 * Convenience method for role-based authorization checks.
 *
 * @param session - Auth.js session object
 * @param requiredRole - Minimum required role
 * @returns True if user has required role or higher, false otherwise
 *
 * Role hierarchy: owner > admin > member
 *
 * @example
 * ```typescript
 * if (!hasRole(session, 'admin')) {
 *   return new Response('Forbidden - Admin required', { status: 403 });
 * }
 * ```
 */
export function hasRole(
  session: Session | null,
  requiredRole: 'owner' | 'admin' | 'member'
): boolean {
  const userRole = extractRoleFromSession(session);
  if (!userRole) return false;

  const roleHierarchy = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Create tenant context SQL statement
 *
 * Helper to generate safe SET statement for tenant context.
 * Validates tenant ID and escapes it properly.
 *
 * @param tenantId - Tenant ID to set
 * @returns SQL statement string
 * @throws Error if tenant ID is invalid
 *
 * @example
 * ```typescript
 * import { sql } from '@platform/db/client';
 *
 * const tenantId = extractTenantFromSession(session);
 * const setTenantSql = createTenantContextSql(tenantId);
 * await sql.unsafe(setTenantSql);
 * ```
 */
export function createTenantContextSql(tenantId: string | null): string {
  if (!tenantId || !isValidTenantId(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }

  return `SET app.current_tenant_id = '${tenantId}'`;
}

/**
 * Clear tenant context SQL statement
 *
 * Resets tenant context to empty string (no tenant access).
 * Use this at the end of request handlers to prevent context leakage.
 *
 * @returns SQL statement string
 *
 * @example
 * ```typescript
 * import { sql } from '@platform/db/client';
 *
 * try {
 *   // ... handle request with tenant context ...
 * } finally {
 *   await sql.unsafe(clearTenantContextSql());
 * }
 * ```
 */
export function clearTenantContextSql(): string {
  return "SET app.current_tenant_id = ''";
}
