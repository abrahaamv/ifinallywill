# Monitoring Setup Guide

**Phase 3 Backend API Infrastructure**
**Version**: 1.0.0
**Last Updated**: 2025-10-06

## Overview

Comprehensive monitoring setup for the Phase 3 backend API, including health checks, metrics collection, logging, and alerting.

## Health Check Endpoints

### Available Endpoints

| Endpoint | Purpose | Response Time | Use Case |
|----------|---------|---------------|----------|
| `/trpc/health.check` | Comprehensive system health | < 100ms | Monitoring dashboards |
| `/trpc/health.liveness` | Process alive check | < 10ms | Kubernetes liveness probe |
| `/trpc/health.readiness` | Ready to serve traffic | < 50ms | Kubernetes readiness probe |
| `/trpc/health.metrics` | Collected metrics | < 20ms | Metrics scraping |

### Health Check Configuration

```bash
# Add to crontab for basic monitoring
*/5 * * * * curl -f https://api.platform.com/trpc/health.check || /usr/local/bin/alert-team "API Health Check Failed"

# Or use systemd timer
# /etc/systemd/system/platform-health-check.timer
[Unit]
Description=Platform API Health Check Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

## Metrics Collection

### In-Memory Metrics

The platform collects the following metrics:

**Request Metrics**:
- `api_requests_total` - Total number of API requests (counter)
- `api_request_duration_seconds` - Request latency distribution (histogram)
- `api_request_errors_total` - Total number of errors (counter)

**Database Metrics**:
- `db_query_duration_ms` - Database query latency (histogram)
- `db_connections_active` - Active database connections (gauge)
- `db_connections_idle` - Idle database connections (gauge)

**RLS Metrics**:
- `rls_context_set_duration_ms` - Time to set tenant context (histogram)
- `rls_violations_total` - Number of RLS policy violations (counter)

**Cost Tracking**:
- `ai_tokens_used_total` - AI tokens consumed (counter)
- `ai_cost_usd_total` - AI cost in USD (counter)
- `embedding_tokens_used_total` - Embedding tokens used (counter)

**Error Metrics**:
- `errors_total` - Total application errors (counter)
- `error_rate` - Error rate percentage (gauge)

### Metrics Export

**Option 1: Prometheus (Recommended)**

```typescript
// packages/api/src/metrics-export.ts
import { metrics } from '@platform/shared';
import { FastifyInstance } from 'fastify';

export function setupPrometheusMetrics(fastify: FastifyInstance) {
  fastify.get('/metrics', async (request, reply) => {
    const allMetrics = metrics.getAll();

    // Convert to Prometheus format
    let output = '';

    for (const [name, metric] of Object.entries(allMetrics)) {
      if (metric.type === 'counter') {
        output += `# TYPE ${name} counter\n`;
        output += `${name} ${metric.value}\n`;
      } else if (metric.type === 'gauge') {
        output += `# TYPE ${name} gauge\n`;
        output += `${name} ${metric.value}\n`;
      } else if (metric.type === 'histogram') {
        output += `# TYPE ${name} histogram\n`;
        output += `${name}_sum ${metric.stats.sum}\n`;
        output += `${name}_count ${metric.stats.count}\n`;
        output += `${name}_bucket{le="0.1"} ${metric.values.filter(v => v <= 100).length}\n`;
        output += `${name}_bucket{le="0.5"} ${metric.values.filter(v => v <= 500).length}\n`;
        output += `${name}_bucket{le="1.0"} ${metric.values.filter(v => v <= 1000).length}\n`;
        output += `${name}_bucket{le="+Inf"} ${metric.stats.count}\n`;
      }
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return output;
  });
}
```

**Prometheus Configuration**:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'platform-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

**Option 2: DataDog**

```typescript
// packages/api/src/datadog-metrics.ts
import { metrics } from '@platform/shared';
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: process.env.DATADOG_HOST || 'localhost',
  port: 8125,
  prefix: 'platform.api.',
});

// Export metrics every 60 seconds
setInterval(() => {
  const allMetrics = metrics.getAll();

  for (const [name, metric] of Object.entries(allMetrics)) {
    if (metric.type === 'counter') {
      statsd.gauge(name, metric.value);
    } else if (metric.type === 'gauge') {
      statsd.gauge(name, metric.value);
    } else if (metric.type === 'histogram') {
      statsd.histogram(name, metric.stats.mean);
    }
  }
}, 60000);
```

**Option 3: CloudWatch (AWS)**

```typescript
// packages/api/src/cloudwatch-metrics.ts
import { CloudWatch } from 'aws-sdk';
import { metrics } from '@platform/shared';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

export async function exportMetricsToCloudWatch() {
  const allMetrics = metrics.getAll();
  const metricData = [];

  for (const [name, metric] of Object.entries(allMetrics)) {
    if (metric.type === 'counter' || metric.type === 'gauge') {
      metricData.push({
        MetricName: name,
        Value: metric.value,
        Unit: 'Count',
        Timestamp: new Date(),
      });
    } else if (metric.type === 'histogram') {
      metricData.push({
        MetricName: name,
        StatisticValues: {
          SampleCount: metric.stats.count,
          Sum: metric.stats.sum,
          Minimum: metric.stats.min,
          Maximum: metric.stats.max,
        },
        Unit: 'Milliseconds',
        Timestamp: new Date(),
      });
    }
  }

  await cloudwatch.putMetricData({
    Namespace: 'Platform/API',
    MetricData: metricData,
  }).promise();
}

// Export every 60 seconds
setInterval(exportMetricsToCloudWatch, 60000);
```

## Logging

### Structured Logging

```typescript
// packages/shared/src/logging/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    version: process.env.APP_VERSION || '0.0.0',
  },
});

// Usage
logger.info({ tenantId: 'xxx', userId: 'yyy' }, 'User authenticated');
logger.error({ err: error }, 'Database query failed');
```

### Log Aggregation

**Using Loki + Grafana**:

```bash
# Install Promtail for log shipping
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
```

**Promtail Configuration**:

```yaml
# /etc/promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: platform-api
    static_configs:
      - targets:
          - localhost
        labels:
          job: platform-api
          __path__: /var/log/platform/api-*.log
```

## Alerting

### Alert Rules

**Prometheus Alert Rules**:

```yaml
# /etc/prometheus/rules/platform-api.yml
groups:
  - name: platform_api
    interval: 30s
    rules:
      # Health check failures
      - alert: APIHealthCheckFailed
        expr: up{job="platform-api"} == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "API health check failed"
          description: "Platform API has been unreachable for 3 minutes"

      # High error rate
      - alert: HighErrorRate
        expr: rate(api_request_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API error rate"
          description: "Error rate is {{ $value }}% over the last 5 minutes"

      # Slow response times
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response times"
          description: "P95 latency is {{ $value }}s"

      # Database connection pool exhaustion
      - alert: DatabasePoolExhausted
        expr: db_connections_active / 100 > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool near capacity"
          description: "Connection pool is {{ $value }}% utilized"

      # RLS violations
      - alert: RLSViolations
        expr: rate(rls_violations_total[1m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High rate of RLS violations"
          description: "{{ $value }} RLS violations per minute"
```

### Notification Channels

**Slack Integration**:

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'slack-notifications'

  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warnings'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**PagerDuty Integration** (for critical alerts):

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .GroupLabels.instance }}'
```

## Dashboard Setup

### Grafana Dashboard

**Import this JSON for Platform API dashboard**:

```json
{
  "dashboard": {
    "title": "Platform API - Phase 3",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(api_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (P50, P95, P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(api_request_errors_total[5m])",
            "legendFormat": "Errors/sec"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "db_connections_active",
            "legendFormat": "Active"
          },
          {
            "expr": "db_connections_idle",
            "legendFormat": "Idle"
          }
        ],
        "type": "graph"
      },
      {
        "title": "RLS Violations",
        "targets": [
          {
            "expr": "rate(rls_violations_total[1m])",
            "legendFormat": "Violations/min"
          }
        ],
        "type": "graph",
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [10],
                "type": "gt"
              }
            }
          ]
        }
      }
    ]
  }
}
```

## Performance Monitoring

### Key Metrics to Track

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Request P95 latency | < 200ms | > 500ms | > 1000ms |
| Error rate | < 0.1% | > 1% | > 5% |
| Database query P95 | < 100ms | > 200ms | > 500ms |
| Connection pool usage | < 60% | > 80% | > 95% |
| RLS violations | 0/min | > 1/min | > 10/min |
| Memory usage | < 70% | > 80% | > 90% |
| CPU usage | < 60% | > 80% | > 95% |

### Database Query Performance

```bash
# Enable pg_stat_statements
psql -U postgres -d platform -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Monitor slow queries
psql -U platform -d platform -c "
  SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100  -- Queries slower than 100ms
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

## Security Monitoring

### Metrics to Track

- Failed authentication attempts
- RLS policy violations
- Suspicious tenant access patterns
- Unusual query patterns
- API rate limit violations (Phase 4)

### Audit Logging

```typescript
// Log all RLS violations
logger.warn({
  event: 'rls_violation',
  tenantId: context.tenantId,
  userId: context.userId,
  table: 'users',
  operation: 'INSERT',
}, 'RLS policy violation detected');

// Log authentication failures
logger.warn({
  event: 'auth_failure',
  email: user.email,
  provider: 'google',
  reason: 'invalid_token',
}, 'Authentication failed');
```

## Next Steps

After Phase 3 monitoring is operational:
- Phase 4: Frontend performance monitoring
- Phase 5: AI cost tracking and optimization
- Phase 6: Real-time WebSocket monitoring
- Phase 7: End-user experience monitoring

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Pino Logger](https://getpino.io/)
- [DataDog APM](https://docs.datadoghq.com/tracing/)
