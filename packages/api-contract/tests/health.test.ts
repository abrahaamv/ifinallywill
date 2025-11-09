/**
 * Health Router Tests (Phase 3 - Week 3.2)
 *
 * Tests for health check endpoints:
 * - Comprehensive health check
 * - Liveness probe
 * - Readiness probe
 */

import { describe, expect, it } from 'vitest';
import { healthRouter } from '../src/routers/health';

/**
 * Create a minimal caller context (health checks don't need auth)
 */
const caller = healthRouter.createCaller({
  session: null,
  tenantId: null,
  userId: null,
  role: null,
  db: {} as any, // Health router uses sql directly, not db
});

describe('Health Router', () => {
  describe('Comprehensive Health Check', () => {
    it.skip('should return health status with all checks (requires real DB)', async () => {
      const health = await caller.check();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('checks');

      // Validate status is one of the allowed values
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);

      // Validate timestamp is ISO 8601
      expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);

      // Validate uptime is a positive number
      expect(health.uptime).toBeGreaterThan(0);

      // Validate checks structure
      expect(health.checks).toHaveProperty('database');
      expect(health.checks).toHaveProperty('redis');

      // Database check should be 'up' (we have a live database)
      expect(health.checks.database.status).toBe('up');
      expect(health.checks.database.responseTime).toBeGreaterThan(0);
      expect(health.checks.database.details?.rlsConfigured).toBe(true);
    });

    it.skip('should detect RLS configuration (requires real DB)', async () => {
      const health = await caller.check();

      const dbCheck = health.checks.database;
      expect(dbCheck.details).toHaveProperty('rlsConfigured');
      expect(dbCheck.details?.rlsConfigured).toBe(true);
    });
  });

  describe('Liveness Probe', () => {
    it('should return alive status', async () => {
      const liveness = await caller.liveness();

      expect(liveness).toHaveProperty('alive');
      expect(liveness).toHaveProperty('timestamp');
      expect(liveness.alive).toBe(true);

      // Validate timestamp is ISO 8601
      expect(new Date(liveness.timestamp).toISOString()).toBe(liveness.timestamp);
    });
  });

  describe('Readiness Probe', () => {
    it.skip('should return ready status when database is up (requires real DB)', async () => {
      const readiness = await caller.readiness();

      expect(readiness).toHaveProperty('ready');
      expect(readiness).toHaveProperty('timestamp');
      expect(readiness).toHaveProperty('checks');

      // Database is available, so should be ready
      expect(readiness.ready).toBe(true);
      expect(readiness.checks.database).toBe('up');

      // Validate timestamp is ISO 8601
      expect(new Date(readiness.timestamp).toISOString()).toBe(readiness.timestamp);
    });
  });
});
