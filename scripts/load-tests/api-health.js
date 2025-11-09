/**
 * k6 Load Test - API Health Check
 *
 * Basic smoke test to verify API is responding correctly.
 * Tests: /health endpoint
 *
 * Usage:
 *   k6 run scripts/load-tests/api-health.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time', true);

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate must be less than 1%
    'errors': ['rate<0.01'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Test health endpoint
  const response = http.get(`${BASE_URL}/health`);

  // Validate response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has status field': (r) => JSON.parse(r.body).status === 'ok',
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  // Record metrics
  errorRate.add(!success);
  responseTime.add(response.timings.duration);

  // Think time
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}=====================================\n`;
  summary += `${indent}API Health Check - Load Test Results\n`;
  summary += `${indent}=====================================\n\n`;

  // Test duration
  const testDuration = data.state.testRunDurationMs / 1000;
  summary += `${indent}Test Duration: ${testDuration.toFixed(1)}s\n\n`;

  // HTTP metrics
  const metrics = data.metrics;

  if (metrics.http_reqs) {
    summary += `${indent}HTTP Requests:\n`;
    summary += `${indent}  Total: ${metrics.http_reqs.values.count}\n`;
    summary += `${indent}  Rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
  }

  if (metrics.http_req_duration) {
    summary += `${indent}Response Times:\n`;
    summary += `${indent}  Min: ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += `${indent}  Avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  Med: ${metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Error Rate: ${failRate}%\n\n`;
  }

  // Threshold results
  summary += `${indent}Thresholds:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const passed = threshold.ok ? '✓' : '✗';
    summary += `${indent}  ${passed} ${name}\n`;
  }

  summary += `\n${indent}=====================================\n`;

  return summary;
}
