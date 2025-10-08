/**
 * Browser-Safe Auth Exports
 *
 * This file only exports code that can run in the browser.
 * DO NOT import Node.js-only modules (crypto, qrcode, argon2, etc.)
 *
 * Usage in frontend apps:
 * ```typescript
 * import { CSRFService, useCSRF } from '@platform/auth/client';
 * ```
 */

// Export CSRF service (browser-safe)
export { CSRFService } from './services/csrf.service';
export type { CSRFToken } from './services/csrf.service';

// Export CSRF hooks (browser-safe)
export { useCSRF, useAuthenticatedFetch } from './hooks/useCSRF';
export type { UseCSRFResult } from './hooks/useCSRF';

// Re-export types (browser-safe)
export type { Session, User } from 'next-auth';
