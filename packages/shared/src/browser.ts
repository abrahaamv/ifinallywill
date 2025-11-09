/**
 * @platform/shared/browser - Browser-safe exports
 *
 * This entry point only exports utilities that are safe for browser environments.
 * Server-side modules (telemetry, alerting) are excluded to prevent bundling Node.js dependencies.
 */

// Logging (browser-compatible - no Node.js dependencies)
export {
  logger,
  createChildLogger,
  createModuleLogger,
  createRequestLogger,
  createDatabaseLogger,
  logSafe,
  type Logger,
} from './logger-browser';

// Error handling utilities (browser-safe)
export {
  ErrorCodes,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  wrapError,
  assertExists,
  toTRPCError,
  type ErrorOptions,
} from './errors';

// Phase 10 cost tracking utilities (browser-safe)
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

// Phase 11 device fingerprinting (browser-safe)
export {
  FINGERPRINT_CONFIG,
  parseFingerprintResult,
  isValidFingerprint,
  isPotentialAbuse,
  getShortFingerprint,
  type FingerprintResult,
  type ExtendedFingerprint,
} from './fingerprint';

// Note: Environment validation, telemetry, and alerting are NOT exported for browser
// These modules require Node.js (process.env, core modules) and are server-side only
