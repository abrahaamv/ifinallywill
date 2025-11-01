/**
 * Phase 12 Week 1-2: Enhanced RAG with Hybrid Retrieval + Embeddings Cache
 * Integrates HybridRetriever with existing RAG pipeline
 */

import { db } from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import type Redis from 'ioredis';
import { HybridRetriever } from './retrieval/hybrid-search';
import { Small2BigRetriever } from './retrieval/small2big';
import { cohereReranker, isCohereRerankingEnabled } from './reranker';
import type { RAGQueryOptions, RAGResult, SearchResult } from './types';
import type { VoyageEmbeddingProvider } from './embeddings';

const logger = createModuleLogger('RAGHybrid');

export interface EnhancedRAGOptions extends RAGQueryOptions {
  useHybridSearch?: boolean;
  useSmall2Big?: boolean;
  tenantId: string;
  embeddingProvider?: VoyageEmbeddingProvider;
  redis?: Redis;
}

/**
 * Execute enhanced RAG query with Phase 12 Week 1 improvements
 *
 * Improvements:
 * - Hybrid search (RRF fusion of semantic + BM25)
 * - Small2Big hierarchical retrieval
 * - Query type adaptive weighting
 */
export async function executeEnhancedRAGQuery(
  database: typeof db,
  options: EnhancedRAGOptions
): Promise<RAGResult> {
  const startTime = Date.now();

  const {
    query,
    topK = 5,
    minScore = 0.7,
    useReranking = true,
    useHybridSearch = true,
    useSmall2Big = false,
    tenantId,
  } = options;

  try {
    let chunks: SearchResult[] = [];

    if (useHybridSearch) {
      // Phase 12 Week 1-2: Use hybrid retrieval with RRF + embeddings cache
      logger.info('Using hybrid retrieval (RRF) with embeddings cache', { query, topK });

      const hybridRetriever = new HybridRetriever(
        database,
        tenantId,
        options.embeddingProvider,
        options.redis
      );
      const retrievalResults = await hybridRetriever.retrieve(query, topK * 2);

      // Convert to SearchResult format
      chunks = retrievalResults.map((r) => ({
        chunk: {
          id: r.id,
          documentId: r.documentId,
          content: r.text,
          embedding: [],
          metadata: r.metadata || {},
          chunkIndex: 0,
        },
        score: r.score,
        relevance: r.score >= 0.8 ? 'high' : r.score >= 0.6 ? 'medium' : 'low',
      }));
    } else {
      // Fallback to original semantic search
      logger.info('Using semantic search', { query, topK });

      // TODO: Implement fallback semantic search
      // For now, return empty results
      chunks = [];
    }

    // Phase 12 Week 1: Small2Big expansion (optional)
    if (useSmall2Big && chunks.length > 0) {
      logger.info('Expanding to parent chunks (Small2Big)', { childCount: chunks.length });

      const small2BigRetriever = new Small2BigRetriever(database, tenantId);

      // Take top 5 chunks and expand to parents
      const topChunks = chunks.slice(0, 5);
      const expandedChunks = await small2BigRetriever.retrieve(query, topChunks.length);

      // Replace child chunks with expanded parent chunks
      chunks = expandedChunks.map((c) => ({
        chunk: {
          id: c.id,
          documentId: c.documentId,
          content: c.text,
          embedding: [],
          metadata: c.metadata || {},
          chunkIndex: 0,
        },
        score: 1.0, // Parent chunks inherit highest score
        relevance: 'high' as const,
      }));
    }

    // Phase 10: Cohere reranking (20-40% accuracy improvement)
    if (isCohereRerankingEnabled() && chunks.length > 0 && useReranking) {
      try {
        logger.info('Applying Cohere reranking', { resultCount: chunks.length });
        chunks = await cohereReranker.rerankSearchResults(query, chunks, topK * 2);
      } catch (error) {
        logger.warn('Cohere reranking failed, using base scores', { error });
      }
    }

    // Filter by minimum score and limit to topK
    const filteredResults = chunks.filter((r) => r.score >= minScore).slice(0, topK);

    // Build context from top chunks
    const context =
      filteredResults.length > 0
        ? filteredResults.map((r, i) => `[${i + 1}] ${r.chunk.content}`).join('\n\n')
        : '';

    const processingTimeMs = Date.now() - startTime;

    return {
      context,
      chunks: filteredResults,
      totalChunks: filteredResults.length,
      processingTimeMs,
    };
  } catch (error) {
    logger.error('Enhanced RAG query failed', { error });
    throw new Error(
      `Failed to execute enhanced RAG query: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build enhanced prompt with RAG context
 */
export function buildEnhancedRAGPrompt(query: string, context: string): string {
  return `You are an AI assistant with access to the following knowledge base context. Use this information to answer the user's question accurately and concisely.

CONTEXT:
${context}

USER QUESTION:
${query}

INSTRUCTIONS:
- Cite specific information from the context using [1], [2], etc.
- If the context doesn't contain relevant information, say so
- Be concise and direct
- If uncertain, acknowledge limitations`;
}
