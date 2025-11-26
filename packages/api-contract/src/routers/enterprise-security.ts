/**
 * Phase 12 Week 10: Enterprise Security Router
 *
 * Provides tRPC endpoints for SSO, RBAC, and security monitoring
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, ownerProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  SSOService,
  SSOServiceFactory,
  RBACService,
  PERMISSIONS,
  SYSTEM_ROLES,
  type SSOConfig,
  type Permission,
} from '../services/enterprise-security';
import { db } from '@platform/db';
import {
  ssoConfigurations,
  customRoles,
  userRoleAssignments,
  securityEvents,
  activeSessions,
  trustedDevices,
  tenants,
  users,
} from '@platform/db';
import { eq, and, desc, gte, sql, count } from 'drizzle-orm';

/**
 * SSO configuration schema
 */
const ssoConfigSchema = z.object({
  provider: z.enum(['saml', 'oidc', 'google', 'microsoft', 'okta', 'auth0', 'onelogin']),
  enabled: z.boolean(),
  samlConfig: z
    .object({
      entryPoint: z.string().url(),
      issuer: z.string(),
      cert: z.string(),
      audience: z.string().optional(),
      wantAssertionsSigned: z.boolean().optional(),
      wantAuthnResponseSigned: z.boolean().optional(),
      signatureAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
      digestAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).optional(),
      callbackUrl: z.string().url(),
      logoutUrl: z.string().url().optional(),
      privateKey: z.string().optional(),
    })
    .optional(),
  oidcConfig: z
    .object({
      issuer: z.string().url(),
      clientId: z.string(),
      clientSecret: z.string(),
      authorizationEndpoint: z.string().url(),
      tokenEndpoint: z.string().url(),
      userInfoEndpoint: z.string().url(),
      jwksUri: z.string().url().optional(),
      scopes: z.array(z.string()),
      callbackUrl: z.string().url(),
      logoutUrl: z.string().url().optional(),
      responseType: z.enum(['code', 'id_token', 'id_token token', 'code id_token']).optional(),
      responseMode: z.enum(['query', 'fragment', 'form_post']).optional(),
      pkce: z.boolean().optional(),
    })
    .optional(),
  attributeMapping: z.object({
    email: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    groups: z.string().optional(),
  }),
  jitProvisioning: z.object({
    enabled: z.boolean(),
    defaultRole: z.enum(['member', 'admin', 'owner']),
    roleMapping: z.record(z.string()).optional(),
  }),
  sessionConfig: z
    .object({
      maxAge: z.number(),
      absoluteTimeout: z.number(),
      idleTimeout: z.number(),
    })
    .optional(),
});

/**
 * Custom role schema
 */
const customRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()),
});

/**
 * Security event schema
 */
const securityEventSchema = z.object({
  eventType: z.enum([
    'login_success',
    'login_failed',
    'logout',
    'password_change',
    'mfa_enabled',
    'mfa_disabled',
    'sso_login',
    'permission_denied',
    'suspicious_activity',
    'data_export',
    'data_deletion',
  ]),
  severity: z.enum(['info', 'warning', 'critical']),
  description: z.string(),
  riskScore: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

/**
 * Enterprise Security Router
 */
export const enterpriseSecurityRouter = router({
  // ==================== SSO CONFIGURATION ====================

  /**
   * Configure SSO for tenant (owner only)
   */
  configureSSOProvider: ownerProcedure
    .input(ssoConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate configuration
      const ssoService = new SSOService(input as SSOConfig);

      // Check if SSO configuration already exists
      const existing = await db.query.ssoConfigurations.findFirst({
        where: and(
          eq(ssoConfigurations.tenantId, ctx.tenantId),
          eq(ssoConfigurations.provider, input.provider)
        ),
      });

      // Build config object - zod validates at runtime, these casts are safe
      const configValues = {
        enabled: input.enabled,
        samlConfig: input.samlConfig as typeof ssoConfigurations.$inferInsert['samlConfig'],
        oidcConfig: input.oidcConfig as typeof ssoConfigurations.$inferInsert['oidcConfig'],
        attributeMapping: input.attributeMapping as typeof ssoConfigurations.$inferInsert['attributeMapping'],
        jitProvisioning: input.jitProvisioning as typeof ssoConfigurations.$inferInsert['jitProvisioning'],
        sessionConfig: input.sessionConfig as typeof ssoConfigurations.$inferInsert['sessionConfig'],
      };

      if (existing) {
        // Update existing configuration
        const [updated] = await db
          .update(ssoConfigurations)
          .set({
            ...configValues,
            updatedAt: new Date(),
          })
          .where(eq(ssoConfigurations.id, existing.id))
          .returning();

        // Clear SSO service cache
        SSOServiceFactory.clearCache(ctx.tenantId);

        return { ssoConfig: updated };
      }

      // Create new configuration
      const [ssoConfig] = await db
        .insert(ssoConfigurations)
        .values({
          tenantId: ctx.tenantId,
          provider: input.provider,
          ...configValues,
          createdBy: ctx.userId,
        })
        .returning();

      return { ssoConfig };
    }),

  /**
   * Get SSO configuration
   */
  getSSOConfiguration: adminProcedure
    .input(z.object({ provider: z.string() }))
    .query(async ({ ctx, input }) => {
      const ssoConfig = await db.query.ssoConfigurations.findFirst({
        where: and(
          eq(ssoConfigurations.tenantId, ctx.tenantId),
          eq(ssoConfigurations.provider, input.provider)
        ),
      });

      if (!ssoConfig) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO configuration not found',
        });
      }

      // Redact sensitive information
      if (ssoConfig.oidcConfig) {
        ssoConfig.oidcConfig = {
          ...ssoConfig.oidcConfig,
          clientSecret: '***REDACTED***',
        };
      }

      return { ssoConfig };
    }),

  /**
   * List all SSO providers
   */
  listSSOProviders: adminProcedure.query(async ({ ctx }) => {
    const providers = await db.query.ssoConfigurations.findMany({
      where: eq(ssoConfigurations.tenantId, ctx.tenantId),
    });

    // Redact sensitive information
    return {
      providers: providers.map((p) => ({
        ...p,
        oidcConfig: p.oidcConfig
          ? {
              ...p.oidcConfig,
              clientSecret: '***REDACTED***',
            }
          : undefined,
      })),
    };
  }),

  /**
   * Initiate SSO login
   */
  initiateSSOLogin: protectedProcedure
    .input(z.object({ provider: z.string(), redirectUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch SSO configuration
      const ssoConfig = await db.query.ssoConfigurations.findFirst({
        where: and(
          eq(ssoConfigurations.tenantId, ctx.tenantId),
          eq(ssoConfigurations.provider, input.provider),
          eq(ssoConfigurations.enabled, true)
        ),
      });

      if (!ssoConfig) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO provider not configured or disabled',
        });
      }

      // Create SSO service
      const ssoService = SSOServiceFactory.getService(ctx.tenantId, ssoConfig as SSOConfig);

      // Generate authentication URL based on provider
      let authUrl: string;
      let state: string | undefined;

      if (ssoConfig.provider === 'saml') {
        const { url } = await ssoService.generateSAMLAuthRequest(input.redirectUrl);
        authUrl = url;
      } else {
        // OIDC/OAuth
        state = crypto.randomUUID();
        const nonce = crypto.randomUUID();
        authUrl = await ssoService.generateOIDCAuthURL(state, nonce);

        // Store state and nonce in session for validation
      }

      return { authUrl, state };
    }),

  // ==================== RBAC MANAGEMENT ====================

  /**
   * Create custom role (owner only)
   */
  createCustomRole: ownerProcedure
    .input(customRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate permissions
      const { valid, invalid } = RBACService.validatePermissions(input.permissions);

      if (invalid.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid permissions: ${invalid.join(', ')}`,
        });
      }

      // Create role
      const [role] = await db
        .insert(customRoles)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          description: input.description,
          permissions: valid,
          isSystem: false,
          canBeDeleted: true,
          createdBy: ctx.userId,
        })
        .returning();

      return { role };
    }),

  /**
   * Update custom role (owner only)
   */
  updateCustomRole: ownerProcedure
    .input(
      z.object({
        roleId: z.string().uuid(),
        updates: customRoleSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch role
      const role = await db.query.customRoles.findFirst({
        where: and(eq(customRoles.id, input.roleId), eq(customRoles.tenantId, ctx.tenantId)),
      });

      if (!role) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Role not found',
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify system roles',
        });
      }

      // Validate permissions if provided
      if (input.updates.permissions) {
        const { valid, invalid } = RBACService.validatePermissions(input.updates.permissions);

        if (invalid.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid permissions: ${invalid.join(', ')}`,
          });
        }

        input.updates.permissions = valid;
      }

      // Update role
      const [updated] = await db
        .update(customRoles)
        .set({
          ...input.updates,
          updatedAt: new Date(),
        })
        .where(eq(customRoles.id, input.roleId))
        .returning();

      return { role: updated };
    }),

  /**
   * Delete custom role (owner only)
   */
  deleteCustomRole: ownerProcedure
    .input(z.object({ roleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch role
      const role = await db.query.customRoles.findFirst({
        where: and(eq(customRoles.id, input.roleId), eq(customRoles.tenantId, ctx.tenantId)),
      });

      if (!role) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Role not found',
        });
      }

      if (!role.canBeDeleted) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This role cannot be deleted',
        });
      }

      // Delete role
      await db.delete(customRoles).where(eq(customRoles.id, input.roleId));

      return { success: true };
    }),

  /**
   * List all roles (system + custom)
   */
  listRoles: protectedProcedure.query(async ({ ctx }) => {
    // Get custom roles
    const custom = await db.query.customRoles.findMany({
      where: eq(customRoles.tenantId, ctx.tenantId),
    });

    // Get system roles
    const system = Object.entries(SYSTEM_ROLES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      permissions: value.permissions,
      isSystem: true,
      canBeDeleted: false,
    }));

    return { roles: [...system, ...custom] };
  }),

  /**
   * Get permission hierarchy (for UI)
   */
  getPermissionHierarchy: protectedProcedure.query(async () => {
    return { hierarchy: RBACService.getPermissionHierarchy() };
  }),

  /**
   * Assign role to user (admin only)
   */
  assignRoleToUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        roleId: z.string().uuid(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user exists and belongs to tenant
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId)),
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Verify role exists
      const role = await db.query.customRoles.findFirst({
        where: and(eq(customRoles.id, input.roleId), eq(customRoles.tenantId, ctx.tenantId)),
      });

      if (!role) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Role not found',
        });
      }

      // Create assignment
      const [assignment] = await db
        .insert(userRoleAssignments)
        .values({
          tenantId: ctx.tenantId,
          userId: input.userId,
          roleId: input.roleId,
          assignedBy: ctx.userId,
          expiresAt: input.expiresAt,
        })
        .returning();

      return { assignment };
    }),

  // ==================== SECURITY MONITORING ====================

  /**
   * Log security event
   */
  logSecurityEvent: protectedProcedure
    .input(securityEventSchema)
    .mutation(async ({ ctx, input }) => {
      const [event] = await db
        .insert(securityEvents)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          eventType: input.eventType,
          severity: input.severity,
          description: input.description,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          riskScore: input.riskScore,
        })
        .returning();

      return { event };
    }),

  /**
   * Get security dashboard
   */
  getSecurityDashboard: adminProcedure
    .input(
      z.object({
        period: z.enum(['today', 'week', 'month', 'quarter']).optional().default('week'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range
      const now = new Date();
      let periodStart: Date;

      switch (input.period) {
        case 'today':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
      }

      // Get security events
      const events = await db.query.securityEvents.findMany({
        where: and(eq(securityEvents.tenantId, ctx.tenantId), gte(securityEvents.timestamp, periodStart)),
        orderBy: desc(securityEvents.timestamp),
        limit: 100,
      });

      // Get active sessions
      const sessions = await db.query.activeSessions.findMany({
        where: and(
          eq(activeSessions.tenantId, ctx.tenantId),
          sql`${activeSessions.terminatedAt} IS NULL`,
          gte(activeSessions.expiresAt, now)
        ),
      });

      // Calculate statistics
      const eventsByType = events.reduce(
        (acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const eventsBySeverity = events.reduce(
        (acc, event) => {
          acc[event.severity] = (acc[event.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        events: events.slice(0, 20), // Recent 20 events
        activeSessions: sessions,
        statistics: {
          totalEvents: events.length,
          eventsByType,
          eventsBySeverity,
          activeSessionCount: sessions.length,
        },
      };
    }),

  /**
   * List active sessions for user
   */
  listActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await db.query.activeSessions.findMany({
      where: and(
        eq(activeSessions.userId, ctx.userId),
        sql`${activeSessions.terminatedAt} IS NULL`,
        gte(activeSessions.expiresAt, new Date())
      ),
      orderBy: desc(activeSessions.lastActivityAt),
    });

    return { sessions };
  }),

  /**
   * Terminate session
   */
  terminateSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch session
      const session = await db.query.activeSessions.findFirst({
        where: eq(activeSessions.id, input.sessionId),
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Verify ownership or admin
      if (session.userId !== ctx.userId && ctx.role !== 'admin' && ctx.role !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot terminate another user\'s session',
        });
      }

      // Terminate session
      await db
        .update(activeSessions)
        .set({
          terminatedAt: new Date(),
          terminatedBy: session.userId === ctx.userId ? 'user' : 'admin',
        })
        .where(eq(activeSessions.id, input.sessionId));

      return { success: true };
    }),
});
