/**
 * Mixed Scenario Load Test - Realistic User Behavior
 * Combines API and WebSocket operations to simulate real user journeys
 *
 * User Journey:
 *   1. Login (API)
 *   2. Connect WebSocket
 *   3. Send/receive messages (WebSocket)
 *   4. Search knowledge base (API)
 *   5. Continue chat (WebSocket)
 *   6. Disconnect
 *
 * Usage:
 *   k6 run -e LOAD_PROFILE=light scenarios/mixed-scenario.js
 *   k6 run --vus 100 --duration 5m scenarios/mixed-scenario.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
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
const userJourneyDuration = new Trend('user_journey_duration');
const userJourneySuccess = new Rate('user_journey_success');
const totalMessages = new Counter('total_messages');
const knowledgeSearches = new Counter('knowledge_searches');

// Test configuration
export const options = {
  stages: getStages(),
  thresholds: {
    ...THRESHOLDS,
    'user_journey_duration': ['p(95)<30000'], // Complete journey < 30s
    'user_journey_success': ['rate>0.95'], // >95% successful journeys
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
};

/**
 * Setup: Verify services
 */
export function setup() {
  logConfig();

  // Verify API is accessible
  const apiHealth = http.get(`${CONFIG.apiUrl}/health`);
  check(apiHealth, {
    'API is accessible': (r) => r.status === 200 || r.status === 404,
  });

  return {
    apiUrl: CONFIG.apiUrl,
    realtimeUrl: CONFIG.realtimeUrl,
    testEmail: CONFIG.testEmail,
    testPassword: CONFIG.testPassword,
  };
}

/**
 * Main test scenario - Complete user journey
 */
export default function (data) {
  const journeyStart = Date.now();
  let journeySuccess = true;

  try {
    // Step 1: Login
    const loginResponse = http.post(
      `${data.apiUrl}/trpc/auth.login`,
      JSON.stringify({
        email: data.testEmail,
        password: data.testPassword,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'mixed.login' },
      }
    );

    const loginSuccess = check(loginResponse, {
      'login successful': (r) => r.status === 200,
    });

    if (!loginSuccess) {
      journeySuccess = false;
      userJourneySuccess.add(0);
      return;
    }

    const authData = loginResponse.json();
    const sessionToken = authData?.result?.data?.sessionToken || '';

    sleep(getThinkTime());

    // Step 2: Create session
    const sessionResponse = http.post(
      `${data.apiUrl}/trpc/sessions.create`,
      JSON.stringify({
        widgetId: 'mixed-test-widget',
        metadata: { source: 'mixed-scenario' },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        tags: { name: 'mixed.session.create' },
      }
    );

    validateResponse(sessionResponse);
    const sessionData = sessionResponse.json();
    const sessionId = sessionData?.result?.data?.id;

    if (!sessionId) {
      journeySuccess = false;
      userJourneySuccess.add(0);
      return;
    }

    sleep(getThinkTime());

    // Step 3: Connect WebSocket and chat
    const wsUrl = `${data.realtimeUrl}?sessionId=${sessionId}`;
    let wsMessagesReceived = 0;

    const wsResponse = ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        // Join session
        socket.send(JSON.stringify({
          type: 'join',
          sessionId: sessionId,
        }));
      });

      socket.on('message', (msg) => {
        wsMessagesReceived++;
        totalMessages.add(1);
      });

      socket.on('error', (err) => {
        journeySuccess = false;
      });

      // Send multiple messages
      const messageCount = 3 + Math.floor(Math.random() * 3); // 3-5 messages
      for (let i = 0; i < messageCount; i++) {
        sleep(getThinkTime());

        socket.send(JSON.stringify({
          type: 'message',
          content: getRandomMessage(),
          timestamp: Date.now(),
        }));

        totalMessages.add(1);
      }

      // Keep connection alive for a bit
      sleep(3 + Math.random() * 5); // 3-8 seconds

      // Step 4: Search knowledge base while in chat (API call)
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
          tags: { name: 'mixed.knowledge.search' },
        }
      );

      validateResponse(knowledgeResponse);
      knowledgeSearches.add(1);

      sleep(getThinkTime());

      // Step 5: Send follow-up messages based on knowledge
      for (let i = 0; i < 2; i++) {
        sleep(getThinkTime());

        socket.send(JSON.stringify({
          type: 'message',
          content: 'Follow-up: ' + getRandomMessage(),
          timestamp: Date.now(),
        }));

        totalMessages.add(1);
      }

      sleep(2);

      // Step 6: Graceful disconnect
      socket.send(JSON.stringify({
        type: 'leave',
        sessionId: sessionId,
      }));

      sleep(1);
      socket.close();
    });

    check(wsResponse, {
      'WebSocket connected': (r) => r && r.status === 101,
    });

    check(wsMessagesReceived, {
      'received messages': (count) => count > 0,
    });

    // Journey completed successfully
    const journeyDuration = Date.now() - journeyStart;
    userJourneyDuration.add(journeyDuration);
    userJourneySuccess.add(journeySuccess ? 1 : 0);

  } catch (err) {
    journeySuccess = false;
    userJourneySuccess.add(0);
  }

  // Think time before next iteration
  sleep(getThinkTime());
}

/**
 * Teardown: Log summary
 */
export function teardown(data) {
  console.log('=== Mixed Scenario Test Summary ===');
  console.log(`API: ${data.apiUrl}`);
  console.log(`WebSocket: ${data.realtimeUrl}`);
  console.log('==================================');
}

/**
 * Handle summary data
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    'stdout': textSummary(data),
    [`results/mixed-scenario-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/mixed-scenario-${timestamp}.html`]: htmlReport(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data) {
  const metrics = data.metrics;
  let summary = '\n=== Mixed Scenario Test Results ===\n';

  // Journey metrics
  summary += `\nUser Journeys:\n`;
  summary += `  Success Rate: ${((metrics.user_journey_success?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `  Duration (p95): ${(metrics.user_journey_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;

  // Activity metrics
  summary += `\nActivity:\n`;
  summary += `  Total Messages: ${metrics.total_messages?.values?.count || 0}\n`;
  summary += `  Knowledge Searches: ${metrics.knowledge_searches?.values?.count || 0}\n`;

  // HTTP metrics
  summary += `\nAPI Performance:\n`;
  summary += `  Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += `  Error Rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `  Latency (p95): ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;

  summary += '\n===================================\n';

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
  <title>Mixed Scenario Load Test Report</title>
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
  <h1>Mixed Scenario Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Test Configuration</h2>
  <div class="metric">
    <p><strong>API URL:</strong> ${CONFIG.apiUrl}</p>
    <p><strong>WebSocket URL:</strong> ${CONFIG.realtimeUrl}</p>
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
      <td>User Journey Success Rate</td>
      <td>${((data.metrics.user_journey_success?.values?.rate || 0) * 100).toFixed(2)}%</td>
      <td class="${(data.metrics.user_journey_success?.values?.rate || 0) > 0.95 ? 'pass' : 'fail'}">${(data.metrics.user_journey_success?.values?.rate || 0) > 0.95 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Journey Duration (p95)</td>
      <td>${(data.metrics.user_journey_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.user_journey_duration?.values?.['p(95)'] || 0) < 30000 ? 'pass' : 'fail'}">${(data.metrics.user_journey_duration?.values?.['p(95)'] || 0) < 30000 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>API Error Rate</td>
      <td>${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</td>
      <td class="${(data.metrics.http_req_failed?.values?.rate || 0) < 0.01 ? 'pass' : 'fail'}">${(data.metrics.http_req_failed?.values?.rate || 0) < 0.01 ? '✓' : '✗'}</td>
    </tr>
  </table>

  <h2>Performance Metrics</h2>
  <div class="metric">
    <h3>User Journeys</h3>
    <p>Success Rate: ${((data.metrics.user_journey_success?.values?.rate || 0) * 100).toFixed(2)}%</p>
    <p>Duration (p50): ${(data.metrics.user_journey_duration?.values?.['p(50)'] || 0).toFixed(2)}ms</p>
    <p>Duration (p95): ${(data.metrics.user_journey_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
    <p>Duration (p99): ${(data.metrics.user_journey_duration?.values?.['p(99)'] || 0).toFixed(2)}ms</p>
  </div>

  <div class="metric">
    <h3>Activity</h3>
    <p>Total Messages: ${data.metrics.total_messages?.values?.count || 0}</p>
    <p>Knowledge Searches: ${data.metrics.knowledge_searches?.values?.count || 0}</p>
  </div>

  <div class="metric">
    <h3>API Performance</h3>
    <p>Total Requests: ${data.metrics.http_reqs?.values?.count || 0}</p>
    <p>Error Rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</p>
    <p>Latency (p50): ${(data.metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms</p>
    <p>Latency (p95): ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
  </div>
</body>
</html>
  `.trim();
}
