/**
 * Surveys Router
 * Multi-tier survey system (in-widget, AI call, SMS, email)
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { surveyResponses } from '@platform/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notFound } from '@platform/shared';

export const surveysRouter = router({
  /**
   * Create survey response (public - widget can submit)
   */
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        endUserId: z.string().uuid().optional(),
        resolutionId: z.string().uuid().optional(),
        surveyMethod: z.enum(['in_widget', 'ai_call', 'sms_link', 'email_link']),
        problemSolved: z.boolean().optional(),
        experienceRating: z.number().int().min(1).max(5).optional(),
        wouldRecommend: z.boolean().optional(),
        feedbackText: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [survey] = await ctx.db
        .insert(surveyResponses)
        .values({
          ...input,
          surveyCompleted: !!(input.experienceRating || input.problemSolved !== undefined),
          respondedAt: new Date(),
        })
        .returning();

      return survey;
    }),

  /**
   * Refuse to rate (user clicked "Later")
   */
  refuse: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        surveyMethod: z.enum(['in_widget', 'ai_call', 'sms_link', 'email_link']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [survey] = await ctx.db
        .insert(surveyResponses)
        .values({
          ...input,
          refusedToRate: true,
          surveyCompleted: false,
        })
        .returning();

      return survey;
    }),

  /**
   * Update survey response (for multi-step surveys)
   */
  update: publicProcedure
    .input(
      z.object({
        surveyId: z.string().uuid(),
        problemSolved: z.boolean().optional(),
        experienceRating: z.number().int().min(1).max(5).optional(),
        wouldRecommend: z.boolean().optional(),
        feedbackText: z.string().max(1000).optional(),
        callDurationSeconds: z.number().positive().optional(),
        callAnswered: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { surveyId, ...updates } = input;

      const [updated] = await ctx.db
        .update(surveyResponses)
        .set({
          ...updates,
          surveyCompleted: !!(updates.experienceRating || updates.problemSolved !== undefined),
          respondedAt: new Date(),
        })
        .where(eq(surveyResponses.id, surveyId))
        .returning();

      if (!updated) {
        throw notFound({
          message: 'Survey not found',
        });
      }

      return updated;
    }),

  /**
   * Get survey by session ID
   */
  getBySession: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const survey = await ctx.db.query.surveyResponses.findFirst({
        where: eq(surveyResponses.sessionId, input.sessionId),
        orderBy: desc(surveyResponses.createdAt),
      });

      return survey;
    }),

  /**
   * List surveys (admin only)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          surveyMethod: z.enum(['in_widget', 'ai_call', 'sms_link', 'email_link']).optional(),
          surveyCompleted: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const conditions = [eq(surveyResponses.tenantId, ctx.tenantId)];

      if (input.surveyMethod) {
        conditions.push(eq(surveyResponses.surveyMethod, input.surveyMethod));
      }

      if (input.surveyCompleted !== undefined) {
        conditions.push(eq(surveyResponses.surveyCompleted, input.surveyCompleted));
      }

      const results = await ctx.db.query.surveyResponses.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: desc(surveyResponses.createdAt),
      });

      return results;
    }),

  /**
   * Get survey statistics
   */
  getStats: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const conditions = [eq(surveyResponses.tenantId, ctx.tenantId)];

      if (input.startDate) {
        conditions.push(sql`${surveyResponses.createdAt} >= ${input.startDate}`);
      }

      if (input.endDate) {
        conditions.push(sql`${surveyResponses.createdAt} <= ${input.endDate}`);
      }

      const result = await ctx.db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`COUNT(*) FILTER (WHERE survey_completed = true)`,
          refused: sql<number>`COUNT(*) FILTER (WHERE refused_to_rate = true)`,
          avgRating: sql<number>`AVG(experience_rating)`,
          problemSolvedRate: sql<number>`
            COUNT(*) FILTER (WHERE problem_solved = true)::float /
            NULLIF(COUNT(*) FILTER (WHERE problem_solved IS NOT NULL), 0)
          `,
        })
        .from(surveyResponses)
        .where(and(...conditions));

      return result[0];
    }),

  /**
   * Get CSAT distribution
   */
  getRatingDistribution: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select({
        rating: surveyResponses.experienceRating,
        count: sql<number>`COUNT(*)`,
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, ctx.tenantId),
          sql`${surveyResponses.experienceRating} IS NOT NULL`
        )
      )
      .groupBy(surveyResponses.experienceRating)
      .orderBy(surveyResponses.experienceRating);

    return results;
  }),
});
