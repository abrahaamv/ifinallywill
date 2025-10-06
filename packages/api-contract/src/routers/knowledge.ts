/**
 * Knowledge Router (Phase 3 - Week 2.4)
 *
 * Knowledge base and RAG endpoint management with automatic RLS enforcement.
 * All queries automatically filtered by tenant_id via PostgreSQL RLS policies.
 *
 * Security:
 * - authMiddleware sets app.current_tenant_id for each request
 * - RLS policies filter all SELECT/UPDATE/DELETE operations
 * - UUID validation prevents SQL injection
 * - Role hierarchy enforced: owner > admin > member
 */

import { knowledgeDocuments } from '@platform/db';
import { TRPCError } from '@trpc/server';
import { count, eq, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, ownerProcedure, protectedProcedure, router } from '../trpc';

/**
 * Input validation schemas
 */
const documentMetadataSchema = z.object({
  source: z.string().optional(),
  url: z.string().url('Invalid URL').optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  category: z.string().max(100).optional(),
  metadata: documentMetadataSchema.optional(),
});

const updateDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  metadata: documentMetadataSchema.optional(),
});

const getDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
});

const listDocumentsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  category: z.string().optional(),
  search: z.string().optional(),
});

const deleteDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
});

/**
 * RAG operation schemas (placeholders for future implementation)
 */
const searchKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().min(1).max(20).default(5),
  category: z.string().optional(),
});

/**
 * Knowledge router with RLS enforcement
 */
export const knowledgeRouter = router({
  // ==================== DOCUMENT MANAGEMENT ====================

  /**
   * List documents in current tenant
   *
   * RLS automatically filters by tenantId
   * All roles can list documents
   */
  list: protectedProcedure.input(listDocumentsSchema).query(async ({ ctx, input }) => {
    try {
      // Build query with filters
      let query = ctx.db.select().from(knowledgeDocuments).$dynamic();

      // RLS handles tenant filtering automatically
      // No need for .where(eq(knowledgeDocuments.tenantId, ctx.tenantId))

      // Apply category filter if provided
      if (input.category) {
        query = query.where(eq(knowledgeDocuments.category, input.category));
      }

      // Apply search filter if provided
      if (input.search) {
        query = query.where(ilike(knowledgeDocuments.title, `%${input.search}%`));
      }

      // Apply pagination
      const results = await query.limit(input.limit).offset(input.offset);

      // Get total count
      const countResult = await ctx.db.select({ count: count() }).from(knowledgeDocuments);

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        documents: results.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          metadata: doc.metadata,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      console.error('Failed to list documents:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve documents',
        cause: error,
      });
    }
  }),

  /**
   * Get document by ID
   *
   * RLS ensures document belongs to current tenant
   */
  get: protectedProcedure.input(getDocumentSchema).query(async ({ ctx, input }) => {
    try {
      const [document] = await ctx.db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.id))
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found or access denied',
        });
      }

      return {
        id: document.id,
        title: document.title,
        content: document.content,
        category: document.category,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to get document:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve document',
        cause: error,
      });
    }
  }),

  /**
   * Create document (admin/owner only)
   *
   * Automatically associates document with current tenant via RLS
   * Note: Embedding generation will be implemented in Phase 5
   */
  create: adminProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Create document - tenantId automatically set via RLS
      // Note: embedding field will be populated by background job in Phase 5
      const [newDocument] = await ctx.db
        .insert(knowledgeDocuments)
        .values({
          tenantId: ctx.tenantId, // Explicit for clarity, but RLS enforces match
          title: input.title,
          content: input.content,
          category: input.category,
          metadata: input.metadata,
          // embedding will be generated asynchronously in Phase 5
        })
        .returning();

      if (!newDocument) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create document',
        });
      }

      return {
        id: newDocument.id,
        title: newDocument.title,
        content: newDocument.content,
        category: newDocument.category,
        metadata: newDocument.metadata,
        createdAt: newDocument.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to create document:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create document',
        cause: error,
      });
    }
  }),

  /**
   * Update document (admin/owner only)
   *
   * RLS ensures document belongs to current tenant
   * Note: Embedding regeneration will be implemented in Phase 5
   */
  update: adminProcedure.input(updateDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verify document exists and belongs to tenant (RLS)
      const [existing] = await ctx.db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found or access denied',
        });
      }

      // Update document - RLS ensures we can only update within our tenant
      const [updated] = await ctx.db
        .update(knowledgeDocuments)
        .set({
          title: input.title,
          content: input.content,
          category: input.category,
          metadata: input.metadata,
          updatedAt: new Date(),
          // Note: embedding will be regenerated asynchronously in Phase 5
        })
        .where(eq(knowledgeDocuments.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update document',
        });
      }

      return {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        category: updated.category,
        metadata: updated.metadata,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to update document:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update document',
        cause: error,
      });
    }
  }),

  /**
   * Delete document (owner only)
   *
   * RLS ensures document belongs to current tenant
   * Cascades to chunks via database constraint
   */
  delete: ownerProcedure.input(deleteDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Delete document - RLS ensures we can only delete within our tenant
      // Cascade to chunks handled by database foreign key constraint
      const [deleted] = await ctx.db
        .delete(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.id))
        .returning({ id: knowledgeDocuments.id });

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found or access denied',
        });
      }

      return {
        id: deleted.id,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to delete document:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete document',
        cause: error,
      });
    }
  }),

  // ==================== RAG OPERATIONS ====================
  // These endpoints will be fully implemented in Phase 5 with @platform/knowledge integration

  /**
   * Semantic search (Phase 5 - placeholder)
   *
   * Future implementation will:
   * - Generate query embedding via Voyage API
   * - Perform vector similarity search using pgvector
   * - Return ranked results with relevance scores
   * - Apply reranking for hybrid retrieval
   */
  search: protectedProcedure.input(searchKnowledgeSchema).query(async ({ input }) => {
    // Placeholder implementation - returns empty results
    // Full implementation in Phase 5 will integrate with @platform/knowledge
    console.log('RAG search placeholder called with query:', input.query);

    return {
      results: [],
      total: 0,
      message: 'RAG semantic search will be implemented in Phase 5',
    };
  }),
});
