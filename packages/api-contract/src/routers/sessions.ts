/**
 * Sessions Router (Phase 3 - Week 2.5)
 *
 * AI conversation session and message management with automatic RLS enforcement.
 * All queries automatically filtered by tenant_id via PostgreSQL RLS policies.
 *
 * Security:
 * - authMiddleware sets app.current_tenant_id for each request
 * - RLS policies filter all SELECT/UPDATE/DELETE operations
 * - UUID validation prevents SQL injection
 * - Role hierarchy enforced: owner > admin > member
 *
 * Note: WebSocket streaming will be implemented in Phase 6 via @platform/realtime
 */

import { messages, sessions } from '@platform/db';
import { TRPCError } from '@trpc/server';
import { count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ownerProcedure, protectedProcedure, router } from '../trpc';

/**
 * Input validation schemas
 */
const sessionMetadataSchema = z.object({
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  country: z.string().optional(),
});

const createSessionSchema = z.object({
  widgetId: z.string().uuid('Invalid widget ID').optional(),
  meetingId: z.string().uuid('Invalid meeting ID').optional(),
  mode: z.enum(['text', 'meeting']).default('text'),
  metadata: sessionMetadataSchema.optional(),
});

const getSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
});

const listSessionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  widgetId: z.string().uuid().optional(),
  meetingId: z.string().uuid().optional(),
  mode: z.enum(['text', 'meeting']).optional(),
  includeEnded: z.boolean().default(false),
});

const endSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
});

const deleteSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
});

/**
 * Message schemas
 */
const attachmentSchema = z.object({
  type: z.enum(['image', 'file']),
  url: z.string().url('Invalid URL'),
  name: z.string().optional(),
  size: z.number().int().positive().optional(),
});

const messageMetadataSchema = z.object({
  model: z.string().optional(),
  tokensUsed: z.number().int().positive().optional(),
  costUsd: z.number().positive().optional(),
  latencyMs: z.number().int().positive().optional(),
});

const sendMessageSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Content is required'),
  attachments: z.array(attachmentSchema).optional(),
  metadata: messageMetadataSchema.optional(),
});

const listMessagesSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Sessions router with RLS enforcement
 */
export const sessionsRouter = router({
  // ==================== SESSION MANAGEMENT ====================

  /**
   * List sessions in current tenant
   *
   * RLS automatically filters by tenantId
   * All roles can list sessions
   */
  list: protectedProcedure.input(listSessionsSchema).query(async ({ ctx, input }) => {
    try {
      // Build query with filters
      let query = ctx.db.select().from(sessions).$dynamic();

      // RLS handles tenant filtering automatically
      // No need for .where(eq(sessions.tenantId, ctx.tenantId))

      // Apply widget filter if provided
      if (input.widgetId) {
        query = query.where(eq(sessions.widgetId, input.widgetId));
      }

      // Apply meeting filter if provided
      if (input.meetingId) {
        query = query.where(eq(sessions.meetingId, input.meetingId));
      }

      // Apply mode filter if provided
      if (input.mode) {
        query = query.where(eq(sessions.mode, input.mode));
      }

      // Filter by ended status
      if (!input.includeEnded) {
        // Only return active sessions (endedAt is null)
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORM requires explicit null comparison
        query = query.where(eq(sessions.endedAt, null as any));
      }

      // Order by most recent first
      query = query.orderBy(desc(sessions.createdAt));

      // Apply pagination
      const results = await query.limit(input.limit).offset(input.offset);

      // Get total count
      const countResult = await ctx.db.select({ count: count() }).from(sessions);

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORM dynamic query result type
        sessions: results.map((session: any) => ({
          id: session.id,
          widgetId: session.widgetId,
          meetingId: session.meetingId,
          mode: session.mode,
          costUsd: session.costUsd,
          metadata: session.metadata,
          createdAt: session.createdAt,
          endedAt: session.endedAt,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve sessions',
        cause: error,
      });
    }
  }),

  /**
   * Get session by ID
   *
   * RLS ensures session belongs to current tenant
   */
  get: protectedProcedure.input(getSessionSchema).query(async ({ ctx, input }) => {
    try {
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.id))
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      return {
        id: session.id,
        widgetId: session.widgetId,
        meetingId: session.meetingId,
        mode: session.mode,
        costUsd: session.costUsd,
        metadata: session.metadata,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to get session:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve session',
        cause: error,
      });
    }
  }),

  /**
   * Create session
   *
   * Automatically associates session with current tenant via RLS
   * All authenticated users can create sessions
   */
  create: protectedProcedure.input(createSessionSchema).mutation(async ({ ctx, input }) => {
    try {
      // Create session - tenantId automatically set via RLS
      const [newSession] = await ctx.db
        .insert(sessions)
        .values({
          tenantId: ctx.tenantId, // Explicit for clarity, but RLS enforces match
          widgetId: input.widgetId,
          meetingId: input.meetingId,
          mode: input.mode,
          metadata: input.metadata,
          costUsd: '0', // Initialize cost to zero
        })
        .returning();

      if (!newSession) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create session',
        });
      }

      return {
        id: newSession.id,
        widgetId: newSession.widgetId,
        meetingId: newSession.meetingId,
        mode: newSession.mode,
        costUsd: newSession.costUsd,
        metadata: newSession.metadata,
        createdAt: newSession.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to create session:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create session',
        cause: error,
      });
    }
  }),

  /**
   * End session
   *
   * Sets endedAt timestamp to mark session as completed
   * All authenticated users can end their own sessions
   */
  end: protectedProcedure.input(endSessionSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verify session exists and belongs to tenant (RLS)
      const [existing] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      if (existing.endedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session already ended',
        });
      }

      // End session - RLS ensures we can only update within our tenant
      const [ended] = await ctx.db
        .update(sessions)
        .set({
          endedAt: new Date(),
        })
        .where(eq(sessions.id, input.id))
        .returning();

      if (!ended) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to end session',
        });
      }

      return {
        id: ended.id,
        endedAt: ended.endedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to end session:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to end session',
        cause: error,
      });
    }
  }),

  /**
   * Delete session (owner only)
   *
   * RLS ensures session belongs to current tenant
   * Cascades to messages via database constraint
   */
  delete: ownerProcedure.input(deleteSessionSchema).mutation(async ({ ctx, input }) => {
    try {
      // Delete session - RLS ensures we can only delete within our tenant
      // Cascade to messages handled by database foreign key constraint
      const [deleted] = await ctx.db
        .delete(sessions)
        .where(eq(sessions.id, input.id))
        .returning({ id: sessions.id });

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      return {
        id: deleted.id,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to delete session:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete session',
        cause: error,
      });
    }
  }),

  // ==================== MESSAGE MANAGEMENT ====================

  /**
   * List messages in a session
   *
   * RLS ensures session belongs to current tenant
   * Ordered by timestamp (oldest first for conversation flow)
   */
  listMessages: protectedProcedure.input(listMessagesSchema).query(async ({ ctx, input }) => {
    try {
      // Verify session exists and belongs to tenant (RLS)
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      // Get messages for this session
      const results = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, input.sessionId))
        .orderBy(messages.timestamp) // Oldest first
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const countResult = await ctx.db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.sessionId, input.sessionId));

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle ORM dynamic query result type
        messages: results.map((message: any) => ({
          id: message.id,
          sessionId: message.sessionId,
          role: message.role,
          content: message.content,
          attachments: message.attachments,
          metadata: message.metadata,
          timestamp: message.timestamp,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to list messages:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve messages',
        cause: error,
      });
    }
  }),

  /**
   * Send message
   *
   * Creates a message in the session
   * Note: AI response generation will be implemented in Phase 5
   */
  sendMessage: protectedProcedure.input(sendMessageSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verify session exists and belongs to tenant (RLS)
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      if (session.endedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot send message to ended session',
        });
      }

      // Create user message
      const [userMessage] = await ctx.db
        .insert(messages)
        .values({
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          attachments: input.attachments,
          metadata: input.metadata,
        })
        .returning();

      if (!userMessage) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message',
        });
      }

      // Generate AI response only for user messages
      if (input.role === 'user') {
        const aiStartTime = Date.now();

        // Step 1: Execute RAG query to retrieve relevant knowledge
        const { executeRAGQuery, buildRAGPrompt } = await import('@platform/knowledge');
        const ragResult = await executeRAGQuery(ctx.db, {
          query: input.content,
          tenantId: ctx.tenantId,
          topK: 5,
          minScore: 0.7,
        });

        // Step 2: Build enhanced prompt with RAG context
        const enhancedPrompt = ragResult.context
          ? buildRAGPrompt(input.content, ragResult.context)
          : input.content;

        // Step 3: Get conversation history for context
        const conversationHistory = await ctx.db
          .select()
          .from(messages)
          .where(eq(messages.sessionId, input.sessionId))
          .orderBy(messages.timestamp)
          .limit(10);

        // Step 4: Generate AI response with cost-optimized routing
        const { AIRouter } = await import('@platform/ai-core');
        const router = new AIRouter({
          openaiApiKey: process.env.OPENAI_API_KEY || '',
          anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
          googleApiKey: process.env.GOOGLE_API_KEY || '',
          logRouting: true,
          enableFallback: true,
        });

        // Build message array for AI
        const aiMessages = [
          {
            role: 'system' as const,
            content:
              'You are a helpful AI assistant. Use the provided context to answer questions accurately.',
          },
          ...conversationHistory.slice(0, -1).map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user' as const,
            content: enhancedPrompt,
          },
        ];

        const aiResponse = await router.complete({
          messages: aiMessages,
          temperature: 0.7,
          maxTokens: 2048,
        });

        const aiLatencyMs = Date.now() - aiStartTime;

        // Step 5: Create assistant message with AI response
        const assistantMetadata: Record<string, unknown> = {
          model: aiResponse.model,
          tokensUsed: aiResponse.usage.totalTokens,
          costUsd: aiResponse.usage.cost,
          latencyMs: aiLatencyMs,
          ragChunks: ragResult.totalChunks,
          ragProcessingMs: ragResult.processingTimeMs,
        };

        const [assistantMessage] = await ctx.db
          .insert(messages)
          .values({
            sessionId: input.sessionId,
            role: 'assistant',
            content: aiResponse.content,
            metadata: assistantMetadata,
          })
          .returning();

        // Step 6: Update session cost
        const newSessionCost = Number.parseFloat(session.costUsd || '0') + aiResponse.usage.cost;
        await ctx.db
          .update(sessions)
          .set({ costUsd: newSessionCost.toFixed(6) })
          .where(eq(sessions.id, input.sessionId));

        // Return both messages
        return {
          userMessage: {
            id: userMessage.id,
            sessionId: userMessage.sessionId,
            role: userMessage.role,
            content: userMessage.content,
            attachments: userMessage.attachments,
            metadata: userMessage.metadata,
            timestamp: userMessage.timestamp,
          },
          assistantMessage: assistantMessage
            ? {
                id: assistantMessage.id,
                sessionId: assistantMessage.sessionId,
                role: assistantMessage.role,
                content: assistantMessage.content,
                attachments: assistantMessage.attachments,
                metadata: assistantMessage.metadata,
                timestamp: assistantMessage.timestamp,
              }
            : undefined,
        };
      }

      // For system/assistant messages, just return the message
      return {
        userMessage: {
          id: userMessage.id,
          sessionId: userMessage.sessionId,
          role: userMessage.role,
          content: userMessage.content,
          attachments: userMessage.attachments,
          metadata: userMessage.metadata,
          timestamp: userMessage.timestamp,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to send message:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send message',
        cause: error,
      });
    }
  }),

  // ==================== STREAMING SUPPORT ====================
  // Note: Full WebSocket streaming will be implemented in Phase 6 via @platform/realtime
  // tRPC subscriptions require WebSocket server setup

  /**
   * Stream message response (Phase 6 - placeholder)
   *
   * Future implementation will:
   * - Use tRPC subscriptions over WebSocket
   * - Stream AI responses token-by-token
   * - Integrate with @platform/realtime for Redis-backed pub/sub
   * - Support multi-instance deployments with sticky sessions
   */
});
