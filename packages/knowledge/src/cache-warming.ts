/**
 * Phase 12 Week 2: Query Embedding Cache Warming
 * Pre-populate Redis cache with embeddings for common queries
 */

import { createModuleLogger } from '@platform/shared';
import type Redis from 'ioredis';
import type { VoyageEmbeddingProvider } from './embeddings';

const logger = createModuleLogger('CacheWarming');

const EMBEDDING_CACHE_TTL = 86400; // 24 hours
const CACHE_KEY_PREFIX = 'embedding:query:';

/**
 * Common query patterns for cache warming
 */
export const COMMON_QUERY_PATTERNS = {
  technical: [
    'How do I configure SSL certificate',
    'API authentication setup',
    'Database connection error',
    'Deploy to production',
    'Install dependencies',
    'Configure environment variables',
    'Debug performance issues',
    'Set up CI/CD pipeline',
  ],
  conceptual: [
    'How do I improve team collaboration',
    'Best practices for code review',
    'Project management strategies',
    'Effective communication',
    'Team productivity tips',
    'Agile methodology',
  ],
  conversational: [
    'Having trouble with login',
    'Need help with setup',
    'How can I contact support',
    'Where do I find documentation',
    'What is the pricing',
    'How do I cancel subscription',
  ],
  exact_match: [
    'ERROR-404',
    'SKU-12345',
    'PRODUCT-CODE-ABC',
    'LICENSE-KEY-FORMAT',
  ],
};

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Redis client for caching */
  redis: Redis;
  /** Voyage embedding provider */
  embeddingProvider: VoyageEmbeddingProvider;
  /** Custom query patterns to warm */
  customQueries?: string[];
  /** Batch size for embedding generation */
  batchSize?: number;
  /** Cache TTL in seconds (default: 24h) */
  ttl?: number;
}

/**
 * Cache warming statistics
 */
export interface CacheWarmingStats {
  totalQueries: number;
  cachedQueries: number;
  failedQueries: number;
  cacheHits: number;
  cacheMisses: number;
  durationMs: number;
  estimatedCost: number;
}

/**
 * Warm embedding cache with common queries
 *
 * Pre-generates and caches embeddings for frequently used queries
 * to reduce latency and Voyage API calls during production usage.
 *
 * @param config - Cache warming configuration
 * @returns Statistics about the warming process
 */
export async function warmEmbeddingCache(
  config: CacheWarmingConfig
): Promise<CacheWarmingStats> {
  const { redis, embeddingProvider, customQueries = [], batchSize = 10, ttl = EMBEDDING_CACHE_TTL } = config;

  const startTime = Date.now();
  const stats: CacheWarmingStats = {
    totalQueries: 0,
    cachedQueries: 0,
    failedQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    durationMs: 0,
    estimatedCost: 0,
  };

  try {
    // Collect all queries to warm
    const allQueries = [
      ...COMMON_QUERY_PATTERNS.technical,
      ...COMMON_QUERY_PATTERNS.conceptual,
      ...COMMON_QUERY_PATTERNS.conversational,
      ...COMMON_QUERY_PATTERNS.exact_match,
      ...customQueries,
    ];

    stats.totalQueries = allQueries.length;

    logger.info('Starting cache warming', {
      totalQueries: stats.totalQueries,
      batchSize,
      ttl,
    });

    // Process queries in batches
    for (let i = 0; i < allQueries.length; i += batchSize) {
      const batch = allQueries.slice(i, i + batchSize);

      // Check which queries are already cached
      const cacheKeys = batch.map(
        (query) => `${CACHE_KEY_PREFIX}${Buffer.from(query).toString('base64').substring(0, 64)}`
      );

      const cacheResults = await redis.mget(...cacheKeys);

      // Separate cached and uncached queries
      const uncachedQueries: string[] = [];
      const uncachedIndices: number[] = [];

      for (let j = 0; j < batch.length; j++) {
        const query = batch[j];
        if (!query) continue;

        if (cacheResults[j]) {
          stats.cacheHits++;
        } else {
          uncachedQueries.push(query);
          uncachedIndices.push(j);
          stats.cacheMisses++;
        }
      }

      // Generate embeddings for uncached queries only
      if (uncachedQueries.length > 0) {
        try {
          // Generate embeddings in batch
          const embeddings = await embeddingProvider.embedBatch(uncachedQueries, 'query');

          // Cache all new embeddings
          const pipeline = redis.pipeline();

          for (let j = 0; j < uncachedQueries.length; j++) {
            const embedding = embeddings[j];
            const originalIndex = uncachedIndices[j];

            if (embedding && originalIndex !== undefined) {
              const cacheKey = cacheKeys[originalIndex];
              if (cacheKey) {
                pipeline.setex(cacheKey, ttl, JSON.stringify(embedding));
                stats.cachedQueries++;
              }
            }
          }

          await pipeline.exec();

          // Estimate cost (Voyage: $0.12/1M tokens, ~50 tokens/query)
          const tokensUsed = uncachedQueries.length * 50;
          stats.estimatedCost += (tokensUsed / 1_000_000) * 0.12;

          logger.info('Batch processed', {
            batchNumber: Math.floor(i / batchSize) + 1,
            totalBatches: Math.ceil(allQueries.length / batchSize),
            newlyCached: uncachedQueries.length,
            cacheHits: stats.cacheHits,
          });
        } catch (error) {
          logger.error('Batch embedding failed', {
            error,
            batchNumber: Math.floor(i / batchSize) + 1,
            queriesInBatch: uncachedQueries.length,
          });
          stats.failedQueries += uncachedQueries.length;
        }
      }
    }

    stats.durationMs = Date.now() - startTime;

    logger.info('Cache warming complete', {
      ...stats,
      hitRate: `${((stats.cacheHits / stats.totalQueries) * 100).toFixed(1)}%`,
    });

    return stats;
  } catch (error) {
    logger.error('Cache warming failed', { error });
    throw error;
  }
}

/**
 * Get cache warming statistics without performing warming
 *
 * Useful for monitoring cache effectiveness and deciding when to re-warm
 */
export async function getCacheWarmingStats(redis: Redis): Promise<{
  cachedQueries: number;
  totalSize: number;
}> {
  try {
    // Scan for all embedding cache keys
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);

    let totalSize = 0;

    if (keys.length > 0) {
      // Get sizes of all cached embeddings
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.strlen(key);
      }
      const results = await pipeline.exec();

      if (results) {
        totalSize = results.reduce((sum, [, size]) => sum + ((size as number) || 0), 0);
      }
    }

    return {
      cachedQueries: keys.length,
      totalSize,
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
    throw error;
  }
}

/**
 * Clear all cached embeddings
 *
 * Useful for cache invalidation after model upgrades or configuration changes
 */
export async function clearEmbeddingCache(redis: Redis): Promise<number> {
  try {
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await redis.del(...keys);
    logger.info('Embedding cache cleared', { deletedKeys: deleted });

    return deleted;
  } catch (error) {
    logger.error('Failed to clear cache', { error });
    throw error;
  }
}
