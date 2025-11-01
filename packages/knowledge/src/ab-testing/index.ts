/**
 * A/B Testing Framework (Phase 12 Week 9-10)
 *
 * Exports:
 * - VariantManager: Experiment and variant management with multi-armed bandit
 * - ABTestingMetricsCollector: Prometheus metrics integration
 * - Statistical significance testing (Chi-Square, Thompson Sampling)
 */

// Variant Management
export {
  VariantManager,
  type Variant,
  type VariantType,
  type Experiment,
  type VariantSelection,
  type ExperimentResult,
} from './variant-manager';

// Prometheus Metrics
export {
  ABTestingMetricsCollector,
  getMetricsCollector,
  exportPrometheusMetrics,
  resetMetrics,
  type MetricLabels,
  type PrometheusMetric,
  type MetricsCollector,
} from './prometheus-metrics';
