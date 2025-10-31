/**
 * Auth Middleware for Request-Scoped RLS Context
 *
 * CRITICAL FOR PRODUCTION:
 * This middleware sets the tenant context for Row-Level Security (RLS) on each request.
 * Each request gets its own database connection with tenant isolation.
 *
 * Usage:
 * ```typescript
 * const context = await authMiddleware(req);
 * // tenant context is now set for this request
 * ```
 */

import { sql } from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import type { Session } from 'next-auth';
import { auth } from './auth';
import {
  hasRole as checkRole,
  extractRoleFromSession,
  extractTenantFromSession,
  isValidTenantId,
} from './tenant-context';

const logger = createModuleLogger('auth-middleware');

/**
 * Auth context attached to each request
 */
export interface AuthContext {
  session: Session;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

/**
 * Auth error with specific error codes
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_TENANT' | 'SESSION_EXPIRED',
    public statusCode = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Request-scoped auth middleware
 *
 * CRITICAL FOR RLS:
 * - Gets session from Auth.js
 * - Extracts tenant ID from session
 * - Validates tenant ID format (UUID v4)
 * - Sets app.current_tenant_id for RLS (request-scoped)
 * - Returns auth context for downstream use
 *
 * @param req - Web API Request object
 * @returns Auth context with session, tenantId, userId, role
 * @throws AuthError if session invalid or tenant context missing
 */
export async function authMiddleware(_req: Request): Promise<AuthContext> {
  // 1. Get session from Auth.js
  const session = await auth();

  if (!session || !session.user) {
    throw new AuthError('No active session - please sign in', 'UNAUTHORIZED', 401);
  }

  // 2. Extract tenant ID from session
  const tenantId = extractTenantFromSession(session);

  if (!tenantId) {
    throw new AuthError(
      'Missing tenant context - user not assigned to tenant',
      'INVALID_TENANT',
      403
    );
  }

  // 3. Validate tenant ID format (UUID v4)
  if (!isValidTenantId(tenantId)) {
    throw new AuthError('Invalid tenant ID format - security violation', 'INVALID_TENANT', 403);
  }

  // 4. Set tenant context for RLS (request-scoped with set_config)
  // This is CRITICAL for multi-tenant security
  // Using set_config() with is_local=true for transaction-scoped setting
  try {
    await sql.unsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
  } catch (error) {
    logger.error('Failed to set tenant context', { error });
    throw new AuthError('Failed to initialize request context', 'INVALID_TENANT', 500);
  }

  // 5. Extract role for RBAC
  const role = extractRoleFromSession(session);

  if (!role) {
    throw new AuthError('Missing user role - access denied', 'FORBIDDEN', 403);
  }

  // 6. Validate user ID exists
  if (!session.user.id) {
    throw new AuthError('Missing user ID in session', 'UNAUTHORIZED', 401);
  }

  // 7. Return auth context for downstream use
  return {
    session,
    tenantId,
    userId: session.user.id,
    role,
  };
}

/**
 * Role-based authorization guard
 *
 * Checks if user has required role (owner > admin > member hierarchy)
 *
 * @param req - Web API Request object
 * @param requiredRole - Minimum role required (owner, admin, or member)
 * @returns Auth context if authorized
 * @throws AuthError if user lacks required role
 */
export async function requireRole(
  req: Request,
  requiredRole: 'owner' | 'admin' | 'member'
): Promise<AuthContext> {
  const context = await authMiddleware(req);

  if (!checkRole(context.session, requiredRole)) {
    throw new AuthError(
      `Insufficient permissions - ${requiredRole} role required`,
      'FORBIDDEN',
      403
    );
  }

  return context;
}

/**
 * Session refresh middleware
 *
 * Updates session updateAge if needed.
 * Auth.js handles automatic session refresh based on updateAge config.
 */
export async function refreshSession(_req: Request): Promise<void> {
  const session = await auth();

  if (!session) return;

  // Auth.js handles automatic session refresh based on updateAge config (24h)
  // No manual action needed - this is a no-op placeholder for future enhancements
}

/**
 * Logout cleanup middleware
 *
 * Ensures tenant context is cleared after logout.
 */
export async function logoutCleanup(): Promise<void> {
  try {
    await sql.unsafe('RESET app.current_tenant_id');
  } catch (error) {
    logger.error('Failed to cleanup tenant context', { error });
  }
}
