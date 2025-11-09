/**
 * Browser-Compatible Logger
 * Lightweight logging for browser environments without Node.js dependencies
 */

export type Logger = {
  trace: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  fatal: (message: string, data?: Record<string, unknown>) => void;
  child: (context: Record<string, unknown>) => Logger;
};

/**
 * Sensitive field names to redact from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
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
];

/**
 * Redact sensitive data from log objects
 */
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };

  for (const key of SENSITIVE_FIELDS) {
    if (key in redacted) {
      redacted[key] = '[REDACTED]';
    }
  }

  // Recursively redact nested objects
  for (const [key, value] of Object.entries(redacted)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      redacted[key] = value.map((item) =>
        item && typeof item === 'object'
          ? redactSensitiveData(item as Record<string, unknown>)
          : item
      );
    }
  }

  return redacted;
}

/**
 * Create browser logger instance
 */
function createBrowserLogger(context?: Record<string, unknown>): Logger {
  const logContext = context || {};

  const log = (
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    message: string,
    data?: Record<string, unknown>
  ) => {
    const redactedData = data ? redactSensitiveData(data) : undefined;
    const logData = { ...logContext, ...redactedData };

    // Map to console methods
    const consoleMethods = {
      trace: console.debug,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    };

    const consoleMethod = consoleMethods[level];
    consoleMethod(`[${level.toUpperCase()}]`, message, logData);
  };

  return {
    trace: (message, data) => log('trace', message, data),
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
    fatal: (message, data) => log('fatal', message, data),
    child: (childContext) => createBrowserLogger({ ...logContext, ...childContext }),
  };
}

/**
 * Global browser logger instance
 */
export const logger = createBrowserLogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(redactSensitiveData(context));
}

/**
 * Create a module-specific logger
 */
export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}

/**
 * Request logger for HTTP requests
 */
export function createRequestLogger(requestId?: string): Logger {
  return logger.child({
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'http',
  });
}

/**
 * Database query logger
 */
export function createDatabaseLogger(): Logger {
  return logger.child({ type: 'database' });
}

/**
 * Log with automatic sensitive data redaction
 */
export function logSafe(
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  data?: Record<string, unknown>
): void {
  const redacted = data ? redactSensitiveData(data) : undefined;
  logger[level](message, redacted);
}
