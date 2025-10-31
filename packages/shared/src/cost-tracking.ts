/**
 * Phase 10 Cost Tracking Utilities
 * Enhanced cost tracking for caching, reranking, clustering, and memory
 */

/**
 * Cache statistics for cost tracking
 */
export interface CacheStatistics {
  /** Tokens written to cache (charged at 25% of input rate) */
  cacheWriteTokens: number;
  /** Tokens read from cache (charged at 10% of input rate) */
  cacheReadTokens: number;
  /** Cache hit rate (0.0-1.0) */
  cacheHitRate: number;
  /** Total input tokens (including cache writes) */
  totalInputTokens: number;
  /** Regular input tokens (not from cache) */
  regularInputTokens: number;
}

/**
 * Reranking cost breakdown
 */
export interface RerankingCost {
  /** Number of documents reranked */
  documentCount: number;
  /** Cost per 1K searches: $2.00 */
  costPerSearch: number;
  /** Total reranking cost */
  totalCost: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Memory operation cost breakdown
 */
export interface MemoryCost {
  /** Number of messages stored */
  messageCount: number;
  /** Total tokens in memory */
  tokenCount: number;
  /** Storage/retrieval cost */
  operationCost: number;
  /** Session duration in minutes */
  sessionDurationMinutes: number;
}

/**
 * Clustering cost breakdown
 */
export interface ClusteringCost {
  /** Number of queries clustered */
  queryCount: number;
  /** Embedding cost (Voyage AI) */
  embeddingCost: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Calculate Anthropic prompt caching cost
 *
 * Pricing:
 * - Cache writes: 25% of base input token price
 * - Cache reads: 10% of base input token price
 * - Regular input: 100% of base input token price
 *
 * Example (Claude Sonnet 3.5):
 * - Base input: $3.00 per 1M tokens
 * - Cache write: $0.75 per 1M tokens (25%)
 * - Cache read: $0.30 per 1M tokens (10%)
 *
 * @param stats - Cache statistics
 * @param baseInputCostPer1M - Base input token cost per 1M tokens
 * @returns Cost breakdown and total
 */
export function calculateCacheCost(
  stats: CacheStatistics,
  baseInputCostPer1M = 3.0 // Default: Claude Sonnet 3.5
): {
  regularInputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  totalCost: number;
  savingsVsNoCache: number;
  savingsPercentage: number;
} {
  const regularInputCost = (stats.regularInputTokens / 1_000_000) * baseInputCostPer1M;
  const cacheWriteCost = (stats.cacheWriteTokens / 1_000_000) * (baseInputCostPer1M * 0.25);
  const cacheReadCost = (stats.cacheReadTokens / 1_000_000) * (baseInputCostPer1M * 0.10);

  const totalCost = regularInputCost + cacheWriteCost + cacheReadCost;

  // Calculate savings vs no cache (all tokens at full price)
  const noCacheCost = (stats.totalInputTokens / 1_000_000) * baseInputCostPer1M;
  const savingsVsNoCache = noCacheCost - totalCost;
  const savingsPercentage = noCacheCost > 0 ? (savingsVsNoCache / noCacheCost) * 100 : 0;

  return {
    regularInputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost,
    savingsVsNoCache,
    savingsPercentage,
  };
}

/**
 * Calculate Cohere reranking cost
 *
 * Pricing: $2.00 per 1,000 searches
 *
 * @param documentCount - Number of documents reranked
 * @param searchCount - Number of reranking operations (default: 1)
 * @returns Cost breakdown
 */
export function calculateRerankingCost(
  documentCount: number,
  searchCount = 1
): RerankingCost {
  const costPerSearch = 2.0 / 1000; // $2 per 1K searches
  const totalCost = searchCount * costPerSearch;

  return {
    documentCount,
    costPerSearch,
    totalCost,
    processingTimeMs: 0, // Set by caller
  };
}

/**
 * Calculate memory operation cost
 *
 * Simplified estimate based on token storage and retrieval
 * Pricing: $0.01 per 1K tokens for storage/retrieval operations
 *
 * @param messageCount - Number of messages in memory
 * @param avgTokensPerMessage - Average tokens per message (default: 50)
 * @returns Cost breakdown
 */
export function calculateMemoryCost(
  messageCount: number,
  avgTokensPerMessage = 50
): MemoryCost {
  const tokenCount = messageCount * avgTokensPerMessage;
  const costPer1KTokens = 0.01;
  const operationCost = (tokenCount / 1000) * costPer1KTokens;

  return {
    messageCount,
    tokenCount,
    operationCost,
    sessionDurationMinutes: 0, // Set by caller
  };
}

/**
 * Calculate clustering cost
 *
 * Based on Voyage AI embedding costs for query embeddings
 * Pricing: $0.06 per 1M tokens (Voyage Multimodal-3)
 * Average query: ~10 tokens
 *
 * @param queryCount - Number of queries to cluster
 * @param tokensPerQuery - Average tokens per query (default: 10)
 * @returns Cost breakdown
 */
export function calculateClusteringCost(
  queryCount: number,
  tokensPerQuery = 10
): ClusteringCost {
  const totalTokens = queryCount * tokensPerQuery;
  const costPer1MTokens = 0.06; // Voyage Multimodal-3
  const embeddingCost = (totalTokens / 1_000_000) * costPer1MTokens;

  return {
    queryCount,
    embeddingCost,
    processingTimeMs: 0, // Set by caller
  };
}

/**
 * Calculate total Phase 10 cost savings
 *
 * Compares Phase 10 enhanced costs against baseline costs
 *
 * @param baseline - Baseline costs without Phase 10 enhancements
 * @param enhanced - Enhanced costs with Phase 10 features
 * @returns Savings breakdown
 */
export function calculatePhase10Savings(
  baseline: {
    totalLLMCost: number;
    totalRAGCost: number;
  },
  enhanced: {
    llmCostWithCache: number;
    ragCostWithReranking: number;
    rerankingCost: number;
    memoryCost: number;
    clusteringCost: number;
  }
): {
  llmSavings: number;
  llmSavingsPercentage: number;
  ragSavings: number;
  ragSavingsPercentage: number;
  totalSavings: number;
  totalSavingsPercentage: number;
  additionalCosts: number;
} {
  // LLM savings from prompt caching
  const llmSavings = baseline.totalLLMCost - enhanced.llmCostWithCache;
  const llmSavingsPercentage =
    baseline.totalLLMCost > 0 ? (llmSavings / baseline.totalLLMCost) * 100 : 0;

  // RAG cost comparison (reranking adds cost but improves accuracy)
  const enhancedRAGTotal = enhanced.ragCostWithReranking + enhanced.rerankingCost;
  const ragSavings = baseline.totalRAGCost - enhancedRAGTotal;
  const ragSavingsPercentage =
    baseline.totalRAGCost > 0 ? (ragSavings / baseline.totalRAGCost) * 100 : 0;

  // Additional costs (memory, clustering)
  const additionalCosts = enhanced.memoryCost + enhanced.clusteringCost;

  // Total savings
  const baselineTotal = baseline.totalLLMCost + baseline.totalRAGCost;
  const enhancedTotal =
    enhanced.llmCostWithCache +
    enhanced.ragCostWithReranking +
    enhanced.rerankingCost +
    enhanced.memoryCost +
    enhanced.clusteringCost;
  const totalSavings = baselineTotal - enhancedTotal;
  const totalSavingsPercentage = baselineTotal > 0 ? (totalSavings / baselineTotal) * 100 : 0;

  return {
    llmSavings,
    llmSavingsPercentage,
    ragSavings,
    ragSavingsPercentage,
    totalSavings,
    totalSavingsPercentage,
    additionalCosts,
  };
}

/**
 * Format cost as USD string
 *
 * @param cost - Cost in USD
 * @param decimals - Number of decimal places (default: 6)
 * @returns Formatted cost string
 */
export function formatCost(cost: number, decimals = 6): string {
  return `$${cost.toFixed(decimals)}`;
}

/**
 * Format percentage with sign
 *
 * @param percentage - Percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number, decimals = 2): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}

/**
 * Cost tracking summary for Phase 10 features
 */
export interface Phase10CostSummary {
  cacheCost: ReturnType<typeof calculateCacheCost>;
  rerankingCost: RerankingCost;
  memoryCost: MemoryCost;
  clusteringCost: ClusteringCost;
  totalPhase10Cost: number;
  savingsVsBaseline?: ReturnType<typeof calculatePhase10Savings>;
}
