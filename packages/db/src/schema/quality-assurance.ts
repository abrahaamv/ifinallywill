/**
 * Phase 12 Week 9: Quality Assurance Schema
 *
 * Database schema for response review, hallucination detection, and quality metrics
 */

import { pgTable, uuid, timestamp, text, jsonb, integer, real, index } from 'drizzle-orm/pg-core';
import { tenants, sessions, messages, users } from './index';

/**
 * Quality reviews table
 *
 * Stores flagged responses for human review
 */
export const qaReviews = pgTable(
  'qa_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),

    // Flagging details
    flaggedAt: timestamp('flagged_at').notNull().defaultNow(),
    flaggedBy: text('flagged_by').notNull(), // 'system' | 'user' | 'admin'
    issueTypes: jsonb('issue_types').notNull(), // Array of QualityIssueType
    status: text('status').notNull().default('pending'), // 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_revision'
    priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'critical'

    // Response details
    originalResponse: text('original_response').notNull(),
    revisedResponse: text('revised_response'),
    context: jsonb('context').notNull(), // { userQuery, conversationHistory, ragSources }

    // Detection results
    hallucinationDetection: jsonb('hallucination_detection'), // HallucinationDetectionResult
    qualityScore: real('quality_score'), // 0-1

    // Review details
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewNotes: text('review_notes'),
    reviewDecision: text('review_decision'), // 'approve' | 'reject' | 'revise'

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('qa_reviews_tenant_idx').on(table.tenantId),
    messageIdx: index('qa_reviews_message_idx').on(table.messageId),
    sessionIdx: index('qa_reviews_session_idx').on(table.sessionId),
    statusIdx: index('qa_reviews_status_idx').on(table.status),
    priorityIdx: index('qa_reviews_priority_idx').on(table.priority),
    flaggedAtIdx: index('qa_reviews_flagged_at_idx').on(table.flaggedAt),
    reviewedByIdx: index('qa_reviews_reviewed_by_idx').on(table.reviewedBy),
  })
);

/**
 * Quality metrics table
 *
 * Aggregated quality metrics for reporting
 */
export const qaMetrics = pgTable(
  'qa_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Time period
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),

    // Response counts
    totalResponses: integer('total_responses').notNull().default(0),
    flaggedResponses: integer('flagged_responses').notNull().default(0),
    flagRate: real('flag_rate').notNull().default(0), // percentage

    // Issue breakdown
    issueBreakdown: jsonb('issue_breakdown').notNull(), // Record<QualityIssueType, number>

    // Review outcomes
    approved: integer('approved').notNull().default(0),
    rejected: integer('rejected').notNull().default(0),
    revised: integer('revised').notNull().default(0),

    // Quality scores
    averageQualityScore: real('average_quality_score'),
    hallucinationRate: real('hallucination_rate').notNull().default(0),

    // Performance
    averageReviewTime: integer('average_review_time'), // seconds
    pendingReviews: integer('pending_reviews').notNull().default(0),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('qa_metrics_tenant_idx').on(table.tenantId),
    periodIdx: index('qa_metrics_period_idx').on(table.periodStart, table.periodEnd),
  })
);

/**
 * Hallucination detection log
 *
 * Detailed log of hallucination detection results for analysis
 */
export const hallucinationDetections = pgTable(
  'hallucination_detections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    reviewId: uuid('review_id').references(() => qaReviews.id, { onDelete: 'cascade' }),

    // Detection details
    detectedAt: timestamp('detected_at').notNull().defaultNow(),
    isHallucination: integer('is_hallucination').notNull(), // 0 or 1 (boolean)
    confidence: real('confidence').notNull(), // 0-1
    reasons: jsonb('reasons').notNull(), // Array of strings
    evidence: jsonb('evidence').notNull(), // Array of evidence objects
    recommendation: text('recommendation').notNull(), // 'approve' | 'flag_for_review' | 'reject'

    // Context
    responseText: text('response_text').notNull(),
    contextSnapshot: jsonb('context_snapshot').notNull(), // RAG sources, conversation history

    // Configuration used
    detectionConfig: jsonb('detection_config').notNull(), // HallucinationDetectionConfig

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('hallucination_detections_tenant_idx').on(table.tenantId),
    messageIdx: index('hallucination_detections_message_idx').on(table.messageId),
    reviewIdx: index('hallucination_detections_review_idx').on(table.reviewId),
    detectedAtIdx: index('hallucination_detections_detected_at_idx').on(table.detectedAt),
    isHallucinationIdx: index('hallucination_detections_is_hallucination_idx').on(table.isHallucination),
    confidenceIdx: index('hallucination_detections_confidence_idx').on(table.confidence),
  })
);
