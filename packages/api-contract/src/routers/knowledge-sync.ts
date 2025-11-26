/**
 * Phase 12 Week 7: Knowledge Base Connector Router
 *
 * Provides tRPC endpoints for knowledge base synchronization
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  ConfluenceConnector,
  NotionConnector,
  GoogleDriveConnector,
  chunkDocument,
  createVoyageProvider,
  type KnowledgeConnectorConfig,
  type Document,
} from '@platform/knowledge';
import { db, tenants, knowledgeDocuments, knowledgeChunks } from '@platform/db';
import { eq } from 'drizzle-orm';

/**
 * Knowledge connector configuration schema
 */
const knowledgeConfigSchema = z.object({
  provider: z.enum(['confluence', 'notion', 'google-drive', 'sharepoint', 'dropbox']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiToken: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    email: z.string().optional(),
    siteUrl: z.string().optional(),
  }),
  options: z
    .object({
      timeout: z.number().optional(),
      retryAttempts: z.number().optional(),
      syncInterval: z.number().optional(),
      includeArchived: z.boolean().optional(),
      includeDrafts: z.boolean().optional(),
      spaceFilter: z.array(z.string()).optional(),
      excludeSpaces: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Get knowledge connector for tenant
 */
async function getKnowledgeConnector(tenantId: string) {
  // Fetch tenant knowledge configuration
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.metadata?.knowledge) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Knowledge base not configured for tenant',
    });
  }

  const config = tenant.metadata.knowledge as unknown as KnowledgeConnectorConfig;

  // Create connector based on provider
  let connector;
  switch (config.provider) {
    case 'confluence':
      connector = new ConfluenceConnector(config);
      break;
    case 'notion':
      connector = new NotionConnector(config);
      break;
    case 'google-drive':
      connector = new GoogleDriveConnector(config);
      break;
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Provider ${config.provider} not yet supported`,
      });
  }

  return connector;
}

/**
 * Process document for RAG storage
 */
async function processDocument(document: Document, tenantId: string) {
  // Skip if document has no content
  if (!document.content || document.content.trim().length === 0) {
    return;
  }

  // Insert/update document record
  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      id: document.id,
      tenantId,
      title: document.title,
      content: document.content,
      contentType: document.contentType,
      url: document.url,
      parentId: document.parentId,
      path: document.path,
      author: document.author,
      tags: document.tags,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })
    .onConflictDoUpdate({
      target: knowledgeDocuments.id,
      set: {
        content: document.content,
        contentType: document.contentType,
        updatedAt: document.updatedAt,
        metadata: document.metadata,
      },
    })
    .returning();

  // Chunk document text content
  const chunks = chunkDocument(doc.content, {
    chunkSize: 512,
    overlapSize: 128,
  });

  // Delete existing chunks for this document
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, doc.id));

  // Generate embeddings and store chunks
  const voyageProvider = createVoyageProvider();

  for (const chunk of chunks) {
    // Generate embedding for this chunk
    const embedding = await voyageProvider.embed(chunk.content, 'document');

    await db.insert(knowledgeChunks).values({
      documentId: doc.id,
      tenantId,
      position: chunk.position,
      content: chunk.content,
      startOffset: chunk.metadata.startIndex,
      endOffset: chunk.metadata.endIndex,
      embedding,
      metadata: {
        chunkSize: chunk.metadata.chunkSize,
        overlapSize: chunk.metadata.overlapSize,
        contentType: doc.contentType,
      },
    });
  }
}

/**
 * Knowledge sync router
 */
export const knowledgeSyncRouter = router({
  /**
   * Configure knowledge base integration (admin only)
   */
  configure: adminProcedure
    .input(knowledgeConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch current tenant metadata
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
      });

      // Update tenant metadata with knowledge config
      await db
        .update(tenants)
        .set({
          metadata: {
            ...(tenant?.metadata as Record<string, unknown> || {}),
            knowledge: input,
          },
        })
        .where(eq(tenants.id, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Test knowledge base connection
   */
  testConnection: adminProcedure.query(async ({ ctx }) => {
    const connector = await getKnowledgeConnector(ctx.tenantId);
    const isConnected = await connector.testConnection();

    return { connected: isConnected };
  }),

  /**
   * List available spaces/databases/folders
   */
  listSpaces: protectedProcedure.query(async ({ ctx }) => {
    const connector = await getKnowledgeConnector(ctx.tenantId);
    const spaces = await connector.listSpaces();

    return { spaces };
  }),

  /**
   * Get space by ID
   */
  getSpace: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const space = await connector.getSpace(input.spaceId);

      return { space };
    }),

  /**
   * List documents in a space
   */
  listDocuments: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const result = await connector.listDocuments(input.spaceId, {
        limit: input.limit,
        cursor: input.cursor,
      });

      return result;
    }),

  /**
   * Get document by ID
   */
  getDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const document = await connector.getDocument(input.documentId);

      return { document };
    }),

  /**
   * Search documents
   */
  searchDocuments: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        spaceId: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const documents = await connector.searchDocuments(input.query, {
        spaceId: input.spaceId,
        limit: input.limit,
      });

      return { documents };
    }),

  /**
   * Sync single space to RAG database
   */
  syncSpace: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);

      let documentsProcessed = 0;
      let documentsFailed = 0;

      // List all documents in space
      let cursor: string | undefined;
      do {
        const result = await connector.listDocuments(input.spaceId, {
          cursor,
        });

        // Process documents in batch
        await Promise.all(
          result.documents.map(async (doc) => {
            try {
              await processDocument(doc, ctx.tenantId);
              documentsProcessed++;
            } catch (error: any) {
              documentsFailed++;
              console.error('Failed to process document', {
                documentId: doc.id,
                error: error.message,
              });
            }
          })
        );

        cursor = result.nextCursor;
      } while (cursor);

      return {
        success: true,
        documentsProcessed,
        documentsFailed,
      };
    }),

  /**
   * Sync all spaces to RAG database
   */
  syncAll: protectedProcedure.mutation(async ({ ctx }) => {
    const connector = await getKnowledgeConnector(ctx.tenantId);

    const syncStatus = await connector.syncAll(
      async (document) => {
        await processDocument(document, ctx.tenantId);
      }
    );

    return {
      success: true,
      ...syncStatus,
    };
  }),

  /**
   * Get incremental changes since last sync
   */
  getChanges: protectedProcedure
    .input(z.object({ since: z.date() }))
    .query(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const changes = await connector.getChanges(input.since);

      return { changes };
    }),

  /**
   * Sync incremental changes to RAG database
   */
  syncChanges: protectedProcedure
    .input(z.object({ since: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const connector = await getKnowledgeConnector(ctx.tenantId);
      const changes = await connector.getChanges(input.since);

      let documentsProcessed = 0;
      let documentsFailed = 0;

      // Process created documents
      await Promise.all(
        changes.created.map(async (doc) => {
          try {
            await processDocument(doc, ctx.tenantId);
            documentsProcessed++;
          } catch (error: any) {
            documentsFailed++;
            console.error('Failed to process created document', {
              documentId: doc.id,
              error: error.message,
            });
          }
        })
      );

      // Process updated documents
      await Promise.all(
        changes.updated.map(async (doc) => {
          try {
            await processDocument(doc, ctx.tenantId);
            documentsProcessed++;
          } catch (error: any) {
            documentsFailed++;
            console.error('Failed to process updated document', {
              documentId: doc.id,
              error: error.message,
            });
          }
        })
      );

      // Delete removed documents
      for (const documentId of changes.deleted) {
        await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId));
        await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
      }

      return {
        success: true,
        documentsProcessed,
        documentsFailed,
        documentsDeleted: changes.deleted.length,
      };
    }),
});
