import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import { authConfig } from './config';

// Create auth instance for use in helpers
// This is internal to the auth package
const { auth } = NextAuth(authConfig);

/**
 * Get current user session
 *
 * Use this in server components, API routes, and middleware
 * to get the authenticated user session.
 *
 * @returns Session object or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  return await auth();
}

/**
 * Get current user ID from session
 *
 * Convenience helper to extract just the user ID
 *
 * @returns User ID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}

/**
 * Get tenant ID from session
 *
 * CRITICAL: Use this to get tenant context for database queries
 * Every database query MUST be scoped to a tenant
 *
 * @returns Tenant ID or null if not authenticated or tenant not set
 */
export async function getTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.tenantId || null;
}

/**
 * Require authentication
 *
 * Throws an error if user is not authenticated.
 * Use this in API routes that require authentication.
 *
 * @returns Session object
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized: Authentication required');
  }

  return session;
}

/**
 * Require tenant context
 *
 * Throws an error if user is not authenticated or tenant is not set.
 * Use this in API routes that require tenant context.
 *
 * @returns Object with session and tenantId
 * @throws Error if not authenticated or tenant not set
 */
export async function requireTenant(): Promise<{
  session: Session;
  tenantId: string;
}> {
  const session = await requireAuth();

  const tenantId = session.user?.tenantId;
  if (!tenantId) {
    throw new Error(
      'Unauthorized: Tenant context not found - user may not be associated with a tenant'
    );
  }

  return { session, tenantId };
}

/**
 * Check if user has required role
 *
 * @param requiredRole - Role required ('owner', 'admin', 'member')
 * @returns True if user has required role
 */
export async function hasRole(requiredRole: 'owner' | 'admin' | 'member'): Promise<boolean> {
  const session = await getSession();

  if (!session?.user) {
    return false;
  }

  const userRole = (session.user as { role?: string }).role;

  // Role hierarchy: owner > admin > member
  const roleHierarchy = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Require specific role
 *
 * Throws an error if user doesn't have required role.
 * Use this in API routes that require specific permissions.
 *
 * @param requiredRole - Role required ('owner', 'admin', 'member')
 * @returns Session object
 * @throws Error if user doesn't have required role
 */
export async function requireRole(requiredRole: 'owner' | 'admin' | 'member'): Promise<Session> {
  const session = await requireAuth();

  const hasRequiredRole = await hasRole(requiredRole);
  if (!hasRequiredRole) {
    throw new Error(`Forbidden: ${requiredRole} role required for this operation`);
  }

  return session;
}
