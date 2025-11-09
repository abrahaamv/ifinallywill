/**
 * Standardized error handling utilities for tRPC routers
 *
 * Provides consistent error creation, logging, and HTTP status mapping
 * across all API endpoints.
 */

import { TRPCError } from '@trpc/server';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('errors');

/**
 * Standard error codes used across the platform
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Error creation options
 */
export interface ErrorOptions {
  message: string;
  cause?: unknown;
  meta?: Record<string, unknown>;
  logLevel?: 'error' | 'warn' | 'info';
}

/**
 * Create a standardized BAD_REQUEST error (400)
 * Use for: Invalid input, validation failures
 */
export function badRequest(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'warn' } = options;

  if (logLevel === 'error') {
    logger.error(message, { cause, meta });
  } else if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'BAD_REQUEST',
    message,
    cause,
  });
}

/**
 * Create a standardized UNAUTHORIZED error (401)
 * Use for: Missing/invalid credentials
 */
export function unauthorized(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'warn' } = options;

  if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'UNAUTHORIZED',
    message,
    cause,
  });
}

/**
 * Create a standardized FORBIDDEN error (403)
 * Use for: Valid auth but insufficient permissions
 */
export function forbidden(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'warn' } = options;

  if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'FORBIDDEN',
    message,
    cause,
  });
}

/**
 * Create a standardized NOT_FOUND error (404)
 * Use for: Resource not found or access denied
 */
export function notFound(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'info' } = options;

  if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'NOT_FOUND',
    message,
    cause,
  });
}

/**
 * Create a standardized CONFLICT error (409)
 * Use for: Resource already exists, state conflicts
 */
export function conflict(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'warn' } = options;

  if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'CONFLICT',
    message,
    cause,
  });
}

/**
 * Create a standardized TOO_MANY_REQUESTS error (429)
 * Use for: Rate limiting violations
 */
export function tooManyRequests(options: ErrorOptions): TRPCError {
  const { message, cause, meta, logLevel = 'warn' } = options;

  if (logLevel === 'warn') {
    logger.warn(message, { cause, meta });
  }

  return new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message,
    cause,
  });
}

/**
 * Create a standardized INTERNAL_SERVER_ERROR (500)
 * Use for: Database errors, unexpected failures
 */
export function internalError(options: ErrorOptions): TRPCError {
  const { message, cause, meta } = options;

  logger.error(message, { cause, meta });

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    cause,
  });
}

/**
 * Wrap an error-prone async operation with automatic error conversion
 *
 * @example
 * ```typescript
 * const result = await wrapError(
 *   () => db.select().from(users).where(eq(users.id, id)),
 *   { operation: 'fetch user', notFoundMessage: 'User not found' }
 * );
 * ```
 */
export async function wrapError<T>(
  operation: () => Promise<T>,
  options: {
    operation: string;
    notFoundMessage?: string;
    errorMessage?: string;
  }
): Promise<T> {
  try {
    const result = await operation();

    // Handle empty result arrays (common pattern)
    if (Array.isArray(result) && result.length === 0 && options.notFoundMessage) {
      throw notFound({ message: options.notFoundMessage });
    }

    return result;
  } catch (error) {
    // Re-throw if already a TRPCError
    if (error instanceof TRPCError) {
      throw error;
    }

    // Convert to internal error
    throw internalError({
      message: options.errorMessage || `Failed to ${options.operation}`,
      cause: error,
    });
  }
}

/**
 * Check if a value exists, throw NOT_FOUND if not
 *
 * @example
 * ```typescript
 * const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
 * assertExists(user[0], 'User not found');
 * ```
 */
export function assertExists<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw notFound({ message });
  }
}

/**
 * Convert generic Error to TRPCError if not already
 * Useful for catch blocks to ensure consistent error types
 */
export function toTRPCError(error: unknown, fallbackMessage: string): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  return internalError({
    message: fallbackMessage,
    cause: error,
  });
}
