/**
 * Phase 12 Week 11: CRAG (Corrective RAG) Database Schema
 *
 * Stores query evaluations, refinements, multi-hop reasoning, and CRAG responses.
 */

import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, integer, real, boolean, index } from 'drizzle-orm/pg-core';
import { tenants, users, sessions, messages } from './index';

/**
 * CRAG Evaluations - Query confidence scoring and analysis
 */
export const cragEvaluations = pgTable(
	'crag_evaluations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id),
		sessionId: uuid('session_id').references(() => sessions.id),
		messageId: uuid('message_id').references(() => messages.id),

		// Query information
		queryId: text('query_id').notNull().unique(),
		originalQuery: text('original_query').notNull(),

		// Confidence scoring
		confidence: real('confidence').notNull(), // 0-1 scale
		confidenceLevel: text('confidence_level').notNull(), // 'high' | 'medium' | 'low' | 'very_low'

		// Evaluation results
		shouldRefine: boolean('should_refine').notNull().default(false),
		shouldUseMultiHop: boolean('should_use_multi_hop').notNull().default(false),
		reasoningType: text('reasoning_type').notNull(), // 'single_hop' | 'multi_hop' | 'comparative' | etc.

		// Issues detected
		issues: jsonb('issues')
			.notNull()
			.$type<
				Array<{
					type: 'ambiguous' | 'too_broad' | 'too_narrow' | 'out_of_scope' | 'spelling_error';
					description: string;
					severity: 'low' | 'medium' | 'high';
				}>
			>(),

		// Refinement recommendations
		recommendations: jsonb('recommendations').notNull().$type<string[]>(),

		// Metadata
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		evaluatedBy: uuid('evaluated_by').references(() => users.id),
	},
	(table) => ({
		tenantIdx: index('crag_evaluations_tenant_idx').on(table.tenantId),
		sessionIdx: index('crag_evaluations_session_idx').on(table.sessionId),
		queryIdIdx: index('crag_evaluations_query_id_idx').on(table.queryId),
		confidenceIdx: index('crag_evaluations_confidence_idx').on(table.confidence),
		createdAtIdx: index('crag_evaluations_created_at_idx').on(table.createdAt),
	}),
);

/**
 * Query Refinements - History of query refinement attempts
 */
export const queryRefinements = pgTable(
	'query_refinements',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id),
		evaluationId: uuid('evaluation_id')
			.notNull()
			.references(() => cragEvaluations.id),

		// Refinement details
		originalQuery: text('original_query').notNull(),
		refinedQuery: text('refined_query').notNull(),
		strategy: text('strategy').notNull(), // RefinementStrategy enum
		attemptNumber: integer('attempt_number').notNull().default(1),

		// Sub-queries (for decomposition)
		subQueries: jsonb('sub_queries').$type<string[]>(),

		// Context added
		context: jsonb('context').$type<Record<string, string>>(),

		// Results
		confidence: real('confidence').notNull(),
		confidenceImprovement: real('confidence_improvement'),
		reasoning: text('reasoning').notNull(),
		success: boolean('success').notNull().default(true),

		// Metadata
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('query_refinements_tenant_idx').on(table.tenantId),
		evaluationIdx: index('query_refinements_evaluation_idx').on(table.evaluationId),
		strategyIdx: index('query_refinements_strategy_idx').on(table.strategy),
		createdAtIdx: index('query_refinements_created_at_idx').on(table.createdAt),
	}),
);

/**
 * Reasoning Steps - Multi-hop reasoning step history
 */
export const reasoningSteps = pgTable(
	'reasoning_steps',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id),
		evaluationId: uuid('evaluation_id')
			.notNull()
			.references(() => cragEvaluations.id),

		// Step information
		stepNumber: integer('step_number').notNull(),
		query: text('query').notNull(),

		// Retrieved documents
		retrievedDocuments: jsonb('retrieved_documents')
			.notNull()
			.$type<
				Array<{
					documentId: string;
					content: string;
					score: number;
				}>
			>(),

		// Step results
		intermediateAnswer: text('intermediate_answer').notNull(),
		confidence: real('confidence').notNull(),
		reasoning: text('reasoning').notNull(),

		// Metadata
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('reasoning_steps_tenant_idx').on(table.tenantId),
		evaluationIdx: index('reasoning_steps_evaluation_idx').on(table.evaluationId),
		stepNumberIdx: index('reasoning_steps_step_number_idx').on(table.stepNumber),
		createdAtIdx: index('reasoning_steps_created_at_idx').on(table.createdAt),
	}),
);

/**
 * CRAG Responses - Complete CRAG processing results
 */
export const cragResponses = pgTable(
	'crag_responses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id),
		sessionId: uuid('session_id').references(() => sessions.id),
		messageId: uuid('message_id').references(() => messages.id),
		evaluationId: uuid('evaluation_id')
			.notNull()
			.references(() => cragEvaluations.id),

		// Query information
		queryId: text('query_id').notNull(),
		originalQuery: text('original_query').notNull(),

		// Response
		finalAnswer: text('final_answer').notNull(),
		confidence: real('confidence').notNull(),

		// Sources used
		sources: jsonb('sources')
			.notNull()
			.$type<
				Array<{
					documentId: string;
					content: string;
					score: number;
				}>
			>(),

		// Processing flags
		correctionApplied: boolean('correction_applied').notNull().default(false),
		qualityCheckPassed: boolean('quality_check_passed').notNull().default(true),

		// Performance metadata
		processingTime: integer('processing_time').notNull(), // milliseconds
		retrievalCount: integer('retrieval_count').notNull(),
		refinementAttempts: integer('refinement_attempts').notNull().default(0),
		reasoningSteps: integer('reasoning_steps').notNull().default(0),

		// Multi-hop result summary
		multiHopResult: jsonb('multi_hop_result').$type<{
			reasoningType: string;
			finalAnswer: string;
			overallConfidence: number;
			supportingEvidence: Array<{
				documentId: string;
				content: string;
				relevance: number;
			}>;
		}>(),

		// Metadata
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('crag_responses_tenant_idx').on(table.tenantId),
		sessionIdx: index('crag_responses_session_idx').on(table.sessionId),
		evaluationIdx: index('crag_responses_evaluation_idx').on(table.evaluationId),
		queryIdIdx: index('crag_responses_query_id_idx').on(table.queryId),
		confidenceIdx: index('crag_responses_confidence_idx').on(table.confidence),
		qualityCheckIdx: index('crag_responses_quality_check_idx').on(table.qualityCheckPassed),
		createdAtIdx: index('crag_responses_created_at_idx').on(table.createdAt),
	}),
);

/**
 * CRAG Metrics - Aggregated performance metrics
 */
export const cragMetrics = pgTable(
	'crag_metrics',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id),

		// Time period
		periodStart: timestamp('period_start').notNull(),
		periodEnd: timestamp('period_end').notNull(),

		// Query statistics
		totalQueries: integer('total_queries').notNull().default(0),
		averageConfidence: real('average_confidence'),
		highConfidenceRate: real('high_confidence_rate').notNull().default(0),
		refinementRate: real('refinement_rate').notNull().default(0),
		multiHopRate: real('multi_hop_rate').notNull().default(0),

		// Performance metrics
		averageProcessingTime: integer('average_processing_time'), // milliseconds
		averageRetrievalCount: real('average_retrieval_count'),
		averageRefinementAttempts: real('average_refinement_attempts'),
		averageReasoningSteps: real('average_reasoning_steps'),

		// Quality metrics
		qualityCheckPassRate: real('quality_check_pass_rate').notNull().default(0),
		correctionAppliedRate: real('correction_applied_rate').notNull().default(0),

		// Reasoning type breakdown
		reasoningTypeBreakdown: jsonb('reasoning_type_breakdown').$type<
			Record<string, { count: number; percentage: number }>
		>(),

		// Refinement strategy breakdown
		refinementStrategyBreakdown: jsonb('refinement_strategy_breakdown').$type<
			Record<string, { count: number; percentage: number; avgConfidenceImprovement: number }>
		>(),

		// Metadata
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('crag_metrics_tenant_idx').on(table.tenantId),
		periodIdx: index('crag_metrics_period_idx').on(table.periodStart, table.periodEnd),
		createdAtIdx: index('crag_metrics_created_at_idx').on(table.createdAt),
	}),
);

// Relations
export const cragEvaluationsRelations = relations(cragEvaluations, ({ one, many }) => ({
	tenant: one(tenants, {
		fields: [cragEvaluations.tenantId],
		references: [tenants.id],
	}),
	session: one(sessions, {
		fields: [cragEvaluations.sessionId],
		references: [sessions.id],
	}),
	message: one(messages, {
		fields: [cragEvaluations.messageId],
		references: [messages.id],
	}),
	refinements: many(queryRefinements),
	reasoningSteps: many(reasoningSteps),
	responses: many(cragResponses),
}));

export const queryRefinementsRelations = relations(queryRefinements, ({ one }) => ({
	tenant: one(tenants, {
		fields: [queryRefinements.tenantId],
		references: [tenants.id],
	}),
	evaluation: one(cragEvaluations, {
		fields: [queryRefinements.evaluationId],
		references: [cragEvaluations.id],
	}),
}));

export const reasoningStepsRelations = relations(reasoningSteps, ({ one }) => ({
	tenant: one(tenants, {
		fields: [reasoningSteps.tenantId],
		references: [tenants.id],
	}),
	evaluation: one(cragEvaluations, {
		fields: [reasoningSteps.evaluationId],
		references: [cragEvaluations.id],
	}),
}));

export const cragResponsesRelations = relations(cragResponses, ({ one }) => ({
	tenant: one(tenants, {
		fields: [cragResponses.tenantId],
		references: [tenants.id],
	}),
	session: one(sessions, {
		fields: [cragResponses.sessionId],
		references: [sessions.id],
	}),
	message: one(messages, {
		fields: [cragResponses.messageId],
		references: [messages.id],
	}),
	evaluation: one(cragEvaluations, {
		fields: [cragResponses.evaluationId],
		references: [cragEvaluations.id],
	}),
}));

export const cragMetricsRelations = relations(cragMetrics, ({ one }) => ({
	tenant: one(tenants, {
		fields: [cragMetrics.tenantId],
		references: [tenants.id],
	}),
}));
