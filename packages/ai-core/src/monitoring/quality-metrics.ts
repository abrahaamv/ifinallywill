/**
 * Phase 12 Week 4: Quality Metrics Tracking
 * Comprehensive quality monitoring and alerting system
 */

import { createModuleLogger } from '@platform/shared';
import type { RAGASScores } from './ragas-metrics';

const logger = createModuleLogger('QualityMetrics');

export interface QualityMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface QualityThreshold {
  metric: string;
  minValue?: number;
  maxValue?: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface QualityAlert {
  id: string;
  metric: string;
  value: number;
  threshold: QualityThreshold;
  timestamp: Date;
  acknowledged: boolean;
}

export interface QualityReport {
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    avg: Record<string, number>;
    min: Record<string, number>;
    max: Record<string, number>;
    p50: Record<string, number>;
    p95: Record<string, number>;
    p99: Record<string, number>;
  };
  alerts: QualityAlert[];
  trends: {
    metric: string;
    direction: 'improving' | 'stable' | 'declining';
    changePercent: number;
  }[];
}

/**
 * Quality Metrics Tracker
 *
 * Tracks and monitors quality metrics:
 * - RAGAS scores (faithfulness, relevancy, etc.)
 * - Response times
 * - Error rates
 * - Cost per query
 * - User satisfaction scores
 */
export class QualityMetricsTracker {
  private metrics: Map<string, QualityMetric[]> = new Map();
  private thresholds: QualityThreshold[] = [];
  private alerts: QualityAlert[] = [];

  constructor() {
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default quality thresholds
   */
  private initializeDefaultThresholds(): void {
    this.thresholds = [
      // RAGAS scores
      { metric: 'ragas_faithfulness', minValue: 0.7, severity: 'warning' },
      { metric: 'ragas_faithfulness', minValue: 0.5, severity: 'critical' },
      { metric: 'ragas_answer_relevancy', minValue: 0.7, severity: 'warning' },
      { metric: 'ragas_context_relevancy', minValue: 0.6, severity: 'warning' },
      { metric: 'ragas_overall', minValue: 0.6, severity: 'critical' },

      // Performance
      { metric: 'response_time_ms', maxValue: 5000, severity: 'warning' },
      { metric: 'response_time_ms', maxValue: 10000, severity: 'critical' },

      // Error rates
      { metric: 'error_rate', maxValue: 0.05, severity: 'warning' }, // 5%
      { metric: 'error_rate', maxValue: 0.1, severity: 'critical' }, // 10%

      // Cost
      { metric: 'cost_per_query_usd', maxValue: 0.10, severity: 'warning' },
      { metric: 'cost_per_query_usd', maxValue: 0.25, severity: 'critical' },

      // User satisfaction
      { metric: 'user_satisfaction', minValue: 0.7, severity: 'warning' },
      { metric: 'user_satisfaction', minValue: 0.5, severity: 'critical' },
    ];
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: QualityMetric = {
      name,
      value,
      timestamp: new Date(),
      metadata,
    };

    // Store metric
    const history = this.metrics.get(name) || [];
    history.push(metric);

    // Keep only last 10,000 metrics per type
    if (history.length > 10000) {
      history.shift();
    }

    this.metrics.set(name, history);

    // Check thresholds
    this.checkThresholds(metric);

    logger.debug('Metric recorded', { name, value });
  }

  /**
   * Record RAGAS scores
   */
  recordRAGASScores(scores: RAGASScores, metadata?: Record<string, unknown>): void {
    this.recordMetric('ragas_faithfulness', scores.faithfulness, metadata);
    this.recordMetric('ragas_answer_relevancy', scores.answerRelevancy, metadata);
    this.recordMetric('ragas_context_relevancy', scores.contextRelevancy, metadata);
    this.recordMetric('ragas_context_precision', scores.contextPrecision, metadata);
    this.recordMetric('ragas_context_recall', scores.contextRecall, metadata);
    this.recordMetric('ragas_overall', scores.overall, metadata);
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: QualityMetric): void {
    for (const threshold of this.thresholds) {
      if (threshold.metric !== metric.name) continue;

      let violated = false;

      if (threshold.minValue !== undefined && metric.value < threshold.minValue) {
        violated = true;
      }

      if (threshold.maxValue !== undefined && metric.value > threshold.maxValue) {
        violated = true;
      }

      if (violated) {
        const alert: QualityAlert = {
          id: `${Date.now()}-${metric.name}`,
          metric: metric.name,
          value: metric.value,
          threshold,
          timestamp: new Date(),
          acknowledged: false,
        };

        this.alerts.push(alert);

        logger.warn('Quality threshold violated', {
          metric: metric.name,
          value: metric.value,
          threshold: threshold.minValue || threshold.maxValue,
          severity: threshold.severity,
        });
      }
    }
  }

  /**
   * Get metric statistics
   */
  getStatistics(metricName: string, since?: Date): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const history = this.metrics.get(metricName) || [];

    // Filter by timestamp
    const filtered = since
      ? history.filter((m) => m.timestamp >= since)
      : history;

    if (filtered.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = filtered.map((m) => m.value).sort((a, b) => a - b);
    const count = values.length;

    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / count;

    const min = values[0] || 0;
    const max = values[count - 1] || 0;

    const p50 = values[Math.floor(count * 0.5)] || 0;
    const p95 = values[Math.floor(count * 0.95)] || 0;
    const p99 = values[Math.floor(count * 0.99)] || 0;

    return {
      count,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Generate quality report
   */
  generateReport(period: 'hour' | 'day' | 'week' | 'month'): QualityReport {
    // Calculate time window
    const now = new Date();
    const since = new Date(now);

    switch (period) {
      case 'hour':
        since.setHours(since.getHours() - 1);
        break;
      case 'day':
        since.setDate(since.getDate() - 1);
        break;
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
      case 'month':
        since.setMonth(since.getMonth() - 1);
        break;
    }

    // Collect metrics
    const metricNames = Array.from(this.metrics.keys());
    const metrics = {
      avg: {} as Record<string, number>,
      min: {} as Record<string, number>,
      max: {} as Record<string, number>,
      p50: {} as Record<string, number>,
      p95: {} as Record<string, number>,
      p99: {} as Record<string, number>,
    };

    for (const name of metricNames) {
      const stats = this.getStatistics(name, since);
      metrics.avg[name] = stats.avg;
      metrics.min[name] = stats.min;
      metrics.max[name] = stats.max;
      metrics.p50[name] = stats.p50;
      metrics.p95[name] = stats.p95;
      metrics.p99[name] = stats.p99;
    }

    // Get alerts in period
    const periodAlerts = this.alerts.filter((a) => a.timestamp >= since);

    // Calculate trends
    const trends = this.calculateTrends(since);

    logger.info('Quality report generated', {
      period,
      metricCount: metricNames.length,
      alertCount: periodAlerts.length,
    });

    return {
      period,
      metrics,
      alerts: periodAlerts,
      trends,
    };
  }

  /**
   * Calculate metric trends
   */
  private calculateTrends(since: Date): Array<{
    metric: string;
    direction: 'improving' | 'stable' | 'declining';
    changePercent: number;
  }> {
    const trends: Array<{
      metric: string;
      direction: 'improving' | 'stable' | 'declining';
      changePercent: number;
    }> = [];

    for (const [name, history] of this.metrics.entries()) {
      const filtered = history.filter((m) => m.timestamp >= since);

      if (filtered.length < 2) continue;

      // Split into two halves
      const midpoint = Math.floor(filtered.length / 2);
      const firstHalf = filtered.slice(0, midpoint);
      const secondHalf = filtered.slice(midpoint);

      const avgFirst = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

      const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

      let direction: 'improving' | 'stable' | 'declining';

      // For most metrics, higher is better
      // For cost and error_rate, lower is better
      const lowerIsBetter = name.includes('cost') || name.includes('error');

      if (Math.abs(changePercent) < 5) {
        direction = 'stable';
      } else if (lowerIsBetter) {
        direction = changePercent < 0 ? 'improving' : 'declining';
      } else {
        direction = changePercent > 0 ? 'improving' : 'declining';
      }

      trends.push({
        metric: name,
        direction,
        changePercent,
      });
    }

    return trends;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): QualityAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged', { alertId });
    }
  }

  /**
   * Add custom threshold
   */
  addThreshold(threshold: QualityThreshold): void {
    this.thresholds.push(threshold);
    logger.info('Threshold added', { metric: threshold.metric });
  }

  /**
   * Export metrics for external systems (Prometheus, Datadog, etc.)
   */
  exportMetrics(): Record<string, number> {
    const exported: Record<string, number> = {};

    for (const [name, history] of this.metrics.entries()) {
      if (history.length === 0) continue;

      const latest = history[history.length - 1];
      if (latest) {
        exported[name] = latest.value;
      }

      // Add statistics
      const stats = this.getStatistics(name);
      exported[`${name}_avg`] = stats.avg;
      exported[`${name}_p95`] = stats.p95;
      exported[`${name}_p99`] = stats.p99;
    }

    return exported;
  }
}

/**
 * Create a quality metrics tracker instance
 */
export function createQualityTracker(): QualityMetricsTracker {
  return new QualityMetricsTracker();
}
