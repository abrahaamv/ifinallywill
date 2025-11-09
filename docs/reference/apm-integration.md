# APM Integration Guide - Google Cloud Trace with OpenTelemetry

**Status**: ✅ Production-ready OpenTelemetry integration implemented

## Overview

This platform uses **OpenTelemetry** with **Google Cloud Trace** for Application Performance Monitoring (APM). The integration provides:

- **Distributed Tracing**: Track requests across services (API, Realtime, Database, Redis, LiveKit)
- **Auto-Instrumentation**: Automatic tracing for HTTP, PostgreSQL, Redis without code changes
- **Custom Metrics**: Business metrics for API performance, database queries, AI usage, cache hits
- **Production Observability**: Google Cloud Trace integration with 10% sampling (cost optimization)
- **Development Debugging**: Console output with 100% sampling for local development

## Quick Start

### 1. Environment Setup

Add to `.env`:

```bash
# Google Cloud Project (production only)
GCP_PROJECT_ID=your-gcp-project-id

# Service identification
SERVICE_NAME=platform-api
SERVICE_VERSION=1.0.0
NODE_ENV=production
```

### 2. Initialize in API Server

Edit `packages/api/src/server.ts`:

```typescript
import { initTelemetry, shutdownTelemetry } from '@platform/shared';

// Initialize telemetry BEFORE creating Fastify server
await initTelemetry({
  serviceName: 'platform-api',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  gcpProjectId: process.env.GCP_PROJECT_ID,
  enableAutoInstrumentation: true,
  sampleRate: 0.1, // 10% sampling in production
});

// Create Fastify server
const fastify = Fastify({ /* config */ });

// ... rest of server setup

// Graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  await fastify.close();
});
```

### 3. Initialize in Realtime Server

Edit `packages/realtime/src/server.ts`:

```typescript
import { initTelemetry, shutdownTelemetry } from '@platform/shared';

await initTelemetry({
  serviceName: 'platform-realtime',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  gcpProjectId: process.env.GCP_PROJECT_ID,
});

// ... rest of server setup

process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  // ... cleanup
});
```

## Auto-Instrumentation

**Automatic tracing** for these libraries (no code changes required):

- **HTTP**: All incoming/outgoing HTTP requests
- **PostgreSQL**: All database queries via `pg` driver
- **Redis**: All Redis operations via `redis` client
- **Fastify**: Request routing and middleware
- **tRPC**: API endpoint calls

**Ignored endpoints** (to reduce noise):
- `/health` - Health check endpoint
- `/metrics` - Metrics endpoint

## Custom Tracing

### Manual Span Creation

```typescript
import { withSpan } from '@platform/shared';

async function processDocument(documentId: string) {
  return withSpan('document-processor', 'processDocument', async (span) => {
    // Add custom attributes
    span.setAttribute('document.id', documentId);
    span.setAttribute('document.type', 'pdf');

    // Your processing logic
    const result = await heavyProcessing(documentId);

    // Add result attributes
    span.setAttribute('document.pages', result.pageCount);

    return result;
  });
}
```

### Nested Spans

```typescript
import { getTracer } from '@platform/shared';

async function complexOperation() {
  const tracer = getTracer('my-service');
  const parentSpan = tracer.startSpan('complexOperation');

  try {
    // Child span 1
    const childSpan1 = tracer.startSpan('step1', { parent: parentSpan });
    await step1();
    childSpan1.end();

    // Child span 2
    const childSpan2 = tracer.startSpan('step2', { parent: parentSpan });
    await step2();
    childSpan2.end();

    parentSpan.setStatus({ code: 0 }); // OK
  } catch (error) {
    parentSpan.setStatus({ code: 2, message: error.message }); // ERROR
    parentSpan.recordException(error);
    throw error;
  } finally {
    parentSpan.end();
  }
}
```

## Custom Metrics

### API Request Latency

```typescript
import { telemetryMetrics } from '@platform/shared';

// In tRPC middleware or Fastify hook
const startTime = Date.now();

try {
  const result = await handler();
  const duration = Date.now() - startTime;

  telemetryMetrics.recordLatency(
    '/api/users/create',
    duration,
    {
      tenant: ctx.tenant.id,
      status: 'success',
    }
  );

  return result;
} catch (error) {
  const duration = Date.now() - startTime;

  telemetryMetrics.recordLatency(
    '/api/users/create',
    duration,
    {
      tenant: ctx.tenant.id,
      status: 'error',
    }
  );

  throw error;
}
```

### Database Query Performance

```typescript
import { telemetryMetrics } from '@platform/shared';

async function queryUsers(tenantId: string) {
  const startTime = Date.now();

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));

  const duration = Date.now() - startTime;

  telemetryMetrics.recordDatabaseQuery('SELECT', 'users', duration);

  return users;
}
```

### Cache Performance

```typescript
import { telemetryMetrics } from '@platform/shared';

async function getCachedData(key: string) {
  const cached = await redis.get(key);

  if (cached) {
    telemetryMetrics.recordCacheAccess(true, 'user-data');
    return JSON.parse(cached);
  }

  telemetryMetrics.recordCacheAccess(false, 'user-data');

  const data = await fetchFromDatabase();
  await redis.set(key, JSON.stringify(data), 'EX', 3600);

  return data;
}
```

### AI Provider Usage

```typescript
import { telemetryMetrics } from '@platform/shared';

async function callAI(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const tokens = response.usage?.total_tokens || 0;
  const costUsd = (tokens / 1000000) * 5.0; // $5/1M tokens

  telemetryMetrics.recordAIRequest('openai', 'gpt-4o', tokens, costUsd);

  return response;
}
```

### Custom Business Metrics

```typescript
import { telemetryMetrics } from '@platform/shared';

// Track user signups
telemetryMetrics.recordCounter('user.signup', 1, {
  plan: 'enterprise',
  source: 'landing-page',
});

// Track feature usage
telemetryMetrics.recordCounter('feature.usage', 1, {
  feature: 'knowledge-upload',
  tenant: tenantId,
});

// Track errors
telemetryMetrics.recordCounter('error.count', 1, {
  type: 'validation',
  endpoint: '/api/meetings/create',
});
```

## Google Cloud Trace Setup

### 1. Enable Cloud Trace API

```bash
gcloud services enable cloudtrace.googleapis.com
gcloud services enable cloudmonitoring.googleapis.com
```

### 2. Service Account (Production)

```bash
# Create service account
gcloud iam service-accounts create platform-apm \
  --display-name="Platform APM Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:platform-apm@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtrace.agent"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:platform-apm@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"

# Create and download key
gcloud iam service-accounts keys create platform-apm-key.json \
  --iam-account=platform-apm@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Configure Credentials

**Option A: Service Account Key** (Production)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/platform-apm-key.json
```

**Option B: Application Default Credentials** (Development)

```bash
gcloud auth application-default login
```

## Sampling Strategy

### Production (10% Sampling)

- **Why**: Reduce costs and noise while maintaining visibility
- **Coverage**: Still captures ~100 requests/day for 1,000 daily active users
- **Sufficient for**: Error detection, performance trends, bottleneck identification

```typescript
await initTelemetry({
  serviceName: 'platform-api',
  environment: 'production',
  sampleRate: 0.1, // 10% sampling
});
```

### Staging/Development (100% Sampling)

- **Why**: Full visibility for debugging and testing
- **Trade-off**: Higher costs acceptable in non-production

```typescript
await initTelemetry({
  serviceName: 'platform-api',
  environment: 'development',
  sampleRate: 1.0, // 100% sampling
});
```

### Custom Sampling Logic

```typescript
// Sample all errors + 10% of successful requests
await initTelemetry({
  serviceName: 'platform-api',
  environment: 'production',
  // Custom sampler in OpenTelemetry SDK configuration
});
```

## Viewing Traces in Google Cloud Console

### 1. Navigate to Cloud Trace

```
https://console.cloud.google.com/traces/list?project=YOUR_PROJECT_ID
```

### 2. Filter Traces

- **By service**: `platform-api`, `platform-realtime`
- **By latency**: Traces >500ms
- **By status**: Only errors (status code 500+)
- **By tenant**: Custom attribute filtering

### 3. Trace Details

- **Timeline View**: See request flow across services
- **Span Details**: Attributes, events, links
- **Performance Analysis**: Identify slow spans
- **Error Context**: Exception messages and stack traces

### 4. Create Custom Dashboards

- API response time percentiles (p50, p95, p99)
- Error rate by endpoint
- Database query duration
- Cache hit rate
- AI provider latency

## Performance Best Practices

### 1. Attribute Limits

```typescript
// ❌ TOO MANY attributes (high cardinality)
span.setAttribute('user.email', email); // Unique per user!
span.setAttribute('request.body', JSON.stringify(body)); // Too large!

// ✅ GOOD attributes (low cardinality)
span.setAttribute('tenant.id', tenantId); // Limited values
span.setAttribute('endpoint', '/api/users'); // Fixed set
span.setAttribute('status', 'success'); // Boolean-like
```

### 2. Span Naming

```typescript
// ❌ BAD span names (high cardinality)
tracer.startSpan(`query-user-${userId}`); // Unique per user!

// ✅ GOOD span names (low cardinality)
tracer.startSpan('query-user'); // Generic operation
span.setAttribute('user.id', userId); // User ID in attribute
```

### 3. Async Context Propagation

```typescript
import { trace, context } from '@platform/shared';

async function parentOperation() {
  const span = trace.getTracer('my-service').startSpan('parent');

  // Run child operations in parent span context
  await context.with(trace.setSpan(context.active(), span), async () => {
    await childOperation1(); // Automatically linked to parent
    await childOperation2(); // Automatically linked to parent
  });

  span.end();
}
```

## Cost Optimization

### Trace Ingestion Costs

- **First 2.5M spans/month**: Free
- **Additional spans**: $0.20 per million spans

**Example** (1,000 daily active users, 10% sampling):
- Requests/day: ~10,000
- Sampled requests/day: ~1,000
- Spans/request (avg): ~5 (HTTP + DB + Redis + tRPC + custom)
- Total spans/day: ~5,000
- Total spans/month: ~150,000
- **Cost**: $0 (under free tier)

### Metric Ingestion Costs

- **First 150 MB/month**: Free
- **Additional data**: $0.258 per MB

**Example**:
- Metrics/minute: ~100 (latency, db, cache, AI)
- Data/month: ~50 MB
- **Cost**: $0 (under free tier)

### Cost Reduction Tips

1. **Lower sampling rate**: Use 5% or 1% in high-traffic production
2. **Selective instrumentation**: Disable noisy instrumentations (DNS, net)
3. **Attribute filtering**: Remove high-cardinality attributes
4. **Tail-based sampling**: Keep only slow/error traces

## Troubleshooting

### No Traces in Google Cloud Console

**Check 1: Credentials**
```bash
# Verify application default credentials
gcloud auth application-default print-access-token

# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:platform-apm@*"
```

**Check 2: SDK Initialization**
```typescript
// Enable debug logging
process.env.OTEL_LOG_LEVEL = 'debug';

await initTelemetry({
  serviceName: 'platform-api',
  environment: 'production',
});

// Check logs for "OpenTelemetry initialized successfully"
```

**Check 3: Network Connectivity**
```bash
# Test Google Cloud Trace API
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://cloudtrace.googleapis.com/v2/projects/YOUR_PROJECT_ID/traces"
```

### High Latency from Tracing

**Symptom**: Requests 10-50ms slower with tracing enabled

**Solution 1: Batch Exporting**
```typescript
// Configure batch span processor (default in production)
// Spans are batched and exported every 5 seconds
```

**Solution 2: Async Exporting**
```typescript
// Ensure exporting doesn't block request handling
// OpenTelemetry SDK uses async exporting by default
```

**Solution 3: Reduce Sampling**
```typescript
await initTelemetry({
  sampleRate: 0.05, // Reduce from 10% to 5%
});
```

### Memory Leaks

**Symptom**: Memory usage growing over time

**Solution 1: Span Cleanup**
```typescript
// Always end spans in finally blocks
const span = tracer.startSpan('operation');
try {
  await operation();
} finally {
  span.end(); // Critical!
}
```

**Solution 2: Context Cleanup**
```typescript
// Use withSpan() helper to ensure proper cleanup
await withSpan('my-service', 'operation', async (span) => {
  // Span automatically ended even on errors
});
```

## Migration from Existing Monitoring

### From Pino Logging Only

**Before**:
```typescript
logger.info({ duration, endpoint }, 'API request completed');
```

**After** (Pino + OpenTelemetry):
```typescript
// Structured logging (Pino)
logger.info({ duration, endpoint, tenantId }, 'API request completed');

// Performance metrics (OpenTelemetry)
telemetryMetrics.recordLatency(endpoint, duration, { tenant: tenantId });
```

**Benefits**:
- Logs for debugging
- Metrics for dashboards and alerts
- Traces for distributed request flows

### From Custom Metrics

**Before**:
```typescript
metrics.increment('api.requests', { endpoint, status });
metrics.histogram('api.duration', duration, { endpoint });
```

**After**:
```typescript
telemetryMetrics.recordLatency(endpoint, duration, { status });
telemetryMetrics.recordCounter('api.requests', 1, { endpoint, status });
```

**Benefits**:
- Standard OpenTelemetry format
- Google Cloud Monitoring integration
- Automatic service mesh support

## Next Steps

1. ✅ Initialize telemetry in API server
2. ✅ Initialize telemetry in Realtime server
3. ⏳ Set up Google Cloud Trace project
4. ⏳ Configure service account credentials
5. ⏳ Create custom dashboards for key metrics
6. ⏳ Set up alerting (see `docs/operations/alerting.md` when implemented)

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Google Cloud Trace](https://cloud.google.com/trace/docs)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [Auto-Instrumentation Guide](https://opentelemetry.io/docs/instrumentation/js/automatic/)
