/**
 * Phase 12 Week 10: Enterprise Security Services
 *
 * Export all enterprise security service implementations
 */

// SSO Service
export {
  SSOService,
  SSOServiceFactory,
  type SSOProvider,
  type SSOConfig,
  type SSOAuthResult,
  type SAMLAssertion,
  type OIDCTokens,
} from './sso-service';

// RBAC Service
export {
  RBACService,
  PERMISSIONS,
  SYSTEM_ROLES,
  requirePermission,
  createPermissionMiddleware,
  type Permission,
  type SystemRole,
  type CustomRole,
  type PermissionCheckResult,
} from './rbac-service';
