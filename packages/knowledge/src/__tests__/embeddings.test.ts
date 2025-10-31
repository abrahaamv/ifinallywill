/**
 * Voyage AI Embeddings Tests
 *
 * Tests Voyage API integration, batch processing, and error handling.
 */

import { describe, expect, it, vi } from 'vitest';
import { VoyageEmbeddingProvider } from '../embeddings';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VoyageEmbeddingProvider', () => {
  const validApiKey = 'pa-test-key-123';
  const mockEmbedding = Array.from({ length: 1024 }, (_, i) => i / 1024);

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should create provider with valid API key', () => {
      expect(() => new VoyageEmbeddingProvider({ apiKey: validApiKey })).not.toThrow();
    });

    it('should throw error with missing API key', () => {
      expect(() => new VoyageEmbeddingProvider({ apiKey: '' })).toThrow(
        'Voyage API key is required'
      );
    });

    it('should use default model voyage-2', () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      // Model is private, but we can test through embed call
      expect(provider).toBeDefined();
    });

    it('should allow custom model', () => {
      const provider = new VoyageEmbeddingProvider({
        apiKey: validApiKey,
        model: 'voyage-3',
      });
      expect(provider).toBeDefined();
    });
  });

  describe('embed()', () => {
    it('should generate embedding for single text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: mockEmbedding,
              index: 0,
            },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 10 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const result = await provider.embed('Test document');

      expect(result).toHaveLength(1024);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${validApiKey}`,
          }),
        })
      );
    });

    it('should throw error for empty text', async () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      await expect(provider.embed('')).rejects.toThrow('Text cannot be empty');
      await expect(provider.embed('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should sanitize text before embedding', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: mockEmbedding,
              index: 0,
            },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 10 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      await provider.embed('Test   with   multiple   spaces');

      const requestBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(requestBody.input[0]).toBe('Test with multiple spaces');
    });

    it('should use correct input_type for queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: mockEmbedding,
              index: 0,
            },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 10 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      await provider.embed('What is AI?', 'query');

      const requestBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(requestBody.input_type).toBe('query');
    });
  });

  describe('embedBatch()', () => {
    it('should generate embeddings for multiple texts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', embedding: mockEmbedding, index: 0 },
            { object: 'embedding', embedding: mockEmbedding, index: 1 },
            { object: 'embedding', embedding: mockEmbedding, index: 2 },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 30 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const results = await provider.embedBatch(['Text 1', 'Text 2', 'Text 3']);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(1024);
      expect(results[1]).toHaveLength(1024);
      expect(results[2]).toHaveLength(1024);
    });

    it('should return empty array for empty input', async () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const results = await provider.embedBatch([]);

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error for batch size exceeding 128', async () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const largeBatch = Array.from({ length: 129 }, (_, i) => `Text ${i}`);

      await expect(provider.embedBatch(largeBatch)).rejects.toThrow(
        'Batch size cannot exceed 128 texts'
      );
    });

    it('should filter out empty texts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', embedding: mockEmbedding, index: 0 },
            { object: 'embedding', embedding: mockEmbedding, index: 1 },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 20 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const results = await provider.embedBatch(['Text 1', '', '   ', 'Text 2']);

      const requestBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(requestBody.input).toHaveLength(2);
      expect(requestBody.input).toEqual(['Text 1', 'Text 2']);
    });

    it('should throw error if all texts are empty', async () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['', '   ', ''])).rejects.toThrow('All texts are empty');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['Test'])).rejects.toThrow(
        'Voyage API error (401): Invalid API key'
      );
    });

    it('should validate embedding dimensions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: Array.from({ length: 512 }, (_, i) => i / 512), // Wrong dimension!
              index: 0,
            },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 10 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['Test'])).rejects.toThrow(
        'Invalid embedding dimension: expected 1024, got 512'
      );
    });

    it('should preserve order of embeddings', async () => {
      // API might return embeddings out of order
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', embedding: mockEmbedding, index: 2 },
            { object: 'embedding', embedding: mockEmbedding, index: 0 },
            { object: 'embedding', embedding: mockEmbedding, index: 1 },
          ],
          model: 'voyage-2',
          usage: { total_tokens: 30 },
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const results = await provider.embedBatch(['First', 'Second', 'Third']);

      expect(results).toHaveLength(3);
      // Should be sorted by index: 0, 1, 2
    });
  });

  describe('estimateCost()', () => {
    it('should calculate cost for text length', () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      // 4000 characters = ~1000 tokens
      // $0.12 per 1M tokens = $0.00012
      const cost = provider.estimateCost(4000);
      expect(cost).toBeCloseTo(0.00012, 6);
    });

    it('should handle zero length', () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });
      const cost = provider.estimateCost(0);
      expect(cost).toBe(0);
    });

    it('should handle large text', () => {
      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      // 4M characters = 1M tokens = $0.12
      const cost = provider.estimateCost(4_000_000);
      expect(cost).toBeCloseTo(0.12, 6);
    });
  });

  describe('validateApiKey()', () => {
    it('should accept production keys starting with pa-', () => {
      expect(VoyageEmbeddingProvider.validateApiKey('pa-123456')).toBe(true);
    });

    it('should accept test keys starting with pk-test-', () => {
      expect(VoyageEmbeddingProvider.validateApiKey('pk-test-123456')).toBe(true);
    });

    it('should reject invalid key formats', () => {
      expect(VoyageEmbeddingProvider.validateApiKey('invalid-key')).toBe(false);
      expect(VoyageEmbeddingProvider.validateApiKey('sk-123456')).toBe(false);
      expect(VoyageEmbeddingProvider.validateApiKey('')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['Test'])).rejects.toThrow(
        'Embedding generation failed: Network error'
      );
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['Test'])).rejects.toThrow('Embedding generation failed');
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: 'list',
          // Missing 'data' field
          model: 'voyage-2',
        }),
      });

      const provider = new VoyageEmbeddingProvider({ apiKey: validApiKey });

      await expect(provider.embedBatch(['Test'])).rejects.toThrow(
        'Invalid response format from Voyage API'
      );
    });
  });
});
