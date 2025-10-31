/**
 * Centralized Logger - Production Ready
 *
 * Pino-based structured logging with sensitive data redaction.
 * Replaces all console.log usage across the platform.
 *
 * Phase 2 Task 2.4: Replace Console.log
 */

import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

/**
 * Sensitive field names to redact from logs
 * Prevents accidental logging of passwords, tokens, API keys, etc.
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'secretKey',
  'privateKey',
  'csrfToken',
  'sessionToken',
  'authToken',
  'bearerToken',
  'oauthToken',
  'apiSecret',
  'clientSecret',
  'encryptionKey',
  'cookie',
  'authorization',
  'mfaSecret',
  'totpSecret',
  'backupCodes',
  'recoveryCode',
  'ssn',
  'creditCard',
  'cardNumber',
  'cvv',
  'pin',
];

/**
 * Redact sensitive data from log objects
 */
function createRedactor() {
  return (obj: Record<string, unknown>): Record<string, unknown> => {
    const redacted = { ...obj };

    for (const key of SENSITIVE_FIELDS) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }

    // Recursively redact nested objects
    for (const [key, value] of Object.entries(redacted)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        redacted[key] = createRedactor()(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        redacted[key] = value.map((item) =>
          item && typeof item === 'object'
            ? createRedactor()(item as Record<string, unknown>)
            : item
        );
      }
    }

    return redacted;
  };
}

/**
 * Create logger instance with environment-specific configuration
 */
function createLogger(options?: Partial<LoggerOptions>): Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const baseOptions: LoggerOptions = {
    level: logLevel,
    // Serialize errors properly
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    // Redact sensitive fields
    redact: {
      paths: SENSITIVE_FIELDS,
      censor: '[REDACTED]',
    },
    // Pretty print in development, JSON in production
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
    // Base fields
    base: {
      env: process.env.NODE_ENV || 'development',
      service: process.env.SERVICE_NAME || 'platform',
    },
  };

  return pino({ ...baseOptions, ...options });
}

/**
 * Global logger instance
 * Use this for general logging across the application
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 *
 * @example
 * const sessionLogger = createChildLogger({ sessionId: '123', userId: 'abc' });
 * sessionLogger.info('Session created');
 */
export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(createRedactor()(context));
}

/**
 * Create a module-specific logger
 *
 * @example
 * const authLogger = createModuleLogger('auth');
 * authLogger.info('User logged in', { userId: '123' });
 */
export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}

/**
 * Request logger for HTTP requests
 * Automatically redacts sensitive headers and body fields
 */
export function createRequestLogger(requestId?: string): Logger {
  return logger.child({
    requestId: requestId || generateRequestId(),
    type: 'http',
  });
}

/**
 * Database query logger
 * Redacts sensitive query parameters
 */
export function createDatabaseLogger(): Logger {
  return logger.child({ type: 'database' });
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log with automatic sensitive data redaction
 *
 * @example
 * logSafe('info', 'User created', { email: 'user@example.com', password: 'secret' });
 * // Output: { email: 'user@example.com', password: '[REDACTED]' }
 */
export function logSafe(
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  data?: Record<string, unknown>
): void {
  const redacted = data ? createRedactor()(data) : undefined;
  logger[level](redacted, message);
}

/**
 * Export types for TypeScript
 */
export type { Logger } from 'pino';
