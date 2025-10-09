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
 * To use middleware (Phase 3):
 * ```typescript
 * import { authMiddleware, type AuthContext } from "@platform/auth";
 *
 * const context = await authMiddleware(req);
 * // context: { session, tenantId, userId, role }
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

// Export middleware (Phase 3 - Request-scoped RLS context)
export { authMiddleware, refreshSession, logoutCleanup, AuthError } from './lib/middleware';
export type { AuthContext } from './lib/middleware';

// Re-export types for convenience
export type { Session, User } from 'next-auth';

// Export services (Phase 8)
export { passwordService } from './services/password.service';
export { MFAService } from './services/mfa.service';
export type { MFASetupResult, MFAVerificationResult } from './services/mfa.service';
export { ApiKeyService } from './services/api-key.service';
export type {
  ApiKeyType,
  ApiKeyPermission,
  ApiKeyValidationResult,
  GeneratedApiKey,
} from './services/api-key.service';

// Export CSRF service (Phase 9)
export { CSRFService } from './services/csrf.service';
export type { CSRFToken } from './services/csrf.service';
export { useCSRF, useAuthenticatedFetch } from './hooks/useCSRF';
export type { UseCSRFResult } from './hooks/useCSRF';
