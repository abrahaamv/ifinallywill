/**
 * Health Router (Phase 3 - Week 3.2)
 *
 * Production-ready health check endpoints:
 * - /health - Comprehensive system health
 * - /health/live - Liveness probe (K8s)
 * - /health/ready - Readiness probe (K8s)
 *
 * Validates:
 * - Database connectivity
 * - RLS configuration
 * - (Future: Redis, LiveKit, AI providers)
 */

import { sql } from '@platform/db';
import { metrics } from '@platform/shared';
import { publicProcedure, router } from '../trpc';

/**
 * Health status types
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

/**
 * Process start time for uptime calculation
 */
const startTime = Date.now();

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();

  try {
    // Test basic connectivity
    await sql.unsafe('SELECT 1 AS health_check');

    const responseTime = Date.now() - start;

    // Verify RLS function exists (critical for security)
    const rlsCheck = await sql.unsafe(`
			SELECT COUNT(*) as count
			FROM pg_proc
			WHERE proname = 'get_current_tenant_id'
		`);

    const rlsFunctionExists = Number(rlsCheck[0]?.count) > 0;

    if (!rlsFunctionExists) {
      return {
        status: 'down',
        message: 'RLS function missing - security risk',
        responseTime,
        details: { rlsConfigured: false },
      };
    }

    return {
      status: responseTime < 100 ? 'up' : 'degraded',
      responseTime,
      message: responseTime < 100 ? 'OK' : 'Slow response',
      details: { rlsConfigured: true },
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

/**
 * Check Redis connectivity (placeholder for Phase 6)
 */
async function checkRedis(): Promise<ComponentHealth> {
  // Phase 3: Redis not implemented yet
  return {
    status: 'up',
    message: 'Not implemented (Phase 6)',
    details: { phase: 3 },
  };
}

/**
 * Health router definition
 */
export const healthRouter = router({
  /**
   * Comprehensive health check
   * GET /health
   *
   * Returns detailed status of all system components
   * Used by monitoring systems and dashboards
   */
  check: publicProcedure.query(async (): Promise<HealthStatus> => {
    const checks = await Promise.all([checkDatabase(), checkRedis()]);

    const checkMap: Record<string, ComponentHealth> = {
      database: checks[0],
      redis: checks[1],
    };

    // Determine overall status
    const hasDown = Object.values(checkMap).some((c) => c.status === 'down');
    const hasDegraded = Object.values(checkMap).some((c) => c.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasDown) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.APP_VERSION || '1.0.0',
      checks: checkMap,
    };
  }),

  /**
   * Liveness probe
   * GET /health/live
   *
   * Kubernetes liveness probe - is the process alive?
   * Returns 200 if process can respond
   */
  liveness: publicProcedure.query(async () => {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Readiness probe
   * GET /health/ready
   *
   * Kubernetes readiness probe - ready to serve traffic?
   * Returns 200 if critical dependencies are available
   */
  readiness: publicProcedure.query(async () => {
    const dbCheck = await checkDatabase();
    const ready = dbCheck.status !== 'down';

    return {
      ready,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck.status,
      },
    };
  }),

  /**
   * Metrics endpoint
   * GET /health/metrics
   *
   * Exposes collected metrics for monitoring systems
   * Returns all in-memory metrics with statistics
   */
  metrics: publicProcedure.query(async () => {
    return {
      timestamp: new Date().toISOString(),
      metrics: metrics.getAll(),
    };
  }),
});
