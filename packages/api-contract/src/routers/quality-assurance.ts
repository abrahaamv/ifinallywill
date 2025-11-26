/**
 * Phase 12 Week 9: Quality Assurance Router
 *
 * Provides tRPC endpoints for response review, hallucination detection, and quality metrics
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  qualityAssuranceService,
  type QualityIssueType,
  type ReviewStatus,
  type QualityReview,
} from '../services/quality-assurance';
import { db } from '@platform/db';
import { qaReviews, qaMetrics, hallucinationDetections, messages, sessions } from '@platform/db';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

/**
 * Flag response input schema
 */
const flagResponseSchema = z.object({
  messageId: z.string().uuid(),
  issueTypes: z.array(
    z.enum([
      'hallucination',
      'inconsistency',
      'low_confidence',
      'missing_citation',
      'factual_error',
      'inappropriate_content',
      'off_topic',
    ])
  ),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().optional(),
});

/**
 * Submit review input schema
 */
const submitReviewSchema = z.object({
  reviewId: z.string().uuid(),
  decision: z.enum(['approve', 'reject', 'revise']),
  notes: z.string().optional(),
  revisedResponse: z.string().optional(),
});

/**
 * Quality assurance router
 */
export const qualityAssuranceRouter = router({
  /**
   * Flag a response for human review
   */
  flagResponse: protectedProcedure.input(flagResponseSchema).mutation(async ({ ctx, input }) => {
    // Fetch message with session context
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, input.messageId),
      with: {
        session: true,
      },
    });

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      });
    }

    // Verify tenant ownership
    if (message.session.tenantId !== ctx.tenantId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Get conversation history for context
    const conversationHistory = await db.query.messages.findMany({
      where: and(eq(messages.sessionId, message.sessionId), sql`${messages.timestamp} <= ${message.timestamp}`),
      orderBy: desc(messages.timestamp),
      limit: 10,
    });

    // Create quality review
    const [review] = await db
      .insert(qaReviews)
      .values({
        tenantId: ctx.tenantId,
        messageId: input.messageId,
        sessionId: message.sessionId,
        flaggedBy: ctx.role === 'admin' || ctx.role === 'owner' ? 'admin' : 'user',
        issueTypes: input.issueTypes,
        priority: input.priority || 'medium',
        originalResponse: message.content,
        context: {
          userQuery:
            conversationHistory.find((m) => m.role === 'user' && m.timestamp < message.timestamp)?.content || '',
          conversationHistory: conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ragSources: message.metadata?.ragSource,
        },
        status: 'pending',
        metadata: {
          flaggedByUser: ctx.userId,
          notes: input.notes,
        },
      })
      .returning();

    return { review };
  }),

  /**
   * Run hallucination detection on a response
   */
  detectHallucination: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        storeResult: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch message with session context
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, input.messageId),
        with: {
          session: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Message not found',
        });
      }

      // Verify tenant ownership
      if (message.session.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Get conversation history for context
      const conversationHistory = await db.query.messages.findMany({
        where: and(eq(messages.sessionId, message.sessionId), sql`${messages.timestamp} <= ${message.timestamp}`),
        orderBy: desc(messages.timestamp),
        limit: 10,
      });

      // Prepare context for detection
      const context = {
        userQuery:
          conversationHistory.find((m) => m.role === 'user' && m.timestamp < message.timestamp)?.content || '',
        conversationHistory: conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ragSources: undefined, // ragSource is a string identifier, not full chunk data
      };

      // Run hallucination detection
      const detectionResult = await qualityAssuranceService.detectHallucination(message.content, context);

      // Store detection result if requested
      if (input.storeResult) {
        await db.insert(hallucinationDetections).values({
          tenantId: ctx.tenantId,
          messageId: input.messageId,
          detectedAt: new Date(),
          isHallucination: detectionResult.isHallucination ? 1 : 0,
          confidence: detectionResult.confidence,
          reasons: detectionResult.reasons,
          evidence: detectionResult.evidence,
          recommendation: detectionResult.recommendation,
          responseText: message.content,
          contextSnapshot: context,
          detectionConfig: qualityAssuranceService['config'], // Access private config
        });

        // Auto-flag if recommended
        if (qualityAssuranceService.shouldFlagForReview(detectionResult)) {
          const issueTypes = qualityAssuranceService.determineIssueTypes(detectionResult);
          const priority = qualityAssuranceService.determinePriority(detectionResult, issueTypes);
          const qualityScore = qualityAssuranceService.calculateQualityScore(detectionResult);

          await db.insert(qaReviews).values({
            tenantId: ctx.tenantId,
            messageId: input.messageId,
            sessionId: message.sessionId,
            flaggedBy: 'system',
            issueTypes,
            priority,
            originalResponse: message.content,
            context,
            hallucinationDetection: detectionResult,
            qualityScore,
            status: 'pending',
          });
        }
      }

      return { detection: detectionResult };
    }),

  /**
   * Get review queue (admin only)
   */
  getReviewQueue: adminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'requires_revision']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build query conditions
      const conditions = [eq(qaReviews.tenantId, ctx.tenantId)];

      if (input.status) {
        conditions.push(eq(qaReviews.status, input.status));
      }

      if (input.priority) {
        conditions.push(eq(qaReviews.priority, input.priority));
      }

      // Fetch reviews
      const reviews = await db.query.qaReviews.findMany({
        where: and(...conditions),
        orderBy: [desc(qaReviews.priority), desc(qaReviews.flaggedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(qaReviews)
        .where(and(...conditions));

      return {
        reviews,
        pagination: {
          total,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < total,
        },
      };
    }),

  /**
   * Get review by ID
   */
  getReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const review = await db.query.qaReviews.findFirst({
        where: and(eq(qaReviews.id, input.reviewId), eq(qaReviews.tenantId, ctx.tenantId)),
      });

      if (!review) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        });
      }

      return { review };
    }),

  /**
   * Submit review decision (admin only)
   */
  submitReview: adminProcedure.input(submitReviewSchema).mutation(async ({ ctx, input }) => {
    // Fetch review
    const review = await db.query.qaReviews.findFirst({
      where: and(eq(qaReviews.id, input.reviewId), eq(qaReviews.tenantId, ctx.tenantId)),
    });

    if (!review) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Review not found',
      });
    }

    // Update review
    const [updatedReview] = await db
      .update(qaReviews)
      .set({
        status: input.decision === 'approve' ? 'approved' : input.decision === 'reject' ? 'rejected' : 'requires_revision',
        reviewedAt: new Date(),
        reviewedBy: ctx.userId,
        reviewNotes: input.notes,
        reviewDecision: input.decision,
        revisedResponse: input.revisedResponse,
        updatedAt: new Date(),
      })
      .where(eq(qaReviews.id, input.reviewId))
      .returning();

    // If revised response provided, update the message
    if (input.decision === 'revise' && input.revisedResponse) {
      await db
        .update(messages)
        .set({
          content: input.revisedResponse,
        })
        .where(eq(messages.id, review.messageId));
    }

    return { review: updatedReview };
  }),

  /**
   * Get quality metrics
   */
  getQualityMetrics: adminProcedure
    .input(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        refreshCache: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check for cached metrics
      if (!input.refreshCache) {
        const cached = await db.query.qaMetrics.findFirst({
          where: and(
            eq(qaMetrics.tenantId, ctx.tenantId),
            eq(qaMetrics.periodStart, input.periodStart),
            eq(qaMetrics.periodEnd, input.periodEnd)
          ),
        });

        if (cached) {
          return { metrics: cached };
        }
      }

      // Calculate metrics
      const allMessages = await db.query.messages.findMany({
        where: and(
          sql`${messages.sessionId} IN (SELECT id FROM ${sessions} WHERE ${sessions.tenantId} = ${ctx.tenantId})`,
          gte(messages.timestamp, input.periodStart),
          lte(messages.timestamp, input.periodEnd),
          eq(messages.role, 'assistant')
        ),
      });

      const flaggedReviews = await db.query.qaReviews.findMany({
        where: and(
          eq(qaReviews.tenantId, ctx.tenantId),
          gte(qaReviews.flaggedAt, input.periodStart),
          lte(qaReviews.flaggedAt, input.periodEnd)
        ),
      });

      const detections = await db.query.hallucinationDetections.findMany({
        where: and(
          eq(hallucinationDetections.tenantId, ctx.tenantId),
          gte(hallucinationDetections.detectedAt, input.periodStart),
          lte(hallucinationDetections.detectedAt, input.periodEnd)
        ),
      });

      // Calculate issue breakdown
      const issueBreakdown: Record<string, number> = {};
      for (const review of flaggedReviews) {
        const issues = review.issueTypes as QualityIssueType[];
        for (const issue of issues) {
          issueBreakdown[issue] = (issueBreakdown[issue] || 0) + 1;
        }
      }

      // Calculate review outcomes
      const approved = flaggedReviews.filter((r) => r.status === 'approved').length;
      const rejected = flaggedReviews.filter((r) => r.status === 'rejected').length;
      const revised = flaggedReviews.filter((r) => r.status === 'requires_revision' || r.revisedResponse).length;

      // Calculate quality scores
      const qualityScores = flaggedReviews.filter((r) => r.qualityScore !== null).map((r) => r.qualityScore as number);
      const averageQualityScore =
        qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

      const hallucinationRate = detections.filter((d) => d.isHallucination === 1).length / Math.max(detections.length, 1);

      // Calculate average review time
      const reviewTimes = flaggedReviews
        .filter((r) => r.reviewedAt && r.flaggedAt)
        .map((r) => (r.reviewedAt!.getTime() - r.flaggedAt.getTime()) / 1000);
      const averageReviewTime =
        reviewTimes.length > 0 ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length : 0;

      const pendingReviews = flaggedReviews.filter((r) => r.status === 'pending' || r.status === 'in_review').length;

      // Store metrics
      const [metrics] = await db
        .insert(qaMetrics)
        .values({
          tenantId: ctx.tenantId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          totalResponses: allMessages.length,
          flaggedResponses: flaggedReviews.length,
          flagRate: (flaggedReviews.length / Math.max(allMessages.length, 1)) * 100,
          issueBreakdown,
          approved,
          rejected,
          revised,
          averageQualityScore,
          hallucinationRate,
          averageReviewTime: Math.round(averageReviewTime),
          pendingReviews,
        })
        .returning();

      return { metrics };
    }),

  /**
   * Get review history for a message
   */
  getReviewHistory: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const reviews = await db.query.qaReviews.findMany({
        where: and(eq(qaReviews.messageId, input.messageId), eq(qaReviews.tenantId, ctx.tenantId)),
        orderBy: desc(qaReviews.flaggedAt),
      });

      const detections = await db.query.hallucinationDetections.findMany({
        where: and(eq(hallucinationDetections.messageId, input.messageId), eq(hallucinationDetections.tenantId, ctx.tenantId)),
        orderBy: desc(hallucinationDetections.detectedAt),
      });

      return {
        reviews,
        detections,
      };
    }),

  /**
   * Get quality dashboard statistics
   */
  getDashboard: adminProcedure
    .input(
      z.object({
        period: z.enum(['today', 'week', 'month', 'quarter']).optional().default('week'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range
      const now = new Date();
      let periodStart: Date;

      switch (input.period) {
        case 'today':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
      }

      // Get metrics
      const metrics = await db.query.qaMetrics.findFirst({
        where: and(
          eq(qaMetrics.tenantId, ctx.tenantId),
          gte(qaMetrics.periodStart, periodStart),
          lte(qaMetrics.periodEnd, now)
        ),
        orderBy: desc(qaMetrics.createdAt),
      });

      // Get recent flagged responses
      const recentFlags = await db.query.qaReviews.findMany({
        where: and(eq(qaReviews.tenantId, ctx.tenantId), gte(qaReviews.flaggedAt, periodStart)),
        orderBy: desc(qaReviews.flaggedAt),
        limit: 10,
      });

      // Get recent detections
      const recentDetections = await db.query.hallucinationDetections.findMany({
        where: and(eq(hallucinationDetections.tenantId, ctx.tenantId), gte(hallucinationDetections.detectedAt, periodStart)),
        orderBy: desc(hallucinationDetections.detectedAt),
        limit: 10,
      });

      return {
        metrics,
        recentFlags,
        recentDetections,
      };
    }),
});
