/**
 * Prometheus Metrics Integration for A/B Testing (Phase 12 Week 9-10)
 *
 * Tracks experiment metrics in Prometheus format:
 * - Variant impressions and conversions
 * - Conversion rates and confidence intervals
 * - Response times, token usage, costs
 * - Statistical significance metrics
 *
 * Metrics exposed via /metrics endpoint for Prometheus scraping
 */

import type { Variant, Experiment, ExperimentResult } from './variant-manager';

// ==================== TYPES ====================

export interface MetricLabels {
  tenant_id?: string;
  experiment_id?: string;
  variant_id?: string;
  variant_name?: string;
  experiment_type?: string;
  strategy?: string;
  [key: string]: string | undefined;
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels: MetricLabels;
  timestamp?: number;
}

export interface MetricsCollector {
  collect(): Promise<string>; // Prometheus text format
  reset(): void;
}

// ==================== PROMETHEUS METRICS COLLECTOR ====================

export class ABTestingMetricsCollector implements MetricsCollector {
  private metrics: Map<string, PrometheusMetric> = new Map();

  /**
   * Record variant impression
   */
  recordImpression(params: {
    experimentId: string;
    variantId: string;
    variantName: string;
    tenantId: string;
  }): void {
    this.increment('ab_test_variant_impressions_total', {
      experiment_id: params.experimentId,
      variant_id: params.variantId,
      variant_name: params.variantName,
      tenant_id: params.tenantId,
    });
  }

  /**
   * Record variant conversion
   */
  recordConversion(params: {
    experimentId: string;
    variantId: string;
    variantName: string;
    tenantId: string;
    responseTime?: number;
    tokens?: number;
    cost?: number;
  }): void {
    this.increment('ab_test_variant_conversions_total', {
      experiment_id: params.experimentId,
      variant_id: params.variantId,
      variant_name: params.variantName,
      tenant_id: params.tenantId,
    });

    if (params.responseTime !== undefined) {
      this.observe('ab_test_variant_response_time_seconds', params.responseTime / 1000, {
        experiment_id: params.experimentId,
        variant_id: params.variantId,
        variant_name: params.variantName,
        tenant_id: params.tenantId,
      });
    }

    if (params.tokens !== undefined) {
      this.observe('ab_test_variant_tokens_total', params.tokens, {
        experiment_id: params.experimentId,
        variant_id: params.variantId,
        variant_name: params.variantName,
        tenant_id: params.tenantId,
      });
    }

    if (params.cost !== undefined) {
      this.observe('ab_test_variant_cost_usd', params.cost, {
        experiment_id: params.experimentId,
        variant_id: params.variantId,
        variant_name: params.variantName,
        tenant_id: params.tenantId,
      });
    }
  }

  /**
   * Record variant failure
   */
  recordFailure(params: {
    experimentId: string;
    variantId: string;
    variantName: string;
    tenantId: string;
  }): void {
    this.increment('ab_test_variant_failures_total', {
      experiment_id: params.experimentId,
      variant_id: params.variantId,
      variant_name: params.variantName,
      tenant_id: params.tenantId,
    });
  }

  /**
   * Update variant conversion rate gauge
   */
  updateConversionRate(variant: Variant, tenantId: string): void {
    this.gauge('ab_test_variant_conversion_rate', variant.conversionRate, {
      experiment_id: variant.experimentId,
      variant_id: variant.id,
      variant_name: variant.name,
      tenant_id: tenantId,
    });
  }

  /**
   * Update experiment status
   */
  updateExperimentStatus(experiment: Experiment): void {
    const statusValue = {
      draft: 0,
      running: 1,
      paused: 2,
      completed: 3,
    }[experiment.status];

    this.gauge('ab_test_experiment_status', statusValue, {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      experiment_type: experiment.type,
      tenant_id: experiment.tenantId,
      strategy: experiment.strategy,
    });

    this.gauge('ab_test_experiment_traffic_allocation', experiment.trafficAllocation, {
      experiment_id: experiment.id,
      tenant_id: experiment.tenantId,
    });
  }

  /**
   * Update statistical significance metrics
   */
  updateStatisticalMetrics(result: ExperimentResult, tenantId: string): void {
    if (result.pValue !== null) {
      this.gauge('ab_test_experiment_p_value', result.pValue, {
        experiment_id: result.experimentId,
        tenant_id: tenantId,
      });

      this.gauge('ab_test_experiment_confidence', result.confidence, {
        experiment_id: result.experimentId,
        tenant_id: tenantId,
      });
    }

    this.gauge('ab_test_experiment_total_impressions', result.metrics.totalImpressions, {
      experiment_id: result.experimentId,
      tenant_id: tenantId,
    });

    this.gauge('ab_test_experiment_total_conversions', result.metrics.totalConversions, {
      experiment_id: result.experimentId,
      tenant_id: tenantId,
    });

    if (result.isSignificant && result.winner) {
      this.gauge('ab_test_experiment_has_winner', 1, {
        experiment_id: result.experimentId,
        winner_id: result.winner.id,
        winner_name: result.winner.name,
        tenant_id: tenantId,
      });
    } else {
      this.gauge('ab_test_experiment_has_winner', 0, {
        experiment_id: result.experimentId,
        tenant_id: tenantId,
      });
    }
  }

  /**
   * Record variant selection strategy
   */
  recordVariantSelection(params: {
    experimentId: string;
    variantId: string;
    strategy: string;
    tenantId: string;
  }): void {
    this.increment('ab_test_variant_selections_total', {
      experiment_id: params.experimentId,
      variant_id: params.variantId,
      strategy: params.strategy,
      tenant_id: params.tenantId,
    });
  }

  /**
   * Collect all metrics in Prometheus text format
   */
  async collect(): Promise<string> {
    const lines: string[] = [];

    // Group metrics by name
    const grouped = new Map<string, PrometheusMetric[]>();
    for (const metric of this.metrics.values()) {
      const existing = grouped.get(metric.name) || [];
      existing.push(metric);
      grouped.set(metric.name, existing);
    }

    // Format each metric group
    for (const [name, metrics] of grouped) {
      const first = metrics[0];
      if (!first) continue;

      // HELP line
      lines.push(`# HELP ${name} ${first.help}`);
      // TYPE line
      lines.push(`# TYPE ${name} ${first.type}`);

      // Metric lines
      for (const metric of metrics) {
        const labels = this.formatLabels(metric.labels);
        const value = metric.value;
        const timestamp = metric.timestamp ? ` ${metric.timestamp}` : '';
        lines.push(`${name}${labels} ${value}${timestamp}`);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  // ==================== METRIC OPERATIONS ====================

  /**
   * Increment a counter metric
   */
  private increment(name: string, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value++;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        help: this.getMetricHelp(name),
        type: 'counter',
        value: 1,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Set a gauge metric
   */
  private gauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    this.metrics.set(key, {
      name,
      help: this.getMetricHelp(name),
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Observe a histogram/summary metric (simplified as gauge)
   */
  private observe(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.metricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      // Update running average
      const count = (existing.value || 0) + 1;
      existing.value = ((existing.value || 0) * (count - 1) + value) / count;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        help: this.getMetricHelp(name),
        type: 'histogram',
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Generate metric key from name and labels
   */
  private metricKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * Format labels for Prometheus text format
   */
  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '';

    const formatted = entries
      .map(([key, value]) => `${key}="${this.escapeLabel(value!)}"`)
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Escape label value for Prometheus format
   */
  private escapeLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Get help text for metric
   */
  private getMetricHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      ab_test_variant_impressions_total: 'Total number of times variant was shown to users',
      ab_test_variant_conversions_total: 'Total number of successful conversions for variant',
      ab_test_variant_failures_total: 'Total number of failed conversions for variant',
      ab_test_variant_conversion_rate: 'Current conversion rate for variant (0-1)',
      ab_test_variant_response_time_seconds: 'Average response time for variant in seconds',
      ab_test_variant_tokens_total: 'Average token usage for variant',
      ab_test_variant_cost_usd: 'Average cost per query for variant in USD',
      ab_test_experiment_status: 'Experiment status (0=draft, 1=running, 2=paused, 3=completed)',
      ab_test_experiment_traffic_allocation: 'Percentage of traffic allocated to experiment (0-1)',
      ab_test_experiment_p_value: 'Statistical p-value for experiment significance',
      ab_test_experiment_confidence: 'Statistical confidence level for experiment',
      ab_test_experiment_total_impressions: 'Total impressions across all variants',
      ab_test_experiment_total_conversions: 'Total conversions across all variants',
      ab_test_experiment_has_winner: 'Whether experiment has statistically significant winner (0 or 1)',
      ab_test_variant_selections_total: 'Total variant selections by strategy',
    };

    return helpTexts[name] || `Metric: ${name}`;
  }
}

// ==================== SINGLETON INSTANCE ====================

let globalMetricsCollector: ABTestingMetricsCollector | null = null;

/**
 * Get global metrics collector instance
 */
export function getMetricsCollector(): ABTestingMetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new ABTestingMetricsCollector();
  }
  return globalMetricsCollector;
}

/**
 * Export metrics in Prometheus text format
 */
export async function exportPrometheusMetrics(): Promise<string> {
  const collector = getMetricsCollector();
  return await collector.collect();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  const collector = getMetricsCollector();
  collector.reset();
}
