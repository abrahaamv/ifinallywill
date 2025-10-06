# Observability & Monitoring Guide

## 🎯 Observability Philosophy

**Three Pillars**: Logs (what happened) + Metrics (how much) + Traces (where/why)

**Targets**: Sub-200ms p95 latency, 99.9% uptime, <1% error rate

---

## 📊 Metrics Collection

### Prometheus + Grafana

```typescript
// packages/shared/src/observability/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// AI metrics
export const aiTokensUsed = new Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens used',
  labelNames: ['service', 'provider', 'model'],
  registers: [registry],
});

export const aiCostUsd = new Counter({
  name: 'ai_cost_usd_total',
  help: 'Total AI cost in USD',
  labelNames: ['service', 'provider'],
  registers: [registry],
});

export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI request duration',
  labelNames: ['service', 'provider'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

// Active connections
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Active connections',
  labelNames: ['type'], // 'sse', 'livekit', 'websocket'
  registers: [registry],
});
```

### Fastify Integration

```typescript
// packages/api/src/plugins/metrics.ts
import { FastifyPluginAsync } from 'fastify';
import { registry, httpRequestsTotal, httpRequestDuration } from '@platform/shared/observability/metrics';

export const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  // Track request metrics
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - request.startTime!) / 1000;

    httpRequestsTotal.labels({
      method: request.method,
      route: request.routerPath || 'unknown',
      status_code: reply.statusCode.toString(),
    }).inc();

    httpRequestDuration.labels({
      method: request.method,
      route: request.routerPath || 'unknown',
    }).observe(duration);
  });

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return registry.metrics();
  });
};
```

---

## 📝 Structured Logging

### Pino Logger

```typescript
// packages/shared/src/observability/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'apiKey',
      'token',
    ],
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

// Usage
logger.info({ userId, tenantId }, 'User logged in');
logger.error({ err, context }, 'Failed to process request');
```

### Axiom Integration

```typescript
// Stream logs to Axiom
import { AxiomWithoutBatching } from '@axiomhq/js';

const axiom = new AxiomWithoutBatching({
  token: process.env.AXIOM_TOKEN!,
  orgId: process.env.AXIOM_ORG_ID,
});

export async function sendToAxiom(log: Record<string, any>) {
  await axiom.ingest('platform-logs', [
    {
      ...log,
      _time: new Date().toISOString(),
    },
  ]);
}
```

---

## 🔍 Distributed Tracing

### OpenTelemetry Setup

```typescript
// packages/shared/src/observability/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function initTracing() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'platform-api',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
```

### Manual Span Creation

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('platform-api');

export async function processAIRequest(params: any) {
  const span = tracer.startSpan('ai.request');

  try {
    span.setAttribute('service', 'vision');
    span.setAttribute('provider', 'gemini');

    const result = await gemini.analyzeImage(params);

    span.setAttribute('tokens_used', result.tokensUsed);
    span.setAttribute('cost_usd', result.costUsd);

    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

---

## ⚠️ Error Tracking

### Sentry Integration

```typescript
// packages/api/src/plugins/sentry.ts
import * as Sentry from '@sentry/node';
import { FastifyPluginAsync } from 'fastify';

export const sentryPlugin: FastifyPluginAsync = async (fastify) => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Don't send 4xx errors
      if (event.exception?.values?.[0]?.type === 'TRPCError') {
        const error = hint.originalException as any;
        if (error.code && error.code.startsWith('4')) {
          return null;
        }
      }
      return event;
    },
  });

  // Capture errors
  fastify.addHook('onError', async (request, reply, error) => {
    Sentry.captureException(error, {
      tags: {
        method: request.method,
        route: request.routerPath,
      },
      user: {
        id: request.user?.id,
        email: request.user?.email,
      },
      extra: {
        body: request.body,
        query: request.query,
      },
    });
  });
};
```

---

## 🚨 Alerting

### Alert Rules

```yaml
# Prometheus alert rules
groups:
  - name: platform_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      - alert: HighAICost
        expr: increase(ai_cost_usd_total[1h]) > 100
        labels:
          severity: warning
        annotations:
          summary: "High AI cost in last hour"
          description: "${{ $value }} spent in last hour"
```

### BetterStack Integration

```typescript
// packages/shared/src/observability/alerts.ts
export async function sendAlert(params: {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  await fetch('https://uptime.betterstack.com/api/v2/incidents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BETTERSTACK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requester_email: 'alerts@platform.com',
      name: params.title,
      summary: params.message,
      severity: params.level,
      ...params.metadata,
    }),
  });
}
```

---

## 📈 Dashboards

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Latency (p50, p95, p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, http_request_duration_seconds_bucket)"
          },
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          },
          {
            "expr": "histogram_quantile(0.99, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "AI Cost (Last 24h)",
        "targets": [
          {
            "expr": "increase(ai_cost_usd_total[24h])"
          }
        ]
      }
    ]
  }
}
```

---

## 🐛 Debugging Tools

### Debug Logging

```typescript
// Enable debug mode
if (process.env.DEBUG === 'true') {
  logger.level = 'debug';

  // Log all database queries
  db.$on('query', (e) => {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: e.duration,
    }, 'Database query');
  });

  // Log all HTTP requests
  fastify.addHook('onRequest', async (request) => {
    logger.debug({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    }, 'Incoming request');
  });
}
```

---

**Next**: See `09-DEPLOYMENT-GUIDE.md` and `ARCHITECTURE-IMPROVEMENTS.md` to complete the documentation.
