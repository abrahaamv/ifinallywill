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
  internalError,
  wrapError,
  assertExists,
  toTRPCError,
  type ErrorOptions,
} from './errors';
