/**
 * CRM Integrations Schema (Phase 12 Week 5-6)
 * Salesforce, HubSpot, and Zendesk bi-directional sync
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './index';

// ==================== CRM CONNECTIONS ====================

export const crmConnections = pgTable('crm_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // CRM provider
  provider: text('provider', {
    enum: ['salesforce', 'hubspot', 'zendesk'],
  }).notNull(),

  // Connection status
  status: text('status', {
    enum: ['active', 'disconnected', 'error', 'pending'],
  }).notNull().default('pending'),

  // OAuth credentials (encrypted)
  credentials: jsonb('credentials').$type<{
    accessToken?: string; // Encrypted
    refreshToken?: string; // Encrypted
    instanceUrl?: string; // Salesforce
    apiKey?: string; // HubSpot/Zendesk (encrypted)
    subdomain?: string; // Zendesk
    expiresAt?: string;
  }>().notNull(),

  // Sync configuration
  syncConfig: jsonb('sync_config').$type<{
    bidirectional: boolean;
    syncFields: string[];
    syncFrequency: 'realtime' | 'hourly' | 'daily';
    conflictResolution: 'platform_wins' | 'crm_wins' | 'newest_wins';
  }>().notNull(),

  // Connection metadata
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: text('last_sync_status', {
    enum: ['success', 'partial', 'failed'],
  }),
  syncErrorCount: integer('sync_error_count').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  metadata: jsonb('metadata').$type<{
    webhookUrl?: string;
    webhookSecret?: string;
    totalSyncs?: number;
    lastError?: string;
  }>(),
});

export const crmConnectionsRelations = relations(crmConnections, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [crmConnections.tenantId],
    references: [tenants.id],
  }),
  syncLogs: many(crmSyncLogs),
  fieldMappings: many(crmFieldMappings),
}));

// ==================== CRM FIELD MAPPINGS ====================

export const crmFieldMappings = pgTable('crm_field_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => crmConnections.id, { onDelete: 'cascade' }),

  // Field mapping
  platformField: text('platform_field').notNull(), // 'end_users.email', 'sessions.metadata'
  crmField: text('crm_field').notNull(), // 'Contact.Email', 'properties.email'
  crmObjectType: text('crm_object_type').notNull(), // 'Contact', 'Lead', 'Ticket'

  // Mapping configuration
  direction: text('direction', {
    enum: ['platform_to_crm', 'crm_to_platform', 'bidirectional'],
  }).notNull(),

  transformationRules: jsonb('transformation_rules').$type<{
    format?: string;
    defaultValue?: string;
    validationRules?: string[];
  }>(),

  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const crmFieldMappingsRelations = relations(crmFieldMappings, ({ one }) => ({
  connection: one(crmConnections, {
    fields: [crmFieldMappings.connectionId],
    references: [crmConnections.id],
  }),
}));

// ==================== CRM SYNC STATE ====================

export const crmSyncState = pgTable('crm_sync_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => crmConnections.id, { onDelete: 'cascade' }),

  // Entity mapping
  platformEntityType: text('platform_entity_type').notNull(), // 'end_user', 'session'
  platformEntityId: uuid('platform_entity_id').notNull(),
  crmEntityType: text('crm_entity_type').notNull(), // 'Contact', 'Lead', 'Ticket'
  crmEntityId: text('crm_entity_id').notNull(),

  // Sync tracking
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
  platformUpdatedAt: timestamp('platform_updated_at').notNull(),
  crmUpdatedAt: timestamp('crm_updated_at').notNull(),

  // Conflict detection
  hasConflict: boolean('has_conflict').notNull().default(false),
  conflictData: jsonb('conflict_data').$type<{
    platformValue?: Record<string, unknown>;
    crmValue?: Record<string, unknown>;
    conflictFields?: string[];
  }>(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const crmSyncStateRelations = relations(crmSyncState, ({ one }) => ({
  connection: one(crmConnections, {
    fields: [crmSyncState.connectionId],
    references: [crmConnections.id],
  }),
}));

// ==================== CRM SYNC LOGS ====================

export const crmSyncLogs = pgTable('crm_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => crmConnections.id, { onDelete: 'cascade' }),

  // Sync operation
  operation: text('operation', {
    enum: ['create', 'update', 'delete', 'sync'],
  }).notNull(),

  direction: text('direction', {
    enum: ['platform_to_crm', 'crm_to_platform'],
  }).notNull(),

  // Entity details
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),

  // Sync result
  status: text('status', {
    enum: ['success', 'failed', 'partial'],
  }).notNull(),

  errorMessage: text('error_message'),
  errorCode: text('error_code'),

  // Data snapshot
  dataBefore: jsonb('data_before'),
  dataAfter: jsonb('data_after'),

  // Performance metrics
  durationMs: integer('duration_ms'),
  retryCount: integer('retry_count').notNull().default(0),

  syncedAt: timestamp('synced_at').notNull().defaultNow(),

  metadata: jsonb('metadata').$type<{
    batchId?: string;
    webhookId?: string;
    triggeredBy?: string;
  }>(),
});

export const crmSyncLogsRelations = relations(crmSyncLogs, ({ one }) => ({
  connection: one(crmConnections, {
    fields: [crmSyncLogs.connectionId],
    references: [crmConnections.id],
  }),
}));

// ==================== CRM WEBHOOKS ====================

export const crmWebhooks = pgTable('crm_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => crmConnections.id, { onDelete: 'cascade' }),

  // Webhook configuration
  provider: text('provider', {
    enum: ['salesforce', 'hubspot', 'zendesk'],
  }).notNull(),

  eventType: text('event_type').notNull(), // 'contact.created', 'ticket.updated'
  webhookUrl: text('webhook_url').notNull(),
  secret: text('secret').notNull(), // For webhook signature verification

  // Status tracking
  isActive: boolean('is_active').notNull().default(true),
  lastReceivedAt: timestamp('last_received_at'),
  totalReceived: integer('total_received').notNull().default(0),
  totalProcessed: integer('total_processed').notNull().default(0),
  totalFailed: integer('total_failed').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  metadata: jsonb('metadata').$type<{
    subscriptionId?: string;
    filters?: Record<string, unknown>;
  }>(),
});

export const crmWebhooksRelations = relations(crmWebhooks, ({ one }) => ({
  connection: one(crmConnections, {
    fields: [crmWebhooks.connectionId],
    references: [crmConnections.id],
  }),
}));
