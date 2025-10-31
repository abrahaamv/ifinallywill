/**
 * Error Handling Utilities (Production Readiness)
 *
 * Centralized error handling with:
 * - Consistent error types
 * - Sanitized error messages for production
 * - Structured error logging
 * - Security-aware error responses
 */

import { logger } from '@platform/shared';
import { TRPCError } from '@trpc/server';

/**
 * Standard error codes mapped to HTTP status codes
 */
export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Application-specific error types
 */
export const APP_ERROR_TYPES = {
  // Authentication & Authorization
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MFA_REQUIRED: 'MFA_REQUIRED',

  // Data & Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // Business Logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',

  // Database & External Services
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Error details interface for structured error responses
 */
export interface ErrorDetails {
  code: string;
  type?: string;
  field?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Create a standardized TRPCError with consistent formatting
 *
 * @param code - HTTP status code
 * @param message - User-friendly error message
 * @param details - Additional error context (optional)
 */
export function createError(
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: Partial<ErrorDetails>
): TRPCError {
  return new TRPCError({
    code,
    message,
    cause: details,
  });
}

/**
 * Sanitize error messages for production
 *
 * Prevents leaking sensitive information like:
 * - Database connection strings
 * - Internal file paths
 * - Stack traces
 * - Environment variables
 */
export function sanitizeErrorMessage(error: unknown, isProd: boolean): string {
  if (!isProd) {
    // Development: return full error message
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // Production: return safe, generic messages
  if (error instanceof TRPCError) {
    // TRPCErrors are designed to be user-facing
    return error.message;
  }

  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      return 'Database connection error. Please try again later.';
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'Invalid request data. Please check your input.';
    }

    // Permission errors
    if (error.message.includes('permission') || error.message.includes('access denied')) {
      return 'You do not have permission to perform this action.';
    }
  }

  // Generic error for everything else
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Log errors with structured context
 *
 * @param error - Error object
 * @param context - Additional context (procedure name, user ID, etc.)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: error instanceof TRPCError ? error.code : undefined,
    cause: error instanceof Error ? error.cause : undefined,
    ...context,
  };

  if (error instanceof TRPCError) {
    // Client errors (4xx) - log as warnings
    if (error.code === 'BAD_REQUEST' || error.code === 'NOT_FOUND') {
      logger.warn(errorInfo, 'Client error');
    }
    // Auth errors - log with security context
    else if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
      logger.warn(errorInfo, 'Authentication/Authorization error');
    }
    // Server errors (5xx) - log as errors
    else {
      logger.error(errorInfo, 'Server error');
    }
  } else {
    // Unexpected errors - always log as errors
    logger.error(errorInfo, 'Unexpected error');
  }
}

/**
 * Handle database constraint violations
 *
 * Converts database-specific errors to user-friendly messages
 */
export function handleDatabaseError(error: unknown): TRPCError {
  if (error instanceof Error) {
    // PostgreSQL unique constraint violation
    if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      return createError('CONFLICT', 'A record with this value already exists.', {
        code: 'DUPLICATE_RESOURCE',
        type: APP_ERROR_TYPES.DUPLICATE_RESOURCE,
      });
    }

    // PostgreSQL foreign key constraint violation
    if (error.message.includes('foreign key constraint')) {
      return createError('PRECONDITION_FAILED', 'Referenced resource does not exist.', {
        code: 'INVALID_REFERENCE',
        type: APP_ERROR_TYPES.VALIDATION_ERROR,
      });
    }

    // PostgreSQL not null constraint violation
    if (error.message.includes('not null constraint')) {
      return createError('BAD_REQUEST', 'Required field is missing.', {
        code: 'MISSING_REQUIRED_FIELD',
        type: APP_ERROR_TYPES.INVALID_INPUT,
      });
    }

    // Connection errors
    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      return createError('SERVICE_UNAVAILABLE', 'Database temporarily unavailable.', {
        code: 'DATABASE_UNAVAILABLE',
        type: APP_ERROR_TYPES.DATABASE_ERROR,
      });
    }
  }

  // Generic database error
  return createError('INTERNAL_SERVER_ERROR', 'Database operation failed.', {
    code: 'DATABASE_ERROR',
    type: APP_ERROR_TYPES.DATABASE_ERROR,
  });
}

/**
 * Wrap async operations with error handling
 *
 * Automatically catches and converts errors to TRPCErrors
 *
 * @param fn - Async function to wrap
 * @param context - Error context (procedure name, etc.)
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log error with context
    logError(error, context);

    // If already a TRPCError, re-throw as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('database')) {
      throw handleDatabaseError(error);
    }

    // Unknown error - wrap in INTERNAL_SERVER_ERROR
    throw createError(
      'INTERNAL_SERVER_ERROR',
      sanitizeErrorMessage(error, process.env.NODE_ENV === 'production'),
      {
        code: 'UNKNOWN_ERROR',
      }
    );
  }
}
