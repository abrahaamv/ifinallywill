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
 *
 * Priority 2 Enhancements:
 * - File upload with base64 encoding
 * - Automatic document chunking
 * - Voyage AI embeddings generation
 * - Vector similarity search integration
 */

import { knowledgeChunks, knowledgeDocuments } from '@platform/db';
import {
  type ChunkOptions,
  VoyageEmbeddingProvider,
  chunkDocument,
  estimateTokens,
  validateChunkOptions,
  HybridRetriever,
  executeEnhancedRAGQuery,
  type EnhancedRAGOptions,
} from '@platform/knowledge';
import { badRequest, internalError, notFound } from '@platform/shared';
import { TRPCError } from '@trpc/server';
import { count, eq, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, ownerProcedure, protectedProcedure, router } from '../trpc';

/**
 * SQL query result interfaces for type-safe database operations
 */
interface SimilaritySearchRow {
  id: string;
  document_id: string;
  content: string;
  position: number;
  metadata: Record<string, unknown> | null;
  document_title: string;
  document_category: string | null;
  similarity_score: number | string;
}

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
 * Priority 2: File upload schema with chunking options
 */
const uploadDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  category: z.string().max(100).optional(),
  metadata: documentMetadataSchema.optional(),
  file: z
    .object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
      data: z.string(), // base64 encoded file content
    })
    .optional(),
  chunkOptions: z
    .object({
      chunkSize: z.number().int().min(100).max(2000).optional(),
      overlapSize: z.number().int().min(0).optional(),
      preserveSentences: z.boolean().optional(),
    })
    .optional(),
});

/**
 * RAG operation schemas
 */
const searchKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().min(1).max(20).default(5),
  category: z.string().optional(),
  minScore: z.number().min(0).max(1).default(0.7).optional(),
});

/**
 * Phase 12 Week 1: Hybrid search schemas
 */
const hybridSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  topK: z.number().int().min(1).max(50).default(25),
  minScore: z.number().min(0).max(1).default(0.7).optional(),
});

const enhancedSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  topK: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7).optional(),
  useHybridSearch: z.boolean().default(true),
  useSmall2Big: z.boolean().default(false),
  useReranking: z.boolean().default(true),
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

      // Get chunk counts for all documents
      const chunkCounts = await ctx.db
        .select({
          documentId: knowledgeChunks.documentId,
          count: count(),
        })
        .from(knowledgeChunks)
        .where(
          sql`${knowledgeChunks.documentId} IN (${sql.join(
            results.map((r) => r.id),
            sql`, `
          )})`
        )
        .groupBy(knowledgeChunks.documentId);

      const chunkCountMap = new Map(chunkCounts.map((c) => [c.documentId, Number(c.count)]));

      // Get total count
      const countResult = await ctx.db.select({ count: count() }).from(knowledgeDocuments);

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        documents: results.map((doc) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          metadata: doc.metadata,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          chunkCount: chunkCountMap.get(doc.id) || 0,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      throw internalError({
        message: 'Failed to retrieve documents',
        cause: error as Error,
        logLevel: 'error',
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
        throw notFound({
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

      throw internalError({
        message: 'Failed to retrieve document',
        cause: error as Error,
        logLevel: 'error',
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
        throw internalError({
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

      throw internalError({
        message: 'Failed to create document',
        cause: error as Error,
        logLevel: 'error',
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
        throw notFound({
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
        throw internalError({
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

      throw internalError({
        message: 'Failed to update document',
        cause: error as Error,
        logLevel: 'error',
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
        throw notFound({
          message: 'Document not found or access denied',
        });
      }

      return {
        id: deleted.id,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to delete document',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Upload document with automatic chunking and embeddings (Priority 2)
   *
   * Process:
   * 1. Decode and extract file content if provided
   * 2. Create document record
   * 3. Chunk document content
   * 4. Generate embeddings for chunks (batch)
   * 5. Store chunks with embeddings
   *
   * Admin/owner only
   */
  upload: adminProcedure.input(uploadDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Extract content from file if provided
      let documentContent = input.content;
      if (input.file) {
        try {
          // Decode base64 file data
          const buffer = Buffer.from(input.file.data, 'base64');
          documentContent = buffer.toString('utf-8');

          // Validate file type (text-based only)
          const textMimeTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];
          if (!textMimeTypes.includes(input.file.type)) {
            throw badRequest({
              message: `Unsupported file type: ${input.file.type}. Only text-based files are supported.`,
            });
          }

          // File size limit: 10MB
          if (input.file.size > 10 * 1024 * 1024) {
            throw badRequest({
              message: 'File size must be less than 10MB',
            });
          }
        } catch (error) {
          throw badRequest({
            message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      // Validate chunk options if provided
      if (input.chunkOptions) {
        const validation = validateChunkOptions(input.chunkOptions as ChunkOptions);
        if (!validation.valid) {
          throw badRequest({
            message: `Invalid chunk options: ${validation.errors.join(', ')}`,
          });
        }
      }

      // 2. Chunk the document (before transaction)
      const chunks = chunkDocument(documentContent, input.chunkOptions as ChunkOptions);

      if (chunks.length === 0) {
        throw badRequest({
          message: 'Document is empty or could not be chunked',
        });
      }

      // 3. Generate embeddings for all chunks (batch, before transaction)
      let embeddings: number[][] = [];
      try {
        // Initialize Voyage AI provider
        if (!process.env.VOYAGE_API_KEY) {
          throw internalError({
            message:
              'VOYAGE_API_KEY not configured. Set environment variable to enable embeddings.',
          });
        }

        const voyageProvider = new VoyageEmbeddingProvider({
          apiKey: process.env.VOYAGE_API_KEY,
        });

        // Generate embeddings in batch (more efficient)
        const chunkTexts = chunks.map((chunk) => chunk.content);
        embeddings = await voyageProvider.embedBatch(chunkTexts, 'document');

        // Verify embeddings count matches chunks
        if (embeddings.length !== chunks.length) {
          throw internalError({
            message: `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`,
          });
        }
      } catch (error) {
        throw internalError({
          message: `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error as Error,
          logLevel: 'error',
        });
      }

      // Transaction: Atomically insert document and chunks
      const newDocument = await ctx.db.transaction(async (tx) => {
        // 1. Create document record
        const documentMetadata: Record<string, unknown> = {
          ...(input.metadata || {}),
        };

        if (input.file) {
          documentMetadata.uploadedFileName = input.file.name;
          documentMetadata.uploadedFileType = input.file.type;
          documentMetadata.uploadedFileSize = input.file.size;
          documentMetadata.uploadedAt = new Date().toISOString();
        }

        const [document] = await tx
          .insert(knowledgeDocuments)
          .values({
            tenantId: ctx.tenantId,
            title: input.title,
            content: documentContent,
            category: input.category,
            metadata: documentMetadata,
          })
          .returning();

        if (!document) {
          throw internalError({
            message: 'Failed to create document',
          });
        }

        // 4. Store chunks with embeddings
        const chunkRecords = chunks.map((chunk, index) => ({
          documentId: document.id,
          content: chunk.content,
          embedding: sql`${JSON.stringify(embeddings[index])}::vector`,
          position: chunk.position,
          metadata: chunk.metadata,
        }));

        await tx.insert(knowledgeChunks).values(chunkRecords);

        return document;
      });

      // 5. Calculate and return summary
      const totalTokens = chunks.reduce((sum, chunk) => sum + estimateTokens(chunk.content), 0);
      const estimatedCost = new VoyageEmbeddingProvider({
        apiKey: process.env.VOYAGE_API_KEY || '',
      }).estimateCost(documentContent.length);

      return {
        id: newDocument.id,
        title: newDocument.title,
        category: newDocument.category,
        metadata: newDocument.metadata,
        createdAt: newDocument.createdAt,
        processingStats: {
          chunksCreated: chunks.length,
          totalTokens,
          estimatedCost,
          avgChunkSize: Math.round(
            chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length
          ),
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to upload document',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  // ==================== RAG OPERATIONS ====================

  /**
   * Phase 12 Week 1-3: Hybrid search with RRF fusion + caching
   *
   * Combines semantic and BM25 keyword search for optimal retrieval.
   * Uses Reciprocal Rank Fusion (RRF) to merge results from both methods.
   *
   * Phase 12 Week 3: Enhanced with Redis caching and Voyage embeddings
   *
   * Process:
   * 1. Classify query type (conceptual, technical, conversational, exact_match)
   * 2. Parallel execution of semantic + BM25 searches (with embedding cache)
   * 3. Fuse results using RRF or weighted combination
   * 4. Return top-K ranked results
   */
  hybridSearch: protectedProcedure.input(hybridSearchSchema).query(async ({ ctx, input }) => {
    try {
      const retriever = new HybridRetriever(
        ctx.db,
        ctx.tenantId,
        ctx.embeddingProvider,
        ctx.redis
      );
      const results = await retriever.retrieve(input.query, input.topK);

      // Filter by minimum score (default to 0.7)
      const minScore = input.minScore ?? 0.7;
      const filteredResults = results.filter((r) => r.score >= minScore);

      return {
        results: filteredResults.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          content: r.text,
          score: Number(r.score.toFixed(4)),
          metadata: r.metadata,
          relevance:
            r.score >= 0.85 ? 'high' : r.score >= 0.7 ? 'medium' : 'low',
        })),
        total: filteredResults.length,
        query: input.query,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: `Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Phase 12 Week 1-3: Enhanced RAG with full pipeline + caching
   *
   * Complete RAG query with all Phase 12 enhancements:
   * - Hybrid search (semantic + BM25 with RRF) with caching
   * - Small2Big hierarchical retrieval (optional)
   * - Cohere reranking (Phase 10, optional)
   *
   * Phase 12 Week 3: Enhanced with Redis caching and Voyage embeddings
   *
   * Returns formatted context ready for LLM consumption.
   */
  enhancedSearch: protectedProcedure.input(enhancedSearchSchema).query(async ({ ctx, input }) => {
    try {
      const options: EnhancedRAGOptions = {
        query: input.query,
        topK: input.topK,
        minScore: input.minScore || 0.7,
        useHybridSearch: input.useHybridSearch,
        useSmall2Big: input.useSmall2Big,
        useReranking: input.useReranking,
        tenantId: ctx.tenantId,
        embeddingProvider: ctx.embeddingProvider,
        redis: ctx.redis,
      };

      const result = await executeEnhancedRAGQuery(ctx.db, options);

      return {
        context: result.context,
        chunks: result.chunks.map((c) => ({
          id: c.chunk.id,
          documentId: c.chunk.documentId,
          content: c.chunk.content,
          score: Number(c.score.toFixed(4)),
          relevance: c.relevance,
          metadata: c.chunk.metadata,
        })),
        totalChunks: result.totalChunks,
        processingTimeMs: result.processingTimeMs,
        query: input.query,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: `Enhanced search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Semantic search with vector similarity (Priority 2)
   *
   * Legacy endpoint - maintained for backward compatibility.
   * For new implementations, use hybridSearch or enhancedSearch instead.
   *
   * Process:
   * 1. Generate query embedding via Voyage API
   * 2. Perform vector similarity search using pgvector (<=> operator)
   * 3. Return ranked results with relevance scores
   * 4. Filter by category if specified
   */
  search: protectedProcedure.input(searchKnowledgeSchema).query(async ({ ctx, input }) => {
    try {
      // 1. Generate query embedding
      if (!process.env.VOYAGE_API_KEY) {
        throw internalError({
          message: 'Semantic search not configured. VOYAGE_API_KEY required.',
        });
      }

      const voyageProvider = new VoyageEmbeddingProvider({
        apiKey: process.env.VOYAGE_API_KEY,
      });

      const [queryEmbedding] = await voyageProvider.embedBatch([input.query], 'query');

      if (!queryEmbedding) {
        throw internalError({
          message: 'Failed to generate query embedding',
        });
      }

      // 2. Vector similarity search with pgvector
      // RLS automatically filters by tenant_id
      // <=> is cosine distance operator (0 = identical, 2 = opposite)
      // 1 - distance = similarity score (0 to 1, higher is better)

      // RLS automatically filters knowledge_documents by tenant_id
      // Join will only match documents visible to current tenant
      const similarityQuery = sql`
        SELECT
          kc.id,
          kc.document_id,
          kc.content,
          kc.position,
          kc.metadata,
          kd.title as document_title,
          kd.category as document_category,
          1 - (kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity_score
        FROM knowledge_chunks kc
        INNER JOIN knowledge_documents kd ON kc.document_id = kd.id
        ${input.category ? sql`WHERE kd.category = ${input.category}` : sql``}
        ORDER BY kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${input.limit}
      `;

      const results = await ctx.db.execute(similarityQuery);

      // 3. Filter by minimum score and format results
      const filteredResults = (results as unknown as SimilaritySearchRow[])
        .filter((row) => Number(row.similarity_score) >= (input.minScore || 0.7))
        .map((row) => ({
          id: row.id,
          documentId: row.document_id,
          documentTitle: row.document_title,
          category: row.document_category,
          content: row.content,
          position: row.position,
          metadata: row.metadata,
          similarityScore: Number(row.similarity_score).toFixed(4),
          relevance:
            Number(row.similarity_score) >= 0.85
              ? 'high'
              : Number(row.similarity_score) >= 0.7
                ? 'medium'
                : 'low',
        }));

      return {
        results: filteredResults,
        total: filteredResults.length,
        query: input.query,
        minScore: input.minScore || 0.7,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),
});
