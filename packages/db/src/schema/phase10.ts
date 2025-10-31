/**
 * Phase 10 AI Enhancements Schema
 * Cache statistics, reranking, clustering, and memory persistence
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, integer, decimal, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { tenants, users, sessions } from './index';

/**
 * Reranking Events
 * Tracks Cohere reranking usage and performance
 */
export const rerankingEvents = pgTable(
  'reranking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    query: text('query').notNull(),
    documentCount: integer('document_count').notNull(),
    topN: integer('top_n').notNull(),
    model: varchar('model', { length: 100 }).notNull().default('rerank-v3.5'),
    relevanceScores: jsonb('relevance_scores').notNull(),
    processingTimeMs: integer('processing_time_ms').notNull(),
    cost: decimal('cost', { precision: 10, scale: 6 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_reranking_events_tenant_id').on(table.tenantId),
    sessionIdIdx: index('idx_reranking_events_session_id').on(table.sessionId),
    createdAtIdx: index('idx_reranking_events_created_at').on(table.createdAt),
    tenantDateIdx: index('idx_reranking_events_tenant_date').on(table.tenantId, table.createdAt),
  })
);

/**
 * Knowledge Gaps
 * DBSCAN clustering results for knowledge base gap detection
 */
export const knowledgeGaps = pgTable(
  'knowledge_gaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    clusterId: integer('cluster_id').notNull(),
    representativeQueries: jsonb('representative_queries').notNull(),
    importance: decimal('importance', { precision: 3, scale: 2 }).notNull(),
    suggestedTopics: jsonb('suggested_topics').notNull(),
    queryCount: integer('query_count').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('identified'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_knowledge_gaps_tenant_id').on(table.tenantId),
    importanceIdx: index('idx_knowledge_gaps_importance').on(table.importance),
    statusIdx: index('idx_knowledge_gaps_status').on(table.status),
    createdAtIdx: index('idx_knowledge_gaps_created_at').on(table.createdAt),
    tenantStatusIdx: index('idx_knowledge_gaps_tenant_status').on(table.tenantId, table.status, table.importance),
  })
);

/**
 * Conversation Memory
 * LlamaIndex conversation memory persistence
 */
export const conversationMemory = pgTable(
  'conversation_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    messages: jsonb('messages').notNull(),
    summary: text('summary'),
    tokenCount: integer('token_count').notNull().default(0),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('idx_conversation_memory_tenant_id').on(table.tenantId),
    sessionIdIdx: index('idx_conversation_memory_session_id').on(table.sessionId),
    lastUpdatedIdx: index('idx_conversation_memory_last_updated').on(table.lastUpdated),
    // Ensure one memory record per session
    sessionUnique: unique('conversation_memory_session_unique').on(table.sessionId),
  })
);

// Relations
export const rerankingEventsRelations = relations(rerankingEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rerankingEvents.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [rerankingEvents.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [rerankingEvents.sessionId],
    references: [sessions.id],
  }),
}));

export const knowledgeGapsRelations = relations(knowledgeGaps, ({ one }) => ({
  tenant: one(tenants, {
    fields: [knowledgeGaps.tenantId],
    references: [tenants.id],
  }),
}));

export const conversationMemoryRelations = relations(conversationMemory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [conversationMemory.tenantId],
    references: [tenants.id],
  }),
  session: one(sessions, {
    fields: [conversationMemory.sessionId],
    references: [sessions.id],
  }),
}));

// Type exports
export type RerankingEvent = typeof rerankingEvents.$inferSelect;
export type NewRerankingEvent = typeof rerankingEvents.$inferInsert;

export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type NewKnowledgeGap = typeof knowledgeGaps.$inferInsert;

export type ConversationMemory = typeof conversationMemory.$inferSelect;
export type NewConversationMemory = typeof conversationMemory.$inferInsert;
