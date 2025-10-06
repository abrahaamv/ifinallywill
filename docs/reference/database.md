# Database Schema - Complete Drizzle ORM Design

## 🎯 Database Philosophy

**Principles**:
1. **Multi-tenant by default** - Every table filtered by `tenant_id`
2. **Type-safe** - Drizzle ORM with TypeScript inference
3. **Performance-optimized** - Strategic indexes, pgvector for embeddings
4. **Scalable** - Partitioning-ready, connection pooling
5. **Audit-ready** - Timestamps, soft deletes where needed

**Technology**: PostgreSQL 16 + pgvector + Drizzle ORM

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
  sessions: many(luciaSessions),
}));

// ==================== LUCIA AUTH SESSIONS ====================

export const luciaSessions = pgTable('lucia_sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const luciaSessionsRelations = relations(luciaSessions, ({ one }) => ({
  user: one(users, {
    fields: [luciaSessions.userId],
    references: [users.id],
  }),
}));

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

```typescript
// packages/database/src/schema/indexes.ts
import { index } from 'drizzle-orm/pg-core';
import * as schema from './index';

// Tenant lookups
export const tenantApiKeyIdx = index('tenant_api_key_idx').on(
  schema.tenants.apiKey
);

// User queries
export const userEmailIdx = index('user_email_idx').on(schema.users.email);
export const userTenantIdx = index('user_tenant_idx').on(schema.users.tenantId);

// Session queries (most frequent)
export const sessionTenantIdx = index('session_tenant_idx').on(
  schema.sessions.tenantId
);
export const sessionWidgetIdx = index('session_widget_idx').on(
  schema.sessions.widgetId
);
export const sessionMeetingIdx = index('session_meeting_idx').on(
  schema.sessions.meetingId
);
export const sessionCreatedAtIdx = index('session_created_at_idx').on(
  schema.sessions.createdAt
);

// Message queries (high volume)
export const messageSessionIdx = index('message_session_idx').on(
  schema.messages.sessionId
);
export const messageTimestampIdx = index('message_timestamp_idx').on(
  schema.messages.timestamp
);

// Knowledge base vector search
export const knowledgeEmbeddingIdx = index('knowledge_embedding_idx')
  .using('hnsw')
  .on(schema.knowledgeDocuments.embedding)
  .with({ m: 16, ef_construction: 64 }); // HNSW parameters

export const knowledgeChunkEmbeddingIdx = index('knowledge_chunk_embedding_idx')
  .using('hnsw')
  .on(schema.knowledgeChunks.embedding)
  .with({ m: 16, ef_construction: 64 });

export const knowledgeTenantIdx = index('knowledge_tenant_idx').on(
  schema.knowledgeDocuments.tenantId
);

export const knowledgeCategoryIdx = index('knowledge_category_idx').on(
  schema.knowledgeDocuments.category
);

// Cost tracking queries
export const costTenantTimestampIdx = index('cost_tenant_timestamp_idx').on(
  schema.costEvents.tenantId,
  schema.costEvents.timestamp
);

export const costSessionIdx = index('cost_session_idx').on(
  schema.costEvents.sessionId
);

// Cost summaries queries (period-based reporting)
export const costSummaryTenantPeriodIdx = index('cost_summary_tenant_period_idx').on(
  schema.costSummaries.tenantId,
  schema.costSummaries.periodStart,
  schema.costSummaries.periodEnd
);

// Budget alerts queries (active monitoring)
export const budgetAlertTenantIdx = index('budget_alert_tenant_idx').on(
  schema.budgetAlerts.tenantId
);

export const budgetAlertActiveIdx = index('budget_alert_active_idx').on(
  schema.budgetAlerts.tenantId,
  schema.budgetAlerts.resolved
);

export const budgetAlertTriggeredIdx = index('budget_alert_triggered_idx').on(
  schema.budgetAlerts.triggeredAt
);

// AI personalities queries (configuration lookups)
export const aiPersonalityTenantIdx = index('ai_personality_tenant_idx').on(
  schema.aiPersonalities.tenantId
);

export const aiPersonalityDefaultIdx = index('ai_personality_default_idx').on(
  schema.aiPersonalities.tenantId,
  schema.aiPersonalities.isDefault,
  schema.aiPersonalities.isActive
);
```

---

## 🔄 Migration Strategy

### Drizzle Kit Configuration

```typescript
// drizzle.config.ts (root)
import type { Config } from 'drizzle-kit';
import { env } from './env';

export default {
  schema: './packages/database/src/schema/*.ts',
  out: './packages/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Generate Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Apply migrations to database
pnpm drizzle-kit push:pg

# View current schema
pnpm drizzle-kit introspect:pg
```

### Migration File Example

```sql
-- packages/database/migrations/0001_initial_schema.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "api_key" TEXT NOT NULL UNIQUE,
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "settings" JSONB,
  "stripe_customer_id" TEXT UNIQUE,
  "stripe_subscription_id" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "name" TEXT,
  "avatar_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Continue for all tables...

-- Create indexes
CREATE INDEX "tenant_api_key_idx" ON "tenants"("api_key");
CREATE INDEX "user_email_idx" ON "users"("email");
CREATE INDEX "user_tenant_idx" ON "users"("tenant_id");

-- Vector indexes (HNSW for fast approximate nearest neighbor search)
CREATE INDEX "knowledge_embedding_idx"
  ON "knowledge_documents"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## 🔐 Multi-Tenancy Enforcement

### Context-Based Filtering

```typescript
// packages/database/src/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// Tenant-scoped database context
export function createTenantDb(tenantId: string) {
  return {
    query: {
      // Override query methods to auto-filter by tenant
      sessions: {
        findMany: async (config?: any) => {
          return db.query.sessions.findMany({
            ...config,
            where: (sessions, { eq, and }) => {
              const conditions = [eq(sessions.tenantId, tenantId)];
              if (config?.where) {
                conditions.push(config.where(sessions, { eq, and }));
              }
              return and(...conditions);
            },
          });
        },
        // ... other methods
      },
      // ... other tables
    },
    // Raw query access (use with caution)
    raw: db,
  };
}

// Usage in tRPC context:
export async function createContext({ req }: FetchCreateContextFnOptions) {
  const tenantId = await extractTenantId(req);

  return {
    db: tenantId ? createTenantDb(tenantId) : db,
    tenantId,
    // ... other context
  };
}
```

### Row-Level Security (PostgreSQL RLS)

```sql
-- Enable RLS on tenants table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's sessions
CREATE POLICY tenant_isolation ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set tenant context in application:
-- SET app.current_tenant_id = 'tenant-uuid-here';
```

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

```typescript
// packages/database/src/seed.ts
import { db } from './client';
import * as schema from './schema';
import { Argon2id } from 'oslo/password';

export async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Acme Corporation',
      apiKey: 'pk_test_acme_1234567890',
      plan: 'business',
      settings: {
        maxMonthlySpend: 1000,
        allowedDomains: ['https://acme.com'],
      },
    })
    .returning();

  console.log('✅ Created tenant:', tenant.id);

  // Create demo user
  const hashedPassword = await new Argon2id().hash('password123');

  const [user] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      email: 'admin@acme.com',
      passwordHash: hashedPassword,
      role: 'owner',
      name: 'John Doe',
    })
    .returning();

  console.log('✅ Created user:', user.email);

  // Create demo widget
  const [widget] = await db
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

  console.log('✅ Created widget:', widget.id);

  // Create demo knowledge document
  const [doc] = await db
    .insert(schema.knowledgeDocuments)
    .values({
      tenantId: tenant.id,
      title: 'Getting Started Guide',
      content: 'Welcome to our platform! Here is how to get started...',
      category: 'onboarding',
      metadata: {
        source: 'docs',
        tags: ['beginner', 'tutorial'],
      },
    })
    .returning();

  console.log('✅ Created knowledge document:', doc.id);

  console.log('🎉 Seeding complete!');
}

// Run: pnpm db:seed
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
```

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
