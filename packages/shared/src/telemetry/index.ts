/**
 * OpenTelemetry Integration - Production APM
 *
 * Provides distributed tracing, metrics, and logging for production observability.
 * Integrates with Google Cloud Trace for APM monitoring.
 *
 * **Features**:
 * - Automatic instrumentation for HTTP, database, Redis
 * - Custom business metrics and traces
 * - Performance monitoring and bottleneck detection
 * - Error tracking and alerting
 * - Resource attribution (tenant, user, endpoint)
 *
 * **Usage**:
 * ```typescript
 * import { initTelemetry, trace, metrics } from '@platform/shared/telemetry';
 *
 * // Initialize at application startup
 * await initTelemetry({
 *   serviceName: 'platform-api',
 *   environment: 'production',
 * });
 *
 * // Create custom traces
 * const span = trace.getTracer('my-service').startSpan('operation');
 * // ... do work
 * span.end();
 *
 * // Record custom metrics
 * metrics.recordLatency('api.request', 150, { endpoint: '/users' });
 * ```
 */

import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { MetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { trace, metrics as metricsApi, Span, Tracer } from '@opentelemetry/api';
import { createModuleLogger } from '../logger';

const logger = createModuleLogger('telemetry');

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment: 'development' | 'staging' | 'production';
  gcpProjectId?: string;
  enableAutoInstrumentation?: boolean;
  sampleRate?: number; // 0.0 to 1.0 (1.0 = 100% sampling)
}

let sdk: NodeSDK | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK with Google Cloud Trace
 *
 * Call this once at application startup before any other operations.
 * Automatically instruments HTTP, database, Redis, and other libraries.
 *
 * @param config - Telemetry configuration
 */
export async function initTelemetry(config: TelemetryConfig): Promise<void> {
  if (isInitialized) {
    logger.warn('Telemetry already initialized, skipping');
    return;
  }

  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment,
    gcpProjectId = process.env.GCP_PROJECT_ID,
    enableAutoInstrumentation = true,
    sampleRate = environment === 'production' ? 0.1 : 1.0, // 10% sampling in prod, 100% in dev
  } = config;

  logger.info('Initializing OpenTelemetry', {
    serviceName,
    environment,
    sampleRate,
  });

  // Resource describes the entity producing telemetry
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      environment,
    })
  );

  // Configure trace exporter based on environment
  const traceExporter =
    environment === 'production' && gcpProjectId
      ? new TraceExporter({
          projectId: gcpProjectId,
          // Use Application Default Credentials (ADC)
          // In production: service account key or Workload Identity
          // In development: gcloud auth application-default login
        })
      : new ConsoleSpanExporter(); // Development: log to console

  // Configure metrics exporter
  const metricExporter =
    environment === 'production' && gcpProjectId
      ? new MetricExporter({
          projectId: gcpProjectId,
        })
      : undefined; // Development: skip metrics export

  const metricReader = metricExporter
    ? new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000, // Export every 60 seconds
      })
    : undefined;

  // Initialize NodeSDK
  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: enableAutoInstrumentation
      ? [
          getNodeAutoInstrumentations({
            // Automatically instrument common libraries
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              ignoreIncomingRequestHook: (req) => {
                // Ignore health check endpoints from tracing
                const url = req.url || '';
                return url === '/health' || url === '/metrics';
              },
            },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-fastify': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true }, // PostgreSQL
            '@opentelemetry/instrumentation-redis': { enabled: true }, // Redis 2.x-4.x
            '@opentelemetry/instrumentation-dns': { enabled: false }, // Too noisy
            '@opentelemetry/instrumentation-net': { enabled: false }, // Too noisy
          }),
        ]
      : [],
    // Sampling strategy: adjust based on traffic
    // Production: 10% sampling to reduce costs
    // Development: 100% sampling for debugging
    sampler: {
      shouldSample: () => ({
        decision: Math.random() < sampleRate ? 1 : 0, // 1 = RECORD_AND_SAMPLED, 0 = DROP
      }),
    } as any,
  });

  // Start the SDK
  await sdk.start();
  isInitialized = true;

  logger.info('OpenTelemetry initialized successfully', {
    exporter: environment === 'production' ? 'Google Cloud Trace' : 'Console',
    autoInstrumentation: enableAutoInstrumentation,
  });

  // Graceful shutdown on process termination
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down telemetry');
    await shutdownTelemetry();
  });
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 *
 * Flushes pending telemetry data and closes connections.
 * Call this on application shutdown.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) {
    logger.warn('Telemetry not initialized, skipping shutdown');
    return;
  }

  logger.info('Shutting down OpenTelemetry');
  await sdk.shutdown();
  isInitialized = false;
  sdk = null;
  logger.info('OpenTelemetry shutdown complete');
}

/**
 * Get OpenTelemetry tracer for creating custom spans
 *
 * @param name - Tracer name (usually module or service name)
 * @returns Tracer instance
 */
export function getTracer(name: string): Tracer {
  return trace.getTracer(name);
}

/**
 * Create a custom span for manual instrumentation
 *
 * @param tracerName - Tracer identifier
 * @param spanName - Span name (operation description)
 * @param fn - Async function to execute within span
 * @returns Promise resolving to function result
 */
export async function withSpan<T>(
  tracerName: string,
  spanName: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer(tracerName);
  const span = tracer.startSpan(spanName);

  try {
    const result = await fn(span);
    span.setStatus({ code: 0 }); // OK
    return result;
  } catch (error) {
    span.setStatus({
      code: 2, // ERROR
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Custom metrics recording utilities
 */
export const metrics = {
  /**
   * Record request latency
   *
   * @param endpoint - API endpoint
   * @param durationMs - Request duration in milliseconds
   * @param attributes - Additional attributes (tenant, user, etc.)
   */
  recordLatency(
    endpoint: string,
    durationMs: number,
    attributes?: Record<string, string>
  ): void {
    const meter = metricsApi.getMeter('platform-metrics');
    const histogram = meter.createHistogram('api.request.duration', {
      description: 'API request duration in milliseconds',
      unit: 'ms',
    });

    histogram.record(durationMs, {
      endpoint,
      ...attributes,
    });
  },

  /**
   * Record database query performance
   *
   * @param operation - Query operation (SELECT, INSERT, etc.)
   * @param table - Database table
   * @param durationMs - Query duration in milliseconds
   */
  recordDatabaseQuery(operation: string, table: string, durationMs: number): void {
    const meter = metricsApi.getMeter('platform-metrics');
    const histogram = meter.createHistogram('db.query.duration', {
      description: 'Database query duration in milliseconds',
      unit: 'ms',
    });

    histogram.record(durationMs, { operation, table });
  },

  /**
   * Record cache hit/miss
   *
   * @param hit - Whether cache hit occurred
   * @param key - Cache key prefix
   */
  recordCacheAccess(hit: boolean, key: string): void {
    const meter = metricsApi.getMeter('platform-metrics');
    const counter = meter.createCounter('cache.access', {
      description: 'Cache access count (hit/miss)',
    });

    counter.add(1, { hit: hit ? 'true' : 'false', key });
  },

  /**
   * Record AI provider request
   *
   * @param provider - AI provider (openai, anthropic, google)
   * @param model - Model name
   * @param tokens - Token count
   * @param costUsd - Cost in USD
   */
  recordAIRequest(provider: string, model: string, tokens: number, costUsd: number): void {
    const meter = metricsApi.getMeter('platform-metrics');

    const tokenCounter = meter.createCounter('ai.tokens.used', {
      description: 'AI tokens consumed',
    });
    tokenCounter.add(tokens, { provider, model });

    const costCounter = meter.createCounter('ai.cost.usd', {
      description: 'AI cost in USD',
    });
    costCounter.add(costUsd, { provider, model });
  },

  /**
   * Record business metric (custom counter)
   *
   * @param name - Metric name
   * @param value - Metric value
   * @param attributes - Metric attributes
   */
  recordCounter(name: string, value: number, attributes?: Record<string, string>): void {
    const meter = metricsApi.getMeter('platform-metrics');
    const counter = meter.createCounter(name, {
      description: `Custom business metric: ${name}`,
    });

    counter.add(value, attributes);
  },
};

/**
 * Re-export OpenTelemetry API for advanced usage
 */
export { trace, metricsApi };
export type { Span, Tracer };
