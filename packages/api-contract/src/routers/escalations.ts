/**
 * Escalations Router
 *
 * Human agent escalation management with Chatwoot integration.
 * Handles the handoff from AI to human agents via Chatwoot inbox.
 *
 * Flow:
 * 1. AI fails to resolve → create escalation
 * 2. Sync contact to Chatwoot (if not exists)
 * 3. Create Chatwoot conversation with AI context
 * 4. Human agent handles in Chatwoot
 * 5. Webhook updates escalation status
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { escalations, messages, endUsers } from '@platform/db';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import {
  ChatwootClient,
  ChatwootError,
  type EscalationContext,
} from '@platform/chatwoot';

// =============================================================================
// Helper: Get Chatwoot Client (lazily created per tenant)
// =============================================================================

function getChatwootClient(config: {
  baseUrl: string;
  accountId: number;
  apiAccessToken: string;
  inboxId: number;
}): ChatwootClient {
  return new ChatwootClient(config);
}

// =============================================================================
// Escalations Router
// =============================================================================

export const escalationsRouter = router({
  /**
   * Create escalation and notify Chatwoot
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
      // Generate meeting URL token
      const meetingToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const meetingUrl = `https://meet.visualkit.live/${meetingToken}`;

      // Create escalation record
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

      // Get AI conversation summary for Chatwoot
      const sessionMessages = await ctx.db.query.messages.findMany({
        where: eq(messages.sessionId, input.sessionId),
        orderBy: desc(messages.timestamp),
        limit: 20,
      });

      const aiTranscript = sessionMessages
        .reverse()
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }));

      // Generate AI summary from last few messages
      const lastUserMessage = sessionMessages.find((m) => m.role === 'user');
      const aiSummary = `User's last message: "${lastUserMessage?.content || 'N/A'}"\n\nEscalation reason: ${input.reason}`;

      // Return escalation with context for Chatwoot sync
      // (Chatwoot sync happens asynchronously via separate endpoint or webhook)
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
          aiTranscript,
        },
      };
    }),

  /**
   * Sync escalation to Chatwoot
   *
   * Creates contact and conversation in Chatwoot with AI context.
   * Called after escalation is created to notify human agents.
   */
  syncToChatwoot: protectedProcedure
    .input(
      z.object({
        escalationId: z.string().uuid(),
        chatwootConfig: z.object({
          baseUrl: z.string().url(),
          accountId: z.number(),
          apiAccessToken: z.string(),
          inboxId: z.number(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get escalation with session and end user
      const escalation = await ctx.db.query.escalations.findFirst({
        where: and(
          eq(escalations.id, input.escalationId),
          eq(escalations.tenantId, ctx.tenantId)
        ),
      });

      if (!escalation) {
        throw notFound({ message: 'Escalation not found' });
      }

      // Already synced?
      if (escalation.chatwootConversationId) {
        return {
          alreadySynced: true,
          chatwootConversationId: escalation.chatwootConversationId,
        };
      }

      // Get end user info
      let endUser = null;
      if (escalation.endUserId) {
        endUser = await ctx.db.query.endUsers.findFirst({
          where: eq(endUsers.id, escalation.endUserId),
        });
      }

      // Get session messages for transcript
      const sessionMessages = await ctx.db.query.messages.findMany({
        where: eq(messages.sessionId, escalation.sessionId),
        orderBy: desc(messages.timestamp),
        limit: 20,
      });

      const aiTranscript = sessionMessages.reverse().map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      // Initialize Chatwoot client
      const chatwootConfig = {
        baseUrl: input.chatwootConfig.baseUrl,
        accountId: input.chatwootConfig.accountId,
        apiAccessToken: input.chatwootConfig.apiAccessToken,
        inboxId: input.chatwootConfig.inboxId,
      };
      const chatwoot = getChatwootClient(chatwootConfig);

      try {
        // Sync contact to Chatwoot
        const contact = await chatwoot.createOrUpdateContact({
          visualkit_user_id: escalation.endUserId || escalation.sessionId,
          email: endUser?.email ?? undefined,
          name: endUser?.name ?? undefined,
          phone_number: endUser?.phone ?? undefined,
        });

        // Build escalation context
        const lastUserMessage = sessionMessages.find((m) => m.role === 'user');
        const escalationContext: EscalationContext = {
          session_id: escalation.sessionId,
          ai_summary: `Escalation reason: ${escalation.reason}\n\nUser's last message: "${lastUserMessage?.content || 'N/A'}"`,
          ai_confidence: 0.3, // Low confidence since AI failed
          escalation_reason: escalation.escalationType as EscalationContext['escalation_reason'],
          ai_turn_count: sessionMessages.length,
          meeting_url: escalation.meetingUrl ?? undefined,
          escalated_at: escalation.createdAt.toISOString(),
        };

        // Create Chatwoot conversation
        const { conversation } = await chatwoot.createEscalation({
          contactId: contact.id,
          context: escalationContext,
          aiTranscript,
        });

        // Update escalation with Chatwoot IDs
        await ctx.db
          .update(escalations)
          .set({
            chatwootConversationId: conversation.id,
            chatwootContactId: contact.id,
          })
          .where(eq(escalations.id, escalation.id));

        return {
          alreadySynced: false,
          chatwootConversationId: conversation.id,
          chatwootContactId: contact.id,
        };
      } catch (error) {
        if (error instanceof ChatwootError) {
          throw badRequest({
            message: `Chatwoot sync failed: ${error.message}`,
          });
        }
        throw error;
      }
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
        throw notFound({
          message: 'Escalation not found',
        });
      }

      return escalation;
    }),

  /**
   * Get escalation by Chatwoot conversation ID
   */
  getByChatwootConversation: protectedProcedure
    .input(
      z.object({
        chatwootConversationId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const escalation = await ctx.db.query.escalations.findFirst({
        where: and(
          eq(escalations.chatwootConversationId, input.chatwootConversationId),
          eq(escalations.tenantId, ctx.tenantId)
        ),
      });

      if (!escalation) {
        throw notFound({
          message: 'Escalation not found for Chatwoot conversation',
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
        throw notFound({
          message: 'Escalation not found',
        });
      }

      return updated;
    }),

  /**
   * Mark agent as joined (from Chatwoot webhook or meeting join)
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
        throw notFound({
          message: 'Escalation not found',
        });
      }

      return updated;
    }),

  /**
   * Resolve escalation (can be called from Chatwoot webhook)
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
        throw notFound({
          message: 'Escalation not found',
        });
      }

      return updated;
    }),

  /**
   * Update escalation from Chatwoot webhook
   *
   * Called when Chatwoot sends conversation_resolved or message_created webhooks.
   */
  updateFromChatwoot: protectedProcedure
    .input(
      z.object({
        chatwootConversationId: z.number(),
        event: z.enum(['resolved', 'agent_replied']),
        agentResponse: z.string().optional(),
        resolvedAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const escalation = await ctx.db.query.escalations.findFirst({
        where: and(
          eq(escalations.chatwootConversationId, input.chatwootConversationId),
          eq(escalations.tenantId, ctx.tenantId)
        ),
      });

      if (!escalation) {
        throw notFound({
          message: 'Escalation not found for Chatwoot conversation',
        });
      }

      if (input.event === 'resolved') {
        await ctx.db
          .update(escalations)
          .set({
            resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : new Date(),
            resolutionNotes: input.agentResponse || 'Resolved via Chatwoot',
          })
          .where(eq(escalations.id, escalation.id));
      } else if (input.event === 'agent_replied') {
        // Track first agent response time
        if (!escalation.humanAgentJoinedAt) {
          await ctx.db
            .update(escalations)
            .set({
              humanAgentJoinedAt: new Date(),
            })
            .where(eq(escalations.id, escalation.id));
        }
      }

      return { success: true };
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

  /**
   * Get Chatwoot configuration status
   */
  getChatwootStatus: protectedProcedure.query(async ({ ctx }) => {
    // This would check if Chatwoot is configured for the tenant
    // In production, this would read from tenant settings
    return {
      configured: false,
      message: 'Chatwoot configuration not found. Please configure in Settings → Integrations.',
    };
  }),
});
