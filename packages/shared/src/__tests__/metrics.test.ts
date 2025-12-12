/**
 * Metrics Tests - Phase 2 Task 2.2 Week 2
 *
 * Comprehensive test suite for metrics collection system.
 * Target: 80%+ coverage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricNames, measure, measureAsync, metrics } from '../monitoring/metrics';

describe('Metrics Module', () => {
  beforeEach(() => {
    // Reset metrics before each test
    metrics.reset();
  });

  afterEach(() => {
    // Clean up after each test
    metrics.reset();
  });

  describe('Counter Metrics', () => {
    it('should increment counter by 1 by default', () => {
      metrics.increment('test_counter');
      const metric = metrics.get('test_counter');

      expect(metric).toBeDefined();
      expect(metric?.type).toBe('counter');
      expect((metric as any)?.value).toBe(1);
    });

    it('should increment counter by custom value', () => {
      metrics.increment('test_counter', {}, 5);
      const metric = metrics.get('test_counter');

      expect((metric as any)?.value).toBe(5);
    });

    it('should accumulate counter values', () => {
      metrics.increment('test_counter');
      metrics.increment('test_counter');
      metrics.increment('test_counter', {}, 3);

      const metric = metrics.get('test_counter');
      expect((metric as any)?.value).toBe(5);
    });

    it('should support labels', () => {
      metrics.increment('http_requests', { method: 'GET', path: '/api' });
      metrics.increment('http_requests', { method: 'POST', path: '/api' });

      const getMetric = metrics.get('http_requests', { method: 'GET', path: '/api' });
      const postMetric = metrics.get('http_requests', { method: 'POST', path: '/api' });

      expect((getMetric as any)?.value).toBe(1);
      expect((postMetric as any)?.value).toBe(1);
    });

    it('should sort labels consistently', () => {
      metrics.increment('test', { b: '2', a: '1' });
      metrics.increment('test', { a: '1', b: '2' });

      const metric = metrics.get('test', { b: '2', a: '1' });
      expect((metric as any)?.value).toBe(2);
    });
  });

  describe('Gauge Metrics', () => {
    it('should set gauge value', () => {
      metrics.set('cpu_usage', 75.5);
      const metric = metrics.get('cpu_usage');

      expect(metric).toBeDefined();
      expect(metric?.type).toBe('gauge');
      expect((metric as any)?.value).toBe(75.5);
    });

    it('should overwrite gauge value', () => {
      metrics.set('memory_mb', 512);
      metrics.set('memory_mb', 768);

      const metric = metrics.get('memory_mb');
      expect((metric as any)?.value).toBe(768);
    });

    it('should support labels on gauge', () => {
      metrics.set('db_connections', 10, { pool: 'primary' });
      metrics.set('db_connections', 5, { pool: 'replica' });

      const primaryMetric = metrics.get('db_connections', { pool: 'primary' });
      const replicaMetric = metrics.get('db_connections', { pool: 'replica' });

      expect((primaryMetric as any)?.value).toBe(10);
      expect((replicaMetric as any)?.value).toBe(5);
    });
  });

  describe('Histogram Metrics', () => {
    it('should record histogram values', () => {
      metrics.record('response_time', 100);
      metrics.record('response_time', 200);
      metrics.record('response_time', 150);

      const metric = metrics.get('response_time');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
      expect((metric as any)?.values).toEqual([100, 200, 150]);
    });

    it('should limit histogram to 1000 values', () => {
      // Record 1500 values
      for (let i = 0; i < 1500; i++) {
        metrics.record('large_histogram', i);
      }

      const metric = metrics.get('large_histogram');
      const values = (metric as any)?.values;

      expect(values).toBeDefined();
      expect(values.length).toBe(1000);
      // Should keep latest values (500-1499)
      expect(values[0]).toBe(500);
      expect(values[999]).toBe(1499);
    });

    it('should support labels on histogram', () => {
      metrics.record('query_time', 50, { table: 'users' });
      metrics.record('query_time', 100, { table: 'users' });
      metrics.record('query_time', 25, { table: 'posts' });

      const usersMetric = metrics.get('query_time', { table: 'users' });
      const postsMetric = metrics.get('query_time', { table: 'posts' });

      expect((usersMetric as any)?.values).toEqual([50, 100]);
      expect((postsMetric as any)?.values).toEqual([25]);
    });
  });

  describe('getAll', () => {
    it('should return all metrics', () => {
      metrics.increment('counter1');
      metrics.set('gauge1', 42);
      metrics.record('histogram1', 100);

      const all = metrics.getAll();

      expect(all).toHaveProperty('counter1');
      expect(all).toHaveProperty('gauge1');
      expect(all).toHaveProperty('histogram1');
    });

    it('should include histogram stats', () => {
      metrics.record('response_time', 100);
      metrics.record('response_time', 200);
      metrics.record('response_time', 300);

      const all = metrics.getAll();
      const histogramMetric = all['response_time'] as any;

      expect(histogramMetric).toHaveProperty('stats');
      expect(histogramMetric.stats.count).toBe(3);
      expect(histogramMetric.stats.sum).toBe(600);
      expect(histogramMetric.stats.min).toBe(100);
      expect(histogramMetric.stats.max).toBe(300);
      expect(histogramMetric.stats.mean).toBe(200);
    });

    it('should calculate percentiles correctly', () => {
      // Add 100 values from 0-99
      for (let i = 0; i < 100; i++) {
        metrics.record('test', i);
      }

      const all = metrics.getAll();
      const metric = all['test'] as any;

      expect(metric.stats.p50).toBe(50); // Median
      expect(metric.stats.p95).toBe(95); // 95th percentile
      expect(metric.stats.p99).toBe(99); // 99th percentile
    });

    it('should handle empty histogram', () => {
      metrics.record('empty', 100);
      const metric = metrics.get('empty');

      // Clear the values array manually to test edge case
      if (metric && metric.type === 'histogram') {
        metric.values = [];
      }

      const all = metrics.getAll();
      const emptyMetric = all['empty'] as any;

      expect(emptyMetric.stats.count).toBe(0);
      expect(emptyMetric.stats.sum).toBe(0);
      expect(emptyMetric.stats.min).toBe(0);
      expect(emptyMetric.stats.max).toBe(0);
      expect(emptyMetric.stats.mean).toBe(0);
      expect(emptyMetric.stats.p50).toBe(0);
      expect(emptyMetric.stats.p95).toBe(0);
      expect(emptyMetric.stats.p99).toBe(0);
    });

    it('should return empty object when no metrics', () => {
      const all = metrics.getAll();
      expect(all).toEqual({});
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent metric', () => {
      const metric = metrics.get('non_existent');
      expect(metric).toBeUndefined();
    });

    it('should return metric with matching labels', () => {
      metrics.increment('test', { env: 'prod', region: 'us' });
      const metric = metrics.get('test', { env: 'prod', region: 'us' });

      expect(metric).toBeDefined();
      expect((metric as any)?.value).toBe(1);
    });

    it('should return undefined for non-matching labels', () => {
      metrics.increment('test', { env: 'prod' });
      const metric = metrics.get('test', { env: 'dev' });

      expect(metric).toBeUndefined();
    });

    it('should handle empty labels', () => {
      metrics.increment('test');
      const metric1 = metrics.get('test');
      const metric2 = metrics.get('test', {});

      expect(metric1).toBeDefined();
      expect(metric2).toBeDefined();
      expect(metric1).toEqual(metric2);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.increment('counter1');
      metrics.set('gauge1', 42);
      metrics.record('histogram1', 100);

      expect(Object.keys(metrics.getAll()).length).toBe(3);

      metrics.reset();

      expect(Object.keys(metrics.getAll()).length).toBe(0);
    });

    it('should allow new metrics after reset', () => {
      metrics.increment('test');
      metrics.reset();
      metrics.increment('test');

      const metric = metrics.get('test');
      expect((metric as any)?.value).toBe(1);
    });
  });

  describe('MetricNames', () => {
    it('should export standard metric names', () => {
      expect(MetricNames.REQUEST_TOTAL).toBe('api_requests_total');
      expect(MetricNames.REQUEST_DURATION).toBe('api_request_duration_seconds');
      expect(MetricNames.REQUEST_ERRORS).toBe('api_request_errors_total');
      expect(MetricNames.DB_QUERY_DURATION).toBe('db_query_duration_ms');
      expect(MetricNames.AI_TOKENS_USED).toBe('ai_tokens_used_total');
      expect(MetricNames.AI_COST_USD).toBe('ai_cost_usd_total');
      expect(MetricNames.ERROR_TOTAL).toBe('errors_total');
    });

    it('should have all documented metric names', () => {
      expect(MetricNames).toHaveProperty('REQUEST_TOTAL');
      expect(MetricNames).toHaveProperty('REQUEST_DURATION');
      expect(MetricNames).toHaveProperty('REQUEST_ERRORS');
      expect(MetricNames).toHaveProperty('DB_QUERY_DURATION');
      expect(MetricNames).toHaveProperty('DB_CONNECTIONS_ACTIVE');
      expect(MetricNames).toHaveProperty('DB_CONNECTIONS_IDLE');
      expect(MetricNames).toHaveProperty('RLS_CONTEXT_SET_DURATION');
      expect(MetricNames).toHaveProperty('RLS_VIOLATIONS');
      expect(MetricNames).toHaveProperty('AI_TOKENS_USED');
      expect(MetricNames).toHaveProperty('AI_COST_USD');
      expect(MetricNames).toHaveProperty('EMBEDDING_TOKENS_USED');
      expect(MetricNames).toHaveProperty('ERROR_TOTAL');
      expect(MetricNames).toHaveProperty('ERROR_RATE');
    });
  });

  describe('measureAsync', () => {
    it('should measure async function execution time', async () => {
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'result';
      };

      const result = await measureAsync('async_operation', fn);

      expect(result).toBe('result');

      const metric = metrics.get('async_operation');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
      // Allow slight timing variations (setTimeout is not exact)
      expect((metric as any)?.values[0]).toBeGreaterThanOrEqual(45);
    });

    it('should measure async function with labels', async () => {
      const fn = async () => 'success';

      await measureAsync('async_op', fn, { service: 'api', endpoint: '/users' });

      const metric = metrics.get('async_op', { service: 'api', endpoint: '/users' });
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
    });

    it('should record error label on failure', async () => {
      const fn = async () => {
        throw new Error('Async error');
      };

      await expect(measureAsync('failing_async', fn)).rejects.toThrow('Async error');

      const metric = metrics.get('failing_async', { error: 'true' });
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
    });

    it('should preserve original error', async () => {
      const customError = new Error('Custom async error');
      const fn = async () => {
        throw customError;
      };

      try {
        await measureAsync('error_test', fn);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(customError);
      }
    });
  });

  describe('measure', () => {
    it('should measure sync function execution time', () => {
      const fn = () => {
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = measure('sync_operation', fn);

      expect(result).toBeGreaterThan(0);

      const metric = metrics.get('sync_operation');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
      expect((metric as any)?.values.length).toBe(1);
    });

    it('should measure sync function with labels', () => {
      const fn = () => 42;

      const result = measure('calc', fn, { operation: 'multiply' });

      expect(result).toBe(42);

      const metric = metrics.get('calc', { operation: 'multiply' });
      expect(metric).toBeDefined();
    });

    it('should record error label on failure', () => {
      const fn = () => {
        throw new Error('Sync error');
      };

      expect(() => measure('failing_sync', fn)).toThrow('Sync error');

      const metric = metrics.get('failing_sync', { error: 'true' });
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('histogram');
    });

    it('should preserve original error', () => {
      const customError = new Error('Custom sync error');
      const fn = () => {
        throw customError;
      };

      try {
        measure('error_test', fn);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(customError);
      }
    });
  });

  describe('Label Handling', () => {
    it('should create unique keys for different label combinations', () => {
      metrics.increment('test', { a: '1' });
      metrics.increment('test', { b: '2' });
      metrics.increment('test', { a: '1', b: '2' });

      expect(metrics.get('test', { a: '1' })).toBeDefined();
      expect(metrics.get('test', { b: '2' })).toBeDefined();
      expect(metrics.get('test', { a: '1', b: '2' })).toBeDefined();
    });

    it('should handle labels with special characters', () => {
      metrics.increment('test', { path: '/api/users/{id}', method: 'GET' });
      const metric = metrics.get('test', { path: '/api/users/{id}', method: 'GET' });

      expect(metric).toBeDefined();
    });

    it('should handle empty string labels', () => {
      metrics.increment('test', { empty: '' });
      const metric = metrics.get('test', { empty: '' });

      expect(metric).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should track API request metrics', () => {
      // Simulate API request tracking
      metrics.increment(MetricNames.REQUEST_TOTAL, {
        method: 'GET',
        path: '/api/users',
        status: '200',
      });
      metrics.record(MetricNames.REQUEST_DURATION, 45, { method: 'GET', path: '/api/users' });

      const requestMetric = metrics.get(MetricNames.REQUEST_TOTAL, {
        method: 'GET',
        path: '/api/users',
        status: '200',
      });
      const durationMetric = metrics.get(MetricNames.REQUEST_DURATION, {
        method: 'GET',
        path: '/api/users',
      });

      expect((requestMetric as any)?.value).toBe(1);
      expect((durationMetric as any)?.values).toEqual([45]);
    });

    it('should track database metrics', () => {
      metrics.set(MetricNames.DB_CONNECTIONS_ACTIVE, 10);
      metrics.set(MetricNames.DB_CONNECTIONS_IDLE, 5);
      metrics.record(MetricNames.DB_QUERY_DURATION, 23, { query: 'SELECT' });

      const activeConnections = metrics.get(MetricNames.DB_CONNECTIONS_ACTIVE);
      const idleConnections = metrics.get(MetricNames.DB_CONNECTIONS_IDLE);
      const queryDuration = metrics.get(MetricNames.DB_QUERY_DURATION, { query: 'SELECT' });

      expect((activeConnections as any)?.value).toBe(10);
      expect((idleConnections as any)?.value).toBe(5);
      expect((queryDuration as any)?.values).toEqual([23]);
    });

    it('should track AI cost metrics', () => {
      metrics.increment(MetricNames.AI_TOKENS_USED, { model: 'gpt-4', tenant: 'acme' }, 1000);
      metrics.increment(MetricNames.AI_COST_USD, { model: 'gpt-4', tenant: 'acme' }, 0.05);

      const tokensMetric = metrics.get(MetricNames.AI_TOKENS_USED, {
        model: 'gpt-4',
        tenant: 'acme',
      });
      const costMetric = metrics.get(MetricNames.AI_COST_USD, {
        model: 'gpt-4',
        tenant: 'acme',
      });

      expect((tokensMetric as any)?.value).toBe(1000);
      expect((costMetric as any)?.value).toBeCloseTo(0.05);
    });

    it('should track error metrics', () => {
      metrics.increment(MetricNames.ERROR_TOTAL, { type: 'validation', severity: 'low' });
      metrics.increment(MetricNames.ERROR_TOTAL, { type: 'database', severity: 'high' });

      const validationErrors = metrics.get(MetricNames.ERROR_TOTAL, {
        type: 'validation',
        severity: 'low',
      });
      const databaseErrors = metrics.get(MetricNames.ERROR_TOTAL, {
        type: 'database',
        severity: 'high',
      });

      expect((validationErrors as any)?.value).toBe(1);
      expect((databaseErrors as any)?.value).toBe(1);
    });
  });
});
