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
