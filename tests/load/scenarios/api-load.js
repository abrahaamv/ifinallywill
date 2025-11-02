/**
 * API Load Test - tRPC Endpoints
 * Tests authentication, chat, and knowledge endpoints under load
 *
 * Usage:
 *   k6 run -e LOAD_PROFILE=light scenarios/api-load.js
 *   k6 run --vus 100 --duration 5m scenarios/api-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  CONFIG,
  THRESHOLDS,
  getLoadProfile,
  getStages,
  logConfig,
  validateResponse,
  getThinkTime,
  getRandomMessage,
  getRandomQuery,
} from '../config.js';

// Custom metrics
const authDuration = new Trend('auth_duration');
const chatResponseTime = new Trend('chat_response_time');
const knowledgeSearchTime = new Trend('knowledge_search_time');
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');

// Test configuration
export const options = {
  stages: getStages(),
  thresholds: THRESHOLDS,
  setupTimeout: '60s',
  teardownTimeout: '60s',
};

/**
 * Setup: Create test user if needed
 */
export function setup() {
  logConfig();

  // Verify API is accessible
  const healthCheck = http.get(`${CONFIG.apiUrl}/health`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200 || r.status === 404,
  });

  return {
    apiUrl: CONFIG.apiUrl,
    testEmail: CONFIG.testEmail,
    testPassword: CONFIG.testPassword,
  };
}

/**
 * Main test scenario
 */
export default function (data) {
  // 1. Authentication flow
  const authStart = Date.now();
  const loginResponse = http.post(
    `${data.apiUrl}/trpc/auth.login`,
    JSON.stringify({
      email: data.testEmail,
      password: data.testPassword,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'auth.login' },
    }
  );

  const authSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'has auth token': (r) => r.json() && r.json().result,
  });

  const authTime = Date.now() - authStart;
  authDuration.add(authTime);

  if (authSuccess) {
    successfulLogins.add(1);

    const authData = loginResponse.json();
    const sessionToken = authData?.result?.data?.sessionToken || '';

    // Think time after login
    sleep(getThinkTime());

    // 2. Create chat session
    const sessionResponse = http.post(
      `${data.apiUrl}/trpc/sessions.create`,
      JSON.stringify({
        widgetId: 'load-test-widget',
        metadata: { source: 'load-test' },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        tags: { name: 'sessions.create' },
      }
    );

    validateResponse(sessionResponse);
    const sessionData = sessionResponse.json();
    const sessionId = sessionData?.result?.data?.id;

    // Think time after creating session
    sleep(getThinkTime());

    // 3. Send chat message
    if (sessionId) {
      const chatStart = Date.now();
      const chatResponse = http.post(
        `${data.apiUrl}/trpc/messages.create`,
        JSON.stringify({
          sessionId: sessionId,
          content: getRandomMessage(),
          role: 'user',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          tags: { name: 'messages.create' },
        }
      );

      validateResponse(chatResponse);
      chatResponseTime.add(Date.now() - chatStart);

      // Think time after chat
      sleep(getThinkTime());

      // 4. Knowledge search (RAG)
      const knowledgeStart = Date.now();
      const knowledgeResponse = http.post(
        `${data.apiUrl}/trpc/knowledge.search`,
        JSON.stringify({
          query: getRandomQuery(),
          limit: 5,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          tags: { name: 'knowledge.search' },
        }
      );

      validateResponse(knowledgeResponse);
      knowledgeSearchTime.add(Date.now() - knowledgeStart);

      // Think time after knowledge search
      sleep(getThinkTime());

      // 5. Get session history
      const historyResponse = http.get(
        `${data.apiUrl}/trpc/messages.list?sessionId=${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
          tags: { name: 'messages.list' },
        }
      );

      validateResponse(historyResponse);
    }
  } else {
    failedLogins.add(1);
  }

  // Random think time before next iteration
  sleep(getThinkTime());
}

/**
 * Teardown: Log summary
 */
export function teardown(data) {
  console.log('=== Test Summary ===');
  console.log(`Total VUs: ${options.stages.reduce((max, stage) => Math.max(max, stage.target), 0)}`);
  console.log('===================');
}

/**
 * Handle summary data
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`results/api-load-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/api-load-${timestamp}.html`]: htmlReport(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data, options) {
  const metrics = data.metrics;
  let summary = '\n=== Load Test Results ===\n';

  // Request metrics
  summary += `\nHTTP Requests:\n`;
  summary += `  Total: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Failed: ${metrics.http_req_failed?.values?.rate || 0}%\n`;
  summary += `  Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s\n`;

  // Latency metrics
  summary += `\nLatency:\n`;
  summary += `  p50: ${(metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms\n`;
  summary += `  p95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `  p99: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms\n`;

  // Custom metrics
  summary += `\nAuthentication:\n`;
  summary += `  Successful: ${metrics.successful_logins?.values?.count || 0}\n`;
  summary += `  Failed: ${metrics.failed_logins?.values?.count || 0}\n`;
  summary += `  Duration (p95): ${(metrics.auth_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;

  summary += '\n========================\n';

  return summary;
}

/**
 * Generate HTML report
 */
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>API Load Test Report</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #333; }
    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .metric h3 { margin-top: 0; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background-color: #4f46e5; color: white; }
  </style>
</head>
<body>
  <h1>API Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Test Configuration</h2>
  <div class="metric">
    <p><strong>API URL:</strong> ${CONFIG.apiUrl}</p>
    <p><strong>Load Profile:</strong> ${__ENV.LOAD_PROFILE || 'light'}</p>
    <p><strong>Duration:</strong> ${data.state.testRunDurationMs}ms</p>
  </div>

  <h2>Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs?.values?.count || 0}</td>
      <td class="pass">✓</td>
    </tr>
    <tr>
      <td>Error Rate</td>
      <td>${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</td>
      <td class="${(data.metrics.http_req_failed?.values?.rate || 0) < 0.01 ? 'pass' : 'fail'}">${(data.metrics.http_req_failed?.values?.rate || 0) < 0.01 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>p95 Latency</td>
      <td>${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 200 ? 'pass' : 'fail'}">${(data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 200 ? '✓' : '✗'}</td>
    </tr>
  </table>

  <h2>Performance Metrics</h2>
  <div class="metric">
    <h3>HTTP Requests</h3>
    <p>Count: ${data.metrics.http_reqs?.values?.count || 0}</p>
    <p>Rate: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s</p>
  </div>

  <div class="metric">
    <h3>Response Time</h3>
    <p>p50: ${(data.metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms</p>
    <p>p95: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
    <p>p99: ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms</p>
    <p>Max: ${(data.metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms</p>
  </div>

  <div class="metric">
    <h3>Authentication</h3>
    <p>Successful: ${data.metrics.successful_logins?.values?.count || 0}</p>
    <p>Failed: ${data.metrics.failed_logins?.values?.count || 0}</p>
    <p>Duration (p95): ${(data.metrics.auth_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
  </div>
</body>
</html>
  `.trim();
}
