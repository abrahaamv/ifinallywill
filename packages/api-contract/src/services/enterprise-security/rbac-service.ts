/**
 * Phase 12 Week 10: RBAC Service
 *
 * Provides role-based access control with custom roles and granular permissions
 */

/**
 * System-wide permissions
 */
export const PERMISSIONS = {
  // User management
  'users:read': 'View users',
  'users:create': 'Create users',
  'users:update': 'Update users',
  'users:delete': 'Delete users',
  'users:invite': 'Invite users',

  // Widget management
  'widgets:read': 'View widgets',
  'widgets:create': 'Create widgets',
  'widgets:update': 'Update widgets',
  'widgets:delete': 'Delete widgets',
  'widgets:configure': 'Configure widget settings',

  // Session management
  'sessions:read': 'View sessions',
  'sessions:terminate': 'Terminate sessions',

  // Knowledge base
  'knowledge:read': 'View knowledge base',
  'knowledge:create': 'Create knowledge documents',
  'knowledge:update': 'Update knowledge documents',
  'knowledge:delete': 'Delete knowledge documents',
  'knowledge:sync': 'Sync external knowledge sources',

  // AI Personalities
  'personalities:read': 'View AI personalities',
  'personalities:create': 'Create AI personalities',
  'personalities:update': 'Update AI personalities',
  'personalities:delete': 'Delete AI personalities',

  // Analytics & Monitoring
  'analytics:read': 'View analytics',
  'monitoring:read': 'View monitoring data',
  'logs:read': 'View logs',

  // Billing & Cost
  'billing:read': 'View billing information',
  'billing:manage': 'Manage billing',

  // API Keys
  'api_keys:read': 'View API keys',
  'api_keys:create': 'Create API keys',
  'api_keys:revoke': 'Revoke API keys',

  // Audit logs
  'audit:read': 'View audit logs',

  // Settings
  'settings:read': 'View settings',
  'settings:update': 'Update settings',

  // SSO Configuration
  'sso:read': 'View SSO configuration',
  'sso:configure': 'Configure SSO',

  // RBAC Management
  'roles:read': 'View roles',
  'roles:create': 'Create custom roles',
  'roles:update': 'Update roles',
  'roles:delete': 'Delete custom roles',
  'roles:assign': 'Assign roles to users',

  // Quality Assurance
  'qa:read': 'View quality reviews',
  'qa:review': 'Review flagged responses',
  'qa:configure': 'Configure QA settings',

  // Escalations
  'escalations:read': 'View escalations',
  'escalations:handle': 'Handle escalations',

  // Integrations
  'integrations:read': 'View integrations',
  'integrations:configure': 'Configure integrations',

  // Data Export (GDPR)
  'data:export': 'Export user data',
  'data:delete': 'Delete user data',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * System roles with predefined permissions
 */
export const SYSTEM_ROLES = {
  owner: {
    name: 'Owner',
    description: 'Full access to all features and settings',
    permissions: Object.keys(PERMISSIONS) as Permission[],
    isSystem: true,
    canBeDeleted: false,
  },
  admin: {
    name: 'Admin',
    description: 'Administrative access with most permissions',
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'users:invite',
      'widgets:read',
      'widgets:create',
      'widgets:update',
      'widgets:delete',
      'widgets:configure',
      'sessions:read',
      'sessions:terminate',
      'knowledge:read',
      'knowledge:create',
      'knowledge:update',
      'knowledge:delete',
      'knowledge:sync',
      'personalities:read',
      'personalities:create',
      'personalities:update',
      'personalities:delete',
      'analytics:read',
      'monitoring:read',
      'logs:read',
      'billing:read',
      'api_keys:read',
      'api_keys:create',
      'api_keys:revoke',
      'audit:read',
      'settings:read',
      'settings:update',
      'sso:read',
      'roles:read',
      'roles:assign',
      'qa:read',
      'qa:review',
      'escalations:read',
      'escalations:handle',
      'integrations:read',
      'integrations:configure',
    ] as Permission[],
    isSystem: true,
    canBeDeleted: false,
  },
  member: {
    name: 'Member',
    description: 'Basic access to view data and manage content',
    permissions: [
      'users:read',
      'widgets:read',
      'sessions:read',
      'knowledge:read',
      'knowledge:create',
      'knowledge:update',
      'personalities:read',
      'analytics:read',
      'settings:read',
      'qa:read',
      'escalations:read',
    ] as Permission[],
    isSystem: true,
    canBeDeleted: false,
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to most features',
    permissions: [
      'users:read',
      'widgets:read',
      'sessions:read',
      'knowledge:read',
      'personalities:read',
      'analytics:read',
      'settings:read',
    ] as Permission[],
    isSystem: true,
    canBeDeleted: false,
  },
  support: {
    name: 'Support Agent',
    description: 'Customer support role with session and escalation access',
    permissions: [
      'sessions:read',
      'sessions:terminate',
      'knowledge:read',
      'qa:read',
      'qa:review',
      'escalations:read',
      'escalations:handle',
      'analytics:read',
    ] as Permission[],
    isSystem: true,
    canBeDeleted: false,
  },
} as const;

export type SystemRole = keyof typeof SYSTEM_ROLES;

/**
 * Custom role definition
 */
export interface CustomRole {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  canBeDeleted: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
}

/**
 * RBAC Service
 */
export class RBACService {
  /**
   * Check if user has permission
   */
  static hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of the permissions
   */
  static hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
  }

  /**
   * Check if user has all permissions
   */
  static hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }

  /**
   * Get permissions for role
   */
  static getRolePermissions(role: SystemRole | string): Permission[] {
    // Check if system role
    if (role in SYSTEM_ROLES) {
      return SYSTEM_ROLES[role as SystemRole].permissions;
    }

    // Custom role - would need to fetch from database
    return [];
  }

  /**
   * Validate permissions against available permissions
   */
  static validatePermissions(permissions: string[]): { valid: Permission[]; invalid: string[] } {
    const validPermissions: Permission[] = [];
    const invalidPermissions: string[] = [];

    for (const permission of permissions) {
      if (permission in PERMISSIONS) {
        validPermissions.push(permission as Permission);
      } else {
        invalidPermissions.push(permission);
      }
    }

    return { valid: validPermissions, invalid: invalidPermissions };
  }

  /**
   * Check permission with detailed result
   */
  static checkPermission(
    userPermissions: Permission[],
    requiredPermission: Permission | Permission[]
  ): PermissionCheckResult {
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasPermissions = this.hasAllPermissions(userPermissions, required);

    if (hasPermissions) {
      return { allowed: true };
    }

    const missing = required.filter((p) => !userPermissions.includes(p));

    return {
      allowed: false,
      reason: `Missing required permissions: ${missing.join(', ')}`,
      requiredPermissions: required,
      userPermissions,
    };
  }

  /**
   * Get permission hierarchy (for UI)
   */
  static getPermissionHierarchy(): Record<
    string,
    { label: string; permissions: { key: Permission; label: string }[] }
  > {
    return {
      'User Management': {
        label: 'User Management',
        permissions: [
          { key: 'users:read', label: PERMISSIONS['users:read'] },
          { key: 'users:create', label: PERMISSIONS['users:create'] },
          { key: 'users:update', label: PERMISSIONS['users:update'] },
          { key: 'users:delete', label: PERMISSIONS['users:delete'] },
          { key: 'users:invite', label: PERMISSIONS['users:invite'] },
        ],
      },
      'Widget Management': {
        label: 'Widget Management',
        permissions: [
          { key: 'widgets:read', label: PERMISSIONS['widgets:read'] },
          { key: 'widgets:create', label: PERMISSIONS['widgets:create'] },
          { key: 'widgets:update', label: PERMISSIONS['widgets:update'] },
          { key: 'widgets:delete', label: PERMISSIONS['widgets:delete'] },
          { key: 'widgets:configure', label: PERMISSIONS['widgets:configure'] },
        ],
      },
      'Knowledge Base': {
        label: 'Knowledge Base',
        permissions: [
          { key: 'knowledge:read', label: PERMISSIONS['knowledge:read'] },
          { key: 'knowledge:create', label: PERMISSIONS['knowledge:create'] },
          { key: 'knowledge:update', label: PERMISSIONS['knowledge:update'] },
          { key: 'knowledge:delete', label: PERMISSIONS['knowledge:delete'] },
          { key: 'knowledge:sync', label: PERMISSIONS['knowledge:sync'] },
        ],
      },
      'AI & Personalities': {
        label: 'AI & Personalities',
        permissions: [
          { key: 'personalities:read', label: PERMISSIONS['personalities:read'] },
          { key: 'personalities:create', label: PERMISSIONS['personalities:create'] },
          { key: 'personalities:update', label: PERMISSIONS['personalities:update'] },
          { key: 'personalities:delete', label: PERMISSIONS['personalities:delete'] },
        ],
      },
      'Analytics & Monitoring': {
        label: 'Analytics & Monitoring',
        permissions: [
          { key: 'analytics:read', label: PERMISSIONS['analytics:read'] },
          { key: 'monitoring:read', label: PERMISSIONS['monitoring:read'] },
          { key: 'logs:read', label: PERMISSIONS['logs:read'] },
        ],
      },
      'Billing & API Keys': {
        label: 'Billing & API Keys',
        permissions: [
          { key: 'billing:read', label: PERMISSIONS['billing:read'] },
          { key: 'billing:manage', label: PERMISSIONS['billing:manage'] },
          { key: 'api_keys:read', label: PERMISSIONS['api_keys:read'] },
          { key: 'api_keys:create', label: PERMISSIONS['api_keys:create'] },
          { key: 'api_keys:revoke', label: PERMISSIONS['api_keys:revoke'] },
        ],
      },
      'Security & Settings': {
        label: 'Security & Settings',
        permissions: [
          { key: 'audit:read', label: PERMISSIONS['audit:read'] },
          { key: 'settings:read', label: PERMISSIONS['settings:read'] },
          { key: 'settings:update', label: PERMISSIONS['settings:update'] },
          { key: 'sso:read', label: PERMISSIONS['sso:read'] },
          { key: 'sso:configure', label: PERMISSIONS['sso:configure'] },
        ],
      },
      'Role Management': {
        label: 'Role Management',
        permissions: [
          { key: 'roles:read', label: PERMISSIONS['roles:read'] },
          { key: 'roles:create', label: PERMISSIONS['roles:create'] },
          { key: 'roles:update', label: PERMISSIONS['roles:update'] },
          { key: 'roles:delete', label: PERMISSIONS['roles:delete'] },
          { key: 'roles:assign', label: PERMISSIONS['roles:assign'] },
        ],
      },
      'Quality & Support': {
        label: 'Quality & Support',
        permissions: [
          { key: 'qa:read', label: PERMISSIONS['qa:read'] },
          { key: 'qa:review', label: PERMISSIONS['qa:review'] },
          { key: 'qa:configure', label: PERMISSIONS['qa:configure'] },
          { key: 'escalations:read', label: PERMISSIONS['escalations:read'] },
          { key: 'escalations:handle', label: PERMISSIONS['escalations:handle'] },
        ],
      },
      'Integrations & Data': {
        label: 'Integrations & Data',
        permissions: [
          { key: 'integrations:read', label: PERMISSIONS['integrations:read'] },
          { key: 'integrations:configure', label: PERMISSIONS['integrations:configure'] },
          { key: 'data:export', label: PERMISSIONS['data:export'] },
          { key: 'data:delete', label: PERMISSIONS['data:delete'] },
        ],
      },
    };
  }

  /**
   * Compare two permission sets
   */
  static comparePermissions(
    current: Permission[],
    target: Permission[]
  ): { added: Permission[]; removed: Permission[]; unchanged: Permission[] } {
    const added = target.filter((p) => !current.includes(p));
    const removed = current.filter((p) => !target.includes(p));
    const unchanged = current.filter((p) => target.includes(p));

    return { added, removed, unchanged };
  }

  /**
   * Get permission diff for audit log
   */
  static getPermissionDiff(current: Permission[], target: Permission[]): string {
    const { added, removed } = this.comparePermissions(current, target);

    const parts: string[] = [];
    if (added.length > 0) {
      parts.push(`Added: ${added.join(', ')}`);
    }
    if (removed.length > 0) {
      parts.push(`Removed: ${removed.join(', ')}`);
    }

    return parts.join('; ');
  }
}

/**
 * Permission decorators for tRPC procedures
 */
export function requirePermission(permission: Permission | Permission[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [{ ctx }] = args;

      if (!ctx.user) {
        throw new Error('Authentication required');
      }

      const userPermissions = RBACService.getRolePermissions(ctx.user.role);
      const required = Array.isArray(permission) ? permission : [permission];

      if (!RBACService.hasAllPermissions(userPermissions, required)) {
        throw new Error(`Missing required permissions: ${required.join(', ')}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Permission middleware for tRPC
 */
export function createPermissionMiddleware(requiredPermissions: Permission | Permission[]) {
  return async (opts: any) => {
    const { ctx } = opts;

    if (!ctx.user) {
      throw new Error('Authentication required');
    }

    const userPermissions = RBACService.getRolePermissions(ctx.user.role);
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    const check = RBACService.checkPermission(userPermissions, required);

    if (!check.allowed) {
      throw new Error(check.reason || 'Permission denied');
    }

    return opts.next();
  };
}
