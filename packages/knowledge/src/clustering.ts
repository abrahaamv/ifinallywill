/**
 * DBSCAN Clustering for Knowledge Gap Detection (Phase 10 - Week 1)
 * Identifies topics in user queries that aren't covered in knowledge base
 */

import DBSCAN from 'density-clustering';
import { createModuleLogger } from '@platform/shared';
import { createVoyageProvider } from './embeddings';

const logger = createModuleLogger('KnowledgeClustering');

export interface QueryCluster {
  /** Cluster ID (-1 for outliers) */
  clusterId: number;
  /** Queries in this cluster */
  queries: string[];
  /** Average position in embedding space */
  centroid: number[];
  /** Number of queries in cluster */
  size: number;
}

export interface KnowledgeGap {
  /** Representative queries for this gap */
  queries: string[];
  /** Estimated importance (0-1) based on query frequency */
  importance: number;
  /** Suggested topics to add to knowledge base */
  suggestedTopics: string[];
  /** Cluster ID */
  clusterId: number;
}

export interface ClusteringOptions {
  /** DBSCAN epsilon parameter (max distance between points in cluster) */
  epsilon?: number;
  /** DBSCAN minPoints parameter (min points to form dense region) */
  minPoints?: number;
  /** Minimum cluster size to consider as knowledge gap */
  minGapSize?: number;
}

/**
 * Calculate Euclidean distance between two embeddings
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimension');
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate centroid of a cluster of embeddings
 */
function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }

  const dimensions = embeddings[0]?.length ?? 0;
  const centroid: number[] = new Array(dimensions).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] = (centroid[i] ?? 0) + (embedding[i] ?? 0);
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] = (centroid[i] ?? 0) / embeddings.length;
  }

  return centroid;
}

/**
 * Cluster user queries using DBSCAN algorithm
 *
 * @param queries - Array of user queries to cluster
 * @param options - Clustering parameters
 * @returns Array of query clusters
 */
export async function clusterQueries(
  queries: string[],
  options: ClusteringOptions = {}
): Promise<QueryCluster[]> {
  const {
    epsilon = 0.5,
    minPoints = 3,
  } = options;

  if (queries.length === 0) {
    return [];
  }

  try {
    const startTime = Date.now();

    // Step 1: Generate embeddings for all queries
    const voyageProvider = createVoyageProvider();
    const embeddings = await Promise.all(
      queries.map((query) => voyageProvider.embed(query, 'query'))
    );

    // Step 2: Create distance matrix for DBSCAN
    const dataset = embeddings.map((embedding) => embedding);

    // Step 3: Run DBSCAN clustering
    const dbscan = new DBSCAN();
    const clusters = dbscan.run(dataset, epsilon, minPoints, euclideanDistance);

    // Step 4: Build cluster objects
    const queryClusters: QueryCluster[] = [];

    // Process each cluster
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (!cluster || cluster.length === 0) continue;

      const clusterQueries = cluster.map((idx: number) => queries[idx] ?? '').filter(Boolean);
      const clusterEmbeddings = cluster.map((idx: number) => embeddings[idx] ?? []).filter((e: number[]) => e.length > 0);

      queryClusters.push({
        clusterId: i,
        queries: clusterQueries,
        centroid: calculateCentroid(clusterEmbeddings),
        size: clusterQueries.length,
      });
    }

    // Process outliers (noise points) as individual clusters
    const noise = dbscan.noise || [];
    if (noise.length > 0) {
      const noiseQueries = noise.map((idx: number) => queries[idx] ?? '').filter(Boolean);
      const noiseEmbeddings = noise.map((idx: number) => embeddings[idx] ?? []).filter((e: number[]) => e.length > 0);

      queryClusters.push({
        clusterId: -1, // -1 indicates outliers
        queries: noiseQueries,
        centroid: calculateCentroid(noiseEmbeddings),
        size: noiseQueries.length,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('Query clustering completed', {
      queryCount: queries.length,
      clusterCount: clusters.length,
      noiseCount: noise.length,
      processingTimeMs: processingTime,
    });

    return queryClusters;
  } catch (error) {
    logger.error('Query clustering failed', { error });
    throw new Error(
      `Failed to cluster queries: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect knowledge gaps by comparing query clusters to document coverage
 *
 * @param queries - User queries to analyze
 * @param documentEmbeddings - Embeddings of existing knowledge base documents
 * @param options - Clustering and gap detection parameters
 * @returns Array of identified knowledge gaps
 */
export async function detectKnowledgeGaps(
  queries: string[],
  documentEmbeddings: number[][],
  options: ClusteringOptions = {}
): Promise<KnowledgeGap[]> {
  const {
    minGapSize = 3,
    epsilon = 0.5,
  } = options;

  try {
    // Step 1: Cluster user queries
    const clusters = await clusterQueries(queries, options);

    // Step 2: Identify clusters that are far from existing documents
    const knowledgeGaps: KnowledgeGap[] = [];

    for (const cluster of clusters) {
      // Skip small clusters and outliers
      if (cluster.size < minGapSize || cluster.clusterId === -1) {
        continue;
      }

      // Calculate minimum distance from cluster centroid to any document
      let minDistanceToDocument = Infinity;
      for (const docEmbedding of documentEmbeddings) {
        const distance = euclideanDistance(cluster.centroid, docEmbedding);
        minDistanceToDocument = Math.min(minDistanceToDocument, distance);
      }

      // If cluster is far from all documents, it's a knowledge gap
      if (minDistanceToDocument > epsilon) {
        // Calculate importance based on cluster size and distance
        const importance = Math.min(
          1.0,
          (cluster.size / queries.length) * (minDistanceToDocument / epsilon)
        );

        // Extract representative queries (up to 5)
        const representativeQueries = cluster.queries.slice(0, 5);

        // Generate suggested topics from query patterns
        const suggestedTopics = extractTopicsFromQueries(cluster.queries);

        knowledgeGaps.push({
          queries: representativeQueries,
          importance,
          suggestedTopics,
          clusterId: cluster.clusterId,
        });
      }
    }

    // Sort by importance (descending)
    knowledgeGaps.sort((a, b) => b.importance - a.importance);

    logger.info('Knowledge gap detection completed', {
      queryCount: queries.length,
      clusterCount: clusters.length,
      gapCount: knowledgeGaps.length,
      topGapImportance: knowledgeGaps[0]?.importance ?? 0,
    });

    return knowledgeGaps;
  } catch (error) {
    logger.error('Knowledge gap detection failed', { error });
    throw new Error(
      `Failed to detect knowledge gaps: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract topic keywords from cluster queries using simple frequency analysis
 */
function extractTopicsFromQueries(queries: string[]): string[] {
  // Simple keyword extraction: find most common words (excluding stopwords)
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'how', 'what', 'when', 'where', 'who',
    'why', 'can', 'could', 'should', 'would', 'do', 'does', 'did',
  ]);

  const wordFrequency = new Map<string, number>();

  for (const query of queries) {
    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopwords.has(word));

    for (const word of words) {
      wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
    }
  }

  // Return top 5 most frequent words as suggested topics
  return Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Estimate cost for clustering operations
 * Based on Voyage AI embedding costs
 *
 * @param queryCount - Number of queries to cluster
 * @returns Estimated cost in USD
 */
export function estimateClusteringCost(queryCount: number): number {
  // Voyage Multimodal-3: $0.06 per 1M tokens
  // Average query ~10 tokens
  const tokensPerQuery = 10;
  const totalTokens = queryCount * tokensPerQuery;
  const costPer1MTokens = 0.06;

  return (totalTokens / 1_000_000) * costPer1MTokens;
}
