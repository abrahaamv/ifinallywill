/**
 * Phase 11 End User Engagement & Survey System Schema
 * End user verification, surveys, problem tracking, and escalations
 */

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { tenants, users, sessions, knowledgeDocuments } from './index';

/**
 * End Users Table
 * Separate from tenant admin users - these are widget/landing page visitors
 */
export const endUsers = pgTable(
  'end_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Contact information (user chooses phone OR email)
    phoneNumber: varchar('phone_number', { length: 20 }), // E.164 format
    phoneVerified: boolean('phone_verified').default(false),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),

    email: varchar('email', { length: 255 }),
    emailVerified: boolean('email_verified').default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

    // Identity (optional)
    name: varchar('name', { length: 255 }),
    externalId: varchar('external_id', { length: 255 }), // Tenant's CRM ID

    // Consent flags (GDPR/CCPA compliance)
    consentSms: boolean('consent_sms').default(false),
    consentEmail: boolean('consent_email').default(false),
    consentCalls: boolean('consent_calls').default(false),
    consentedAt: timestamp('consented_at', { withTimezone: true }),

    // Abuse prevention
    isBlocked: boolean('is_blocked').default(false),
    blockedReason: text('blocked_reason'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),

    // Device fingerprinting (FingerprintJS)
    deviceFingerprint: varchar('device_fingerprint', { length: 255 }),

    // Source tracking
    source: varchar('source', { length: 50 }).default('widget'), // 'widget', 'landing_demo'
    isPotentialTenant: boolean('is_potential_tenant').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_end_users_tenant').on(table.tenantId),
    phoneIdx: index('idx_end_users_phone').on(table.phoneNumber),
    emailIdx: index('idx_end_users_email').on(table.email),
    externalIdIdx: index('idx_end_users_external_id').on(table.tenantId, table.externalId),
    blockedIdx: index('idx_end_users_blocked').on(table.isBlocked),
    sourceIdx: index('idx_end_users_source').on(table.source, table.isPotentialTenant),
    deviceIdx: index('idx_end_users_device').on(table.deviceFingerprint),
    // Constraints
    validPhone: check('valid_phone', sql`phone_number IS NULL OR phone_number ~ '^\\+[1-9]\\d{1,14}$'`),
    validEmail: check('valid_email', sql`email IS NULL OR email ~ '^[^@]+@[^@]+\\.[^@]+$'`),
    atLeastOneContact: check('at_least_one_contact', sql`phone_number IS NOT NULL OR email IS NOT NULL`),
  })
);

/**
 * Survey Responses Table
 * Multi-tier survey system (in-widget, AI call, SMS, email)
 */
export const surveyResponses = pgTable(
  'survey_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    endUserId: uuid('end_user_id').references(() => endUsers.id, { onDelete: 'set null' }),
    resolutionId: uuid('resolution_id'), // Will reference resolutions table (if exists)

    // Survey method
    surveyMethod: varchar('survey_method', { length: 20 }).notNull(), // 'in_widget', 'ai_call', 'sms_link', 'email_link'
    fallbackAttempts: integer('fallback_attempts').default(0), // 0-3

    // Questions & answers
    problemSolved: boolean('problem_solved'),
    experienceRating: integer('experience_rating'), // 1-5 stars
    wouldRecommend: boolean('would_recommend'),
    feedbackText: text('feedback_text'),

    // Refusal tracking
    refusedToRate: boolean('refused_to_rate').default(false),

    // Metadata
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    callDurationSeconds: integer('call_duration_seconds'),
    callAnswered: boolean('call_answered'),
    callRecordingUrl: text('call_recording_url'),
    surveyCompleted: boolean('survey_completed').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_survey_responses_tenant').on(table.tenantId),
    sessionIdx: index('idx_survey_responses_session').on(table.sessionId),
    endUserIdx: index('idx_survey_responses_end_user').on(table.endUserId),
    methodIdx: index('idx_survey_responses_method').on(table.surveyMethod),
    completedIdx: index('idx_survey_responses_completed').on(table.surveyCompleted),
    ratingIdx: index('idx_survey_responses_rating').on(table.experienceRating),
    problemSolvedIdx: index('idx_survey_responses_problem_solved').on(table.problemSolved),
    // Constraints
    validRating: check(
      'valid_rating',
      sql`experience_rating BETWEEN 1 AND 5 OR experience_rating IS NULL`
    ),
    validMethod: check(
      'valid_method',
      sql`survey_method IN ('in_widget', 'ai_call', 'sms_link', 'email_link')`
    ),
  })
);

/**
 * Unresolved Problems Table
 * Semantic deduplication to prevent duplicate RAG content
 */
export const unresolvedProblems = pgTable(
  'unresolved_problems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Problem identification (semantic similarity)
    problemDescription: text('problem_description').notNull(),
    problemEmbedding: vector('problem_embedding', { dimensions: 1024 }), // Voyage Multimodal-3
    problemHash: varchar('problem_hash', { length: 64 }).notNull(), // SHA256

    // Tracking
    firstSessionId: uuid('first_session_id').references(() => sessions.id),
    lastSessionId: uuid('last_session_id').references(() => sessions.id),
    affectedUserCount: integer('affected_user_count').default(1),
    attemptCount: integer('attempt_count').default(1),

    // Status
    status: varchar('status', { length: 20 }).default('unresolved'), // 'unresolved', 'rag_updated', 'resolved'

    // AI-generated solution
    generatedSolutionDraft: text('generated_solution_draft'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),

    // Knowledge base integration
    knowledgeDocumentId: uuid('knowledge_document_id').references(() => knowledgeDocuments.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_unresolved_problems_tenant').on(table.tenantId),
    statusIdx: index('idx_unresolved_problems_status').on(table.status),
    hashIdx: index('idx_unresolved_problems_hash').on(table.tenantId, table.problemHash),
    knowledgeDocIdx: index('idx_unresolved_problems_knowledge_doc').on(
      table.knowledgeDocumentId
    ),
    // Vector similarity index - note: actual index created via SQL migration
    // CREATE INDEX idx_unresolved_problems_embedding ON unresolved_problems
    // USING ivfflat (problem_embedding vector_cosine_ops) WITH (lists = 100);
  })
);

/**
 * Unresolved Problem Users Table
 * Track which end users are blocked by which problems
 */
export const unresolvedProblemUsers = pgTable(
  'unresolved_problem_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => unresolvedProblems.id, { onDelete: 'cascade' }),
    endUserId: uuid('end_user_id')
      .notNull()
      .references(() => endUsers.id, { onDelete: 'cascade' }),

    firstBlockedAt: timestamp('first_blocked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    notifiedWhenResolved: boolean('notified_when_resolved').default(false),
  },
  (table) => ({
    endUserIdx: index('idx_unresolved_problem_users_end_user').on(table.endUserId),
    problemIdx: index('idx_unresolved_problem_users_problem').on(table.problemId),
    uniqueProblemUser: unique('unresolved_problem_users_problem_end_user_unique').on(
      table.problemId,
      table.endUserId
    ),
  })
);

/**
 * Escalations Table
 * Human agent escalation tracking and meeting URL generation
 */
export const escalations = pgTable(
  'escalations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    endUserId: uuid('end_user_id').references(() => endUsers.id, { onDelete: 'set null' }),

    // Escalation type
    escalationType: varchar('escalation_type', { length: 50 }).default('ai_failure'), // 'ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request'
    reason: text('reason'), // Escalation reason/description
    problemId: uuid('problem_id').references(() => unresolvedProblems.id, { onDelete: 'set null' }),

    // Phase 12: Ticketing integration fields
    subject: text('subject'), // Ticket subject line
    description: text('description'), // Full problem description
    category: varchar('category', { length: 100 }), // Problem category
    subcategory: varchar('subcategory', { length: 100 }), // Problem subcategory

    // Timing
    withinServiceHours: boolean('within_service_hours').default(true),
    scheduledFollowupAt: timestamp('scheduled_followup_at', { withTimezone: true }),

    // Human agent assignment
    humanAgentId: uuid('human_agent_id').references(() => users.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    humanAgentJoinedAt: timestamp('human_agent_joined_at', { withTimezone: true }),
    meetingUrl: text('meeting_url'), // meet.platform.com/{token}
    meetingToken: varchar('meeting_token', { length: 32 }),
    meetingDurationSeconds: integer('meeting_duration_seconds'),

    // Resolution
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),

    // Chatwoot Integration
    chatwootConversationId: integer('chatwoot_conversation_id'), // Chatwoot conversation ID
    chatwootContactId: integer('chatwoot_contact_id'), // Chatwoot contact ID

    // Metadata
    escalationMetadata: jsonb('escalation_metadata').$type<{
      sessionDuration?: number;
      attemptCount?: number;
      problemDescription?: string;
      aiModel?: string;
      [key: string]: unknown;
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_escalations_tenant').on(table.tenantId),
    sessionIdx: index('idx_escalations_session').on(table.sessionId),
    typeIdx: index('idx_escalations_type').on(table.escalationType),
    scheduledIdx: index('idx_escalations_scheduled').on(table.scheduledFollowupAt),
    humanAgentIdx: index('idx_escalations_human_agent').on(table.humanAgentId),
    unresolvedIdx: index('idx_escalations_unresolved').on(table.resolvedAt),
    chatwootConvIdx: index('idx_escalations_chatwoot_conv').on(table.chatwootConversationId),
    // Constraints
    validEscalationType: check(
      'valid_escalation_type',
      sql`escalation_type IN ('ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request')`
    ),
  })
);

// ==================== RELATIONS ====================

export const endUsersRelations = relations(endUsers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [endUsers.tenantId],
    references: [tenants.id],
  }),
  sessions: many(sessions),
  surveyResponses: many(surveyResponses),
  escalations: many(escalations),
  blockedProblems: many(unresolvedProblemUsers),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [surveyResponses.tenantId],
    references: [tenants.id],
  }),
  session: one(sessions, {
    fields: [surveyResponses.sessionId],
    references: [sessions.id],
  }),
  endUser: one(endUsers, {
    fields: [surveyResponses.endUserId],
    references: [endUsers.id],
  }),
}));

export const unresolvedProblemsRelations = relations(unresolvedProblems, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [unresolvedProblems.tenantId],
    references: [tenants.id],
  }),
  firstSession: one(sessions, {
    fields: [unresolvedProblems.firstSessionId],
    references: [sessions.id],
  }),
  lastSession: one(sessions, {
    fields: [unresolvedProblems.lastSessionId],
    references: [sessions.id],
  }),
  approver: one(users, {
    fields: [unresolvedProblems.approvedBy],
    references: [users.id],
  }),
  knowledgeDocument: one(knowledgeDocuments, {
    fields: [unresolvedProblems.knowledgeDocumentId],
    references: [knowledgeDocuments.id],
  }),
  blockedUsers: many(unresolvedProblemUsers),
}));

export const unresolvedProblemUsersRelations = relations(unresolvedProblemUsers, ({ one }) => ({
  problem: one(unresolvedProblems, {
    fields: [unresolvedProblemUsers.problemId],
    references: [unresolvedProblems.id],
  }),
  endUser: one(endUsers, {
    fields: [unresolvedProblemUsers.endUserId],
    references: [endUsers.id],
  }),
}));

export const escalationsRelations = relations(escalations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [escalations.tenantId],
    references: [tenants.id],
  }),
  session: one(sessions, {
    fields: [escalations.sessionId],
    references: [sessions.id],
  }),
  endUser: one(endUsers, {
    fields: [escalations.endUserId],
    references: [endUsers.id],
  }),
  humanAgent: one(users, {
    fields: [escalations.humanAgentId],
    references: [users.id],
  }),
}));

// ==================== TYPE EXPORTS ====================

export type EndUser = typeof endUsers.$inferSelect;
export type NewEndUser = typeof endUsers.$inferInsert;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;

export type UnresolvedProblem = typeof unresolvedProblems.$inferSelect;
export type NewUnresolvedProblem = typeof unresolvedProblems.$inferInsert;

export type UnresolvedProblemUser = typeof unresolvedProblemUsers.$inferSelect;
export type NewUnresolvedProblemUser = typeof unresolvedProblemUsers.$inferInsert;

export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;
