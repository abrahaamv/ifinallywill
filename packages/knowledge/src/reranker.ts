/**
 * Cohere Reranking Service (Phase 10 - Week 1)
 * 20-40% accuracy improvement over basic score merging
 * Cost: $2/1K searches
 */

import { CohereClientV2 } from 'cohere-ai';
import { createModuleLogger } from '@platform/shared';
import type { SearchResult } from './types';

const logger = createModuleLogger('CohereReranker');

export interface RerankOptions {
  /** Query string */
  query: string;
  /** Documents/chunks to rerank */
  documents: Array<{ id: string; content: string }>;
  /** Number of top results to return */
  topN?: number;
  /** Cohere model to use */
  model?: 'rerank-v3.5' | 'rerank-english-v3.0' | 'rerank-multilingual-v3.0';
}

export interface RerankResult {
  /** Reranked document ID */
  id: string;
  /** Relevance score from Cohere (0-1) */
  relevanceScore: number;
  /** Original index in input array */
  index: number;
}

/**
 * Cohere Reranker Client
 * Singleton instance with API key from environment
 */
class CohereReranker {
  private client: CohereClientV2 | null = null;

  /**
   * Initialize Cohere client with API key
   */
  private initialize(): void {
    if (this.client) return;

    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is not set');
    }

    this.client = new CohereClientV2({
      token: apiKey,
    });

    logger.info('Cohere reranker initialized');
  }

  /**
   * Rerank documents using Cohere Rerank API
   *
   * @param options - Reranking options
   * @returns Array of reranked results with relevance scores
   */
  async rerank(options: RerankOptions): Promise<RerankResult[]> {
    this.initialize();

    if (!this.client) {
      throw new Error('Cohere client not initialized');
    }

    const { query, documents, topN = 10, model = 'rerank-v3.5' } = options;

    if (documents.length === 0) {
      return [];
    }

    try {
      const startTime = Date.now();

      // Cohere rerank API expects array of strings
      const documentTexts = documents.map((doc) => doc.content);

      // Call Cohere Rerank API
      const response = await this.client.rerank({
        model,
        query,
        documents: documentTexts,
        topN: Math.min(topN, documents.length),
      });

      const processingTime = Date.now() - startTime;

      // Map results back to original document IDs
      const results: RerankResult[] =
        response.results?.map((result) => {
          const index = result.index ?? 0;
          return {
            id: documents[index]?.id ?? '',
            relevanceScore: result.relevanceScore ?? 0,
            index,
          };
        }) || [];

      logger.info('Cohere reranking completed', {
        query: query.slice(0, 50),
        inputCount: documents.length,
        outputCount: results.length,
        topScore: results[0]?.relevanceScore,
        processingTimeMs: processingTime,
        model,
      });

      return results;
    } catch (error) {
      logger.error('Cohere reranking failed', { error });
      throw new Error(
        `Failed to rerank with Cohere: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Rerank search results from hybrid retrieval
   * Maintains SearchResult format with updated scores
   *
   * @param query - User query
   * @param searchResults - Results from hybrid retrieval
   * @param topN - Number of top results to return
   * @returns Reranked search results
   */
  async rerankSearchResults(
    query: string,
    searchResults: SearchResult[],
    topN = 5
  ): Promise<SearchResult[]> {
    if (searchResults.length === 0) {
      return [];
    }

    // Prepare documents for reranking
    const documents = searchResults.map((result) => ({
      id: result.chunk.id,
      content: result.chunk.content,
    }));

    // Call Cohere rerank
    const rerankResults = await this.rerank({
      query,
      documents,
      topN,
    });

    // Map reranked scores back to search results
    const rerankMap = new Map(rerankResults.map((r) => [r.id, r.relevanceScore]));

    // Update search results with Cohere scores and sort
    const rerankedSearchResults = searchResults
      .map((result) => {
        const cohereScore = rerankMap.get(result.chunk.id);
        if (cohereScore === undefined) return null;

        return {
          ...result,
          score: cohereScore,
          relevance:
            cohereScore >= 0.8
              ? ('high' as const)
              : cohereScore >= 0.6
                ? ('medium' as const)
                : ('low' as const),
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score);

    return rerankedSearchResults;
  }
}

// Export singleton instance
export const cohereReranker = new CohereReranker();

/**
 * Utility function to check if Cohere reranking is enabled
 */
export function isCohereRerankingEnabled(): boolean {
  return !!process.env.COHERE_API_KEY;
}

/**
 * Estimate cost for Cohere reranking
 * $2 per 1,000 searches
 *
 * @param searchCount - Number of searches
 * @returns Estimated cost in USD
 */
export function estimateCohereRerankingCost(searchCount: number): number {
  const costPer1K = 2.0;
  return (searchCount / 1000) * costPer1K;
}
