/**
 * Problems Router
 * Unresolved problem tracking with semantic deduplication
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { unresolvedProblems, unresolvedProblemUsers } from '@platform/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { internalError, notFound } from '@platform/shared';

export const problemsRouter = router({
  /**
   * Record or update unresolved problem
   */
  record: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        sessionId: z.string().uuid(),
        endUserId: z.string().uuid().optional(),
        problemDescription: z.string().min(10),
        embedding: z.array(z.number()).length(1024),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Normalize and hash problem description
      const normalized = input.problemDescription
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');

      const problemHash = createHash('sha256').update(normalized).digest('hex');

      // Check if problem already exists
      const existing = await ctx.db.query.unresolvedProblems.findFirst({
        where: and(
          eq(unresolvedProblems.tenantId, input.tenantId),
          eq(unresolvedProblems.problemHash, problemHash)
        ),
      });

      if (existing) {
        // Update existing problem
        const [updated] = await ctx.db
          .update(unresolvedProblems)
          .set({
            affectedUserCount: sql`${unresolvedProblems.affectedUserCount} + 1`,
            attemptCount: sql`${unresolvedProblems.attemptCount} + 1`,
            lastSessionId: input.sessionId,
            updatedAt: new Date(),
          })
          .where(eq(unresolvedProblems.id, existing.id))
          .returning();

        // Add user to problem if provided
        if (input.endUserId) {
          await ctx.db
            .insert(unresolvedProblemUsers)
            .values({
              problemId: existing.id,
              endUserId: input.endUserId,
            })
            .onConflictDoNothing();
        }

        return { problem: updated, isNew: false };
      }

      // Create new problem
      const [newProblem] = await ctx.db
        .insert(unresolvedProblems)
        .values({
          tenantId: input.tenantId,
          problemDescription: input.problemDescription,
          problemEmbedding: input.embedding,
          problemHash,
          firstSessionId: input.sessionId,
          lastSessionId: input.sessionId,
        })
        .returning();

      // Add user to problem if provided
      if (input.endUserId && newProblem) {
        await ctx.db.insert(unresolvedProblemUsers).values({
          problemId: newProblem.id,
          endUserId: input.endUserId,
        });
      }

      if (!newProblem) {
        throw internalError({
          message: 'Failed to create problem',
        });
      }

      return { problem: newProblem, isNew: true };
    }),

  /**
   * Find similar problems using vector similarity
   */
  findSimilar: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        embedding: z.array(z.number()).length(1024),
        threshold: z.number().min(0).max(1).default(0.85),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.execute(sql`
        SELECT
          id,
          problem_description,
          affected_user_count,
          attempt_count,
          status,
          (1 - (problem_embedding <=> ${sql.raw(JSON.stringify(input.embedding))}::vector)) as similarity
        FROM unresolved_problems
        WHERE tenant_id = ${input.tenantId}
          AND status = 'unresolved'
          AND (1 - (problem_embedding <=> ${sql.raw(JSON.stringify(input.embedding))}::vector)) > ${input.threshold}
        ORDER BY similarity DESC
        LIMIT ${input.limit}
      `);

      return results;
    }),

  /**
   * List all unresolved problems (admin only)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['unresolved', 'rag_updated', 'resolved']).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const conditions = [eq(unresolvedProblems.tenantId, ctx.tenantId)];

      if (input.status) {
        conditions.push(eq(unresolvedProblems.status, input.status));
      }

      const results = await ctx.db.query.unresolvedProblems.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: desc(unresolvedProblems.affectedUserCount),
      });

      return results;
    }),

  /**
   * Approve AI-generated solution and update RAG
   */
  approveSolution: protectedProcedure
    .input(
      z.object({
        problemId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(unresolvedProblems)
        .set({
          status: 'rag_updated',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(unresolvedProblems.id, input.problemId),
            eq(unresolvedProblems.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw notFound({
          message: 'Problem not found',
        });
      }

      return updated;
    }),

  /**
   * Mark problem as resolved
   */
  markResolved: protectedProcedure
    .input(
      z.object({
        problemId: z.string().uuid(),
        knowledgeDocumentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(unresolvedProblems)
        .set({
          status: 'resolved',
          knowledgeDocumentId: input.knowledgeDocumentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(unresolvedProblems.id, input.problemId),
            eq(unresolvedProblems.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updated) {
        throw notFound({
          message: 'Problem not found',
        });
      }

      return updated;
    }),
});
