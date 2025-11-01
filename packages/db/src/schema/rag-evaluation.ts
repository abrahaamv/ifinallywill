/**
 * RAG Evaluation Schema (Phase 12 Week 4)
 * RAGAS metrics for quality assurance and regression detection
 */

import { relations } from 'drizzle-orm';
import {
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './index';

// ==================== RAG EVALUATION RUNS ====================

export const ragEvaluationRuns = pgTable('rag_evaluation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Evaluation metadata
  evaluationType: text('evaluation_type', {
    enum: ['automated', 'manual', 'regression', 'baseline'],
  }).notNull(),

  configSnapshot: jsonb('config_snapshot').$type<{
    retrieverType: string; // 'hybrid', 'semantic', 'bm25'
    rerankingEnabled: boolean;
    small2bigEnabled: boolean;
    topK: number;
    model: string;
  }>().notNull(),

  // Status tracking
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed'],
  }).notNull().default('pending'),

  // Aggregate scores
  avgFaithfulness: decimal('avg_faithfulness', { precision: 5, scale: 4 }),
  avgAnswerRelevancy: decimal('avg_answer_relevancy', { precision: 5, scale: 4 }),
  avgContextPrecision: decimal('avg_context_precision', { precision: 5, scale: 4 }),
  avgContextRecall: decimal('avg_context_recall', { precision: 5, scale: 4 }),

  // Overall metrics
  totalQueries: integer('total_queries').notNull().default(0),
  successfulEvaluations: integer('successful_evaluations').notNull().default(0),
  failedEvaluations: integer('failed_evaluations').notNull().default(0),

  // Regression detection
  isRegression: text('is_regression', {
    enum: ['no', 'warning', 'critical'],
  }).default('no'),
  baselineRunId: uuid('baseline_run_id').references((): any => ragEvaluationRuns.id, {
    onDelete: 'set null',
  }),
  regressionThreshold: decimal('regression_threshold', { precision: 5, scale: 4 }).default('0.05'), // 5% degradation

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  metadata: jsonb('metadata').$type<{
    triggeredBy?: string; // 'manual', 'ci', 'scheduled'
    gitCommit?: string;
    environment?: string;
    notes?: string;
  }>(),
});

export const ragEvaluationRunsRelations = relations(ragEvaluationRuns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [ragEvaluationRuns.tenantId],
    references: [tenants.id],
  }),
  baselineRun: one(ragEvaluationRuns, {
    fields: [ragEvaluationRuns.baselineRunId],
    references: [ragEvaluationRuns.id],
  }),
  evaluations: many(ragEvaluations),
}));

// ==================== RAG EVALUATIONS ====================

export const ragEvaluations = pgTable('rag_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => ragEvaluationRuns.id, { onDelete: 'cascade' }),

  // Query and response
  query: text('query').notNull(),
  retrievedContext: jsonb('retrieved_context').$type<Array<{
    content: string;
    score: number;
    documentId: string;
  }>>().notNull(),
  generatedAnswer: text('generated_answer').notNull(),
  groundTruth: text('ground_truth'), // Optional reference answer for validation

  // RAGAS metrics (0.0 - 1.0 scale)
  faithfulness: decimal('faithfulness', { precision: 5, scale: 4 }),
  answerRelevancy: decimal('answer_relevancy', { precision: 5, scale: 4 }),
  contextPrecision: decimal('context_precision', { precision: 5, scale: 4 }),
  contextRecall: decimal('context_recall', { precision: 5, scale: 4 }),

  // Composite score
  compositeScore: decimal('composite_score', { precision: 5, scale: 4 }),

  // Detailed analysis
  faithfulnessDetails: jsonb('faithfulness_details').$type<{
    claims: string[];
    supportedClaims: number;
    totalClaims: number;
    unsupportedClaims?: string[];
  }>(),

  relevancyDetails: jsonb('relevancy_details').$type<{
    queryKeywords: string[];
    matchedKeywords: number;
    semanticSimilarity: number;
  }>(),

  precisionDetails: jsonb('precision_details').$type<{
    relevantChunks: number;
    totalChunks: number;
    irrelevantIndices: number[];
  }>(),

  recallDetails: jsonb('recall_details').$type<{
    requiredConcepts: string[];
    coveredConcepts: number;
    missingConcepts?: string[];
  }>(),

  // Performance metrics
  retrievalTimeMs: integer('retrieval_time_ms'),
  generationTimeMs: integer('generation_time_ms'),
  totalTimeMs: integer('total_time_ms'),

  // Cost tracking
  evaluationCostUsd: decimal('evaluation_cost_usd', { precision: 10, scale: 6 }),

  // Status
  status: text('status', {
    enum: ['success', 'failed', 'partial'],
  }).notNull(),
  errorMessage: text('error_message'),

  evaluatedAt: timestamp('evaluated_at').notNull().defaultNow(),
});

export const ragEvaluationsRelations = relations(ragEvaluations, ({ one }) => ({
  run: one(ragEvaluationRuns, {
    fields: [ragEvaluations.runId],
    references: [ragEvaluationRuns.id],
  }),
}));

// ==================== RAG TEST SETS ====================

export const ragTestSets = pgTable('rag_test_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description'),

  testCases: jsonb('test_cases').$type<Array<{
    query: string;
    expectedContext?: string[];
    expectedAnswer?: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>>().notNull(),

  isActive: text('is_active').notNull().default('true'),

  // Usage tracking
  totalRuns: integer('total_runs').notNull().default(0),
  lastRunId: uuid('last_run_id').references(() => ragEvaluationRuns.id, {
    onDelete: 'set null',
  }),
  lastRunAt: timestamp('last_run_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  metadata: jsonb('metadata').$type<{
    tags?: string[];
    source?: string;
    createdBy?: string;
  }>(),
});

export const ragTestSetsRelations = relations(ragTestSets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ragTestSets.tenantId],
    references: [tenants.id],
  }),
  lastRun: one(ragEvaluationRuns, {
    fields: [ragTestSets.lastRunId],
    references: [ragEvaluationRuns.id],
  }),
}));

// ==================== RAG QUALITY THRESHOLDS ====================

export const ragQualityThresholds = pgTable('rag_quality_thresholds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Threshold configuration
  minFaithfulness: decimal('min_faithfulness', { precision: 5, scale: 4 }).notNull().default('0.8'),
  minAnswerRelevancy: decimal('min_answer_relevancy', { precision: 5, scale: 4 }).notNull().default('0.7'),
  minContextPrecision: decimal('min_context_precision', { precision: 5, scale: 4 }).notNull().default('0.6'),
  minContextRecall: decimal('min_context_recall', { precision: 5, scale: 4 }).notNull().default('0.7'),
  minCompositeScore: decimal('min_composite_score', { precision: 5, scale: 4 }).notNull().default('0.75'),

  // Alerting configuration
  enableAlerts: text('enable_alerts').notNull().default('true'),
  alertChannels: jsonb('alert_channels').$type<{
    email?: string[];
    slack?: string;
    webhook?: string;
  }>(),

  // Environment
  environment: text('environment', {
    enum: ['development', 'staging', 'production'],
  }).notNull().default('production'),

  isActive: text('is_active').notNull().default('true'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const ragQualityThresholdsRelations = relations(ragQualityThresholds, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ragQualityThresholds.tenantId],
    references: [tenants.id],
  }),
}));
