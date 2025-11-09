/**
 * Simple logger for auth package
 * Works in both Node.js and browser environments
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
 * Uses console in browser, can be enhanced for Node.js later
 */
export function createModuleLogger(module: string): Logger {
  const prefix = `[Auth:${module}]`;

  return {
    trace: (message, data) => console.debug(prefix, message, data),
    debug: (message, data) => console.debug(prefix, message, data),
    info: (message, data) => console.info(prefix, message, data),
    warn: (message, data) => console.warn(prefix, message, data),
    error: (message, data) => console.error(prefix, message, data),
    fatal: (message, data) => console.error(prefix, '[FATAL]', message, data),
  };
}
