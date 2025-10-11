/**
 * RAG Query Engine (Phase 5 - Week 1)
 * Hybrid retrieval with semantic search + keyword matching + reranking
 */

import { knowledgeChunks, knowledgeDocuments } from '@platform/db';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createVoyageProvider } from './embeddings';
import type { RAGQueryOptions, RAGResult, SearchResult } from './types';

/**
 * Result shape from semantic search SQL query
 */
interface SemanticSearchRow {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  chunk_index: number;
  semantic_score: number;
}

/**
 * Result shape from keyword search SQL query
 */
interface KeywordSearchRow {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  chunk_index: number;
  keyword_score: number;
}

/**
 * Execute RAG query with hybrid retrieval
 *
 * Combines:
 * 1. Semantic search (pgvector cosine similarity)
 * 2. Keyword search (PostgreSQL full-text search)
 * 3. Reranking (score normalization and weighting)
 *
 * @param db - Drizzle database instance
 * @param options - Query options
 * @returns RAG result with context and chunks
 */
export async function executeRAGQuery<T extends Record<string, unknown>>(
  db: NodePgDatabase<T>,
  options: RAGQueryOptions
): Promise<RAGResult> {
  const startTime = Date.now();

  const {
    query,
    topK = 5,
    minScore = 0.7,
    hybridWeights = { semantic: 0.7, keyword: 0.3 },
    useReranking = true,
  } = options;

  try {
    // Step 1: Generate query embedding using Voyage AI
    const voyageProvider = createVoyageProvider();
    const queryEmbedding = await voyageProvider.embed(query, 'query');

    // Step 2: Semantic search with pgvector
    // Use cosine distance operator (<=>)
    // Convert to similarity score: 1 - distance
    // RLS policies automatically filter by tenant_id via get_current_tenant_id()
    const semanticResults = (await db.execute(sql`
      SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.metadata,
        kc.position as chunk_index,
        1 - (kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_score
      FROM ${knowledgeChunks} kc
      INNER JOIN ${knowledgeDocuments} kd ON kc.document_id = kd.id
      ORDER BY kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${topK * 2}
    `)) as unknown as SemanticSearchRow[];

    // Step 3: Keyword search with PostgreSQL full-text search
    // RLS policies automatically filter by tenant_id via get_current_tenant_id()
    const keywordResults = (await db.execute(sql`
      SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.metadata,
        kc.position as chunk_index,
        ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', ${query})) as keyword_score
      FROM ${knowledgeChunks} kc
      INNER JOIN ${knowledgeDocuments} kd ON kc.document_id = kd.id
      WHERE to_tsvector('english', kc.content) @@ plainto_tsquery('english', ${query})
      ORDER BY keyword_score DESC
      LIMIT ${topK * 2}
    `)) as unknown as KeywordSearchRow[];

    // Step 4: Merge and rerank results
    // Smart fallback: If keyword search returns 0 results, skip hybrid reranking
    // and use pure semantic scores to avoid penalizing good semantic matches
    const shouldUseReranking = useReranking && keywordResults.length > 0;

    const mergedResults = shouldUseReranking
      ? mergeAndRerank(semanticResults, keywordResults, hybridWeights)
      : semanticResults.map((r) => ({
          chunk: {
            id: r.id,
            documentId: r.document_id,
            content: r.content,
            embedding: [], // Don't return full embedding
            metadata: r.metadata || {},
            chunkIndex: r.chunk_index || 0,
          },
          score: r.semantic_score,
          relevance:
            r.semantic_score >= 0.8
              ? ('high' as const)
              : r.semantic_score >= 0.6
                ? ('medium' as const)
                : ('low' as const),
        }));

    // Step 5: Filter by minimum score and limit to topK
    const filteredResults = mergedResults.filter((r) => r.score >= minScore).slice(0, topK);

    // Step 6: Build context from top chunks
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
    console.error('RAG query failed:', error);
    throw new Error(
      `Failed to execute RAG query: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Merge and rerank results from semantic and keyword search
 *
 * Normalizes scores to [0, 1] range and applies weighted combination
 */
function mergeAndRerank(
  semanticResults: SemanticSearchRow[],
  keywordResults: KeywordSearchRow[],
  weights: { semantic: number; keyword: number }
): SearchResult[] {
  // Create a map to combine scores for the same chunk
  const scoreMap = new Map<
    string,
    { chunk: SemanticSearchRow | KeywordSearchRow; semanticScore: number; keywordScore: number }
  >();

  // Add semantic results
  for (const result of semanticResults) {
    scoreMap.set(result.id, {
      chunk: result,
      semanticScore: result.semantic_score || 0,
      keywordScore: 0,
    });
  }

  // Add/merge keyword results
  for (const result of keywordResults) {
    const existing = scoreMap.get(result.id);
    if (existing) {
      existing.keywordScore = result.keyword_score || 0;
    } else {
      scoreMap.set(result.id, {
        chunk: result,
        semanticScore: 0,
        keywordScore: result.keyword_score || 0,
      });
    }
  }

  // Normalize keyword scores to [0, 1] range
  const maxKeywordScore = Math.max(...Array.from(scoreMap.values()).map((d) => d.keywordScore), 0);

  // Calculate hybrid scores
  const results: SearchResult[] = [];
  for (const [_id, data] of scoreMap) {
    // Normalize keyword score if max > 0
    const normalizedKeywordScore = maxKeywordScore > 0 ? data.keywordScore / maxKeywordScore : 0;

    const hybridScore =
      data.semanticScore * weights.semantic + normalizedKeywordScore * weights.keyword;

    results.push({
      chunk: {
        id: data.chunk.id,
        documentId: data.chunk.document_id,
        content: data.chunk.content,
        embedding: [], // Don't return full embedding
        metadata: data.chunk.metadata || {},
        chunkIndex: data.chunk.chunk_index || 0,
      },
      score: hybridScore,
      relevance: hybridScore >= 0.8 ? 'high' : hybridScore >= 0.6 ? 'medium' : 'low',
    });
  }

  // Sort by hybrid score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Build enhanced prompt with RAG context
 *
 * Formats the retrieved context and adds instructions for the AI
 */
export function buildRAGPrompt(query: string, context: string): string {
  return `You are an AI assistant with access to the following knowledge base context. Use this information to answer the user's question accurately and concisely. If the context doesn't contain relevant information, say so and answer based on your general knowledge.

CONTEXT:
${context}

USER QUESTION:
${query}

INSTRUCTIONS:
- Cite specific information from the context when relevant using [1], [2], etc.
- If the context doesn't help, acknowledge that and provide a general answer
- Be concise and direct
- If you're uncertain, say so`;
}
