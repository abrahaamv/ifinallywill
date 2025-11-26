/**
 * Phase 12 Week 4 Days 1-3: Continuous RAGAS Evaluation
 * Automated quality monitoring running every 24 hours
 *
 * Builds on Phase 10 RAGAS infrastructure
 */

import { db, messages, sessions } from '@platform/db';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { createModuleLogger } from '@platform/shared';
import type { RAGASEvaluationService } from './ragas-integration';

const logger = createModuleLogger('ContinuousEvaluation');

export interface ContinuousEvaluationConfig {
  intervalMs: number; // Default: 24 hours
  sampleSize: number; // Default: 100 conversations
  tenantId: string;
  thresholds: QualityThresholds;
}

export interface QualityThresholds {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  overall: number;
}

export interface EvaluationAlert {
  severity: 'critical' | 'warning';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
}

const DEFAULT_CONFIG: Omit<ContinuousEvaluationConfig, 'tenantId'> = {
  intervalMs: 24 * 60 * 60 * 1000, // 24 hours
  sampleSize: 100,
  thresholds: {
    faithfulness: 0.90,
    answerRelevancy: 0.85,
    contextPrecision: 0.80,
    contextRecall: 0.85,
    overall: 0.85,
  },
};

/**
 * Continuous evaluation service
 * Runs RAGAS evaluation on production data every 24 hours
 */
export class ContinuousRAGEvaluator {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private config: ContinuousEvaluationConfig;

  constructor(
    private ragasService: RAGASEvaluationService,
    config: Partial<ContinuousEvaluationConfig> & { tenantId: string }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start continuous evaluation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Continuous evaluation already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting continuous RAGAS evaluation', {
      interval: `${this.config.intervalMs / 1000 / 60 / 60}h`,
      sampleSize: this.config.sampleSize,
    });

    // Run immediately on start
    await this.runEvaluationCycle();

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runEvaluationCycle().catch((error) => {
        logger.error('Evaluation cycle failed', { error });
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop continuous evaluation
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.info('Stopped continuous evaluation');
  }

  /**
   * Run a single evaluation cycle
   */
  private async runEvaluationCycle(): Promise<void> {
    const startTime = Date.now();
    logger.info('Starting evaluation cycle');

    try {
      // Sample recent production conversations
      const conversations = await this.fetchRecentConversations();

      if (conversations.length === 0) {
        logger.warn('No conversations found for evaluation');
        return;
      }

      // Run RAGAS evaluation using existing service
      const runId = await this.ragasService.createEvaluationRun({
        tenantId: this.config.tenantId,
        evaluationType: 'automated',
        testCases: conversations.map((c) => ({
          query: c.query,
          expectedAnswer: c.answer, // Use AI response as reference
          metadata: {
            messageId: c.messageId,
            sessionId: c.sessionId,
            source: 'production',
          },
        })),
      });

      // Get evaluation results
      const summary = await this.ragasService.executeEvaluationRun(runId);

      // Check for quality alerts
      const alerts = this.generateAlerts(summary);

      if (alerts.length > 0) {
        await this.handleAlerts(alerts, summary);
      }

      const duration = Date.now() - startTime;
      logger.info('Evaluation cycle completed', {
        runId,
        duration: `${duration}ms`,
        conversations: conversations.length,
        alerts: alerts.length,
      });
    } catch (error) {
      logger.error('Evaluation cycle failed', { error });
      throw error;
    }
  }

  /**
   * Fetch recent production conversations for evaluation
   */
  private async fetchRecentConversations(): Promise<
    Array<{
      messageId: string;
      sessionId: string;
      query: string;
      answer: string;
      retrievedContext: string[];
    }>
  > {
    // Query messages from last 24 hours with RAG metadata
    // Join with sessions to filter by tenantId since messages don't have direct tenantId column
    const recentMessages = await db
      .select({
        id: messages.id,
        sessionId: messages.sessionId,
        role: messages.role,
        content: messages.content,
        metadata: messages.metadata,
        timestamp: messages.timestamp,
      })
      .from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.tenantId, this.config.tenantId),
          eq(messages.role, 'assistant'),
          gte(messages.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)),
          isNotNull(messages.metadata)
        )
      )
      .limit(this.config.sampleSize);

    // Filter messages with RAG context
    return recentMessages
      .filter((msg) => {
        const metadata = msg.metadata as any;
        return metadata?.rag?.context || metadata?.ragContext;
      })
      .map((msg) => {
        const metadata = msg.metadata as any;
        const ragData = metadata.rag || metadata;

        return {
          messageId: msg.id,
          sessionId: msg.sessionId,
          query: ragData.query || ragData.userQuery || '',
          answer: msg.content,
          retrievedContext: ragData.context || ragData.chunks || [],
        };
      });
  }

  /**
   * Generate alerts based on evaluation results
   */
  private generateAlerts(summary: {
    avgFaithfulness: number;
    avgAnswerRelevancy: number;
    avgContextPrecision: number;
    avgContextRecall: number;
  }): EvaluationAlert[] {
    const alerts: EvaluationAlert[] = [];
    const { thresholds } = this.config;

    // Overall score
    const overall =
      (summary.avgFaithfulness +
        summary.avgAnswerRelevancy +
        summary.avgContextPrecision +
        summary.avgContextRecall) /
      4;

    // Check faithfulness
    if (summary.avgFaithfulness < thresholds.faithfulness) {
      alerts.push({
        severity:
          summary.avgFaithfulness < thresholds.faithfulness - 0.1
            ? 'critical'
            : 'warning',
        metric: 'faithfulness',
        currentValue: summary.avgFaithfulness,
        threshold: thresholds.faithfulness,
        message: `Faithfulness dropped to ${(summary.avgFaithfulness * 100).toFixed(1)}% (target: ${thresholds.faithfulness * 100}%)`,
      });
    }

    // Check answer relevancy
    if (summary.avgAnswerRelevancy < thresholds.answerRelevancy) {
      alerts.push({
        severity:
          summary.avgAnswerRelevancy < thresholds.answerRelevancy - 0.1
            ? 'critical'
            : 'warning',
        metric: 'answer_relevancy',
        currentValue: summary.avgAnswerRelevancy,
        threshold: thresholds.answerRelevancy,
        message: `Answer relevancy dropped to ${(summary.avgAnswerRelevancy * 100).toFixed(1)}% (target: ${thresholds.answerRelevancy * 100}%)`,
      });
    }

    // Check context precision
    if (summary.avgContextPrecision < thresholds.contextPrecision) {
      alerts.push({
        severity:
          summary.avgContextPrecision < thresholds.contextPrecision - 0.1
            ? 'critical'
            : 'warning',
        metric: 'context_precision',
        currentValue: summary.avgContextPrecision,
        threshold: thresholds.contextPrecision,
        message: `Context precision dropped to ${(summary.avgContextPrecision * 100).toFixed(1)}% (target: ${thresholds.contextPrecision * 100}%)`,
      });
    }

    // Check context recall
    if (summary.avgContextRecall < thresholds.contextRecall) {
      alerts.push({
        severity:
          summary.avgContextRecall < thresholds.contextRecall - 0.1
            ? 'critical'
            : 'warning',
        metric: 'context_recall',
        currentValue: summary.avgContextRecall,
        threshold: thresholds.contextRecall,
        message: `Context recall dropped to ${(summary.avgContextRecall * 100).toFixed(1)}% (target: ${thresholds.contextRecall * 100}%)`,
      });
    }

    // Check overall quality
    if (overall < thresholds.overall) {
      alerts.push({
        severity: overall < thresholds.overall - 0.1 ? 'critical' : 'warning',
        metric: 'overall_quality',
        currentValue: overall,
        threshold: thresholds.overall,
        message: `Overall quality dropped to ${(overall * 100).toFixed(1)}% (target: ${thresholds.overall * 100}%)`,
      });
    }

    return alerts;
  }

  /**
   * Handle quality alerts
   */
  private async handleAlerts(
    alerts: EvaluationAlert[],
    summary: any
  ): Promise<void> {
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
    const warningAlerts = alerts.filter((a) => a.severity === 'warning');

    if (criticalAlerts.length > 0) {
      logger.error('🚨 CRITICAL RAG QUALITY ALERTS', {
        alerts: criticalAlerts.map((a) => a.message),
        summary,
      });
    }

    if (warningAlerts.length > 0) {
      logger.warn('⚠️ RAG QUALITY WARNINGS', {
        alerts: warningAlerts.map((a) => a.message),
        summary,
      });
    }

    // TODO: Integrate with alerting system
    // await this.sendSlackAlert(alerts);
    // await this.sendEmailAlert(alerts);
    // await this.createIncident(criticalAlerts);
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    config: ContinuousEvaluationConfig;
    nextRunAt?: Date;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      nextRunAt: this.intervalId
        ? new Date(Date.now() + this.config.intervalMs)
        : undefined,
    };
  }
}

/**
 * Create and export continuous evaluator instance
 * Usage in server startup (packages/api/src/server.ts):
 *
 * import { createContinuousEvaluator } from '@platform/knowledge/evaluation';
 * const evaluator = createContinuousEvaluator(ragasService, { tenantId: 'default' });
 * evaluator.start();
 */
export function createContinuousEvaluator(
  ragasService: RAGASEvaluationService,
  config: Partial<ContinuousEvaluationConfig> & { tenantId: string }
): ContinuousRAGEvaluator {
  return new ContinuousRAGEvaluator(ragasService, config);
}
