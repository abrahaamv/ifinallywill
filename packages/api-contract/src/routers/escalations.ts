/**
 * Escalations Router
 * Human agent escalation management with direct database operations
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { escalations } from '@platform/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const escalationsRouter = router({
  /**
   * Create escalation (public - can be called from widget)
   */
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        endUserId: z.string().uuid().optional(),
        escalationType: z.enum(['ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request']),
        reason: z.string().min(10).max(1000),
        problemId: z.string().uuid().optional(),
        withinServiceHours: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate meeting URL token
      const meetingToken = Math.random().toString(36).substring(2, 15) +
                          Math.random().toString(36).substring(2, 15);

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
          meetingUrl: `https://meet.platform.com/${meetingToken}`,
          meetingToken,
        })
        .returning();

      return escalation;
    }),

  /**
   * List escalations (admin only)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          escalationType: z.enum(['ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request']).optional(),
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
    .input(
      z.object({
        escalationId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const escalation = await ctx.db.query.escalations.findFirst({
        where: eq(escalations.id, input.escalationId),
      });

      if (!escalation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escalation not found',
        });
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escalation not found',
        });
      }

      return updated;
    }),

  /**
   * Mark agent as joined
   */
  agentJoined: protectedProcedure
    .input(
      z.object({
        escalationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(escalations)
        .set({
          humanAgentJoinedAt: new Date(),
        })
        .where(
          and(
            eq(escalations.id, input.escalationId),
            eq(escalations.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escalation not found',
        });
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escalation not found',
        });
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
        resolved: sql<number>`COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)`,
        avgDuration: sql<number>`AVG(meeting_duration_seconds)`,
      })
      .from(escalations)
      .where(eq(escalations.tenantId, ctx.tenantId));

    return result[0];
  }),
});
