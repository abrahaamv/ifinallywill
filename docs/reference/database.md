# Database Schema Reference

## 📊 Overview

**Database**: PostgreSQL 16+ (minimum 17.3/16.7/15.11 for security patches)
**ORM**: Drizzle ORM 0.44.6 with postgres driver
**Extensions**: `pgvector` for vector embeddings (1024 dimensions)
**Connection Pooling**: PgBouncer recommended (50-100 connections)
**Migration Strategy**: SQL files for RLS policies + Drizzle Kit push for schema

**Status**: ✅ Phase 2 complete (2025-10-06) - All schema, RLS policies, and seeding implemented

**15 Tables Total**:
- **Core**: `tenants`, `users`, `widgets`, `meetings`, `sessions`, `messages`
- **Auth.js**: `accounts`, `auth_sessions`, `verification_tokens`
- **Knowledge**: `knowledge_documents`, `knowledge_chunks`
- **Cost Tracking**: `cost_events`, `cost_summaries`, `budget_alerts`
- **AI**: `ai_personalities`

> **🔐 SECURITY IMPLEMENTATION**:
> - Row-Level Security (RLS) with **FORCE mode** enabled on 14 tenant-scoped tables
> - 56 policies implemented (4 per table: SELECT, INSERT, UPDATE, DELETE)
> - Helper function `get_current_tenant_id()` for edge case handling
> - Session variable `app.current_tenant_id` MUST be set before ANY database query
> - See `rls-policies.md` for comprehensive RLS documentation
> - See `migrations.md` for migration history and execution order

## 🎯 Database Philosophy

**Principles**:
1. **Multi-tenant by default** - Every table filtered by `tenant_id` + RLS policies
2. **Type-safe** - Drizzle ORM with TypeScript inference
3. **Performance-optimized** - Strategic indexes, pgvector for embeddings
4. **Scalable** - Partitioning-ready, connection pooling
5. **Audit-ready** - Timestamps, soft deletes where needed
6. **Security-first** - Row-Level Security (RLS) MANDATORY for multi-tenant isolation

**Technology**: PostgreSQL 16+ + pgvector + Drizzle ORM 0.44.6 + Auth.js

---

## 🗄️ Complete Schema Definition

### Base Schema File

```typescript
// packages/database/src/schema/index.ts
import { pgTable, uuid, text, timestamp, jsonb, boolean, decimal, integer, vector } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ==================== TENANTS ====================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  plan: text('plan', { enum: ['starter', 'growth', 'business', 'enterprise'] })
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
  role: text('role', { enum: ['owner', 'admin', 'member'] })
    .notNull()
    .default('member'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
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
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

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
    [key: string]: any;
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
  attachments: jsonb('attachments').$type<
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

export const knowledgeDocumentsRelations = relations(
  knowledgeDocuments,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [knowledgeDocuments.tenantId],
      references: [tenants.id],
    }),
    chunks: many(knowledgeChunks),
  })
);

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
  breakdown: jsonb('breakdown').$type<{
    vision: number;
    voice_stt: number;
    voice_tts: number;
    llm: number;
    embedding: number;
    livekit: number;
  }>().notNull(),
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
  temperature: decimal('temperature', { precision: 3, scale: 2 })
    .notNull()
    .default('0.7'),
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
```

---

## 🔍 Indexes for Performance

> **⚠️ TODO**: Indexes temporarily removed due to Drizzle ORM 0.44.6 compatibility issue
>
> Standalone index exports caused runtime errors in Drizzle 0.44.6. Indexes will be added via SQL migration in future phase.
>
> See `packages/db/src/schema/index.ts` line 454 for implementation note.

**Planned Indexes** (to be implemented via SQL migration):

```sql
-- Tenant lookups
CREATE INDEX tenant_api_key_idx ON tenants(api_key);

-- User queries
CREATE INDEX user_email_idx ON users(email);
CREATE INDEX user_tenant_idx ON users(tenant_id);

-- Session queries (most frequent)
CREATE INDEX session_tenant_idx ON sessions(tenant_id);
CREATE INDEX session_widget_idx ON sessions(widget_id);
CREATE INDEX session_meeting_idx ON sessions(meeting_id);
CREATE INDEX session_created_at_idx ON sessions(created_at);

-- Message queries (high volume)
CREATE INDEX message_session_idx ON messages(session_id);
CREATE INDEX message_timestamp_idx ON messages(timestamp);

-- Knowledge base vector search (HNSW for fast approximate nearest neighbor)
CREATE INDEX knowledge_embedding_idx
  ON knowledge_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX knowledge_chunk_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX knowledge_tenant_idx ON knowledge_documents(tenant_id);
CREATE INDEX knowledge_category_idx ON knowledge_documents(category);

-- Cost tracking queries
CREATE INDEX cost_tenant_timestamp_idx ON cost_events(tenant_id, timestamp);
CREATE INDEX cost_session_idx ON cost_events(session_id);

-- Cost summaries queries (period-based reporting)
CREATE INDEX cost_summary_tenant_period_idx ON cost_summaries(tenant_id, period_start, period_end);

-- Budget alerts queries (active monitoring)
CREATE INDEX budget_alert_tenant_idx ON budget_alerts(tenant_id);
CREATE INDEX budget_alert_active_idx ON budget_alerts(tenant_id, resolved);
CREATE INDEX budget_alert_triggered_idx ON budget_alerts(triggered_at);

-- AI personalities queries (configuration lookups)
CREATE INDEX ai_personality_tenant_idx ON ai_personalities(tenant_id);
CREATE INDEX ai_personality_default_idx ON ai_personalities(tenant_id, is_default, is_active);
```

---

## 🔄 Migration Strategy

**Status**: ✅ Phase 2 complete (2025-10-06)

**Strategy**: Hybrid approach combining Drizzle Kit push with SQL migration files

### Execution Order

```bash
# 1. Push schema changes to database (Drizzle Kit)
pnpm db:push

# 2. Apply RLS policies (SQL migrations)
psql -U platform -d platform -f packages/db/migrations/001_enable_rls.sql
psql -U platform -d platform -f packages/db/migrations/002_fix_rls_policies.sql
psql -U platform -d platform -f packages/db/migrations/003_fix_rls_empty_string.sql

# 3. Seed database (with temporary RLS disable)
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql
pnpm db:seed
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

### Drizzle Kit Configuration

```typescript
// packages/db/drizzle.config.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import type { Config } from 'drizzle-kit';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Migration Files

**5 migration files implemented** in `packages/db/migrations/`:

1. **`001_enable_rls.sql`** - Initial RLS setup (superseded by 003)
2. **`002_fix_rls_policies.sql`** - Separate INSERT/UPDATE/DELETE policies (superseded by 003)
3. **`003_fix_rls_empty_string.sql`** - ✅ Production-ready RLS with helper function (ACTIVE)
4. **`004_seed_helper.sql`** - Temporarily disable FORCE RLS for seeding
5. **`005_restore_force_rls.sql`** - Restore FORCE RLS after seeding

See `migrations.md` for complete migration documentation and execution details.

---

## 🔐 Multi-Tenancy Enforcement

**Status**: ✅ Phase 2 complete - FORCE RLS enabled on 14 tenant-scoped tables

> **📚 COMPREHENSIVE DOCUMENTATION**: See `rls-policies.md` for complete RLS implementation details, policy structure, middleware integration, and troubleshooting guide.

### Security Summary

- **Tables Protected**: 14 tenant-scoped tables
- **Policies Implemented**: 56 total (4 per table: SELECT, INSERT, UPDATE, DELETE)
- **RLS Mode**: FORCE (even superusers must comply)
- **Helper Function**: `get_current_tenant_id()` handles edge cases
- **Session Variable**: `app.current_tenant_id` MUST be set before ANY database query

### Quick Reference

**Helper Function** (handles empty string from `current_setting()`):
```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Policy Example**:
```sql
-- SELECT: Users can only see their own tenant's data
CREATE POLICY tenants_select ON tenants
  FOR SELECT
  USING (id = get_current_tenant_id());

-- INSERT: Allow creating new tenants (for admin operations and seeding)
CREATE POLICY tenants_insert ON tenants
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only modify own tenant
CREATE POLICY tenants_update ON tenants
  FOR UPDATE
  USING (id = get_current_tenant_id());

-- DELETE: Only delete own tenant
CREATE POLICY tenants_delete ON tenants
  FOR DELETE
  USING (id = get_current_tenant_id());
```

**Middleware Integration** (REQUIRED for all requests):
```typescript
// packages/api/src/middleware/tenant-context.ts
import { db } from "@platform/db";
import { sql } from "drizzle-orm";

export async function setTenantContext(tenantId: string) {
  // Set PostgreSQL session variable for RLS policies
  await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenantId}'`));
}

// Apply to all protected tRPC procedures
export const protectedProcedure = publicProcedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user?.tenantId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // CRITICAL: Set tenant context before ANY database query
    await setTenantContext(ctx.session.user.tenantId);

    return next({
      ctx: {
        ...ctx,
        tenantId: ctx.session.user.tenantId,
      },
    });
  });
```

**Verification**:
```sql
-- Set tenant context
SET app.current_tenant_id = '72cda7ac-9168-41a5-87ad-895ca68d2fd0';
SELECT COUNT(*) FROM sessions;  -- Returns only this tenant's sessions

-- Reset context
RESET app.current_tenant_id;
SELECT COUNT(*) FROM sessions;  -- Returns 0 (FORCE RLS blocks access without tenant context)
```

For complete documentation including:
- All 56 policy definitions
- Indirect tenant-scoped tables (via foreign keys)
- Common pitfalls and solutions
- Testing procedures
- Future improvements

See `rls-policies.md` and `migrations.md`.

---

## 📊 Common Query Patterns

### Paginated Session List

```typescript
// packages/api-contract/src/routers/sessions.ts
export const listSessions = tenantProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
      widgetId: z.string().uuid().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    const { limit, cursor, widgetId } = input;

    const sessions = await ctx.db.query.sessions.findMany({
      where: (sessions, { eq, and, lt }) => {
        const conditions = [eq(sessions.tenantId, ctx.tenantId!)];
        if (cursor) {
          conditions.push(lt(sessions.createdAt, cursor));
        }
        if (widgetId) {
          conditions.push(eq(sessions.widgetId, widgetId));
        }
        return and(...conditions);
      },
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
      limit: limit + 1,
    });

    let nextCursor: string | undefined;
    if (sessions.length > limit) {
      const nextItem = sessions.pop();
      nextCursor = nextItem!.id;
    }

    return {
      sessions,
      nextCursor,
    };
  });
```

### Vector Search with Hybrid Ranking

```typescript
// packages/rag/src/search.ts
import { db } from '@platform/database';
import { sql } from 'drizzle-orm';

export async function hybridSearch({
  query,
  queryEmbedding,
  tenantId,
  limit = 10,
}: {
  query: string;
  queryEmbedding: number[];
  tenantId: string;
  limit?: number;
}) {
  // Stage 1: Hybrid retrieval (vector + keyword)
  const results = await db.execute(sql`
    WITH vector_search AS (
      SELECT
        id,
        title,
        content,
        1 - (embedding <=> ${queryEmbedding}::vector) AS vector_score
      FROM knowledge_documents
      WHERE tenant_id = ${tenantId}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT 30
    ),
    keyword_search AS (
      SELECT
        id,
        title,
        content,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) AS keyword_score
      FROM knowledge_documents
      WHERE tenant_id = ${tenantId}
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY keyword_score DESC
      LIMIT 30
    ),
    combined AS (
      SELECT
        COALESCE(v.id, k.id) AS id,
        COALESCE(v.title, k.title) AS title,
        COALESCE(v.content, k.content) AS content,
        COALESCE(v.vector_score, 0) * 0.6 + COALESCE(k.keyword_score, 0) * 0.4 AS combined_score
      FROM vector_search v
      FULL OUTER JOIN keyword_search k ON v.id = k.id
    )
    SELECT * FROM combined
    ORDER BY combined_score DESC
    LIMIT ${limit}
  `);

  return results;
}
```

### Cost Aggregation

```typescript
// packages/api-contract/src/routers/analytics.ts
export const getCostSummary = tenantProcedure
  .input(
    z.object({
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    })
  )
  .query(async ({ input, ctx }) => {
    const { startDate, endDate, groupBy } = input;

    const results = await ctx.db
      .select({
        date: sql`date_trunc(${groupBy}, timestamp)`,
        service: costEvents.service,
        totalCost: sql`SUM(cost_usd)`,
        totalTokens: sql`SUM(tokens_used)`,
      })
      .from(costEvents)
      .where(
        and(
          eq(costEvents.tenantId, ctx.tenantId!),
          gte(costEvents.timestamp, startDate),
          lte(costEvents.timestamp, endDate)
        )
      )
      .groupBy(sql`date_trunc(${groupBy}, timestamp)`, costEvents.service)
      .orderBy(sql`date_trunc(${groupBy}, timestamp)`);

    return results;
  });
```

---

## 🌱 Seed Data

**Status**: ✅ Implemented with RLS handling

> **⚠️ RLS SEEDING STRATEGY**: FORCE RLS blocks all operations (even superuser), including seeding. Solution: Temporarily disable FORCE RLS during seeding, then restore.

### Seeding Process

```bash
# 1. Disable FORCE RLS (allows seeding)
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql

# 2. Run seed script
pnpm db:seed

# 3. Restore FORCE RLS (CRITICAL for production security!)
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

### Seed Implementation

```typescript
// packages/db/src/seed.ts
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema/index';

export async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Set placeholder tenant ID to satisfy RLS policies during seeding
    // Required because FORCE RLS is enabled on all tables
    // Use SET SESSION (not SET LOCAL) since we're not in an explicit transaction
    const placeholderTenantId = '00000000-0000-0000-0000-000000000000';
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${placeholderTenantId}'`));
    console.log('✅ Set placeholder tenant context');

    // Create demo tenant (INSERT policy allows this without tenant context)
    const tenantResult = await db
      .insert(schema.tenants)
      .values({
        name: 'Acme Corporation',
        apiKey: `pk_test_${crypto.randomBytes(16).toString('hex')}`,
        plan: 'business',
        settings: {
          maxMonthlySpend: 1000,
          allowedDomains: ['https://acme.com'],
          features: ['chat', 'meetings', 'knowledge-base'],
        },
      })
      .returning();

    const tenant = tenantResult[0];
    console.log('✅ Created tenant:', tenant.id);

    // Update session variable to the actual tenant ID for subsequent inserts
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenant.id}'`));
    console.log('✅ Updated tenant context to:', tenant.id);

    // Create demo user
    // NOTE: In production, users will authenticate via OAuth (Google/Microsoft)
    // Password hash only needed for development/testing
    const hashedPassword = crypto.createHash('sha256').update('password123').digest('hex');

    const userResult = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'admin@acme.com',
        passwordHash: hashedPassword,
        role: 'owner',
        name: 'John Doe',
      })
      .returning();

    const user = userResult[0];
    console.log('✅ Created user:', user.email);

    // Create demo Auth.js session (optional, for testing)
    const sessionToken = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days

    await db.insert(schema.authSessions).values({
      sessionToken,
      userId: user.id,
      expires: expiryDate,
    });

    console.log('✅ Created auth session');

    // Create demo widget
    const widgetResult = await db
      .insert(schema.widgets)
      .values({
        tenantId: tenant.id,
        name: 'Main Website Widget',
        domainWhitelist: ['https://acme.com', 'https://www.acme.com'],
        settings: {
          theme: 'auto',
          position: 'bottom-right',
          greeting: 'Hi! How can I help you today?',
        },
      })
      .returning();

    const widget = widgetResult[0];
    console.log('✅ Created widget:', widget.id);

    // Create demo knowledge document
    const docResult = await db
      .insert(schema.knowledgeDocuments)
      .values({
        tenantId: tenant.id,
        title: 'Getting Started Guide',
        content: 'Welcome to our platform! Here is how to get started with our AI assistant...',
        category: 'onboarding',
        metadata: {
          source: 'docs',
          tags: ['beginner', 'tutorial'],
        },
      })
      .returning();

    const doc = docResult[0];
    console.log('✅ Created knowledge document:', doc.id);

    // Create AI personality
    const personalityResult = await db
      .insert(schema.aiPersonalities)
      .values({
        tenantId: tenant.id,
        name: 'Helpful Assistant',
        description: 'A friendly and knowledgeable assistant',
        systemPrompt:
          'You are a helpful AI assistant for Acme Corporation. Be friendly, professional, and concise in your responses.',
        temperature: '0.7',
        maxTokens: 2000,
        isDefault: true,
        isActive: true,
      })
      .returning();

    const personality = personalityResult[0];
    console.log('✅ Created AI personality:', personality.id);

    console.log('🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
```

**Key Implementation Details**:
1. **Placeholder Tenant Context**: Set `app.current_tenant_id` to placeholder UUID before creating tenant
2. **Session Variable Update**: Update to actual tenant ID after tenant creation
3. **RLS-Aware**: Uses `sql.raw()` for SET SESSION commands (avoids parameterization issues)
4. **Error Handling**: Comprehensive try-catch with detailed logging
5. **ESM Compatibility**: Uses `import.meta.url` instead of `require.main`

---

## 🚀 Performance Optimization

### Connection Pooling

```typescript
// packages/database/src/client.ts
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout in seconds
  prepare: true, // Use prepared statements (faster)
});
```

### Query Performance Monitoring

```typescript
// Log slow queries
db.$on('query', (e) => {
  if (e.duration > 100) {
    console.warn(`Slow query (${e.duration}ms):`, e.query);
  }
});
```

### pgvector HNSW Parameters

```sql
-- m: Number of connections per layer (16 = good balance)
-- ef_construction: Build-time effort (64 = good quality)
-- ef_search: Search-time effort (set at query time)

CREATE INDEX knowledge_embedding_idx
  ON knowledge_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Query with custom ef_search:
SET hnsw.ef_search = 100;
SELECT * FROM knowledge_documents
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

---

## 📈 Monitoring Queries

```sql
-- View active queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- View slow queries (pg_stat_statements extension)
SELECT
  calls,
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- View index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## ✅ Schema Validation

```bash
# Validate schema against database
pnpm drizzle-kit check:pg

# View schema diff
pnpm drizzle-kit up:pg

# Introspect existing database
pnpm drizzle-kit introspect:pg
```

---

**Next**: See `05-DEVELOPMENT-SETUP.md` for local environment configuration.
