/**
 * Voyage AI Embeddings Integration (Phase 5 - Priority 2)
 * Voyage Multimodal-3 embeddings for RAG
 */

import type { EmbeddingProvider } from './types';

/**
 * Voyage AI configuration
 */
export interface VoyageConfig {
  apiKey: string;
  model?: string;
  inputType?: 'query' | 'document';
  truncation?: boolean;
}

/**
 * Voyage AI API response
 */
interface VoyageResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * Voyage AI Embedding Provider
 *
 * Implements EmbeddingProvider interface for Voyage-2
 * Model specs:
 * - Dimensions: 1024 (voyage-2)
 * - Max input: 16K tokens
 * - Pricing: $0.12/1M tokens
 * - Best for: General-purpose retrieval (text, code)
 */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.voyageai.com/v1';

  constructor(config: VoyageConfig) {
    if (!config.apiKey) {
      throw new Error('Voyage API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'voyage-2';
  }

  /**
   * Sanitize text for Voyage API
   * Removes invalid UTF-8 characters and normalizes whitespace
   */
  private sanitizeText(text: string): string {
    return (
      text
        // Replace invalid UTF-8 characters with space
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
        // Normalize unicode
        .normalize('NFC')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Trim
        .trim()
    );
  }

  /**
   * Generate embedding for single text
   *
   * @param text - Text to embed
   * @param inputType - 'query' for search queries, 'document' for knowledge base content
   * @returns 1024-dimensional embedding vector
   */
  async embed(text: string, inputType: 'query' | 'document' = 'document'): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const embeddings = await this.embedBatch([text], inputType);
    return embeddings[0] || [];
  }

  /**
   * Generate embeddings for multiple texts (batch)
   *
   * Batch processing is more efficient for multiple documents
   * Voyage API supports up to 128 texts per batch
   *
   * @param texts - Array of texts to embed
   * @param inputType - 'query' or 'document'
   * @returns Array of 1024-dimensional embedding vectors
   */
  async embedBatch(
    texts: string[],
    inputType: 'query' | 'document' = 'document'
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (texts.length > 128) {
      throw new Error('Batch size cannot exceed 128 texts');
    }

    // Validate and sanitize texts
    const validTexts = texts
      .filter((t) => t && t.trim().length > 0)
      .map((t) => this.sanitizeText(t));

    if (validTexts.length === 0) {
      throw new Error('All texts are empty');
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: validTexts,
          input_type: inputType,
          truncation: true, // Auto-truncate if exceeds 32K tokens
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voyage API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as VoyageResponse;

      // Verify response format
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from Voyage API');
      }

      // Extract embeddings in original order
      const embeddings = data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);

      // Verify dimensions
      for (const embedding of embeddings) {
        if (embedding.length !== 1024) {
          throw new Error(`Invalid embedding dimension: expected 1024, got ${embedding.length}`);
        }
      }

      return embeddings;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Embedding generation failed: ${error.message}`);
      }
      throw new Error('Embedding generation failed: Unknown error');
    }
  }

  /**
   * Calculate cost for embedding operation
   *
   * Voyage pricing: $0.12 per 1M tokens
   * Average: 1 token ≈ 4 characters
   *
   * @param textLength - Total characters in texts
   * @returns Estimated cost in USD
   */
  estimateCost(textLength: number): number {
    const estimatedTokens = Math.ceil(textLength / 4);
    const costPerMillionTokens = 0.12;
    return (estimatedTokens / 1_000_000) * costPerMillionTokens;
  }

  /**
   * Validate Voyage API key format
   */
  static validateApiKey(apiKey: string): boolean {
    // Voyage keys start with "pa-" (production) or "pk-test-" (test)
    return apiKey.startsWith('pa-') || apiKey.startsWith('pk-test-');
  }
}

/**
 * Create Voyage embedding provider from environment
 *
 * Reads API key from VOYAGE_API_KEY environment variable
 */
export function createVoyageProvider(): VoyageEmbeddingProvider {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VOYAGE_API_KEY environment variable is required. Get your key at https://www.voyageai.com/'
    );
  }

  if (!VoyageEmbeddingProvider.validateApiKey(apiKey)) {
    throw new Error('Invalid Voyage API key format. Keys should start with "pa-" or "pk-test-"');
  }

  return new VoyageEmbeddingProvider({
    apiKey,
    model: 'voyage-2',
  });
}
