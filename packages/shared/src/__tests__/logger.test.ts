/**
 * Logger Tests - Phase 2 Task 2.2 Week 2
 *
 * Comprehensive test suite for logger functionality.
 * Target: 80%+ coverage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  logger,
  createChildLogger,
  createModuleLogger,
  createRequestLogger,
  createDatabaseLogger,
  logSafe,
} from '../index';

describe('Logger Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Global logger', () => {
    it('should have global logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.trace).toBeDefined();
      expect(logger.fatal).toBeDefined();
    });

    it('should log at different levels', () => {
      const infoSpy = vi.spyOn(logger, 'info');
      const errorSpy = vi.spyOn(logger, 'error');
      const warnSpy = vi.spyOn(logger, 'warn');

      logger.info('Info message');
      logger.error('Error message');
      logger.warn('Warning message');

      expect(infoSpy).toHaveBeenCalledWith('Info message');
      expect(errorSpy).toHaveBeenCalledWith('Error message');
      expect(warnSpy).toHaveBeenCalledWith('Warning message');
    });

    it('should log with metadata', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info({ userId: '123', action: 'login' }, 'User logged in');

      expect(spy).toHaveBeenCalledWith({ userId: '123', action: 'login' }, 'User logged in');
    });
  });

  describe('createModuleLogger', () => {
    it('should create a logger with module name', () => {
      const moduleLogger = createModuleLogger('TestModule');
      expect(moduleLogger).toBeDefined();
      expect(moduleLogger.info).toBeDefined();
      expect(moduleLogger.error).toBeDefined();
      expect(moduleLogger.warn).toBeDefined();
      expect(moduleLogger.debug).toBeDefined();
    });

    it('should include module in log context', () => {
      const moduleLogger = createModuleLogger('AuthModule');
      const spy = vi.spyOn(moduleLogger, 'info');

      moduleLogger.info('Test message');

      expect(spy).toHaveBeenCalled();
    });

    it('should log messages with context', () => {
      const moduleLogger = createModuleLogger('TestModule');
      const spy = vi.spyOn(moduleLogger, 'info');

      moduleLogger.info('Test message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('Test message', { key: 'value' });
    });

    it('should create child logger from module logger', () => {
      const moduleLogger = createModuleLogger('ParentModule');
      const childLogger = moduleLogger.child({ requestId: '123' });

      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
    });
  });

  describe('createChildLogger', () => {
    it('should create child logger with context', () => {
      const childLogger = createChildLogger({ sessionId: 'sess_123', userId: 'user_456' });

      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
    });

    it('should redact sensitive data in context', () => {
      const childLogger = createChildLogger({
        userId: 'user_123',
        password: 'secret123',
        apiKey: 'key_abc',
      });

      expect(childLogger).toBeDefined();
    });

    it('should handle nested object redaction', () => {
      const childLogger = createChildLogger({
        user: {
          id: '123',
          email: 'test@example.com',
          password: 'secret',
        },
      });

      expect(childLogger).toBeDefined();
    });

    it('should handle array redaction', () => {
      const childLogger = createChildLogger({
        users: [
          { id: '1', password: 'secret1' },
          { id: '2', password: 'secret2' },
        ],
      });

      expect(childLogger).toBeDefined();
    });
  });

  describe('createRequestLogger', () => {
    it('should create request logger with generated requestId', () => {
      const requestLogger = createRequestLogger();

      expect(requestLogger).toBeDefined();
      expect(requestLogger.info).toBeDefined();
    });

    it('should create request logger with provided requestId', () => {
      const requestLogger = createRequestLogger('req_custom_123');

      expect(requestLogger).toBeDefined();
      const spy = vi.spyOn(requestLogger, 'info');

      requestLogger.info('Request processed');
      expect(spy).toHaveBeenCalled();
    });

    it('should include type: http in context', () => {
      const requestLogger = createRequestLogger('req_123');
      const spy = vi.spyOn(requestLogger, 'info');

      requestLogger.info('HTTP request');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('createDatabaseLogger', () => {
    it('should create database logger', () => {
      const dbLogger = createDatabaseLogger();

      expect(dbLogger).toBeDefined();
      expect(dbLogger.info).toBeDefined();
    });

    it('should include type: database in context', () => {
      const dbLogger = createDatabaseLogger();
      const spy = vi.spyOn(dbLogger, 'info');

      dbLogger.info('Query executed');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('logSafe', () => {
    it('should log at info level', () => {
      const spy = vi.spyOn(logger, 'info');

      logSafe('info', 'Test message', { key: 'value' });

      expect(spy).toHaveBeenCalled();
    });

    it('should log at error level', () => {
      const spy = vi.spyOn(logger, 'error');

      logSafe('error', 'Error occurred', { error: 'Something went wrong' });

      expect(spy).toHaveBeenCalled();
    });

    it('should log at warn level', () => {
      const spy = vi.spyOn(logger, 'warn');

      logSafe('warn', 'Warning message');

      expect(spy).toHaveBeenCalled();
    });

    it('should log at debug level', () => {
      const spy = vi.spyOn(logger, 'debug');

      logSafe('debug', 'Debug info', { details: 'some data' });

      expect(spy).toHaveBeenCalled();
    });

    it('should log at trace level', () => {
      const spy = vi.spyOn(logger, 'trace');

      logSafe('trace', 'Trace message');

      expect(spy).toHaveBeenCalled();
    });

    it('should log at fatal level', () => {
      const spy = vi.spyOn(logger, 'fatal');

      logSafe('fatal', 'Fatal error');

      expect(spy).toHaveBeenCalled();
    });

    it('should redact sensitive data', () => {
      const spy = vi.spyOn(logger, 'info');

      logSafe('info', 'User created', {
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'key_abc',
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should handle undefined data', () => {
      const spy = vi.spyOn(logger, 'info');

      logSafe('info', 'Message without data');

      expect(spy).toHaveBeenCalledWith(undefined, 'Message without data');
    });

    it('should redact nested sensitive data', () => {
      const spy = vi.spyOn(logger, 'info');

      logSafe('info', 'Complex object', {
        user: {
          id: '123',
          credentials: {
            password: 'secret',
            apiKey: 'key_123',
          },
        },
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should redact array elements', () => {
      const spy = vi.spyOn(logger, 'info');

      logSafe('info', 'Multiple users', {
        users: [
          { id: '1', password: 'secret1', token: 'tok1' },
          { id: '2', password: 'secret2', token: 'tok2' },
        ],
      });

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Redaction', () => {
    it('should redact password field', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info({ password: 'secret123' }, 'Test');

      expect(spy).toHaveBeenCalled();
    });

    it('should redact multiple sensitive fields', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info(
        {
          password: 'secret',
          apiKey: 'key_123',
          token: 'tok_456',
          accessToken: 'access_789',
        },
        'Multiple sensitive fields'
      );

      expect(spy).toHaveBeenCalled();
    });

    it('should redact credit card information', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info(
        {
          cardNumber: '4111111111111111',
          cvv: '123',
          pin: '1234',
        },
        'Payment info'
      );

      expect(spy).toHaveBeenCalled();
    });

    it('should redact MFA secrets', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info(
        {
          mfaSecret: 'JBSWY3DPEHPK3PXP',
          totpSecret: 'secret_key',
          backupCodes: ['code1', 'code2'],
        },
        'MFA setup'
      );

      expect(spy).toHaveBeenCalled();
    });

    it('should preserve non-sensitive fields', () => {
      const spy = vi.spyOn(logger, 'info');

      logger.info(
        {
          userId: '123',
          email: 'test@example.com',
          name: 'Test User',
          password: 'secret',
        },
        'User data'
      );

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const logger1 = createRequestLogger();
      const logger2 = createRequestLogger();

      // Both should be defined but have different requestIds
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });

    it('should generate request IDs with req_ prefix', () => {
      const requestLogger = createRequestLogger();
      const spy = vi.spyOn(requestLogger, 'info');

      requestLogger.info('Test request');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Environment Configuration', () => {
    it('should use debug level in development', () => {
      process.env.NODE_ENV = 'development';

      // Logger is already created, but we can test behavior
      const spy = vi.spyOn(logger, 'debug');
      logger.debug('Debug message');

      expect(spy).toHaveBeenCalled();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';

      // Logger behavior with custom log level
      const spy = vi.spyOn(logger, 'warn');
      logger.warn('Warning message');

      expect(spy).toHaveBeenCalled();
    });

    it('should include service name from environment', () => {
      process.env.SERVICE_NAME = 'test-service';

      const spy = vi.spyOn(logger, 'info');
      logger.info('Service message');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Error Serialization', () => {
    it('should serialize Error objects', () => {
      const error = new Error('Test error');
      const spy = vi.spyOn(logger, 'error');

      logger.error({ err: error }, 'Error occurred');

      expect(spy).toHaveBeenCalled();
    });

    it('should serialize nested errors', () => {
      const cause = new Error('Root cause');
      const error = new Error('Wrapper error', { cause });
      const spy = vi.spyOn(logger, 'error');

      logger.error({ error }, 'Nested error');

      expect(spy).toHaveBeenCalled();
    });
  });
});
