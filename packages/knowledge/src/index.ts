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
export type { VoyageConfig } from './embeddings';

export {
  VoyageEmbeddingProvider,
  createVoyageProvider,
} from './embeddings';

// Cohere reranking (Phase 10)
export type { RerankOptions, RerankResult } from './reranker';

export {
  cohereReranker,
  isCohereRerankingEnabled,
  estimateCohereRerankingCost,
} from './reranker';

// Problem deduplication (Phase 11 Week 4)
export {
  checkForSimilarProblem,
  createOrUpdateUnresolvedProblem,
  checkIfUserBlocked,
  approveSolutionDraft,
} from './problem-deduplication';

// DBSCAN clustering for knowledge gap detection (Phase 10)
export type {
  QueryCluster,
  KnowledgeGap,
  ClusteringOptions,
} from './clustering';

export {
  clusterQueries,
  detectKnowledgeGaps,
  estimateClusteringCost,
} from './clustering';

// LlamaIndex memory system (Phase 10)
export type {
  MemoryOptions,
  MemorySummary,
} from './memory';

export {
  ConversationMemory,
  MemoryManager,
  buildRAGPromptWithMemory,
  estimateMemoryCost,
} from './memory';

// Phase 12 Week 1: Advanced retrieval
export type {
  QueryType,
  RetrievalResult,
} from './retrieval/hybrid-search';

export type {
  Chunk,
  DocumentHierarchy,
} from './retrieval/small2big';

export {
  HybridRetriever,
} from './retrieval/hybrid-search';

export {
  Small2BigRetriever,
} from './retrieval/small2big';

// Phase 12 Week 1-2: Enhanced RAG + Cache Warming
export type {
  EnhancedRAGOptions,
} from './rag-hybrid';

export {
  executeEnhancedRAGQuery,
  buildEnhancedRAGPrompt,
} from './rag-hybrid';

// Phase 12 Week 2: Cache warming
export type {
  CacheWarmingConfig,
  CacheWarmingStats,
} from './cache-warming';

export {
  warmEmbeddingCache,
  getCacheWarmingStats,
  clearEmbeddingCache,
  COMMON_QUERY_PATTERNS,
} from './cache-warming';

// Phase 12 Week 4: RAGAS evaluation framework
export type {
  RAGASMetrics,
  RAGASEvaluationInput,
  RAGASEvaluationResult,
  FaithfulnessDetails,
  RelevancyDetails,
  PrecisionDetails,
  RecallDetails,
  RAGASConfig,
  RegressionDetectionResult,
  QualityScoreResult,
} from './evaluation/ragas';

export {
  RAGASEvaluator,
  DEFAULT_RAGAS_CONFIG,
  detectRegression,
  calculateQualityScore,
} from './evaluation/ragas';

export type {
  TestRunConfig,
  TestRunResult,
} from './evaluation/test-runner';

export {
  RAGASTestRunner,
} from './evaluation/test-runner';

export {
  DEFAULT_TEST_SETS,
  createDefaultTestSet,
  getAvailableTestSets,
  getTestSetStats,
} from './evaluation/test-sets';

// ==================== INTELLIGENT ROUTING (PHASE 12 WEEK 7-8) ====================

export type {
  ComplexityScore,
  ComplexityAnalysisInput,
  ComplexityScorerConfig,
  Intent,
  IntentClassificationResult,
  IntentClassificationInput,
  IntentClassifierConfig,
  RouteDecision,
  RoutingConfig,
} from './routing';

export {
  ComplexityScorer,
  IntentClassifier,
  IntelligentRouter,
} from './routing';

// ==================== A/B TESTING (PHASE 12 WEEK 9-10) ====================

export type {
  Variant,
  VariantType,
  Experiment,
  VariantSelection,
  ExperimentResult,
  MetricLabels,
  PrometheusMetric,
  MetricsCollector,
} from './ab-testing';

export {
  VariantManager,
  ABTestingMetricsCollector,
  getMetricsCollector,
  exportPrometheusMetrics,
  resetMetrics,
} from './ab-testing';
