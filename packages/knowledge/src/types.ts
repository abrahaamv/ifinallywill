/**
 * Knowledge Base Types (Phase 5 - Week 1)
 * RAG system with hybrid retrieval
 */

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  chunkIndex: number;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface RAGQueryOptions {
  query: string;
  topK?: number;
  minScore?: number;
  hybridWeights?: {
    semantic: number;
    keyword: number;
  };
  useReranking?: boolean;
}

export interface RAGResult {
  context: string;
  chunks: SearchResult[];
  totalChunks: number;
  processingTimeMs: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
