/**
 * Phase 12 Week 1-2: Hybrid Search with RRF + Embeddings Cache
 * Combines semantic and keyword search for optimal retrieval
 */

import { sql } from 'drizzle-orm';
import { db } from '@platform/db';
import type { VoyageEmbeddingProvider } from '../embeddings';
import type Redis from 'ioredis';

export type QueryType = 'conceptual' | 'technical' | 'conversational' | 'exact_match';

export interface RetrievalResult {
  id: string;
  score: number;
  text: string;
  documentId: string;
  metadata?: Record<string, unknown>;
}

interface HybridSearchConfig {
  alphaByType: Record<QueryType, number>;
  fusionAlgorithm: 'weighted' | 'rrf';
}

const HYBRID_CONFIG: HybridSearchConfig = {
  alphaByType: {
    conceptual: 0.7,      // "How do I improve team collaboration?"
    technical: 0.5,       // "Configure SSL certificate nginx"
    conversational: 0.8,  // "Having trouble with login"
    exact_match: 0.3      // Product codes, error messages, SKUs
  },
  fusionAlgorithm: 'rrf' // Default to RRF (better for different relevance indicators)
};

/**
 * Phase 12 Week 2-3: Embedding cache configuration with tenant isolation
 */
const EMBEDDING_CACHE_TTL = 86400; // 24 hours in seconds

/**
 * Generate cache key with tenant isolation (Phase 12 Week 3)
 * Format: embedding:query:{tenantId}:{queryHash}
 */
function getCacheKey(tenantId: string, query: string): string {
  const queryHash = Buffer.from(query).toString('base64').substring(0, 64);
  return `embedding:query:${tenantId}:${queryHash}`;
}

export class HybridRetriever {
  constructor(
    private database: typeof db,
    private tenantId: string,
    private embeddingProvider?: VoyageEmbeddingProvider,
    private redis?: Redis
  ) {}

  async retrieve(
    query: string,
    topK: number = 25
  ): Promise<RetrievalResult[]> {
    // Classify query type
    const queryType = this.classifyQueryType(query);

    // Parallel retrieval
    const [semanticResults, bm25Results] = await Promise.all([
      this.semanticSearch(query, topK),
      this.keywordSearch(query, topK)
    ]);

    // Fusion
    if (HYBRID_CONFIG.fusionAlgorithm === 'rrf') {
      return this.reciprocalRankFusion(semanticResults, bm25Results);
    } else {
      const alpha = HYBRID_CONFIG.alphaByType[queryType];
      return this.weightedCombination(semanticResults, bm25Results, alpha);
    }
  }

  /**
   * Phase 12 Week 2-3: Get or generate query embedding with Redis caching + tenant isolation
   */
  private async getQueryEmbedding(query: string): Promise<number[] | null> {
    // Return null if no embedding provider (fallback to BM25 only)
    if (!this.embeddingProvider) {
      return null;
    }

    // Generate cache key with tenant isolation (Phase 12 Week 3)
    const cacheKey = getCacheKey(this.tenantId, query);

    // Try to get from cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as number[];
        }
      } catch (error) {
        // Cache miss or error - continue to generate
      }
    }

    // Generate new embedding
    const embedding = await this.embeddingProvider.embed(query, 'query');

    // Cache for future use with tenant isolation
    if (this.redis && embedding) {
      try {
        await this.redis.setex(
          cacheKey,
          EMBEDDING_CACHE_TTL,
          JSON.stringify(embedding)
        );
      } catch (error) {
        // Cache write failure - non-critical, continue
      }
    }

    return embedding;
  }

  private async semanticSearch(query: string, topK: number): Promise<RetrievalResult[]> {
    // Get query embedding (with caching)
    const queryEmbedding = await this.getQueryEmbedding(query);

    // Fallback to empty results if no embedding provider
    if (!queryEmbedding) {
      return [];
    }

    // Vector similarity search using pgvector (<=> operator)
    // Cosine distance: 0 = identical, 2 = opposite
    // Similarity score: 1 - distance (0 to 1, higher is better)
    const results = await this.database.execute(sql`
      SELECT
        id,
        content,
        document_id,
        metadata,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM knowledge_chunks
      WHERE tenant_id = ${this.tenantId}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${topK}
    `);

    return (results as unknown as Array<{
      id: string;
      content: string;
      document_id: string;
      metadata: unknown;
      similarity: string;
    }>).map((row) => ({
      id: row.id,
      score: parseFloat(row.similarity),
      text: row.content,
      documentId: row.document_id,
      metadata: row.metadata as Record<string, unknown> | undefined
    }));
  }

  private async keywordSearch(query: string, topK: number): Promise<RetrievalResult[]> {
    // BM25 full-text search using PostgreSQL tsvector
    const results = await this.database.execute(sql`
      SELECT
        id,
        content,
        document_id,
        metadata,
        ts_rank_cd(to_tsvector('english', content), query) AS rank
      FROM knowledge_chunks,
           to_tsquery('english', ${query}) query
      WHERE tenant_id = ${this.tenantId}
        AND to_tsvector('english', content) @@ query
      ORDER BY rank DESC
      LIMIT ${topK}
    `);

    return (results as unknown as Array<{ id: string; content: string; document_id: string; metadata: unknown; rank: string }>).map((row) => ({
      id: row.id,
      score: parseFloat(row.rank),
      text: row.content,
      documentId: row.document_id,
      metadata: row.metadata as Record<string, unknown> | undefined
    }));
  }

  private reciprocalRankFusion(
    semantic: RetrievalResult[],
    bm25: RetrievalResult[],
    k: number = 60
  ): RetrievalResult[] {
    const scores = new Map<string, { score: number; result: RetrievalResult }>();

    // RRF formula: score = Σ(1 / (k + rank_i))
    for (let i = 0; i < semantic.length; i++) {
      const result = semantic[i];
      if (!result) continue;

      const rrfScore = 1 / (k + i + 1);

      if (scores.has(result.id)) {
        const existing = scores.get(result.id)!;
        existing.score += rrfScore;
      } else {
        scores.set(result.id, { score: rrfScore, result });
      }
    }

    for (let i = 0; i < bm25.length; i++) {
      const result = bm25[i];
      if (!result) continue;

      const rrfScore = 1 / (k + i + 1);

      if (scores.has(result.id)) {
        const existing = scores.get(result.id)!;
        existing.score += rrfScore;
      } else {
        scores.set(result.id, { score: rrfScore, result });
      }
    }

    // Sort by combined score
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(({ result, score }) => ({ ...result, score }));
  }

  private weightedCombination(
    semantic: RetrievalResult[],
    bm25: RetrievalResult[],
    alpha: number
  ): RetrievalResult[] {
    const scores = new Map<string, { score: number; result: RetrievalResult }>();

    // Normalize scores first
    const maxSemantic = Math.max(...semantic.map(r => r.score), 1);
    const maxBM25 = Math.max(...bm25.map(r => r.score), 1);

    for (const result of semantic) {
      const normalizedScore = result.score / maxSemantic;
      scores.set(result.id, {
        score: alpha * normalizedScore,
        result: { ...result, score: normalizedScore }
      });
    }

    for (const result of bm25) {
      const normalizedScore = result.score / maxBM25;

      if (scores.has(result.id)) {
        const existing = scores.get(result.id)!;
        existing.score += (1 - alpha) * normalizedScore;
      } else {
        scores.set(result.id, {
          score: (1 - alpha) * normalizedScore,
          result: { ...result, score: normalizedScore }
        });
      }
    }

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(({ result, score }) => ({ ...result, score }));
  }

  private classifyQueryType(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // Exact match indicators
    if (/^[A-Z0-9-]+$/.test(query) || /error|code|sku/i.test(query)) {
      return 'exact_match';
    }

    // Technical indicators
    const technicalTerms = ['configure', 'implement', 'integrate', 'api', 'ssl', 'debug', 'install', 'setup'];
    if (technicalTerms.some(term => lowerQuery.includes(term))) {
      return 'technical';
    }

    // Conversational indicators
    if (lowerQuery.includes('how') || lowerQuery.includes('help') || lowerQuery.includes('trouble')) {
      return 'conversational';
    }

    return 'conceptual';
  }
}
