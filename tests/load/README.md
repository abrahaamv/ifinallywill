# Load Testing Suite - k6

Comprehensive load testing suite for the Enterprise AI Assistant Platform using [k6](https://k6.io/).

## 📋 Overview

This suite validates production scalability and performance under various load conditions:
- **API Load Tests**: tRPC endpoints (auth, chat, knowledge)
- **WebSocket Load Tests**: Real-time messaging and connection stability
- **Mixed Scenarios**: Realistic user behavior combining API + WebSocket

## 🎯 Performance Targets

Based on production readiness requirements:
- **API Latency**: <200ms p95 for all endpoints
- **Error Rate**: <1% across all operations
- **WebSocket**: <100ms message delivery, >99% connection stability
- **Concurrent Users**: Validated at 100, 500, 1K, 5K users

## 🚀 Quick Start

### Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install k6 (Windows - Chocolatey)
choco install k6
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.test

# Configure test environment
# Edit .env.test with your test server URLs:
# - API_URL=http://localhost:3001
# - REALTIME_URL=ws://localhost:3002
# - TEST_EMAIL=loadtest@example.com
# - TEST_PASSWORD=SecureTestPass123!
```

### Running Tests

```bash
# Run all scenarios
pnpm test:load

# Run specific scenario
pnpm test:load:api         # API endpoints only
pnpm test:load:websocket   # WebSocket only
pnpm test:load:mixed       # Combined realistic scenario

# Run with specific load profile
k6 run --vus 100 --duration 5m scenarios/api-load.js
k6 run --vus 500 --duration 10m scenarios/api-load.js
```

## 📊 Test Scenarios

### 1. API Load Test (`scenarios/api-load.js`)

Tests tRPC endpoints under progressive load:
- **Stages**: Ramp-up → Steady → Spike → Cool-down
- **Endpoints**: Login, chat, knowledge search, session management
- **Metrics**: Response time, throughput, error rate

**Load Profiles**:
- **Light**: 100 VUs for 5 minutes
- **Medium**: 500 VUs for 10 minutes
- **Heavy**: 1,000 VUs for 15 minutes
- **Stress**: 5,000 VUs for 20 minutes

```bash
# Run with different profiles
k6 run -e LOAD_PROFILE=light scenarios/api-load.js
k6 run -e LOAD_PROFILE=heavy scenarios/api-load.js
```

### 2. WebSocket Load Test (`scenarios/websocket-load.js`)

Tests real-time messaging infrastructure:
- **Concurrent Connections**: Progressive scaling
- **Message Throughput**: Bidirectional messaging
- **Connection Stability**: Long-running connections
- **Metrics**: Connection time, message latency, drop rate

**Test Parameters**:
- Connection establishment time
- Message send/receive latency
- Concurrent active connections
- Connection drop rate

### 3. Mixed Scenario (`scenarios/mixed-scenario.js`)

Realistic user behavior combining API + WebSocket:
- **User Journey**: Login → Chat → Knowledge query → Disconnect
- **Concurrent Users**: Progressive scaling
- **Think Time**: Realistic pauses between actions
- **Metrics**: End-to-end latency, user success rate

## 📈 Results and Reports

Test results are saved to `tests/load/results/`:
- JSON metrics: `results/{scenario}-{timestamp}.json`
- HTML reports: `results/{scenario}-{timestamp}.html`
- CSV data: `results/{scenario}-{timestamp}.csv`

```bash
# Generate HTML report from JSON
k6 run --out json=results/api-load.json scenarios/api-load.js
k6 report results/api-load.json --out results/api-load.html
```

## 🛠️ Configuration

### Load Profiles

Edit `config.js` to customize load profiles:

```javascript
export const LOAD_PROFILES = {
  smoke: { vus: 1, duration: '1m' },      // Validation
  light: { vus: 100, duration: '5m' },    // Normal load
  medium: { vus: 500, duration: '10m' },  // Peak hours
  heavy: { vus: 1000, duration: '15m' },  // High traffic
  stress: { vus: 5000, duration: '20m' }, // Capacity planning
};
```

### Thresholds

Performance thresholds in each test file:

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<200'],  // 95% of requests < 200ms
    'http_req_failed': ['rate<0.01'],    // Error rate < 1%
    'ws_connecting': ['p(95)<1000'],     // WebSocket connect < 1s
    'ws_msgs_sent': ['count>1000'],      // Message throughput
  },
};
```

## 🔍 Metrics Collected

### HTTP Metrics
- `http_req_duration`: Request latency (p50, p95, p99)
- `http_req_failed`: Error rate
- `http_reqs`: Total requests
- `http_req_blocked`: Time blocked waiting for connection
- `http_req_connecting`: Time establishing connection
- `http_req_sending`: Time sending request
- `http_req_waiting`: Time waiting for response (TTFB)
- `http_req_receiving`: Time receiving response

### WebSocket Metrics
- `ws_connecting`: Connection establishment time
- `ws_session_duration`: WebSocket session duration
- `ws_msgs_sent`: Messages sent
- `ws_msgs_received`: Messages received
- `ws_ping`: WebSocket ping latency

### Custom Metrics
- `user_success_rate`: % of complete user journeys
- `auth_duration`: Authentication flow time
- `chat_response_time`: AI response latency
- `knowledge_search_time`: RAG query time

## 🎯 Performance Baselines

Expected performance based on Phase 11 architecture:

| Metric | Target | Notes |
|--------|--------|-------|
| Auth API (p95) | <200ms | Login + session creation |
| Chat API (p95) | <500ms | AI inference included |
| Knowledge API (p95) | <300ms | RAG + reranking |
| WebSocket Connect (p95) | <1000ms | Initial handshake |
| Message Delivery (p95) | <100ms | Bidirectional |
| Error Rate | <1% | All operations |
| Connection Stability | >99% | WebSocket uptime |

## 📦 Test Data

Test data generators in `utils/`:
- `auth.js`: User credentials and tokens
- `messages.js`: Realistic chat messages
- `knowledge.js`: Sample queries for RAG

## 🐛 Troubleshooting

### High Error Rates

```bash
# Check server logs
docker logs platform-api
docker logs platform-realtime

# Reduce concurrent users
k6 run --vus 10 --duration 1m scenarios/api-load.js
```

### Connection Issues

```bash
# Verify services are running
curl http://localhost:3001/health
wscat -c ws://localhost:3002

# Check network limits
ulimit -n  # Should be >10000 for heavy load
```

### Memory Issues

```bash
# Monitor k6 memory usage
k6 run --vus 100 --duration 5m --log-output=stdout scenarios/api-load.js

# Use fewer VUs if needed
k6 run --vus 50 --duration 10m scenarios/api-load.js
```

## 🔗 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://github.com/grafana/k6-learn)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/performance-testing/)
- Platform Architecture: `docs/architecture/`
- API Documentation: `docs/reference/api.md`

## 📝 Notes

- Run tests in isolated environment (not production)
- Warm up services before heavy load tests
- Monitor system resources during tests
- Validate database connection pool settings
- Check Redis connection limits
- Review LiveKit capacity planning
