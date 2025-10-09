import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

// ==================== TENANTS ====================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  plan: text('plan', {
    enum: ['starter', 'growth', 'business', 'enterprise'],
  })
    .notNull()
    .default('starter'),
  settings: jsonb('settings').$type<{
    maxMonthlySpend?: number;
    allowedDomains?: string[];
    features?: string[];
  }>(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  widgets: many(widgets),
  sessions: many(sessions),
  knowledgeDocuments: many(knowledgeDocuments),
}));

// ==================== USERS ====================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordAlgorithm: text('password_algorithm', { enum: ['bcrypt', 'argon2id'] })
    .notNull()
    .default('bcrypt'), // Phase 8: Argon2id migration support
  role: text('role', { enum: ['owner', 'admin', 'member'] })
    .notNull()
    .default('member'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  // Auth.js required columns (Migration 007)
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
  // Phase 8: MFA support
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'), // Encrypted TOTP secret
  mfaBackupCodes: jsonb('mfa_backup_codes').$type<string[]>(), // Encrypted backup codes
  // Phase 8: Account security
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  accounts: many(accounts),
  sessions: many(authSessions),
}));

// ==================== AUTH.JS TABLES ====================
// Auth.js (NextAuth.js) - SOC 2 certified, industry standard
// Replaces deprecated Lucia v4

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'oauth', 'email', etc.
  provider: text('provider').notNull(), // 'google', 'microsoft', etc.
  providerAccountId: text('provider_account_id').notNull(),
  // Auth.js OAuth token columns (snake_case - Migration 007)
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const authSessions = pgTable('auth_sessions', {
  // Migration 007: session_token is now the primary key (not id)
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  // Phase 8: Enhanced session security
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

// Migration 007: Composite primary key (identifier, token)
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ==================== WIDGETS ====================

export const widgets = pgTable('widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domainWhitelist: jsonb('domain_whitelist').$type<string[]>().notNull(),
  settings: jsonb('settings').$type<{
    theme: 'light' | 'dark' | 'auto';
    position: 'bottom-right' | 'bottom-left';
    greeting?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const widgetsRelations = relations(widgets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [widgets.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
}));

// ==================== MEETINGS ====================

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  roomName: text('room_name').notNull().unique(),
  livekitRoomId: text('livekit_room_id').notNull().unique(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  metadata: jsonb('metadata').$type<{
    title?: string;
    description?: string;
    participants?: string[];
  }>(),
});

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [meetings.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
  }),
  sessions: many(sessions),
}));

// ==================== SESSIONS ====================

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  widgetId: uuid('widget_id').references(() => widgets.id, {
    onDelete: 'set null',
  }),
  meetingId: uuid('meeting_id').references(() => meetings.id, {
    onDelete: 'set null',
  }),
  mode: text('mode', { enum: ['text', 'meeting'] })
    .notNull()
    .default('text'),
  costUsd: decimal('cost_usd', { precision: 10, scale: 4 }).default('0'),
  metadata: jsonb('metadata').$type<{
    userAgent?: string;
    ip?: string;
    country?: string;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  widget: one(widgets, {
    fields: [sessions.widgetId],
    references: [widgets.id],
  }),
  meeting: one(meetings, {
    fields: [sessions.meetingId],
    references: [meetings.id],
  }),
  messages: many(messages),
}));

// ==================== MESSAGES ====================

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  attachments:
    jsonb('attachments').$type<
      Array<{
        type: 'image' | 'file';
        url: string;
        name?: string;
        size?: number;
      }>
    >(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    tokensUsed?: number;
    costUsd?: number;
    latencyMs?: number;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

// ==================== KNOWLEDGE BASE ====================

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  embedding: vector('embedding', { dimensions: 1024 }), // Voyage Multimodal-3
  metadata: jsonb('metadata').$type<{
    source?: string;
    url?: string;
    author?: string;
    tags?: string[];
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [knowledgeDocuments.tenantId],
    references: [tenants.id],
  }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1024 }).notNull(),
  position: integer('position').notNull(), // Order within document
  metadata: jsonb('metadata').$type<{
    chunkSize?: number;
    overlapSize?: number;
  }>(),
});

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, {
    fields: [knowledgeChunks.documentId],
    references: [knowledgeDocuments.id],
  }),
}));

// ==================== COST TRACKING ====================

export const costEvents = pgTable('cost_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id, {
    onDelete: 'set null',
  }),
  service: text('service', {
    enum: ['vision', 'voice_stt', 'voice_tts', 'llm', 'embedding', 'livekit'],
  }).notNull(),
  provider: text('provider'), // 'openai', 'anthropic', 'deepgram', etc.
  tokensUsed: integer('tokens_used'),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }).notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    operation?: string;
    duration?: number;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const costEventsRelations = relations(costEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [costEvents.tenantId],
    references: [tenants.id],
  }),
  session: one(sessions, {
    fields: [costEvents.sessionId],
    references: [sessions.id],
  }),
}));

// ==================== COST SUMMARIES ====================

export const costSummaries = pgTable('cost_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 4 }).notNull(),
  breakdown: jsonb('breakdown')
    .$type<{
      vision: number;
      voice_stt: number;
      voice_tts: number;
      llm: number;
      embedding: number;
      livekit: number;
    }>()
    .notNull(),
  eventCount: integer('event_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const costSummariesRelations = relations(costSummaries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [costSummaries.tenantId],
    references: [tenants.id],
  }),
}));

// ==================== BUDGET ALERTS ====================

export const budgetAlerts = pgTable('budget_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  threshold: decimal('threshold', { precision: 10, scale: 2 }).notNull(),
  currentSpend: decimal('current_spend', { precision: 10, scale: 4 }).notNull(),
  period: text('period', { enum: ['daily', 'weekly', 'monthly'] })
    .notNull()
    .default('monthly'),
  severity: text('severity', { enum: ['warning', 'critical'] })
    .notNull()
    .default('warning'),
  notificationsSent: integer('notifications_sent').notNull().default(0),
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  metadata: jsonb('metadata').$type<{
    recipients?: string[];
    channels?: string[];
    customMessage?: string;
  }>(),
});

export const budgetAlertsRelations = relations(budgetAlerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [budgetAlerts.tenantId],
    references: [tenants.id],
  }),
}));

// ==================== AI PERSONALITIES ====================

export const aiPersonalities = pgTable('ai_personalities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).notNull().default('0.7'),
  maxTokens: integer('max_tokens').default(2000),
  topP: decimal('top_p', { precision: 3, scale: 2 }).default('1.0'),
  frequencyPenalty: decimal('frequency_penalty', { precision: 3, scale: 2 }).default('0.0'),
  presencePenalty: decimal('presence_penalty', { precision: 3, scale: 2 }).default('0.0'),
  preferredModel: text('preferred_model'), // 'gpt-4', 'claude-3-sonnet', etc.
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').$type<{
    tags?: string[];
    category?: string;
    usageStats?: {
      totalUses: number;
      avgTokens: number;
      avgCost: number;
    };
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const aiPersonalitiesRelations = relations(aiPersonalities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiPersonalities.tenantId],
    references: [tenants.id],
  }),
}));

// ==================== API KEYS (Phase 8) ====================

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyType: text('key_type', { enum: ['publishable', 'secret'] }).notNull(),
  keyHash: text('key_hash').notNull().unique(), // SHA-256 hash of the key
  prefix: text('prefix').notNull(), // First 8 chars for display (pk_live_xxxx, sk_live_xxxx)
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  permissions: jsonb('permissions').$type<{
    scopes: string[]; // ['widget:read', 'widget:write', 'meetings:create', etc.]
    ipWhitelist?: string[];
    rateLimit?: number;
  }>(),
  metadata: jsonb('metadata').$type<{
    createdBy?: string;
    environment?: 'development' | 'production';
    description?: string;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
}));

// ==================== AUDIT LOGS (Phase 8) ====================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'user.login', 'user.logout', 'data.export', etc.
  resource: text('resource').notNull(), // Table or entity affected
  resourceId: uuid('resource_id'), // ID of affected entity
  status: text('status', { enum: ['success', 'failure', 'pending'] }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  changes: jsonb('changes').$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    diff?: string[];
  }>(),
  metadata: jsonb('metadata').$type<{
    reason?: string;
    riskScore?: number;
    geolocation?: string;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ==================== GDPR DATA REQUESTS (Phase 8) ====================

export const dataRequests = pgTable('data_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  requestType: text('request_type', { enum: ['export', 'deletion'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  exportUrl: text('export_url'), // S3/storage URL for export files
  expiresAt: timestamp('expires_at'), // Export file expiry (7 days)
  metadata: jsonb('metadata').$type<{
    requestSource?: string; // 'dashboard', 'email', 'api'
    format?: 'json' | 'csv' | 'pdf';
    includeRelated?: boolean;
    legalHold?: boolean; // Prevents deletion during legal proceedings
    processedBy?: string;
  }>(),
});

export const dataRequestsRelations = relations(dataRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dataRequests.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [dataRequests.userId],
    references: [users.id],
  }),
}));

// ==================== INDEXES ====================
// TODO: Add indexes via SQL migration (standalone index exports cause runtime errors in Drizzle 0.44.6)
