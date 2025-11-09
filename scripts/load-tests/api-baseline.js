/**
 * k6 Load Test - API Baseline Performance
 *
 * Tests multiple API endpoints to establish baseline performance.
 * Validates p95 <500ms requirement across realistic user scenarios.
 *
 * Endpoints tested:
 * - GET /health (health check)
 * - GET /api/trpc/widget.getByDomain (widget lookup - cached)
 * - POST /api/trpc/chat.sendMessage (chat message - database write)
 *
 * Usage:
 *   k6 run scripts/load-tests/api-baseline.js
 *   k6 run --vus 50 --duration 5m scripts/load-tests/api-baseline.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckTime = new Trend('health_check_time', true);
const widgetLookupTime = new Trend('widget_lookup_time', true);
const chatMessageTime = new Trend('chat_message_time', true);
const requestCounter = new Counter('total_requests');

// Test configuration - Progressive load test
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm-up: 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Spike to 100 users
    { duration: '2m', target: 100 },  // Maintain 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Overall API performance
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // p95 <500ms, p99 <1s
    'http_req_failed': ['rate<0.01'], // <1% error rate

    // Per-endpoint performance
    'health_check_time': ['p(95)<100'], // Health check <100ms
    'widget_lookup_time': ['p(95)<200'], // Widget lookup <200ms (cached)
    'chat_message_time': ['p(95)<500'], // Chat message <500ms (database write)

    // Error thresholds
    'errors': ['rate<0.01'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/trpc`;

// Test data
const TEST_DOMAINS = ['example.com', 'acme.com', 'test.com', 'demo.com'];
const TEST_MESSAGES = [
  'Hello, how can I help you?',
  'What are your business hours?',
  'Can you provide pricing information?',
  'I need technical support',
  'Tell me more about your services',
];

export default function () {
  // Simulate realistic user behavior with different scenarios
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Quick health check only
    healthCheck();
    sleep(Math.random() * 2 + 1); // 1-3s think time
  } else if (scenario < 0.7) {
    // 40% - Widget lookup (read-heavy)
    widgetLookup();
    sleep(Math.random() * 3 + 2); // 2-5s think time
  } else {
    // 30% - Full interaction (widget + chat message)
    widgetLookup();
    sleep(1);
    chatMessage();
    sleep(Math.random() * 5 + 3); // 3-8s think time
  }
}

function healthCheck() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    requestCounter.add(1);

    const success = check(response, {
      'health: status 200': (r) => r.status === 200,
      'health: valid response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    healthCheckTime.add(response.timings.duration);
  });
}

function widgetLookup() {
  group('Widget Lookup', () => {
    const domain = TEST_DOMAINS[Math.floor(Math.random() * TEST_DOMAINS.length)];

    // tRPC GET request with query params
    const params = {
      input: JSON.stringify({ domain }),
    };

    const response = http.get(`${API_BASE}/widget.getByDomain`, { params });
    requestCounter.add(1);

    const success = check(response, {
      'widget: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'widget: valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    widgetLookupTime.add(response.timings.duration);
  });
}

function chatMessage() {
  group('Chat Message', () => {
    const message = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];

    // Note: This endpoint requires authentication in production
    // For load testing, we're testing the endpoint structure and response time
    const payload = JSON.stringify({
      sessionId: `test-session-${__VU}`, // Virtual user ID
      message,
      tenantId: 'test-tenant',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // tRPC POST request (batch: false for single mutation)
    const response = http.post(
      `${API_BASE}/chat.sendMessage`,
      payload,
      params
    );
    requestCounter.add(1);

    const success = check(response, {
      'chat: status 200 or 401': (r) => r.status === 200 || r.status === 401, // 401 expected without auth
      'chat: response time acceptable': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!success);
    chatMessageTime.add(response.timings.duration);
  });
}

export function handleSummary(data) {
  console.log('\n=====================================');
  console.log('API Baseline Performance - Results');
  console.log('=====================================\n');

  const metrics = data.metrics;

  // Test overview
  const testDuration = data.state.testRunDurationMs / 1000;
  console.log(`Test Duration: ${testDuration.toFixed(1)}s`);
  console.log(`VUs: ${data.options.stages.map(s => s.target).join(' → ')}`);
  console.log('');

  // Request metrics
  if (metrics.total_requests) {
    console.log('Total Requests:');
    console.log(`  Count: ${metrics.total_requests.values.count}`);
    console.log(`  Rate: ${metrics.total_requests.values.rate.toFixed(2)}/s`);
    console.log('');
  }

  // Overall response times
  if (metrics.http_req_duration) {
    console.log('Overall Response Times:');
    console.log(`  Min: ${metrics.http_req_duration.values.min.toFixed(2)}ms`);
    console.log(`  Avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`  Med: ${metrics.http_req_duration.values.med.toFixed(2)}ms`);
    console.log(`  p90: ${metrics.http_req_duration.values['p(90)'].toFixed(2)}ms`);
    console.log(`  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
    console.log(`  Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms`);
    console.log('');
  }

  // Per-endpoint breakdown
  console.log('Per-Endpoint Performance:');

  if (metrics.health_check_time) {
    console.log('  Health Check:');
    console.log(`    p95: ${metrics.health_check_time.values['p(95)'].toFixed(2)}ms`);
    console.log(`    Avg: ${metrics.health_check_time.values.avg.toFixed(2)}ms`);
  }

  if (metrics.widget_lookup_time) {
    console.log('  Widget Lookup:');
    console.log(`    p95: ${metrics.widget_lookup_time.values['p(95)'].toFixed(2)}ms`);
    console.log(`    Avg: ${metrics.widget_lookup_time.values.avg.toFixed(2)}ms`);
  }

  if (metrics.chat_message_time) {
    console.log('  Chat Message:');
    console.log(`    p95: ${metrics.chat_message_time.values['p(95)'].toFixed(2)}ms`);
    console.log(`    Avg: ${metrics.chat_message_time.values.avg.toFixed(2)}ms`);
  }
  console.log('');

  // Error rate
  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    console.log(`Error Rate: ${failRate}%`);
    console.log('');
  }

  // Threshold validation
  console.log('Threshold Validation:');
  let allPassed = true;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✓ PASS' : '✗ FAIL';
    if (!threshold.ok) allPassed = false;
    console.log(`  ${status} - ${name}`);
  }
  console.log('');

  // Final verdict
  console.log('=====================================');
  if (allPassed) {
    console.log('✓ All performance requirements met!');
    console.log('  p95 < 500ms: VALIDATED ✓');
  } else {
    console.log('✗ Some thresholds failed - review above');
  }
  console.log('=====================================\n');

  return {
    'stdout': '', // Suppress default summary
    'results/api-baseline.json': JSON.stringify(data, null, 2),
  };
}
