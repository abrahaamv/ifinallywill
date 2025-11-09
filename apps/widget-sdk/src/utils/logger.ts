/**
 * Simple browser logger for widget-sdk
 * Minimal implementation to keep bundle size small
 */

type Logger = {
  trace: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  fatal: (message: string, data?: unknown) => void;
};

/**
 * Create a simple module logger
 * Uses browser console with module prefix for debugging
 */
export function createModuleLogger(module: string): Logger {
  const prefix = `[Widget:${module}]`;

  return {
    trace: (message, data) => console.debug(prefix, message, data),
    debug: (message, data) => console.debug(prefix, message, data),
    info: (message, data) => console.info(prefix, message, data),
    warn: (message, data) => console.warn(prefix, message, data),
    error: (message, data) => console.error(prefix, message, data),
    fatal: (message, data) => console.error(prefix, '[FATAL]', message, data),
  };
}
