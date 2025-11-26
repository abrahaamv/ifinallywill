/**
 * Phase 12 Week 11: CRAG (Corrective RAG) Router
 *
 * tRPC router for CRAG pattern endpoints including query evaluation,
 * refinement, multi-hop reasoning, and metrics.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
	router,
	protectedProcedure,
	adminProcedure,
} from '../trpc';
import {
	cragEvaluations,
	queryRefinements,
	reasoningSteps,
	cragResponses,
	cragMetrics,
} from '@platform/db';
import {
	CRAGService,
	cragService,
	DEFAULT_CRAG_CONFIG,
	type CRAGConfig,
	type CRAGEvaluation,
	type QueryRefinement,
	type MultiHopResult,
	type CRAGResponse,
} from '../services/crag';

// Input schemas
const evaluateQuerySchema = z.object({
	query: z.string().min(1),
	context: z.record(z.string()).optional(),
	config: z
		.object({
			highConfidenceThreshold: z.number().min(0).max(1).optional(),
			mediumConfidenceThreshold: z.number().min(0).max(1).optional(),
			lowConfidenceThreshold: z.number().min(0).max(1).optional(),
		})
		.optional(),
});

const refineQuerySchema = z.object({
	evaluationId: z.string().uuid(),
	strategy: z
		.enum(['decomposition', 'clarification', 'expansion', 'simplification', 'contextualization', 'correction'])
		.optional(),
	context: z.record(z.string()).optional(),
});

const processQuerySchema = z.object({
	query: z.string().min(1),
	sessionId: z.string().uuid().optional(),
	context: z.record(z.string()).optional(),
	config: z
		.object({
			enableQueryRefinement: z.boolean().optional(),
			enableMultiHopReasoning: z.boolean().optional(),
			enableQualityCheck: z.boolean().optional(),
			maxRefinementAttempts: z.number().min(1).max(5).optional(),
			maxReasoningSteps: z.number().min(1).max(10).optional(),
		})
		.optional(),
});

const getMetricsSchema = z.object({
	periodStart: z.date(),
	periodEnd: z.date(),
	refreshCache: z.boolean().default(false),
});

const getDashboardSchema = z.object({
	period: z.enum(['today', 'week', 'month', 'quarter']).default('week'),
});

/**
 * CRAG Router - Corrective RAG endpoints
 */
export const cragRouter = router({
	/**
	 * Evaluate query confidence and get refinement recommendations
	 */
	evaluateQuery: protectedProcedure
		.input(evaluateQuerySchema)
		.mutation(async ({ ctx, input }) => {
			// Create CRAG service with custom config
			const service = new CRAGService(input.config);

			// Evaluate query
			const evaluation = await service.evaluateQuery(input.query, input.context);

			// Store evaluation in database
			const [storedEvaluation] = await ctx.db
				.insert(cragEvaluations)
				.values({
					tenantId: ctx.tenantId,
					queryId: evaluation.queryId,
					originalQuery: evaluation.originalQuery,
					confidence: evaluation.confidence,
					confidenceLevel: evaluation.confidenceLevel,
					shouldRefine: evaluation.shouldRefine,
					shouldUseMultiHop: evaluation.shouldUseMultiHop,
					reasoningType: evaluation.reasoningType,
					issues: evaluation.issues,
					recommendations: evaluation.recommendations,
					evaluatedBy: ctx.userId,
				})
				.returning();

			return {
				evaluationId: storedEvaluation.id,
				...evaluation,
			};
		}),

	/**
	 * Refine query based on evaluation
	 */
	refineQuery: protectedProcedure.input(refineQuerySchema).mutation(async ({ ctx, input }) => {
		// Fetch evaluation
		const evaluation = await ctx.db.query.cragEvaluations.findFirst({
			where: and(
				eq(cragEvaluations.id, input.evaluationId),
				eq(cragEvaluations.tenantId, ctx.tenantId),
			),
		});

		if (!evaluation) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Evaluation not found',
			});
		}

		// Create CRAG service
		const service = new CRAGService();

		// Convert stored evaluation to CRAGEvaluation
		const cragEvaluation: CRAGEvaluation = {
			queryId: evaluation.queryId,
			originalQuery: evaluation.originalQuery,
			confidence: evaluation.confidence,
			confidenceLevel: evaluation.confidenceLevel as any,
			shouldRefine: evaluation.shouldRefine,
			shouldUseMultiHop: evaluation.shouldUseMultiHop,
			reasoningType: evaluation.reasoningType as any,
			issues: evaluation.issues as any,
			recommendations: evaluation.recommendations as any,
			timestamp: evaluation.createdAt,
		};

		// Refine query
		const refinement = await service.refineQuery(
			evaluation.originalQuery,
			cragEvaluation,
			input.context,
		);

		// Get current attempt number
		const existingRefinements = await ctx.db.query.queryRefinements.findMany({
			where: and(
				eq(queryRefinements.evaluationId, input.evaluationId),
				eq(queryRefinements.tenantId, ctx.tenantId),
			),
		});

		const attemptNumber = existingRefinements.length + 1;

		// Store refinement
		const [storedRefinement] = await ctx.db
			.insert(queryRefinements)
			.values({
				tenantId: ctx.tenantId,
				evaluationId: input.evaluationId,
				originalQuery: refinement.originalQuery,
				refinedQuery: refinement.refinedQuery,
				strategy: refinement.strategy,
				attemptNumber,
				subQueries: refinement.subQueries,
				context: refinement.context,
				confidence: refinement.confidence,
				confidenceImprovement: refinement.confidence - evaluation.confidence,
				reasoning: refinement.reasoning,
				success: refinement.confidence > evaluation.confidence,
			})
			.returning();

		return {
			refinementId: storedRefinement.id,
			...refinement,
		};
	}),

	/**
	 * Process query with full CRAG pattern
	 */
	processQuery: protectedProcedure.input(processQuerySchema).mutation(async ({ ctx, input }) => {
		// Create CRAG service with custom config
		const service = new CRAGService(input.config);

		// Mock RAG service (in production, would use actual RAG service)
		const mockRagService = {
			retrieveDocuments: async (query: string, topK: number) => {
				// In production, would call actual RAG retrieval
				return [
					{
						id: crypto.randomUUID(),
						content: `Relevant document for: ${query}`,
						score: 0.85,
					},
				];
			},
		};

		// Process query with CRAG
		const response = await service.processQuery(input.query, mockRagService, input.context);

		// Store evaluation
		const [storedEvaluation] = await ctx.db
			.insert(cragEvaluations)
			.values({
				tenantId: ctx.tenantId,
				sessionId: input.sessionId,
				queryId: response.queryId,
				originalQuery: response.originalQuery,
				confidence: response.evaluation.confidence,
				confidenceLevel: response.evaluation.confidenceLevel,
				shouldRefine: response.evaluation.shouldRefine,
				shouldUseMultiHop: response.evaluation.shouldUseMultiHop,
				reasoningType: response.evaluation.reasoningType,
				issues: response.evaluation.issues,
				recommendations: response.evaluation.recommendations,
				evaluatedBy: ctx.userId,
			})
			.returning();

		// Store refinement if applied
		if (response.refinement) {
			await ctx.db.insert(queryRefinements).values({
				tenantId: ctx.tenantId,
				evaluationId: storedEvaluation.id,
				originalQuery: response.refinement.originalQuery,
				refinedQuery: response.refinement.refinedQuery,
				strategy: response.refinement.strategy,
				attemptNumber: response.metadata.refinementAttempts,
				subQueries: response.refinement.subQueries,
				context: response.refinement.context,
				confidence: response.refinement.confidence,
				confidenceImprovement:
					response.refinement.confidence - response.evaluation.confidence,
				reasoning: response.refinement.reasoning,
				success: true,
			});
		}

		// Store reasoning steps if multi-hop
		if (response.multiHopResult) {
			for (const step of response.multiHopResult.steps) {
				await ctx.db.insert(reasoningSteps).values({
					tenantId: ctx.tenantId,
					evaluationId: storedEvaluation.id,
					stepNumber: step.stepNumber,
					query: step.query,
					retrievedDocuments: step.retrievedDocuments,
					intermediateAnswer: step.intermediateAnswer,
					confidence: step.confidence,
					reasoning: step.reasoning,
				});
			}
		}

		// Store complete response
		const [storedResponse] = await ctx.db
			.insert(cragResponses)
			.values({
				tenantId: ctx.tenantId,
				sessionId: input.sessionId,
				evaluationId: storedEvaluation.id,
				queryId: response.queryId,
				originalQuery: response.originalQuery,
				finalAnswer: response.finalAnswer,
				confidence: response.confidence,
				sources: response.sources,
				correctionApplied: response.correctionApplied,
				qualityCheckPassed: response.qualityCheckPassed,
				processingTime: response.metadata.processingTime,
				retrievalCount: response.metadata.retrievalCount,
				refinementAttempts: response.metadata.refinementAttempts,
				reasoningSteps: response.metadata.reasoningSteps,
				multiHopResult: response.multiHopResult
					? {
							reasoningType: response.multiHopResult.reasoningType,
							finalAnswer: response.multiHopResult.finalAnswer,
							overallConfidence: response.multiHopResult.overallConfidence,
							supportingEvidence: response.multiHopResult.supportingEvidence,
						}
					: undefined,
			})
			.returning();

		return {
			responseId: storedResponse.id,
			evaluationId: storedEvaluation.id,
			...response,
		};
	}),

	/**
	 * Get evaluation details
	 */
	getEvaluation: protectedProcedure
		.input(z.object({ evaluationId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const evaluation = await ctx.db.query.cragEvaluations.findFirst({
				where: and(
					eq(cragEvaluations.id, input.evaluationId),
					eq(cragEvaluations.tenantId, ctx.tenantId),
				),
			});

			if (!evaluation) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Evaluation not found',
				});
			}

			return evaluation;
		}),

	/**
	 * Get refinement history for evaluation
	 */
	getRefinementHistory: protectedProcedure
		.input(z.object({ evaluationId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const refinements = await ctx.db.query.queryRefinements.findMany({
				where: and(
					eq(queryRefinements.evaluationId, input.evaluationId),
					eq(queryRefinements.tenantId, ctx.tenantId),
				),
				orderBy: [desc(queryRefinements.attemptNumber)],
			});

			return { refinements };
		}),

	/**
	 * Get reasoning steps for evaluation
	 */
	getReasoningSteps: protectedProcedure
		.input(z.object({ evaluationId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const steps = await ctx.db.query.reasoningSteps.findMany({
				where: and(
					eq(reasoningSteps.evaluationId, input.evaluationId),
					eq(reasoningSteps.tenantId, ctx.tenantId),
				),
				orderBy: [desc(reasoningSteps.stepNumber)],
			});

			return { steps };
		}),

	/**
	 * Get CRAG response
	 */
	getResponse: protectedProcedure
		.input(z.object({ responseId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const response = await ctx.db.query.cragResponses.findFirst({
				where: and(
					eq(cragResponses.id, input.responseId),
					eq(cragResponses.tenantId, ctx.tenantId),
				),
				with: {
					evaluation: true,
				},
			});

			if (!response) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Response not found',
				});
			}

			return response;
		}),

	/**
	 * Get CRAG metrics for period
	 */
	getMetrics: adminProcedure.input(getMetricsSchema).query(async ({ ctx, input }) => {
		if (input.refreshCache) {
			// Calculate fresh metrics
			const responses = await ctx.db.query.cragResponses.findMany({
				where: and(
					eq(cragResponses.tenantId, ctx.tenantId),
					gte(cragResponses.createdAt, input.periodStart),
					lte(cragResponses.createdAt, input.periodEnd),
				),
			});

			if (responses.length === 0) {
				return {
					totalQueries: 0,
					averageConfidence: 0,
					highConfidenceRate: 0,
					refinementRate: 0,
					multiHopRate: 0,
					averageProcessingTime: 0,
					qualityCheckPassRate: 0,
				};
			}

			// Calculate metrics
			const totalQueries = responses.length;
			const averageConfidence =
				responses.reduce((sum, r) => sum + r.confidence, 0) / totalQueries;
			const highConfidenceQueries = responses.filter((r) => r.confidence >= 0.8).length;
			const refinedQueries = responses.filter((r) => r.correctionApplied).length;
			const multiHopQueries = responses.filter((r) => r.reasoningSteps > 0).length;
			const qualityPassedQueries = responses.filter((r) => r.qualityCheckPassed).length;
			const averageProcessingTime =
				responses.reduce((sum, r) => sum + r.processingTime, 0) / totalQueries;

			// Store metrics
			await ctx.db.insert(cragMetrics).values({
				tenantId: ctx.tenantId,
				periodStart: input.periodStart,
				periodEnd: input.periodEnd,
				totalQueries,
				averageConfidence,
				highConfidenceRate: highConfidenceQueries / totalQueries,
				refinementRate: refinedQueries / totalQueries,
				multiHopRate: multiHopQueries / totalQueries,
				averageProcessingTime,
				qualityCheckPassRate: qualityPassedQueries / totalQueries,
			});

			return {
				totalQueries,
				averageConfidence,
				highConfidenceRate: highConfidenceQueries / totalQueries,
				refinementRate: refinedQueries / totalQueries,
				multiHopRate: multiHopQueries / totalQueries,
				averageProcessingTime,
				qualityCheckPassRate: qualityPassedQueries / totalQueries,
			};
		}

		// Fetch cached metrics
		const metrics = await ctx.db.query.cragMetrics.findFirst({
			where: and(
				eq(cragMetrics.tenantId, ctx.tenantId),
				eq(cragMetrics.periodStart, input.periodStart),
				eq(cragMetrics.periodEnd, input.periodEnd),
			),
		});

		return metrics || {
			totalQueries: 0,
			averageConfidence: 0,
			highConfidenceRate: 0,
			refinementRate: 0,
			multiHopRate: 0,
			averageProcessingTime: 0,
			qualityCheckPassRate: 0,
		};
	}),

	/**
	 * Get CRAG dashboard data
	 */
	getDashboard: adminProcedure.input(getDashboardSchema).query(async ({ ctx, input }) => {
		// Calculate date range
		const now = new Date();
		let periodStart: Date;

		switch (input.period) {
			case 'today':
				periodStart = new Date(now.setHours(0, 0, 0, 0));
				break;
			case 'week':
				periodStart = new Date(now.setDate(now.getDate() - 7));
				break;
			case 'month':
				periodStart = new Date(now.setMonth(now.getMonth() - 1));
				break;
			case 'quarter':
				periodStart = new Date(now.setMonth(now.getMonth() - 3));
				break;
		}

		// Fetch recent evaluations
		const recentEvaluations = await ctx.db.query.cragEvaluations.findMany({
			where: and(
				eq(cragEvaluations.tenantId, ctx.tenantId),
				gte(cragEvaluations.createdAt, periodStart),
			),
			orderBy: [desc(cragEvaluations.createdAt)],
			limit: 10,
		});

		// Fetch recent responses
		const recentResponses = await ctx.db.query.cragResponses.findMany({
			where: and(
				eq(cragResponses.tenantId, ctx.tenantId),
				gte(cragResponses.createdAt, periodStart),
			),
			orderBy: [desc(cragResponses.createdAt)],
			limit: 10,
		});

		// Calculate summary statistics
		const totalEvaluations = recentEvaluations.length;
		const avgConfidence =
			totalEvaluations > 0
				? recentEvaluations.reduce((sum, e) => sum + e.confidence, 0) / totalEvaluations
				: 0;

		const lowConfidenceQueries = recentEvaluations.filter((e) => e.confidence < 0.6).length;
		const refinedQueries = recentResponses.filter((r) => r.correctionApplied).length;
		const multiHopQueries = recentResponses.filter((r) => r.reasoningSteps > 0).length;
		const qualityFailures = recentResponses.filter((r) => !r.qualityCheckPassed).length;

		return {
			summary: {
				totalEvaluations,
				averageConfidence: avgConfidence,
				lowConfidenceRate: totalEvaluations > 0 ? lowConfidenceQueries / totalEvaluations : 0,
				refinementRate: recentResponses.length > 0 ? refinedQueries / recentResponses.length : 0,
				multiHopRate: recentResponses.length > 0 ? multiHopQueries / recentResponses.length : 0,
				qualityFailureRate:
					recentResponses.length > 0 ? qualityFailures / recentResponses.length : 0,
			},
			recentEvaluations: recentEvaluations.slice(0, 5),
			recentResponses: recentResponses.slice(0, 5),
		};
	}),

	/**
	 * List evaluations with filters
	 */
	listEvaluations: protectedProcedure
		.input(
			z.object({
				sessionId: z.string().uuid().optional(),
				confidenceLevel: z.enum(['high', 'medium', 'low', 'very_low']).optional(),
				shouldRefine: z.boolean().optional(),
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(cragEvaluations.tenantId, ctx.tenantId)];

			if (input.sessionId) {
				conditions.push(eq(cragEvaluations.sessionId, input.sessionId));
			}

			if (input.confidenceLevel) {
				conditions.push(eq(cragEvaluations.confidenceLevel, input.confidenceLevel));
			}

			if (input.shouldRefine !== undefined) {
				conditions.push(eq(cragEvaluations.shouldRefine, input.shouldRefine));
			}

			const evaluations = await ctx.db.query.cragEvaluations.findMany({
				where: and(...conditions),
				orderBy: [desc(cragEvaluations.createdAt)],
				limit: input.limit,
				offset: input.offset,
			});

			const total = await ctx.db
				.select({ count: sql<number>`count(*)` })
				.from(cragEvaluations)
				.where(and(...conditions));

			return {
				evaluations,
				total: total[0]?.count || 0,
				limit: input.limit,
				offset: input.offset,
			};
		}),
});
