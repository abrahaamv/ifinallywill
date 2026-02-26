/**
 * Escalations Router
 *
 * Human agent escalation management.
 * Handles the handoff from AI to human agents.
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { escalations, messages } from '@platform/db';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { notFound } from '@platform/shared';

export const escalationsRouter = router({
  /**
   * Create escalation
   *
   * Called when AI fails to resolve or user requests human.
   */
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        endUserId: z.string().uuid().optional(),
        escalationType: z.enum([
          'ai_failure',
          'time_exceeded',
          'duplicate_problem',
          'user_request',
        ]),
        reason: z.string().min(10).max(1000),
        problemId: z.string().uuid().optional(),
        withinServiceHours: z.boolean().default(true),
        aiConfidence: z.number().min(0).max(1).optional(),
        aiTurnCount: z.number().int().min(0).optional(),
        userSentiment: z
          .enum(['positive', 'neutral', 'negative', 'frustrated'])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meetingToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const meetingUrl = `https://meet.visualkit.live/${meetingToken}`;

      const [escalation] = await ctx.db
        .insert(escalations)
        .values({
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          endUserId: input.endUserId,
          escalationType: input.escalationType,
          reason: input.reason,
          problemId: input.problemId,
          withinServiceHours: input.withinServiceHours,
          meetingUrl,
          meetingToken,
        })
        .returning();

      const sessionMessages = await ctx.db.query.messages.findMany({
        where: eq(messages.sessionId, input.sessionId),
        orderBy: desc(messages.timestamp),
        limit: 20,
      });

      const lastUserMessage = sessionMessages.find((m) => m.role === 'user');
      const aiSummary = `User's last message: "${lastUserMessage?.content || 'N/A'}"\n\nEscalation reason: ${input.reason}`;

      return {
        ...escalation,
        aiContext: {
          sessionId: input.sessionId,
          aiSummary,
          aiConfidence: input.aiConfidence ?? 0.3,
          escalationReason: input.escalationType,
          aiTurnCount: input.aiTurnCount ?? sessionMessages.length,
          userSentiment: input.userSentiment,
          meetingUrl,
        },
      };
    }),

  /**
   * List escalations (admin only)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          escalationType: z
            .enum([
              'ai_failure',
              'time_exceeded',
              'duplicate_problem',
              'user_request',
            ])
            .optional(),
          status: z.enum(['pending', 'assigned', 'resolved']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const conditions = [eq(escalations.tenantId, ctx.tenantId)];

      if (input.escalationType) {
        conditions.push(eq(escalations.escalationType, input.escalationType));
      }

      if (input.status === 'pending') {
        conditions.push(isNull(escalations.humanAgentId));
        conditions.push(isNull(escalations.resolvedAt));
      } else if (input.status === 'assigned') {
        conditions.push(sql`${escalations.humanAgentId} IS NOT NULL`);
        conditions.push(isNull(escalations.resolvedAt));
      } else if (input.status === 'resolved') {
        conditions.push(sql`${escalations.resolvedAt} IS NOT NULL`);
      }

      const results = await ctx.db.query.escalations.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: desc(escalations.createdAt),
      });

      return results;
    }),

  /**
   * Get escalation by ID
   */
  getById: publicProcedure
    .input(z.object({ escalationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const escalation = await ctx.db.query.escalations.findFirst({
        where: eq(escalations.id, input.escalationId),
      });

      if (!escalation) {
        throw notFound({ message: 'Escalation not found' });
      }

      return escalation;
    }),

  /**
   * Assign escalation to human agent
   */
  assign: protectedProcedure
    .input(
      z.object({
        escalationId: z.string().uuid(),
        humanAgentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(escalations)
        .set({
          humanAgentId: input.humanAgentId,
          assignedAt: new Date(),
        })
        .where(
          and(
            eq(escalations.id, input.escalationId),
            eq(escalations.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw notFound({ message: 'Escalation not found' });
      }

      return updated;
    }),

  /**
   * Mark agent as joined
   */
  agentJoined: protectedProcedure
    .input(z.object({ escalationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(escalations)
        .set({ humanAgentJoinedAt: new Date() })
        .where(
          and(
            eq(escalations.id, input.escalationId),
            eq(escalations.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw notFound({ message: 'Escalation not found' });
      }

      return updated;
    }),

  /**
   * Resolve escalation
   */
  resolve: protectedProcedure
    .input(
      z.object({
        escalationId: z.string().uuid(),
        resolutionNotes: z.string().min(10),
        meetingDurationSeconds: z.number().positive().optional(),
        resolvedBy: z.enum(['agent', 'ai_followup', 'user']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(escalations)
        .set({
          resolvedAt: new Date(),
          resolutionNotes: input.resolutionNotes,
          meetingDurationSeconds: input.meetingDurationSeconds,
        })
        .where(
          and(
            eq(escalations.id, input.escalationId),
            eq(escalations.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw notFound({ message: 'Escalation not found' });
      }

      return updated;
    }),

  /**
   * Get escalation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`COUNT(*) FILTER (WHERE human_agent_id IS NULL AND resolved_at IS NULL)`,
        assigned: sql<number>`COUNT(*) FILTER (WHERE human_agent_id IS NOT NULL AND resolved_at IS NULL)`,
        resolved: sql<number>`COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)`,
        avgDurationSeconds: sql<number>`AVG(meeting_duration_seconds)`,
        avgResponseTimeMinutes: sql<number>`AVG(EXTRACT(EPOCH FROM (human_agent_joined_at - created_at)) / 60) FILTER (WHERE human_agent_joined_at IS NOT NULL)`,
      })
      .from(escalations)
      .where(eq(escalations.tenantId, ctx.tenantId));

    const byType = await ctx.db
      .select({
        escalationType: escalations.escalationType,
        count: sql<number>`COUNT(*)`,
      })
      .from(escalations)
      .where(eq(escalations.tenantId, ctx.tenantId))
      .groupBy(escalations.escalationType);

    return {
      ...result[0],
      byType,
    };
  }),
});
