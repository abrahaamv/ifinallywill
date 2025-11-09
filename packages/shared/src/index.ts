/**
 * @platform/shared - Shared utilities and services
 *
 * Common functionality used across the platform
 */

// Logging (Phase 2 Task 2.4)
export {
  logger,
  createChildLogger,
  createModuleLogger,
  createRequestLogger,
  createDatabaseLogger,
  logSafe,
  type Logger,
} from './logger';

// Monitoring and metrics
export { metrics, MetricNames, measureAsync, measure, type MetricType } from './monitoring';

// Error handling utilities
export {
  ErrorCodes,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  wrapError,
  assertExists,
  toTRPCError,
  type ErrorOptions,
} from './errors';

// Phase 10 cost tracking utilities
export {
  calculateCacheCost,
  calculateRerankingCost,
  calculateMemoryCost,
  calculateClusteringCost,
  calculatePhase10Savings,
  formatCost,
  formatPercentage,
  type CacheStatistics,
  type RerankingCost,
  type MemoryCost,
  type ClusteringCost,
  type Phase10CostSummary,
} from './cost-tracking';

// Phase 11 device fingerprinting
export {
  FINGERPRINT_CONFIG,
  parseFingerprintResult,
  isValidFingerprint,
  isPotentialAbuse,
  getShortFingerprint,
  type FingerprintResult,
  type ExtendedFingerprint,
} from './fingerprint';

// Phase 8 environment validation (Week 1 Critical Fix #10)
export {
  validateEnvironment,
  getEnv,
  isProduction,
  isDevelopment,
  isTest,
  type ValidatedEnv,
} from './env-validation';

// OpenTelemetry APM integration (Security Audit Remediation)
export {
  initTelemetry,
  shutdownTelemetry,
  getTracer,
  withSpan,
  metrics as telemetryMetrics,
  trace,
  metricsApi,
  type TelemetryConfig,
  type Span,
  type Tracer,
} from './telemetry';

// Alerting and monitoring (Security Audit Remediation)
export {
  AlertSeverity,
  AlertType,
  AlertChecks,
  checkAlertConditions,
  getAlertCondition,
  getEnabledAlerts,
  ALERT_CONDITIONS,
  type AlertCondition,
  type Alert,
} from './alerting';
