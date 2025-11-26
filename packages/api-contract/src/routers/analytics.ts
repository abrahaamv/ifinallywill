/**
 * Analytics Router
 * Week 1, Days 6-7: Phase 12 Implementation
 *
 * Real-time visibility into AI quality and performance metrics
 */

import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { messages, sessions } from '@platform/db';

export const analyticsRouter = router({
  /**
   * Get real-time AI performance metrics
   */
  getAIMetrics: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
        groupBy: z.enum(['hour', 'day']).default('hour'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { timeRange } = input;

      // Calculate time window
      const now = new Date();
      const startTime = new Date(
        now.getTime() - parseTimeRange(timeRange)
      );

      // Query messages with metadata
      const msgRecords = await ctx.db
        .select({
          message: messages,
        })
        .from(messages)
        .innerJoin(sessions, eq(messages.sessionId, sessions.id))
        .where(
          and(
            gte(messages.timestamp, startTime),
            eq(sessions.tenantId, ctx.tenantId),
            eq(messages.role, 'assistant')
          )
        )
        .then((rows) => rows.map((r) => r.message));

      // Calculate metrics
      const metrics = {
        totalInteractions: msgRecords.length,
        resolutionMetrics: calculateResolutionMetrics(msgRecords),
        speedMetrics: calculateSpeedMetrics(msgRecords),
        qualityMetrics: calculateQualityMetrics(msgRecords),
        costMetrics: calculateCostMetrics(msgRecords),
        modelDistribution: calculateModelDistribution(msgRecords),
      };

      return metrics;
    }),

  /**
   * Get RAGAS evaluation results
   */
  getRAGASMetrics: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Query messages and calculate RAGAS metrics
      const startTime = new Date(
        Date.now() - parseTimeRange(input.timeRange)
      );

      const msgRecords = await ctx.db
        .select({
          message: messages,
        })
        .from(messages)
        .innerJoin(sessions, eq(messages.sessionId, sessions.id))
        .where(
          and(
            gte(messages.timestamp, startTime),
            eq(sessions.tenantId, ctx.tenantId),
            eq(messages.role, 'assistant'),
            isNotNull(messages.metadata)
          )
        )
        .then((rows) => rows.map((r) => r.message));

      // Extract RAGAS scores from metadata
      const ragasScores = msgRecords
        .map((m) => m.metadata?.ragas)
        .filter((ragas): ragas is NonNullable<typeof ragas> => Boolean(ragas));

      if (ragasScores.length === 0) {
        return {
          overall: 0,
          faithfulness: 0,
          answerRelevancy: 0,
          contextRelevancy: 0,
          contextPrecision: 0,
          contextRecall: 0,
          sampleSize: 0,
          targets: {
            overall: 0.85,
            faithfulness: 0.9,
            answerRelevancy: 0.85,
            contextRelevancy: 0.85,
            contextPrecision: 0.8,
            contextRecall: 0.85,
          },
        };
      }

      return {
        overall: average(ragasScores.map((r) => r.overall || 0)),
        faithfulness: average(ragasScores.map((r) => r.faithfulness || 0)),
        answerRelevancy: average(
          ragasScores.map((r) => r.answerRelevancy || 0)
        ),
        contextRelevancy: average(
          ragasScores.map((r) => r.contextRelevancy || 0)
        ),
        contextPrecision: average(
          ragasScores.map((r) => r.contextPrecision || 0)
        ),
        contextRecall: average(ragasScores.map((r) => r.contextRecall || 0)),
        sampleSize: ragasScores.length,
        targets: {
          overall: 0.85,
          faithfulness: 0.9,
          answerRelevancy: 0.85,
          contextRelevancy: 0.85,
          contextPrecision: 0.8,
          contextRecall: 0.85,
        },
      };
    }),

  /**
   * Get cost breakdown by model tier
   */
  getCostAnalysis: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
      })
    )
    .query(async ({ ctx, input }) => {
      const startTime = new Date(
        Date.now() - parseTimeRange(input.timeRange)
      );

      const msgRecords = await ctx.db
        .select({
          message: messages,
        })
        .from(messages)
        .innerJoin(sessions, eq(messages.sessionId, sessions.id))
        .where(
          and(
            gte(messages.timestamp, startTime),
            eq(sessions.tenantId, ctx.tenantId),
            eq(messages.role, 'assistant')
          )
        )
        .then((rows) => rows.map((r) => r.message));

      const costByModel: Record<string, number> = {};
      let totalCost = 0;

      for (const message of msgRecords) {
        const cost = message.metadata?.cost?.total || 0;
        const model =
          message.metadata?.modelRouting?.selectedModel || 'unknown';

        costByModel[model] = (costByModel[model] || 0) + cost;
        totalCost += cost;
      }

      const modelDistribution = Object.entries(costByModel).map(
        ([model, cost]) => ({
          model,
          cost,
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
          interactions: msgRecords.filter(
            (m) => m.metadata?.modelRouting?.selectedModel === model
          ).length,
        })
      );

      return {
        totalCost,
        costByModel,
        averageCostPerInteraction:
          msgRecords.length > 0 ? totalCost / msgRecords.length : 0,
        modelDistribution,
      };
    }),

  /**
   * Get alert summary
   */
  getAlerts: publicProcedure
    .input(
      z.object({
        severity: z
          .enum(['low', 'medium', 'high', 'critical'])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit } = input;

      // Query recent messages to detect quality issues
      const recentMessages = await ctx.db
        .select({
          message: messages,
        })
        .from(messages)
        .innerJoin(sessions, eq(messages.sessionId, sessions.id))
        .where(
          and(
            gte(
              messages.timestamp,
              new Date(Date.now() - parseTimeRange('24h'))
            ),
            eq(sessions.tenantId, ctx.tenantId),
            eq(messages.role, 'assistant'),
            isNotNull(messages.metadata)
          )
        )
        .limit(1000)
        .then((rows) => rows.map((r) => r.message));

      const alerts: Array<{
        id: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        title: string;
        description: string;
        timestamp: Date;
        metric: string;
        value: number;
        threshold: number;
      }> = [];

      // Analyze RAGAS scores for quality alerts
      const ragasScores = recentMessages
        .map((m) => m.metadata?.ragas)
        .filter(Boolean);

      if (ragasScores.length > 0) {
        const avgFaithfulness = average(
          ragasScores.map((r) => r.faithfulness || 0)
        );
        const avgContextRecall = average(
          ragasScores.map((r) => r.contextRecall || 0)
        );
        const avgOverall = average(ragasScores.map((r) => r.overall || 0));

        // Faithfulness alert (hallucinations)
        if (avgFaithfulness < 0.8) {
          alerts.push({
            id: 'faithfulness-low',
            severity: avgFaithfulness < 0.6 ? 'critical' : 'high',
            title: 'Low Faithfulness Score',
            description:
              'AI may be hallucinating. Review grounding configuration and knowledge base quality.',
            timestamp: new Date(),
            metric: 'faithfulness',
            value: avgFaithfulness,
            threshold: 0.8,
          });
        }

        // Context recall alert (missing information)
        if (avgContextRecall < 0.7) {
          alerts.push({
            id: 'context-recall-low',
            severity: avgContextRecall < 0.5 ? 'high' : 'medium',
            title: 'Low Context Recall',
            description:
              'AI may be missing relevant information. Consider expanding knowledge base or improving chunking.',
            timestamp: new Date(),
            metric: 'contextRecall',
            value: avgContextRecall,
            threshold: 0.7,
          });
        }

        // Overall quality alert
        if (avgOverall < 0.75) {
          alerts.push({
            id: 'overall-quality-low',
            severity: avgOverall < 0.6 ? 'critical' : 'high',
            title: 'Low Overall RAGAS Score',
            description:
              'Multiple quality metrics below target. Review AI configuration and RAG pipeline.',
            timestamp: new Date(),
            metric: 'overall',
            value: avgOverall,
            threshold: 0.75,
          });
        }
      }

      // Performance alerts
      const latencies = recentMessages
        .map((m) => m.metadata?.performance?.totalLatencyMs)
        .filter((lat): lat is number => typeof lat === 'number');

      if (latencies.length > 0) {
        const p95 = percentile(latencies, 95);

        if (p95 > 3000) {
          alerts.push({
            id: 'latency-high',
            severity: p95 > 5000 ? 'high' : 'medium',
            title: 'High Response Latency',
            description: `P95 latency is ${p95.toFixed(0)}ms. Consider optimizing RAG retrieval or model selection.`,
            timestamp: new Date(),
            metric: 'p95_latency',
            value: p95,
            threshold: 3000,
          });
        }
      }

      // Cost alerts
      const costs = recentMessages.map((m) => m.metadata?.cost?.total || 0);
      const avgCost = average(costs);

      if (avgCost > 0.001) {
        alerts.push({
          id: 'cost-high',
          severity: avgCost > 0.003 ? 'medium' : 'low',
          title: 'High Average Cost',
          description: `Average cost per interaction is $${avgCost.toFixed(6)}. Consider prompt caching or model optimization.`,
          timestamp: new Date(),
          metric: 'avg_cost',
          value: avgCost,
          threshold: 0.001,
        });
      }

      // Filter by severity if specified and limit results
      let filteredAlerts = input.severity
        ? alerts.filter((a) => a.severity === input.severity)
        : alerts;

      filteredAlerts = filteredAlerts
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, limit);

      return {
        alerts: filteredAlerts,
        totalCount: alerts.length,
        criticalCount: alerts.filter((a) => a.severity === 'critical').length,
        highCount: alerts.filter((a) => a.severity === 'high').length,
      };
    }),
});

// ========================================
// Helper Functions
// ========================================

function calculateResolutionMetrics(messages: any[]) {
  // Calculate resolution rate based on escalation patterns
  const escalatedMessages = messages.filter(
    (m) => m.metadata?.confidence?.requiresEscalation === true
  );

  const escalationRate =
    messages.length > 0 ? escalatedMessages.length / messages.length : 0;
  const aiResolutionRate = 1 - escalationRate;

  // First contact resolution = resolved without follow-up
  // Simplified: assume resolved if confidence > 0.8 and no escalation
  const resolvedMessages = messages.filter(
    (m) =>
      m.metadata?.confidence?.score > 0.8 &&
      !m.metadata?.confidence?.requiresEscalation
  );

  const firstContactResolution =
    messages.length > 0 ? resolvedMessages.length / messages.length : 0;

  return {
    aiResolutionRate,
    firstContactResolution,
    escalationRate,
  };
}

function calculateSpeedMetrics(messages: any[]) {
  const latencies = messages
    .map((m) => m.metadata?.performance?.totalLatencyMs)
    .filter((lat): lat is number => typeof lat === 'number');

  if (latencies.length === 0) {
    return {
      averageResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  return {
    averageResponseTime: average(latencies),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

function calculateQualityMetrics(messages: any[]) {
  // Extract RAGAS scores
  const ragasScores = messages
    .map((m) => m.metadata?.ragas?.overall)
    .filter((s): s is number => typeof s === 'number');

  if (ragasScores.length === 0) {
    return {
      averageRAGASScore: 0,
      csat: 0.0,
      lowQualityCount: 0,
    };
  }

  return {
    averageRAGASScore: average(ragasScores),
    csat: 0.0, // TODO: Implement CSAT collection from end-user feedback
    lowQualityCount: ragasScores.filter((s) => s < 0.7).length,
  };
}

function calculateCostMetrics(messages: any[]) {
  const costs = messages.map((m) => m.metadata?.cost?.total || 0);

  if (costs.length === 0) {
    return {
      totalCost: 0,
      averageCost: 0,
      minCost: 0,
      maxCost: 0,
    };
  }

  return {
    totalCost: costs.reduce((sum, c) => sum + c, 0),
    averageCost: average(costs),
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
  };
}

function calculateModelDistribution(messages: any[]) {
  const models = messages.map(
    (m) => m.metadata?.modelRouting?.selectedModel || 'unknown'
  );
  const distribution: Record<string, number> = {};

  for (const model of models) {
    distribution[model] = (distribution[model] || 0) + 1;
  }

  return Object.entries(distribution).map(([model, count]) => ({
    model,
    count,
    percentage: messages.length > 0 ? (count / messages.length) * 100 : 0,
  }));
}

// ========================================
// Utility Functions
// ========================================

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function percentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function parseTimeRange(range: string): number {
  const map: Record<string, number> = {
    '1h': 3600000, // 1 hour
    '24h': 86400000, // 24 hours
    '7d': 604800000, // 7 days
    '30d': 2592000000, // 30 days
  };
  return map[range] || 86400000; // Default: 24 hours
}
