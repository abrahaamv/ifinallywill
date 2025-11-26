/**
 * Phase 12 Week 10: Enterprise Security Schema
 *
 * Database schema for SSO configuration, custom roles, and enhanced audit logging
 */

import { pgTable, uuid, timestamp, text, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { tenants, users } from './index';

/**
 * SSO configurations table
 *
 * Stores SSO/SAML/OIDC configuration per tenant
 */
export const ssoConfigurations = pgTable(
  'sso_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Provider details
    provider: text('provider').notNull(), // 'saml' | 'oidc' | 'google' | 'microsoft' | 'okta' | 'auth0' | 'onelogin'
    enabled: boolean('enabled').notNull().default(false),

    // SAML 2.0 configuration
    samlConfig: jsonb('saml_config').$type<{
      entryPoint: string;
      issuer: string;
      cert: string;
      audience?: string;
      wantAssertionsSigned?: boolean;
      wantAuthnResponseSigned?: boolean;
      signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
      digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
      callbackUrl: string;
      logoutUrl?: string;
      privateKey?: string;
    }>(),

    // OAuth 2.0 / OIDC configuration
    oidcConfig: jsonb('oidc_config').$type<{
      issuer: string;
      clientId: string;
      clientSecret: string; // Encrypted
      authorizationEndpoint: string;
      tokenEndpoint: string;
      userInfoEndpoint: string;
      jwksUri?: string;
      scopes: string[];
      callbackUrl: string;
      logoutUrl?: string;
      responseType?: 'code' | 'id_token' | 'id_token token' | 'code id_token';
      responseMode?: 'query' | 'fragment' | 'form_post';
      pkce?: boolean;
    }>(),

    // Attribute mapping
    attributeMapping: jsonb('attribute_mapping')
      .notNull()
      .$type<{
        email: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        groups?: string;
      }>(),

    // Just-in-time provisioning
    jitProvisioning: jsonb('jit_provisioning')
      .notNull()
      .$type<{
        enabled: boolean;
        defaultRole: 'member' | 'admin' | 'owner';
        roleMapping?: Record<string, string>;
      }>(),

    // Session configuration
    sessionConfig: jsonb('session_config').$type<{
      maxAge: number;
      absoluteTimeout: number;
      idleTimeout: number;
    }>(),

    // Audit
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('sso_configurations_tenant_idx').on(table.tenantId),
    providerIdx: index('sso_configurations_provider_idx').on(table.provider),
    enabledIdx: index('sso_configurations_enabled_idx').on(table.enabled),
  })
);

/**
 * Custom roles table
 *
 * Stores custom role definitions with granular permissions
 */
export const customRoles = pgTable(
  'custom_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Role details
    name: text('name').notNull(),
    description: text('description'),
    permissions: jsonb('permissions').notNull().$type<string[]>(), // Array of Permission keys
    isSystem: boolean('is_system').notNull().default(false), // System roles cannot be deleted
    canBeDeleted: boolean('can_be_deleted').notNull().default(true),

    // Audit
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('custom_roles_tenant_idx').on(table.tenantId),
    nameIdx: index('custom_roles_name_idx').on(table.name),
    isSystemIdx: index('custom_roles_is_system_idx').on(table.isSystem),
  })
);

/**
 * User role assignments table
 *
 * Many-to-many relationship between users and custom roles
 */
export const userRoleAssignments = pgTable(
  'user_role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => customRoles.id, { onDelete: 'cascade' }),

    // Assignment details
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'), // Optional role expiration

    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('user_role_assignments_tenant_idx').on(table.tenantId),
    userIdx: index('user_role_assignments_user_idx').on(table.userId),
    roleIdx: index('user_role_assignments_role_idx').on(table.roleId),
    assignedByIdx: index('user_role_assignments_assigned_by_idx').on(table.assignedBy),
    expiresAtIdx: index('user_role_assignments_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * Enhanced security events table
 *
 * Tracks security-critical events for monitoring and compliance
 */
export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Event details
    eventType: text('event_type').notNull(), // 'login_success' | 'login_failed' | 'logout' | 'password_change' | 'mfa_enabled' | 'mfa_disabled' | 'sso_login' | 'permission_denied' | 'suspicious_activity' | 'data_export' | 'data_deletion'
    severity: text('severity').notNull(), // 'info' | 'warning' | 'critical'
    description: text('description').notNull(),

    // Context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    location: jsonb('location').$type<{
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    }>(),

    // Risk scoring
    riskScore: text('risk_score'), // 'low' | 'medium' | 'high' | 'critical'
    riskFactors: jsonb('risk_factors').$type<
      Array<{
        factor: string;
        description: string;
        weight: number;
      }>
    >(),

    // Response details
    actionTaken: text('action_taken'), // 'none' | 'block' | 'mfa_required' | 'session_terminated' | 'account_locked'
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),

    timestamp: timestamp('timestamp').notNull().defaultNow(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('security_events_tenant_idx').on(table.tenantId),
    userIdx: index('security_events_user_idx').on(table.userId),
    eventTypeIdx: index('security_events_event_type_idx').on(table.eventType),
    severityIdx: index('security_events_severity_idx').on(table.severity),
    timestampIdx: index('security_events_timestamp_idx').on(table.timestamp),
    riskScoreIdx: index('security_events_risk_score_idx').on(table.riskScore),
  })
);

/**
 * Active sessions tracking table
 *
 * Tracks active user sessions with device information
 */
export const activeSessions = pgTable(
  'active_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Session details
    sessionToken: text('session_token').notNull().unique(),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at').notNull(),

    // Device information
    deviceId: text('device_id'), // Unique device identifier
    deviceType: text('device_type'), // 'desktop' | 'mobile' | 'tablet'
    deviceName: text('device_name'), // e.g., "Chrome on Windows"
    osName: text('os_name'),
    osVersion: text('os_version'),
    browserName: text('browser_name'),
    browserVersion: text('browser_version'),

    // Location
    ipAddress: text('ip_address').notNull(),
    location: jsonb('location').$type<{
      country?: string;
      region?: string;
      city?: string;
    }>(),

    // Activity tracking
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
    terminatedAt: timestamp('terminated_at'),
    terminatedBy: text('terminated_by'), // 'user' | 'admin' | 'system' | 'timeout'

    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('active_sessions_tenant_idx').on(table.tenantId),
    userIdx: index('active_sessions_user_idx').on(table.userId),
    sessionTokenIdx: index('active_sessions_session_token_idx').on(table.sessionToken),
    deviceIdIdx: index('active_sessions_device_id_idx').on(table.deviceId),
    expiresAtIdx: index('active_sessions_expires_at_idx').on(table.expiresAt),
    lastActivityIdx: index('active_sessions_last_activity_idx').on(table.lastActivityAt),
  })
);

/**
 * Trusted devices table
 *
 * Stores trusted devices for MFA bypass
 */
export const trustedDevices = pgTable(
  'trusted_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Device details
    deviceId: text('device_id').notNull().unique(),
    deviceName: text('device_name').notNull(),
    deviceType: text('device_type').notNull(),

    // Trust details
    trustToken: text('trust_token').notNull().unique(),
    trustedAt: timestamp('trusted_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(), // Trust expires after 30 days
    lastUsedAt: timestamp('last_used_at'),

    // Revocation
    revokedAt: timestamp('revoked_at'),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokedReason: text('revoked_reason'),

    metadata: jsonb('metadata'),
  },
  (table) => ({
    tenantIdx: index('trusted_devices_tenant_idx').on(table.tenantId),
    userIdx: index('trusted_devices_user_idx').on(table.userId),
    deviceIdIdx: index('trusted_devices_device_id_idx').on(table.deviceId),
    trustTokenIdx: index('trusted_devices_trust_token_idx').on(table.trustToken),
    expiresAtIdx: index('trusted_devices_expires_at_idx').on(table.expiresAt),
  })
);
