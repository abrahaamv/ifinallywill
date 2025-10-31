/**
 * Knowledge Router Tests
 *
 * Comprehensive test coverage for knowledge base and RAG operations.
 * Tests all 6 procedures with focus on:
 * - Document management (CRUD)
 * - File upload and processing
 * - Document chunking
 * - Embedding generation (Voyage AI)
 * - Vector similarity search
 * - RBAC enforcement
 *
 * Coverage Target: ~80% of 634-line knowledge.ts router
 */

import { TRPCError } from '@trpc/server';
import { serviceDb } from '@platform/db';
import type { KnowledgeChunk as DbChunk, KnowledgeDocument as DbDocument } from '@platform/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { knowledgeRouter } from '../src/routers/knowledge';

// Mock external dependencies
vi.mock('@platform/db', () => ({
  serviceDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn((callback) =>
      callback({
        /* mock tx */
      })
    ),
  },
  knowledgeDocuments: {},
  knowledgeChunks: {},
  schema: {
    knowledgeDocuments: {},
    knowledgeChunks: {},
  },
  and: vi.fn(),
  eq: vi.fn(),
  ilike: vi.fn(),
  count: vi.fn(),
  sql: {
    raw: vi.fn(),
  },
}));

vi.mock('@platform/knowledge', () => ({
  chunkDocument: vi.fn(),
  VoyageEmbeddingProvider: vi.fn(),
  estimateTokens: vi.fn(),
  validateChunkOptions: vi.fn(),
}));

vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  // Error handlers used by knowledge router
  internalError: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: opts.message || 'Internal server error',
      cause: opts.cause,
    });
    return error;
  }),
  notFound: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'NOT_FOUND',
      message: opts.message || 'Not found',
    });
    return error;
  }),
  badRequest: vi.fn((opts) => {
    const error = new TRPCError({
      code: 'BAD_REQUEST',
      message: opts.message || 'Bad request',
    });
    return error;
  }),
}));

import {
  createMockContext,
  createMockDb,
  setupMockDelete,
  setupMockExecuteResult,
  setupMockGet,
  setupMockInsert,
  setupMockQuery,
  setupMockQueryWithCount,
  setupMockUpdate,
} from './utils/context';
// Import test utilities
import {
  mockChunk as createMockChunk,
  mockDocument as createMockDocument,
  mockUUIDs,
} from './utils/fixtures';

// Test data
const mockDocument: DbDocument = {
  ...createMockDocument({
    id: mockUUIDs.document.default,
    tenantId: mockUUIDs.tenant.default,
  }),
  category: 'general',
};

const mockChunk: DbChunk = {
  ...createMockChunk({
    id: mockUUIDs.chunk.default,
    documentId: mockUUIDs.document.default,
  }),
  embedding: '[0.1, 0.2, 0.3]' as any,
};

// Helper to create authenticated caller
const createCaller = (
  role: 'member' | 'admin' | 'owner' = 'admin',
  userId = mockUUIDs.user.default,
  tenantId = mockUUIDs.tenant.default
) => {
  const mockDb = createMockDb();
  const ctx = createMockContext({ role, userId, tenantId, db: mockDb });

  return {
    caller: knowledgeRouter.createCaller(ctx),
    mockDb,
    ctx,
  };
};

describe('Knowledge Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    process.env.VOYAGE_API_KEY = 'test_key';
  });

  describe('Document Management', () => {
    describe('list - List Documents with Filters', () => {
      it('should list documents with default pagination (limit 50)', async () => {
        const { caller, mockDb } = createCaller();

        // Use helper to setup mock query with count
        setupMockQueryWithCount(mockDb, [mockDocument], 1);

        const result = await caller.list({});

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0]).toEqual({
          id: mockDocument.id,
          title: mockDocument.title,
          content: mockDocument.content,
          category: mockDocument.category,
          metadata: mockDocument.metadata,
          createdAt: mockDocument.createdAt,
          updatedAt: mockDocument.updatedAt,
        });
        expect(result.total).toBe(1);
        expect(result.hasMore).toBe(false);
      });

      it('should apply pagination correctly', async () => {
        const { caller, mockDb } = createCaller();

        const documents = Array.from({ length: 10 }, (_, i) => ({
          ...mockDocument,
          id: `doc_${i}`,
        }));

        // Use helper to setup mock query with count
        setupMockQueryWithCount(mockDb, documents.slice(5, 10), 20);

        const result = await caller.list({ limit: 5, offset: 5 });

        expect(result.documents).toHaveLength(5);
        expect(result.total).toBe(20);
        expect(result.hasMore).toBe(true);
      });

      it('should filter by category', async () => {
        const { caller, mockDb } = createCaller();

        // Use helper to setup mock query with count
        setupMockQueryWithCount(mockDb, [mockDocument], 1);

        const result = await caller.list({ category: 'general' });

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].category).toBe('general');
      });

      it('should filter by search term', async () => {
        const { caller, mockDb } = createCaller();

        // Use helper to setup mock query with count
        setupMockQueryWithCount(mockDb, [mockDocument], 1);

        const result = await caller.list({ search: 'test' });

        expect(result.documents).toHaveLength(1);
      });

      it('should validate limit bounds (min 1, max 100)', async () => {
        const { caller } = createCaller();

        await expect(caller.list({ limit: 0 })).rejects.toThrow();
        await expect(caller.list({ limit: 101 })).rejects.toThrow();
      });

      it('should validate offset is non-negative', async () => {
        const { caller } = createCaller();

        await expect(caller.list({ offset: -1 })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller();

        // Setup mock to reject with error
        const chainableQuery = {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockRejectedValue(new Error('Database error')),
        };

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            $dynamic: vi.fn().mockReturnValue(chainableQuery),
          }),
        });

        await expect(caller.list({})).rejects.toThrow();
      });
    });

    describe('get - Get Document by ID', () => {
      it('should return document by ID', async () => {
        const { caller, mockDb } = createCaller();

        // Use helper to setup mock get
        setupMockGet(mockDb, mockDocument);

        const result = await caller.get({ id: mockUUIDs.document.default });

        expect(result).toEqual({
          id: mockDocument.id,
          title: mockDocument.title,
          content: mockDocument.content,
          category: mockDocument.category,
          metadata: mockDocument.metadata,
          createdAt: mockDocument.createdAt,
          updatedAt: mockDocument.updatedAt,
        });
      });

      it('should throw NOT_FOUND if document does not exist', async () => {
        const { caller, mockDb } = createCaller();

        // Use helper to setup mock get (return null for not found)
        setupMockGet(mockDb, null);

        await expect(caller.get({ id: '423e4567-e89b-12d3-a456-426614174999' })).rejects.toThrow(
          'Document not found or access denied'
        );
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller();

        await expect(caller.get({ id: 'invalid-uuid' })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller();

        // Setup mock to reject with error
        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(caller.get({ id: mockUUIDs.document.default })).rejects.toThrow();
      });
    });

    describe('create - Create Document (Admin+)', () => {
      it('should create document successfully', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Use helper to setup mock insert
        setupMockInsert(mockDb, mockDocument);

        const result = await caller.create({
          title: 'Test Document',
          content: 'Test content',
          category: 'general',
        });

        expect(result).toEqual({
          id: mockDocument.id,
          title: mockDocument.title,
          content: mockDocument.content,
          category: mockDocument.category,
          metadata: mockDocument.metadata,
          createdAt: mockDocument.createdAt,
        });
      });

      it('should create document with metadata', async () => {
        const { caller, mockDb } = createCaller('admin');

        const metadata = { source: 'api', url: 'https://example.com', tags: ['test'] };

        // Use helper to setup mock insert
        setupMockInsert(mockDb, { ...mockDocument, metadata });

        const result = await caller.create({
          title: 'Test',
          content: 'Content',
          metadata,
        });

        expect(result.metadata).toEqual(metadata);
      });

      it('should validate title is required', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            title: '',
            content: 'Content',
          })
        ).rejects.toThrow();
      });

      it('should validate title length (max 500)', async () => {
        const { caller } = createCaller('admin');

        const longTitle = 'a'.repeat(501);

        await expect(
          caller.create({
            title: longTitle,
            content: 'Content',
          })
        ).rejects.toThrow();
      });

      it('should validate content is required', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            title: 'Title',
            content: '',
          })
        ).rejects.toThrow();
      });

      it('should validate metadata URL format', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.create({
            title: 'Title',
            content: 'Content',
            metadata: { url: 'invalid-url' },
          })
        ).rejects.toThrow();
      });

      it('should handle creation failure', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Setup mock to return empty array (creation failure)
        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        });

        await expect(
          caller.create({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow('Failed to create document');
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Setup mock to reject with error
        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        });

        await expect(
          caller.create({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow();
      });
    });

    describe('update - Update Document (Admin+)', () => {
      it('should update document successfully', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Mock update with existing document check
        const updatedDoc = { ...mockDocument, title: 'Updated Title' };
        setupMockUpdate(mockDb, updatedDoc, mockDocument);

        const result = await caller.update({
          id: mockUUIDs.document.default,
          title: 'Updated Title',
        });

        expect(result.title).toBe('Updated Title');
      });

      it('should throw NOT_FOUND if document does not exist', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Use helper to setup mock get (return null for not found)
        setupMockGet(mockDb, null);

        await expect(
          caller.update({
            id: '423e4567-e89b-12d3-a456-426614174999',
            title: 'New Title',
          })
        ).rejects.toThrow('Document not found or access denied');
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller('admin');

        await expect(
          caller.update({
            id: 'invalid-uuid',
            title: 'Title',
          })
        ).rejects.toThrow();
      });

      it('should handle update failure', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Mock existing document check
        setupMockGet(mockDb, mockDocument);

        // Mock update returning empty array (failure)
        mockDb.update.mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        await expect(
          caller.update({
            id: mockUUIDs.document.default,
            title: 'New Title',
          })
        ).rejects.toThrow('Failed to update document');
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('admin');

        // Setup mock to reject with error
        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(
          caller.update({
            id: mockUUIDs.document.default,
            title: 'Title',
          })
        ).rejects.toThrow();
      });
    });

    describe('delete - Delete Document (Owner Only)', () => {
      it('should delete document successfully', async () => {
        const { caller, mockDb } = createCaller('owner');

        // Setup mock to return deleted document ID
        mockDb.delete.mockReturnValueOnce({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: mockUUIDs.document.default }]),
          }),
        });

        const result = await caller.delete({ id: mockUUIDs.document.default });

        expect(result).toEqual({
          id: mockUUIDs.document.default,
          deleted: true,
        });
      });

      it('should throw NOT_FOUND if document does not exist', async () => {
        const { caller, mockDb } = createCaller('owner');

        // Setup mock to return empty array (not found)
        mockDb.delete.mockReturnValueOnce({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        });

        await expect(caller.delete({ id: '423e4567-e89b-12d3-a456-426614174999' })).rejects.toThrow(
          'Document not found or access denied'
        );
      });

      it('should validate UUID format', async () => {
        const { caller } = createCaller('owner');

        await expect(caller.delete({ id: 'invalid-uuid' })).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller('owner');

        // Setup mock to reject with error
        mockDb.delete.mockReturnValueOnce({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        });

        await expect(caller.delete({ id: mockUUIDs.document.default })).rejects.toThrow();
      });
    });
  });

  describe('File Upload & Processing', () => {
    describe('upload - Upload Document with Chunking (Admin+)', () => {
      it('should upload and process text file successfully', async () => {
        const { caller, mockDb } = createCaller('admin');
        const { chunkDocument, VoyageEmbeddingProvider, estimateTokens } = await import(
          '@platform/knowledge'
        );

        const fileContent = 'This is test file content for chunking.';
        const base64Content = Buffer.from(fileContent).toString('base64');

        // Mock document creation
        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDocument]),
          }),
        } as any);

        // Mock chunking
        const mockChunks = [
          { content: 'This is test', position: 0, metadata: {} },
          { content: 'file content for chunking', position: 1, metadata: {} },
        ];
        (chunkDocument as any).mockReturnValue(mockChunks);

        // Mock embeddings
        const mockEmbeddings = [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ];
        const mockEmbedBatch = vi.fn().mockResolvedValue(mockEmbeddings);
        const mockEstimateCost = vi.fn().mockReturnValue(0.001);
        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: mockEmbedBatch,
          estimateCost: mockEstimateCost,
        }));

        // Mock token estimation
        (estimateTokens as any).mockReturnValue(10);

        // Mock chunk insertion
        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        } as any);

        const result = await caller.upload({
          title: 'Test File',
          content: 'This is test file content for chunking',
          file: {
            name: 'test.txt',
            type: 'text/plain',
            size: 1024,
            data: base64Content,
          },
        });

        expect(result.processingStats.chunksCreated).toBe(2);
        expect(result.processingStats.totalTokens).toBe(20);
        expect(mockEmbedBatch).toHaveBeenCalledWith(
          mockChunks.map((c) => c.content),
          'document'
        );
      });

      it('should reject unsupported file types', async () => {
        const { caller } = createCaller('admin');

        const base64Content = Buffer.from('binary content').toString('base64');

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Valid content',
            file: {
              name: 'test.pdf',
              type: 'application/pdf',
              size: 1024,
              data: base64Content,
            },
          })
        ).rejects.toThrow('Unsupported file type');
      });

      it('should reject files larger than 10MB', async () => {
        const { caller } = createCaller('admin');

        const base64Content = Buffer.from('content').toString('base64');

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Valid content',
            file: {
              name: 'test.txt',
              type: 'text/plain',
              size: 11 * 1024 * 1024, // 11MB
              data: base64Content,
            },
          })
        ).rejects.toThrow('File size must be less than 10MB');
      });

      it('should validate chunk options', async () => {
        const { caller } = createCaller('admin');
        const { validateChunkOptions } = await import('@platform/knowledge');

        (validateChunkOptions as any).mockReturnValue({
          valid: false,
          errors: ['Invalid chunk size'],
        });

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Content',
            chunkOptions: {
              chunkSize: 150, // Valid for Zod, but mock will reject
            },
          })
        ).rejects.toThrow('Invalid chunk options');
      });

      it('should throw error if VOYAGE_API_KEY not configured', async () => {
        const { caller, mockDb } = createCaller('admin');
        const { chunkDocument } = await import('@platform/knowledge');

        delete process.env.VOYAGE_API_KEY;

        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDocument]),
          }),
        } as any);

        (chunkDocument as any).mockReturnValue([{ content: 'Test', position: 0, metadata: {} }]);

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow('Embedding generation failed');
      });

      it('should handle empty document after chunking', async () => {
        const { caller, mockDb } = createCaller('admin');
        const { chunkDocument } = await import('@platform/knowledge');

        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDocument]),
          }),
        } as any);

        (chunkDocument as any).mockReturnValue([]);

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow('Document is empty or could not be chunked');
      });

      it('should handle embedding generation failure', async () => {
        const { caller, mockDb } = createCaller('admin');
        const { chunkDocument, VoyageEmbeddingProvider } = await import('@platform/knowledge');

        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDocument]),
          }),
        } as any);

        (chunkDocument as any).mockReturnValue([{ content: 'Test', position: 0, metadata: {} }]);

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockRejectedValue(new Error('API error')),
        }));

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow('Embedding generation failed');
      });

      it('should handle embedding count mismatch', async () => {
        const { caller, mockDb } = createCaller('admin');
        const { chunkDocument, VoyageEmbeddingProvider } = await import('@platform/knowledge');

        mockDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDocument]),
          }),
        } as any);

        const mockChunks = [
          { content: 'Chunk 1', position: 0, metadata: {} },
          { content: 'Chunk 2', position: 1, metadata: {} },
        ];
        (chunkDocument as any).mockReturnValue(mockChunks);

        // Return only 1 embedding for 2 chunks
        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2]]),
        }));

        await expect(
          caller.upload({
            title: 'Test',
            content: 'Content',
          })
        ).rejects.toThrow('Embedding generation failed');
      });
    });
  });

  describe('Semantic Search', () => {
    describe('search - Vector Similarity Search', () => {
      it('should perform semantic search successfully', async () => {
        const { caller, mockDb } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        // Mock query embedding
        const mockQueryEmbedding = [0.1, 0.2, 0.3];
        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([mockQueryEmbedding]),
        }));

        // Mock similarity search results
        const mockResults = {
          rows: [
            {
              id: 'chunk_1',
              document_id: 'doc_1',
              content: 'Relevant content',
              position: 0,
              metadata: null,
              document_title: 'Test Doc',
              document_category: 'general',
              similarity_score: 0.95,
            },
            {
              id: 'chunk_2',
              document_id: 'doc_2',
              content: 'Another relevant content',
              position: 0,
              metadata: null,
              document_title: 'Test Doc 2',
              document_category: 'general',
              similarity_score: 0.75,
            },
          ],
        };

        // Use helper to setup mock execute result
        setupMockExecuteResult(mockDb, mockResults);

        const result = await caller.search({
          query: 'test query',
          limit: 5,
          minScore: 0.7,
        });

        expect(result.results).toHaveLength(2);
        expect(result.results[0].similarityScore).toBe('0.9500');
        expect(result.results[0].relevance).toBe('high');
        expect(result.results[1].similarityScore).toBe('0.7500');
        expect(result.results[1].relevance).toBe('medium');
      });

      it('should filter results by minimum score', async () => {
        const { caller, mockDb } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
        }));

        const mockResults = {
          rows: [
            {
              id: 'chunk_1',
              document_id: 'doc_1',
              content: 'High relevance',
              position: 0,
              metadata: null,
              document_title: 'Test',
              document_category: 'general',
              similarity_score: 0.9,
            },
            {
              id: 'chunk_2',
              document_id: 'doc_2',
              content: 'Low relevance',
              position: 0,
              metadata: null,
              document_title: 'Test 2',
              document_category: 'general',
              similarity_score: 0.5, // Below minScore
            },
          ],
        };

        // Use helper to setup mock execute result
        setupMockExecuteResult(mockDb, mockResults);

        const result = await caller.search({
          query: 'test',
          minScore: 0.7,
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].similarityScore).toBe('0.9000');
      });

      it('should filter by category', async () => {
        const { caller, mockDb } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
        }));

        // Use helper to setup mock execute result
        setupMockExecuteResult(mockDb, { rows: [] });

        await caller.search({
          query: 'test',
          category: 'technical',
        });

        expect(mockDb.execute).toHaveBeenCalled();
      });

      it('should validate query is required', async () => {
        const { caller } = createCaller();

        await expect(caller.search({ query: '' })).rejects.toThrow();
      });

      it('should validate limit bounds (min 1, max 20)', async () => {
        const { caller } = createCaller();

        await expect(caller.search({ query: 'test', limit: 0 })).rejects.toThrow();
        await expect(caller.search({ query: 'test', limit: 21 })).rejects.toThrow();
      });

      it('should validate minScore bounds (0-1)', async () => {
        const { caller } = createCaller();

        await expect(caller.search({ query: 'test', minScore: -0.1 })).rejects.toThrow();
        await expect(caller.search({ query: 'test', minScore: 1.1 })).rejects.toThrow();
      });

      it('should throw error if VOYAGE_API_KEY not configured', async () => {
        const { caller } = createCaller();

        delete process.env.VOYAGE_API_KEY;

        await expect(caller.search({ query: 'test' })).rejects.toThrow(
          'Semantic search not configured'
        );
      });

      it('should handle embedding generation failure', async () => {
        const { caller } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockRejectedValue(new Error('API error')),
        }));

        await expect(caller.search({ query: 'test' })).rejects.toThrow();
      });

      it('should handle null query embedding', async () => {
        const { caller } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([null]),
        }));

        await expect(caller.search({ query: 'test' })).rejects.toThrow(
          'Failed to generate query embedding'
        );
      });

      it('should handle database errors', async () => {
        const { caller, mockDb } = createCaller();
        const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

        (VoyageEmbeddingProvider as any).mockImplementation(() => ({
          embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
        }));

        // Setup mock to reject with error
        mockDb.execute.mockRejectedValue(new Error('Database error'));

        await expect(caller.search({ query: 'test' })).rejects.toThrow();
      });
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow member to list documents', async () => {
      const { caller, mockDb } = createCaller('member');

      // Use helper to setup mock query with count
      setupMockQueryWithCount(mockDb, [], 0);

      const result = await caller.list({});
      expect(result.documents).toEqual([]);
    });

    it('should allow member to search documents', async () => {
      const { caller, mockDb } = createCaller('member');
      const { VoyageEmbeddingProvider } = await import('@platform/knowledge');

      (VoyageEmbeddingProvider as any).mockImplementation(() => ({
        embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      }));

      // Use helper to setup mock execute result
      setupMockExecuteResult(mockDb, { rows: [] });

      const result = await caller.search({ query: 'test' });
      expect(result.results).toEqual([]);
    });

    // RBAC enforcement tested via middleware - admin/owner procedures tested above
  });
});
