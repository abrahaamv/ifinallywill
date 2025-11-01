/**
 * RAGAS Evaluation Framework (Phase 12 Week 4)
 *
 * Implements RAGAS (Retrieval Augmented Generation Assessment) metrics:
 * - Faithfulness: How grounded is the answer in retrieved context?
 * - Answer Relevancy: How relevant is the answer to the question?
 * - Context Precision: How relevant is the retrieved context?
 * - Context Recall: Did we retrieve all necessary information?
 *
 * Reference: https://docs.ragas.io/en/stable/concepts/metrics/
 */

import type { AIProviderInterface } from '@platform/ai-core';

// ==================== TYPES ====================

export interface RAGASMetrics {
  faithfulness: number; // 0.0 - 1.0
  answerRelevancy: number; // 0.0 - 1.0
  contextPrecision: number; // 0.0 - 1.0
  contextRecall: number; // 0.0 - 1.0
  compositeScore: number; // Weighted average
}

export interface RAGASEvaluationInput {
  query: string;
  retrievedContext: Array<{
    content: string;
    score: number;
    documentId: string;
  }>;
  generatedAnswer: string;
  groundTruth?: string; // Optional reference answer
}

export interface RAGASEvaluationResult extends RAGASMetrics {
  details: {
    faithfulness: FaithfulnessDetails;
    relevancy: RelevancyDetails;
    precision: PrecisionDetails;
    recall: RecallDetails;
  };
  costUsd: number;
  durationMs: number;
}

export interface FaithfulnessDetails {
  claims: string[];
  supportedClaims: number;
  totalClaims: number;
  unsupportedClaims: string[];
}

export interface RelevancyDetails {
  queryKeywords: string[];
  matchedKeywords: number;
  semanticSimilarity: number;
}

export interface PrecisionDetails {
  relevantChunks: number;
  totalChunks: number;
  irrelevantIndices: number[];
}

export interface RecallDetails {
  requiredConcepts: string[];
  coveredConcepts: number;
  missingConcepts: string[];
}

export interface RAGASConfig {
  model: string; // LLM for evaluation
  temperature: number;
  weights: {
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
  };
  parallelization: boolean; // Run metrics in parallel
  costTracking: boolean;
}

// ==================== DEFAULT CONFIG ====================

export const DEFAULT_RAGAS_CONFIG: RAGASConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.0, // Deterministic for evaluation
  weights: {
    faithfulness: 0.3,
    answerRelevancy: 0.3,
    contextPrecision: 0.2,
    contextRecall: 0.2,
  },
  parallelization: true,
  costTracking: true,
};

// ==================== RAGAS EVALUATOR ====================

export class RAGASEvaluator {
  constructor(
    private aiProvider: AIProviderInterface,
    private config: RAGASConfig = DEFAULT_RAGAS_CONFIG
  ) {}

  /**
   * Evaluate a RAG query response using RAGAS metrics
   */
  async evaluate(
    input: RAGASEvaluationInput
  ): Promise<RAGASEvaluationResult> {
    const startTime = Date.now();
    let totalCost = 0;

    // Run metrics in parallel if enabled
    const faithfulnessResult = await this.evaluateFaithfulness(input);
    const relevancyResult = await this.evaluateAnswerRelevancy(input);
    const precisionResult = await this.evaluateContextPrecision(input);
    const recallResult = await this.evaluateContextRecall(input);

    // Aggregate costs
    totalCost =
      faithfulnessResult.cost +
      relevancyResult.cost +
      precisionResult.cost +
      recallResult.cost;

    // Calculate composite score
    const compositeScore =
      faithfulnessResult.score * this.config.weights.faithfulness +
      relevancyResult.score * this.config.weights.answerRelevancy +
      precisionResult.score * this.config.weights.contextPrecision +
      recallResult.score * this.config.weights.contextRecall;

    return {
      faithfulness: faithfulnessResult.score,
      answerRelevancy: relevancyResult.score,
      contextPrecision: precisionResult.score,
      contextRecall: recallResult.score,
      compositeScore,
      details: {
        faithfulness: faithfulnessResult.details,
        relevancy: relevancyResult.details,
        precision: precisionResult.details,
        recall: recallResult.details,
      },
      costUsd: totalCost,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Faithfulness: Are all claims in the answer supported by context?
   *
   * Methodology:
   * 1. Extract claims from generated answer
   * 2. For each claim, check if supported by retrieved context
   * 3. Score = supported_claims / total_claims
   */
  private async evaluateFaithfulness(
    input: RAGASEvaluationInput
  ): Promise<{ score: number; details: FaithfulnessDetails; cost: number }> {
    const claimsPrompt = `Extract all factual claims from the following answer. Return as JSON array of strings.

Answer: "${input.generatedAnswer}"

Return format: {"claims": ["claim1", "claim2", ...]}`;

    const claimsResponse = await this.aiProvider.complete({
      messages: [{ role: 'user', content: claimsPrompt }],
      temperature: 0.0,
      model: this.config.model as any,
    });

    const claims = this.parseJsonResponse(claimsResponse.content, 'claims') as string[];

    // Check each claim against context
    const context = input.retrievedContext.map(c => c.content).join('\n\n');
    const supportPrompt = `For each claim below, determine if it is supported by the context. Return JSON with claim index and boolean support.

Context:
${context}

Claims:
${claims.map((c, i) => `${i}: ${c}`).join('\n')}

Return format: {"support": [true, false, true, ...]}`;

    const supportResponse = await this.aiProvider.complete({
      messages: [{ role: 'user', content: supportPrompt }],
      temperature: 0.0,
      model: this.config.model as any,
    });

    const support = this.parseJsonResponse(supportResponse.content, 'support') as boolean[];
    const supportedClaims = support.filter(Boolean).length;
    const unsupportedClaims = claims.filter((_, i) => !support[i]);

    return {
      score: claims.length > 0 ? supportedClaims / claims.length : 1.0,
      details: {
        claims,
        supportedClaims,
        totalClaims: claims.length,
        unsupportedClaims,
      },
      cost: this.estimateCost(claimsResponse.usage.totalTokens + supportResponse.usage.totalTokens),
    };
  }

  /**
   * Answer Relevancy: How relevant is the answer to the query?
   *
   * Methodology:
   * 1. Extract key concepts from query
   * 2. Check if answer addresses these concepts
   * 3. Calculate semantic similarity
   */
  private async evaluateAnswerRelevancy(
    input: RAGASEvaluationInput
  ): Promise<{ score: number; details: RelevancyDetails; cost: number }> {
    const relevancyPrompt = `Evaluate how well the answer addresses the query.

Query: "${input.query}"
Answer: "${input.generatedAnswer}"

Provide:
1. Key concepts from query (array of strings)
2. Number of concepts addressed in answer
3. Relevancy score (0.0-1.0)

Return format: {
  "queryKeywords": ["concept1", "concept2", ...],
  "matchedKeywords": 3,
  "semanticSimilarity": 0.85
}`;

    const response = await this.aiProvider.complete({
      messages: [{ role: 'user', content: relevancyPrompt }],
      temperature: 0.0,
      model: this.config.model as any,
    });

    const parsed = this.parseJsonResponse(response.content, null) as {
      queryKeywords: string[];
      matchedKeywords: number;
      semanticSimilarity: number;
    };

    // Score is the semantic similarity
    return {
      score: parsed.semanticSimilarity,
      details: parsed,
      cost: this.estimateCost(response.usage.totalTokens),
    };
  }

  /**
   * Context Precision: How many retrieved chunks are actually relevant?
   *
   * Methodology:
   * 1. For each retrieved chunk, determine relevance to query
   * 2. Score = relevant_chunks / total_chunks
   */
  private async evaluateContextPrecision(
    input: RAGASEvaluationInput
  ): Promise<{ score: number; details: PrecisionDetails; cost: number }> {
    const precisionPrompt = `For each context chunk below, determine if it's relevant to answering the query.

Query: "${input.query}"

Context Chunks:
${input.retrievedContext.map((c, i) => `${i}: ${c.content}`).join('\n\n')}

Return format: {"relevance": [true, false, true, ...]}`;

    const response = await this.aiProvider.complete({
      messages: [{ role: 'user', content: precisionPrompt }],
      temperature: 0.0,
      model: this.config.model as any,
    });

    const relevance = this.parseJsonResponse(response.content, 'relevance') as boolean[];
    const relevantChunks = relevance.filter(Boolean).length;
    const irrelevantIndices = relevance
      .map((r, i) => (!r ? i : -1))
      .filter(i => i !== -1);

    return {
      score: input.retrievedContext.length > 0
        ? relevantChunks / input.retrievedContext.length
        : 1.0,
      details: {
        relevantChunks,
        totalChunks: input.retrievedContext.length,
        irrelevantIndices,
      },
      cost: this.estimateCost(response.usage.totalTokens),
    };
  }

  /**
   * Context Recall: Did we retrieve all necessary information?
   *
   * Requires groundTruth answer for comparison.
   * If groundTruth is not provided, we extract required concepts from the query.
   */
  private async evaluateContextRecall(
    input: RAGASEvaluationInput
  ): Promise<{ score: number; details: RecallDetails; cost: number }> {
    const context = input.retrievedContext.map(c => c.content).join('\n\n');

    if (input.groundTruth) {
      // Use ground truth to identify required concepts
      const recallPrompt = `Identify all concepts required to answer the query based on the ground truth answer.
Then check if these concepts are present in the retrieved context.

Query: "${input.query}"
Ground Truth: "${input.groundTruth}"
Retrieved Context: ${context}

Return format: {
  "requiredConcepts": ["concept1", "concept2", ...],
  "coveredConcepts": 3,
  "missingConcepts": ["concept4", ...]
}`;

      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: recallPrompt }],
        temperature: 0.0,
        model: this.config.model as any,
      });

      const parsed = this.parseJsonResponse(response.content, null) as {
        requiredConcepts: string[];
        coveredConcepts: number;
        missingConcepts: string[];
      };

      return {
        score: parsed.requiredConcepts.length > 0
          ? parsed.coveredConcepts / parsed.requiredConcepts.length
          : 1.0,
        details: parsed,
        cost: this.estimateCost(response.usage.totalTokens),
      };
    } else {
      // Fallback: Extract concepts from query and check context coverage
      const recallPrompt = `Identify key concepts that should be addressed to answer this query.
Then check if these concepts are present in the retrieved context.

Query: "${input.query}"
Retrieved Context: ${context}

Return format: {
  "requiredConcepts": ["concept1", "concept2", ...],
  "coveredConcepts": 3,
  "missingConcepts": ["concept4", ...]
}`;

      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: recallPrompt }],
        temperature: 0.0,
        model: this.config.model as any,
      });

      const parsed = this.parseJsonResponse(response.content, null) as {
        requiredConcepts: string[];
        coveredConcepts: number;
        missingConcepts: string[];
      };

      return {
        score: parsed.requiredConcepts.length > 0
          ? parsed.coveredConcepts / parsed.requiredConcepts.length
          : 1.0,
        details: parsed,
        cost: this.estimateCost(response.usage.totalTokens),
      };
    }
  }

  /**
   * Parse JSON response from LLM, handling markdown code blocks
   */
  private parseJsonResponse(content: string, key: string | null): unknown {
    try {
      // Remove markdown code blocks if present
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return key ? parsed[key] : parsed;
    } catch (error) {
      console.error('Failed to parse JSON response:', content);
      throw new Error(`Invalid JSON response from evaluator: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  /**
   * Estimate cost based on tokens used
   * Using GPT-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens
   * Simplified: assume 80% input, 20% output
   */
  private estimateCost(tokensUsed: number): number {
    const inputTokens = tokensUsed * 0.8;
    const outputTokens = tokensUsed * 0.2;
    return (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
  }
}

// ==================== REGRESSION DETECTION ====================

export interface RegressionDetectionResult {
  isRegression: 'no' | 'warning' | 'critical';
  degradation: {
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    compositeScore: number;
  };
  recommendation: string;
}

/**
 * Compare current metrics against baseline to detect regressions
 */
export function detectRegression(
  currentMetrics: RAGASMetrics,
  baselineMetrics: RAGASMetrics,
  threshold = 0.05 // 5% degradation threshold
): RegressionDetectionResult {
  const degradation = {
    faithfulness: baselineMetrics.faithfulness - currentMetrics.faithfulness,
    answerRelevancy: baselineMetrics.answerRelevancy - currentMetrics.answerRelevancy,
    contextPrecision: baselineMetrics.contextPrecision - currentMetrics.contextPrecision,
    contextRecall: baselineMetrics.contextRecall - currentMetrics.contextRecall,
    compositeScore: baselineMetrics.compositeScore - currentMetrics.compositeScore,
  };

  // Check for critical regression (>10% degradation)
  const criticalThreshold = threshold * 2;
  const hasCriticalRegression = Object.values(degradation).some(
    d => d > criticalThreshold
  );

  // Check for warning regression (>5% degradation)
  const hasWarningRegression = Object.values(degradation).some(
    d => d > threshold
  );

  let recommendation = 'No significant regression detected. Quality is stable.';

  if (hasCriticalRegression) {
    recommendation = `CRITICAL: Quality degraded by >10% in at least one metric. Immediate investigation required. Consider rolling back recent changes.`;
  } else if (hasWarningRegression) {
    recommendation = `WARNING: Quality degraded by >5% in at least one metric. Review recent changes and consider improvements.`;
  }

  return {
    isRegression: hasCriticalRegression ? 'critical' : hasWarningRegression ? 'warning' : 'no',
    degradation,
    recommendation,
  };
}

// ==================== AUTOMATED QUALITY SCORING ====================

export interface QualityScoreResult {
  score: 'excellent' | 'good' | 'fair' | 'poor';
  passingMetrics: number;
  failingMetrics: string[];
  recommendation: string;
}

/**
 * Automated quality scoring based on threshold comparison
 */
export function calculateQualityScore(
  metrics: RAGASMetrics,
  thresholds: {
    minFaithfulness: number;
    minAnswerRelevancy: number;
    minContextPrecision: number;
    minContextRecall: number;
    minCompositeScore: number;
  }
): QualityScoreResult {
  const checks = [
    { name: 'faithfulness', value: metrics.faithfulness, threshold: thresholds.minFaithfulness },
    { name: 'answerRelevancy', value: metrics.answerRelevancy, threshold: thresholds.minAnswerRelevancy },
    { name: 'contextPrecision', value: metrics.contextPrecision, threshold: thresholds.minContextPrecision },
    { name: 'contextRecall', value: metrics.contextRecall, threshold: thresholds.minContextRecall },
    { name: 'compositeScore', value: metrics.compositeScore, threshold: thresholds.minCompositeScore },
  ];

  const passingMetrics = checks.filter(c => c.value >= c.threshold).length;
  const failingMetrics = checks.filter(c => c.value < c.threshold).map(c => c.name);

  let score: QualityScoreResult['score'];
  let recommendation: string;

  if (passingMetrics === 5) {
    score = 'excellent';
    recommendation = 'All quality metrics exceed thresholds. System performing optimally.';
  } else if (passingMetrics >= 4) {
    score = 'good';
    recommendation = `System performing well. Consider improving: ${failingMetrics.join(', ')}.`;
  } else if (passingMetrics >= 3) {
    score = 'fair';
    recommendation = `System needs attention. Focus on: ${failingMetrics.join(', ')}.`;
  } else {
    score = 'poor';
    recommendation = `URGENT: Multiple quality issues detected. Immediate action required on: ${failingMetrics.join(', ')}.`;
  }

  return {
    score,
    passingMetrics,
    failingMetrics,
    recommendation,
  };
}
