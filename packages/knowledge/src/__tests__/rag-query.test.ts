/**
 * RAG Query Engine Tests
 *
 * Tests hybrid retrieval, reranking, and context building.
 */

import { describe, expect, it, vi } from 'vitest';
import { buildRAGPrompt, executeRAGQuery } from '../rag-query';
import type { RAGQueryOptions } from '../types';

// Mock database module to avoid DATABASE_URL requirement
vi.mock('@platform/db', () => ({
  knowledgeChunks: 'knowledge_chunks',
  knowledgeDocuments: 'knowledge_documents',
}));

// Mock dependencies
vi.mock('../embeddings', () => ({
  createVoyageProvider: vi.fn(() => ({
    embed: vi.fn().mockResolvedValue(Array.from({ length: 1024 }, (_, i) => i / 1024)),
  })),
}));

vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock reranker module - disable Cohere reranking for tests
vi.mock('../reranker', () => ({
  cohereReranker: {
    rerankSearchResults: vi.fn((query, results) => Promise.resolve(results)),
  },
  isCohereRerankingEnabled: vi.fn(() => false),
}));

describe('executeRAGQuery()', () => {
  // Mock database instance that matches drizzle's execute pattern
  const createMockDb = () => ({
    execute: vi.fn(),
  });

  describe('Semantic Search', () => {
    it('should execute semantic search with embeddings', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          // Semantic results
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test content 1',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.95,
          },
          {
            id: 'chunk-2',
            document_id: 'doc-1',
            content: 'Test content 2',
            metadata: {},
            chunk_index: 1,
            semantic_score: 0.85,
          },
        ])
        .mockResolvedValueOnce([
          // Keyword results
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test content 1',
            metadata: {},
            chunk_index: 0,
            keyword_score: 0.8,
          },
        ]);

      const options: RAGQueryOptions = {
        query: 'What is AI?',
        topK: 5,
      };

      const result = await executeRAGQuery(mockDb as any, options);

      expect(mockDb.execute).toHaveBeenCalledTimes(2); // Semantic + keyword
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.totalChunks).toBe(result.chunks.length);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should filter results by minimum score', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'High relevance',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.9,
          },
          {
            id: 'chunk-2',
            document_id: 'doc-1',
            content: 'Low relevance',
            metadata: {},
            chunk_index: 1,
            semantic_score: 0.5,
          },
        ])
        .mockResolvedValueOnce([]);

      const options: RAGQueryOptions = {
        query: 'Test query',
        minScore: 0.7,
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Only chunk-1 should pass the 0.7 threshold
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0]?.chunk.content).toBe('High relevance');
    });

    it('should limit results to topK', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (_, i) => ({
            id: `chunk-${i}`,
            document_id: 'doc-1',
            content: `Content ${i}`,
            metadata: {},
            chunk_index: i,
            semantic_score: 0.9 - i * 0.05,
          }))
        )
        .mockResolvedValueOnce([]);

      const options: RAGQueryOptions = {
        query: 'Test query',
        topK: 3,
        minScore: 0.5,
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Should return exactly 3 chunks
      expect(result.chunks).toHaveLength(3);
      expect(result.totalChunks).toBe(3);
    });
  });

  describe('Keyword Search', () => {
    it('should execute keyword search with full-text search', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'AI and machine learning',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.8,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'AI and machine learning',
            metadata: {},
            chunk_index: 0,
            keyword_score: 0.9,
          },
          {
            id: 'chunk-2',
            document_id: 'doc-1',
            content: 'AI applications',
            metadata: {},
            chunk_index: 1,
            keyword_score: 0.6,
          },
        ]);

      const options: RAGQueryOptions = {
        query: 'AI machine learning',
      };

      const result = await executeRAGQuery(mockDb as any, options);

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should handle empty keyword results gracefully', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Content without matching keywords',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.85,
          },
        ])
        .mockResolvedValueOnce([]); // No keyword matches

      const options: RAGQueryOptions = {
        query: 'Very specific technical term',
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Should still return semantic results
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0]?.score).toBe(0.85); // Pure semantic score
    });
  });

  describe('Hybrid Reranking', () => {
    it('should combine semantic and keyword scores', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test content',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.8,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test content',
            metadata: {},
            chunk_index: 0,
            keyword_score: 0.6,
          },
        ]);

      const options: RAGQueryOptions = {
        query: 'Test query',
        hybridWeights: { semantic: 0.7, keyword: 0.3 },
        useReranking: true,
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Hybrid score should be weighted combination
      // semantic: 0.8 * 0.7 = 0.56
      // keyword (normalized): 0.6 * 0.3 = 0.18
      // total: ~0.74
      expect(result.chunks[0]?.score).toBeGreaterThan(0.5);
      expect(result.chunks[0]?.score).toBeLessThan(1.0);
    });

    it('should allow custom hybrid weights', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.9,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test',
            metadata: {},
            chunk_index: 0,
            keyword_score: 0.5,
          },
        ]);

      const options: RAGQueryOptions = {
        query: 'Test',
        hybridWeights: { semantic: 0.9, keyword: 0.1 }, // Heavy semantic weight
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Score should be heavily influenced by semantic
      expect(result.chunks[0]?.score).toBeGreaterThan(0.8);
    });

    it('should disable reranking when useReranking is false', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.85,
          },
        ])
        .mockResolvedValueOnce([]);

      const options: RAGQueryOptions = {
        query: 'Test',
        useReranking: false,
      };

      const result = await executeRAGQuery(mockDb as any, options);

      // Should use pure semantic score
      expect(result.chunks[0]?.score).toBe(0.85);
    });
  });

  describe('Relevance Classification', () => {
    it('should classify high relevance (>= 0.8)', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'High relevance',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.9,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      expect(result.chunks[0]?.relevance).toBe('high');
    });

    it('should classify medium relevance (0.6-0.8)', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Medium relevance',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.75,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      expect(result.chunks[0]?.relevance).toBe('medium');
    });

    it('should classify low relevance (< 0.6)', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Low relevance',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.5,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, {
        query: 'Test',
        minScore: 0.4,
      });

      expect(result.chunks[0]?.relevance).toBe('low');
    });
  });

  describe('Context Building', () => {
    it('should build formatted context from chunks', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'First chunk content',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.9,
          },
          {
            id: 'chunk-2',
            document_id: 'doc-1',
            content: 'Second chunk content',
            metadata: {},
            chunk_index: 1,
            semantic_score: 0.8,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      expect(result.context).toContain('[1] First chunk content');
      expect(result.context).toContain('[2] Second chunk content');
      expect(result.context).toContain('\n\n'); // Chunks separated by double newline
    });

    it('should return empty context when no chunks', async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      expect(result.context).toBe('');
      expect(result.totalChunks).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockRejectedValueOnce(new Error('Database connection failed'));

      const options: RAGQueryOptions = {
        query: 'Test query',
      };

      await expect(executeRAGQuery(mockDb as any, options)).rejects.toThrow(
        'Failed to execute RAG query'
      );
    });

    it('should handle embedding generation errors', async () => {
      // Mock createVoyageProvider to throw error
      const { createVoyageProvider } = await import('../embeddings');
      vi.mocked(createVoyageProvider).mockImplementationOnce(() => {
        throw new Error('API key invalid');
      });

      const mockDb = createMockDb();
      const options: RAGQueryOptions = {
        query: 'Test query',
      };

      await expect(executeRAGQuery(mockDb as any, options)).rejects.toThrow();
    });
  });

  describe('Default Options', () => {
    it('should use default topK of 5', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (_, i) => ({
            id: `chunk-${i}`,
            document_id: 'doc-1',
            content: `Content ${i}`,
            metadata: {},
            chunk_index: i,
            semantic_score: 0.9,
          }))
        )
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, {
        query: 'Test',
        minScore: 0.5,
      });

      expect(result.chunks.length).toBeLessThanOrEqual(5);
    });

    it('should use default minScore of 0.3', async () => {
      // Default minScore was lowered to 0.3 because Cohere reranker returns scores 0-1,
      // often below 0.7 even for relevant docs
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'High score',
            metadata: {},
            chunk_index: 0,
            semantic_score: 0.5,
          },
          {
            id: 'chunk-2',
            document_id: 'doc-1',
            content: 'Low score',
            metadata: {},
            chunk_index: 1,
            semantic_score: 0.2,
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      // Only chunk with score >= 0.3 should be included
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0]?.score).toBeGreaterThanOrEqual(0.3);
    });

    it('should use default hybrid weights (0.7 semantic, 0.3 keyword)', async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test',
            metadata: {},
            chunk_index: 0,
            semantic_score: 1.0,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'chunk-1',
            document_id: 'doc-1',
            content: 'Test',
            metadata: {},
            chunk_index: 0,
            keyword_score: 1.0,
          },
        ]);

      const result = await executeRAGQuery(mockDb as any, { query: 'Test' });

      // Default weights: 1.0 * 0.7 + 1.0 * 0.3 = 1.0
      expect(result.chunks[0]?.score).toBeCloseTo(1.0, 2);
    });
  });
});

describe('buildRAGPrompt()', () => {
  it('should format prompt with context and query', () => {
    const query = 'What is machine learning?';
    const context = '[1] ML is a subset of AI\n\n[2] It learns from data';

    const prompt = buildRAGPrompt(query, context);

    expect(prompt).toContain('CONTEXT:');
    expect(prompt).toContain(context);
    expect(prompt).toContain('USER QUESTION:');
    expect(prompt).toContain(query);
    expect(prompt).toContain('INSTRUCTIONS:');
  });

  it('should include citation instructions', () => {
    const prompt = buildRAGPrompt('Test query', 'Test context');

    expect(prompt).toContain('[1], [2]');
    expect(prompt).toContain('Cite specific information');
  });

  it('should include fallback instructions', () => {
    const prompt = buildRAGPrompt('Test query', 'Test context');

    expect(prompt).toContain("context doesn't contain relevant information");
    expect(prompt).toContain('general knowledge');
  });

  it('should handle empty context', () => {
    const prompt = buildRAGPrompt('Test query', '');

    expect(prompt).toContain('CONTEXT:');
    expect(prompt).toContain('USER QUESTION:');
    // Should still have structure even with empty context
  });

  it('should handle multiline context', () => {
    const context = `[1] First chunk
with multiple lines

[2] Second chunk
also with multiple lines`;

    const prompt = buildRAGPrompt('Test query', context);

    expect(prompt).toContain('[1] First chunk');
    expect(prompt).toContain('[2] Second chunk');
  });
});
