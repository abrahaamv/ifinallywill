# Load Testing with k6

Performance validation using [k6](https://k6.io/) load testing tool.

## Prerequisites

### Install k6

**Linux (Debian/Ubuntu)**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS**:
```bash
brew install k6
```

**Docker**:
```bash
docker pull grafana/k6:latest
```

## Test Scenarios

### 1. Health Check (Smoke Test)

**Purpose**: Verify API is responding correctly
**Duration**: 2 minutes
**Load**: 10 concurrent users
**Endpoint**: `GET /health`

```bash
k6 run scripts/load-tests/api-health.js
```

**Expected Results**:
- p95 response time: <100ms
- Error rate: <1%
- All health checks successful

---

### 2. API Baseline Performance

**Purpose**: Validate p95 <500ms requirement across multiple endpoints
**Duration**: 12 minutes
**Load**: Progressive (10 → 50 → 100 users)
**Endpoints**:
- `GET /health` - Health check
- `GET /api/trpc/widget.getByDomain` - Widget lookup (cached reads)
- `POST /api/trpc/chat.sendMessage` - Chat message (database writes)

```bash
# Start API server first
pnpm dev:api

# Run baseline test
k6 run scripts/load-tests/api-baseline.js
```

**Expected Results**:
- Overall p95: <500ms ✓
- Health check p95: <100ms
- Widget lookup p95: <200ms (cached)
- Chat message p95: <500ms (database write)
- Error rate: <1%

**Load Progression**:
```
0-1min:   10 users  (warm-up)
1-3min:   50 users  (moderate load)
3-6min:   50 users  (sustained load)
6-8min:  100 users  (spike test)
8-10min: 100 users  (stress test)
10-12min:  0 users  (ramp down)
```

---

## Custom Test Runs

### Quick Smoke Test (30s)

```bash
k6 run --vus 5 --duration 30s scripts/load-tests/api-health.js
```

### Sustained Load Test (10min, 100 users)

```bash
k6 run --vus 100 --duration 10m scripts/load-tests/api-baseline.js
```

### Stress Test (500 users)

```bash
k6 run --vus 500 --duration 5m scripts/load-tests/api-baseline.js
```

### Spike Test (1000 users, 2min)

```bash
k6 run --vus 1000 --duration 2m scripts/load-tests/api-baseline.js
```

---

## Environment Configuration

### Custom API URL

```bash
BASE_URL=http://api.platform.com:3001 k6 run scripts/load-tests/api-baseline.js
```

### Production Testing

```bash
# ⚠️ WARNING: Only test against staging/non-production environments
BASE_URL=https://staging-api.platform.com k6 run scripts/load-tests/api-baseline.js
```

---

## Interpreting Results

### Key Metrics

**Response Time Percentiles**:
- **p50 (median)**: 50% of requests complete below this time
- **p95**: 95% of requests complete below this time (our target: <500ms)
- **p99**: 99% of requests complete below this time
- **Max**: Slowest request (may include outliers)

**Error Rate**:
- **http_req_failed**: Percentage of failed HTTP requests
- **Target**: <1% (0.01)

**Request Rate**:
- **http_reqs**: Total requests and requests per second
- **Higher is better**: Indicates system throughput

### Threshold Validation

k6 automatically validates thresholds defined in test scripts:

```
✓ PASS - http_req_duration: p(95)<500
✗ FAIL - http_req_duration: p(95)<500
```

**Pass**: All requests meet performance target
**Fail**: Performance degradation detected, investigate bottlenecks

---

## Performance Troubleshooting

### High Response Times (p95 >500ms)

**Potential Causes**:
1. **Database queries**: Check slow queries in `pg_stat_statements`
2. **Missing indexes**: Review query plans with `EXPLAIN ANALYZE`
3. **Connection pool exhaustion**: Monitor pool usage
4. **External API latency**: Check AI provider response times
5. **Memory pressure**: Check Node.js heap usage

**Investigation Steps**:
```bash
# Check database slow queries
psql -U platform -d platform -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check connection pool
# Monitor logs for "connection pool exhausted" warnings

# Check API traces in Google Cloud Trace
# Review distributed traces for bottlenecks
```

### High Error Rate (>1%)

**Potential Causes**:
1. **Database connection failures**: Check pool configuration
2. **Authentication errors**: Verify test data and credentials
3. **Rate limiting**: Check rate limit thresholds
4. **External service failures**: Check AI provider status

**Investigation Steps**:
```bash
# Check API error logs
tail -100 /var/log/platform/api.log | grep ERROR

# Check database connectivity
psql -U platform -d platform -c "SELECT 1;"

# Review Google Cloud Trace for error details
```

### Low Throughput (requests/s)

**Potential Causes**:
1. **CPU bottleneck**: Check CPU usage during test
2. **Single-threaded blocking**: Review async/await patterns
3. **Database lock contention**: Check for table locks
4. **Network latency**: Test from same region/network

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build packages
        run: pnpm build

      - name: Start API server
        run: |
          pnpm dev:api &
          sleep 10

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run smoke test
        run: k6 run scripts/load-tests/api-health.js

      - name: Run baseline test
        run: k6 run scripts/load-tests/api-baseline.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: load-test-results
          path: results/*.json
```

---

## Best Practices

### Before Testing

1. **Start fresh**: Restart API server and database
2. **Clear caches**: Redis flush for consistent baseline
3. **Check resources**: Ensure adequate CPU/memory available
4. **Disable monitoring**: Temporarily disable APM to reduce overhead (optional)
5. **Use realistic data**: Seed database with production-like data volume

### During Testing

1. **Monitor system**: Watch CPU, memory, connections in real-time
2. **Check logs**: Tail API logs for errors
3. **Observe metrics**: Monitor OpenTelemetry dashboard
4. **Note anomalies**: Document unexpected behavior

### After Testing

1. **Review results**: Check all thresholds passed
2. **Analyze traces**: Use Google Cloud Trace for bottleneck analysis
3. **Document findings**: Record baseline metrics for future comparison
4. **Clean up**: Stop background processes, clear test data

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| p95 Response Time | <500ms | 95th percentile across all endpoints |
| p99 Response Time | <1000ms | 99th percentile across all endpoints |
| Error Rate | <1% | Failed requests / total requests |
| Throughput | >100 req/s | Requests per second (moderate load) |
| Concurrent Users | 100+ | Simultaneous active users supported |

**Validation**: Run `api-baseline.js` test - all thresholds must pass.

---

## Load Test Results Archive

Store test results for historical comparison:

```bash
# Create results directory
mkdir -p results

# Run test with timestamped results
k6 run --out json=results/baseline-$(date +%Y%m%d-%H%M%S).json scripts/load-tests/api-baseline.js
```

**Results Location**: `results/*.json`
**Format**: k6 JSON output (importable into Grafana, k6 Cloud)

---

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/test-types/load-testing/)
- [k6 Cloud](https://k6.io/cloud/) - Managed load testing service
