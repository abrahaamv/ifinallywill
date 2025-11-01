/**
 * Automated Test Runner for RAGAS Evaluation (Phase 12 Week 4)
 *
 * Orchestrates evaluation runs, manages test sets, and handles regression detection.
 */

import * as schema from '@platform/db';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { RAGASEvaluator, RAGASEvaluationInput } from './ragas';
import { detectRegression, calculateQualityScore } from './ragas';

type Database = NodePgDatabase<typeof schema>;

// ==================== TYPES ====================

export interface TestRunConfig {
  tenantId: string;
  testSetId?: string; // If not provided, use default test set
  evaluationType: 'automated' | 'manual' | 'regression' | 'baseline';
  configSnapshot: {
    retrieverType: string;
    rerankingEnabled: boolean;
    small2bigEnabled: boolean;
    topK: number;
    model: string;
  };
  baselineRunId?: string; // For regression testing
  metadata?: {
    triggeredBy?: string;
    gitCommit?: string;
    environment?: string;
    notes?: string;
  };
}

export interface TestRunResult {
  runId: string;
  status: 'completed' | 'failed';
  metrics: {
    avgFaithfulness: number;
    avgAnswerRelevancy: number;
    avgContextPrecision: number;
    avgContextRecall: number;
  };
  totalQueries: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  isRegression?: 'no' | 'warning' | 'critical';
  durationMs: number;
  qualityScore: 'excellent' | 'good' | 'fair' | 'poor';
}

// ==================== TEST RUNNER ====================

export class RAGASTestRunner {
  constructor(
    private db: Database,
    private evaluator: RAGASEvaluator,
    private executeRAGQuery: (query: string, tenantId: string) => Promise<{
      answer: string;
      sources: Array<{ content: string; score: number; documentId: string }>;
    }>
  ) {}

  /**
   * Run evaluation on a test set
   */
  async runEvaluation(config: TestRunConfig): Promise<TestRunResult> {
    const startTime = Date.now();

    // Create evaluation run record
    const runResult = await this.db.insert(schema.ragEvaluationRuns).values({
      tenantId: config.tenantId,
      evaluationType: config.evaluationType,
      configSnapshot: config.configSnapshot,
      status: 'running',
      baselineRunId: config.baselineRunId,
      metadata: config.metadata,
      startedAt: new Date(),
    }).returning();

    const run = runResult[0];
    if (!run) {
      throw new Error('Failed to create evaluation run');
    }

    try {
      // Load test set
      const testSet = await this.loadTestSet(config.tenantId, config.testSetId);

      if (!testSet || testSet.testCases.length === 0) {
        throw new Error('No test cases found');
      }

      // Run evaluations for each test case
      const evaluationResults = await Promise.allSettled(
        testSet.testCases.map((testCase: { query: string; expectedAnswer?: string }) =>
          this.evaluateTestCase(run.id, testCase, config.tenantId)
        )
      );

      const successful = evaluationResults.filter((r: PromiseSettledResult<any>) => r.status === 'fulfilled').length;
      const failed = evaluationResults.filter((r: PromiseSettledResult<any>) => r.status === 'rejected').length;

      // Calculate aggregate metrics
      const successfulResults = evaluationResults
        .filter((r: PromiseSettledResult<any>): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r: PromiseFulfilledResult<any>) => r.value);

      const avgMetrics = this.calculateAverageMetrics(successfulResults);

      // Check for regression if baseline provided
      let isRegression: 'no' | 'warning' | 'critical' = 'no';
      if (config.baselineRunId) {
        const baseline = await this.loadBaselineMetrics(config.baselineRunId);
        if (baseline) {
          const regressionResult = detectRegression(avgMetrics, baseline);
          isRegression = regressionResult.isRegression;
        }
      }

      // Calculate quality score
      const thresholds = await this.loadQualityThresholds(config.tenantId);
      const qualityResult = calculateQualityScore(avgMetrics, thresholds);

      // Update run with results
      const durationMs = Date.now() - startTime;
      await this.db.update(schema.ragEvaluationRuns)
        .set({
          status: 'completed',
          avgFaithfulness: avgMetrics.faithfulness.toString(),
          avgAnswerRelevancy: avgMetrics.answerRelevancy.toString(),
          avgContextPrecision: avgMetrics.contextPrecision.toString(),
          avgContextRecall: avgMetrics.contextRecall.toString(),
          totalQueries: testSet.testCases.length,
          successfulEvaluations: successful,
          failedEvaluations: failed,
          isRegression,
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(schema.ragEvaluationRuns.id, run.id));

      return {
        runId: run.id,
        status: 'completed',
        metrics: {
          avgFaithfulness: avgMetrics.faithfulness,
          avgAnswerRelevancy: avgMetrics.answerRelevancy,
          avgContextPrecision: avgMetrics.contextPrecision,
          avgContextRecall: avgMetrics.contextRecall,
        },
        totalQueries: testSet.testCases.length,
        successfulEvaluations: successful,
        failedEvaluations: failed,
        isRegression,
        durationMs,
        qualityScore: qualityResult.score,
      };
    } catch (error) {
      // Mark run as failed
      await this.db.update(schema.ragEvaluationRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        })
        .where(eq(schema.ragEvaluationRuns.id, run.id));

      throw error;
    }
  }

  /**
   * Evaluate a single test case
   */
  private async evaluateTestCase(
    runId: string,
    testCase: { query: string; expectedAnswer?: string },
    tenantId: string
  ) {
    const retrievalStart = Date.now();

    // Execute RAG query
    const { answer, sources } = await this.executeRAGQuery(testCase.query, tenantId);
    const retrievalTime = Date.now() - retrievalStart;

    // Prepare evaluation input
    const input: RAGASEvaluationInput = {
      query: testCase.query,
      retrievedContext: sources,
      generatedAnswer: answer,
      groundTruth: testCase.expectedAnswer,
    };

    // Run RAGAS evaluation
    const generationStart = Date.now();
    const result = await this.evaluator.evaluate(input);
    const generationTime = Date.now() - generationStart;

    // Store evaluation result
    await this.db.insert(schema.ragEvaluations).values({
      runId,
      query: testCase.query,
      retrievedContext: sources,
      generatedAnswer: answer,
      groundTruth: testCase.expectedAnswer,
      faithfulness: result.faithfulness.toString(),
      answerRelevancy: result.answerRelevancy.toString(),
      contextPrecision: result.contextPrecision.toString(),
      contextRecall: result.contextRecall.toString(),
      compositeScore: result.compositeScore.toString(),
      faithfulnessDetails: result.details.faithfulness,
      relevancyDetails: result.details.relevancy,
      precisionDetails: result.details.precision,
      recallDetails: result.details.recall,
      retrievalTimeMs: retrievalTime,
      generationTimeMs: generationTime,
      totalTimeMs: result.durationMs,
      evaluationCostUsd: result.costUsd.toString(),
      status: 'success',
      evaluatedAt: new Date(),
    });

    return result;
  }

  /**
   * Load test set for tenant
   */
  private async loadTestSet(tenantId: string, testSetId?: string) {
    let testSets;

    if (testSetId) {
      testSets = await this.db.select()
        .from(schema.ragTestSets)
        .where(eq(schema.ragTestSets.tenantId, tenantId))
        .limit(1);
      // Filter by testSetId in memory (Drizzle doesn't support multiple where clauses in this way)
      testSets = testSets.filter(ts => ts.id === testSetId);
    } else {
      testSets = await this.db.select()
        .from(schema.ragTestSets)
        .where(eq(schema.ragTestSets.tenantId, tenantId))
        .limit(1);
    }

    return testSets[0] || null;
  }

  /**
   * Load baseline metrics for regression comparison
   */
  private async loadBaselineMetrics(baselineRunId: string) {
    const [baseline] = await this.db.select()
      .from(schema.ragEvaluationRuns)
      .where(eq(schema.ragEvaluationRuns.id, baselineRunId))
      .limit(1);

    if (!baseline) return null;

    return {
      faithfulness: parseFloat(baseline.avgFaithfulness || '0'),
      answerRelevancy: parseFloat(baseline.avgAnswerRelevancy || '0'),
      contextPrecision: parseFloat(baseline.avgContextPrecision || '0'),
      contextRecall: parseFloat(baseline.avgContextRecall || '0'),
      compositeScore: 0, // Will be calculated
    };
  }

  /**
   * Load quality thresholds for tenant
   */
  private async loadQualityThresholds(tenantId: string) {
    const thresholdsResult = await this.db.select()
      .from(schema.ragQualityThresholds)
      .where(eq(schema.ragQualityThresholds.tenantId, tenantId))
      .limit(1);

    const thresholds = thresholdsResult[0];

    if (!thresholds) {
      return {
        minFaithfulness: 0.8,
        minAnswerRelevancy: 0.7,
        minContextPrecision: 0.6,
        minContextRecall: 0.7,
        minCompositeScore: 0.75,
      };
    }

    return {
      minFaithfulness: parseFloat(thresholds.minFaithfulness),
      minAnswerRelevancy: parseFloat(thresholds.minAnswerRelevancy),
      minContextPrecision: parseFloat(thresholds.minContextPrecision),
      minContextRecall: parseFloat(thresholds.minContextRecall),
      minCompositeScore: parseFloat(thresholds.minCompositeScore),
    };
  }

  /**
   * Calculate average metrics from evaluation results
   */
  private calculateAverageMetrics(results: Array<{
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    compositeScore: number;
  }>) {
    if (results.length === 0) {
      return {
        faithfulness: 0,
        answerRelevancy: 0,
        contextPrecision: 0,
        contextRecall: 0,
        compositeScore: 0,
      };
    }

    const sum = results.reduce(
      (acc, r) => ({
        faithfulness: acc.faithfulness + r.faithfulness,
        answerRelevancy: acc.answerRelevancy + r.answerRelevancy,
        contextPrecision: acc.contextPrecision + r.contextPrecision,
        contextRecall: acc.contextRecall + r.contextRecall,
        compositeScore: acc.compositeScore + r.compositeScore,
      }),
      {
        faithfulness: 0,
        answerRelevancy: 0,
        contextPrecision: 0,
        contextRecall: 0,
        compositeScore: 0,
      }
    );

    return {
      faithfulness: sum.faithfulness / results.length,
      answerRelevancy: sum.answerRelevancy / results.length,
      contextPrecision: sum.contextPrecision / results.length,
      contextRecall: sum.contextRecall / results.length,
      compositeScore: sum.compositeScore / results.length,
    };
  }
}

// Schema is imported at the top of the file
