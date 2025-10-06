/**
 * Auth.js Configuration Package
 *
 * This package provides Auth.js configuration and helper functions
 * for use across the platform.
 *
 * To use in a Next.js app:
 * ```typescript
 * import NextAuth from "next-auth";
 * import { authConfig } from "@platform/auth";
 *
 * export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
 * ```
 *
 * To use helper functions:
 * ```typescript
 * import { requireTenant, getTenantId } from "@platform/auth";
 *
 * const { tenantId } = await requireTenant();
 * ```
 *
 * @see https://authjs.dev/
 */

// Export configuration
export { authConfig } from './config';

// Export helper functions
export {
  getSession,
  getUserId,
  getTenantId,
  requireAuth,
  requireTenant,
  hasRole,
  requireRole,
} from './helpers';

// Re-export types for convenience
export type { Session, User } from 'next-auth';
