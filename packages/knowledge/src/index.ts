/**
 * Knowledge Base Package (Phase 5 - Week 1)
 * RAG system with hybrid retrieval
 */

export type {
  KnowledgeChunk,
  SearchResult,
  RAGQueryOptions,
  RAGResult,
  EmbeddingProvider,
} from './types';

export {
  executeRAGQuery,
  buildRAGPrompt,
} from './rag-query';

// Document chunking (Priority 2)
export type {
  ChunkOptions,
  TextChunk,
} from './chunking';

export {
  chunkDocument,
  estimateTokens,
  validateChunkOptions,
} from './chunking';

// Voyage AI embeddings (Priority 2)
export type {
  VoyageConfig,
} from './embeddings';

export {
  VoyageEmbeddingProvider,
  createVoyageProvider,
} from './embeddings';
