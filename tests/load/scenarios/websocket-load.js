/**
 * WebSocket Load Test - Real-time Messaging
 * Tests WebSocket connections and bidirectional messaging under load
 *
 * Usage:
 *   k6 run -e LOAD_PROFILE=light scenarios/websocket-load.js
 *   k6 run --vus 100 --duration 5m scenarios/websocket-load.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  CONFIG,
  THRESHOLDS,
  getLoadProfile,
  getStages,
  logConfig,
  getThinkTime,
  getRandomMessage,
} from '../config.js';

// Custom metrics
const wsConnectTime = new Trend('ws_connect_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsSentMessages = new Counter('ws_sent_messages');
const wsReceivedMessages = new Counter('ws_received_messages');
const wsErrors = new Counter('ws_errors');
const wsConnectionSuccess = new Rate('ws_connection_success');

// Test configuration
export const options = {
  stages: getStages(),
  thresholds: {
    ...THRESHOLDS,
    'ws_connect_time': ['p(95)<1000'], // Connection < 1s
    'ws_message_latency': ['p(95)<100'], // Message delivery < 100ms
    'ws_connection_success': ['rate>0.99'], // >99% connection success
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
};

/**
 * Setup: Verify WebSocket server
 */
export function setup() {
  logConfig();

  return {
    realtimeUrl: CONFIG.realtimeUrl,
    sessionId: `load-test-${Date.now()}`,
  };
}

/**
 * Main test scenario
 */
export default function (data) {
  const connectStart = Date.now();
  let connected = false;
  let messagesReceived = 0;

  const url = `${data.realtimeUrl}?sessionId=${data.sessionId}-${__VU}-${__ITER}`;

  const response = ws.connect(url, {}, function (socket) {
    connected = true;
    const connectTime = Date.now() - connectStart;
    wsConnectTime.add(connectTime);
    wsConnectionSuccess.add(1);

    socket.on('open', () => {
      // Send initial connection message
      socket.send(JSON.stringify({
        type: 'join',
        sessionId: `${data.sessionId}-${__VU}-${__ITER}`,
        metadata: { source: 'load-test' },
      }));
    });

    socket.on('message', (msg) => {
      messagesReceived++;
      wsReceivedMessages.add(1);

      try {
        const data = JSON.parse(msg);

        check(data, {
          'message has type': (d) => d.type !== undefined,
          'message has content': (d) => d.content !== undefined || d.data !== undefined,
        });

        // Calculate round-trip latency if message has timestamp
        if (data.timestamp) {
          const latency = Date.now() - data.timestamp;
          wsMessageLatency.add(latency);
        }
      } catch (err) {
        wsErrors.add(1);
      }
    });

    socket.on('error', (err) => {
      wsErrors.add(1);
    });

    socket.on('close', () => {
      check(messagesReceived, {
        'received at least one message': (count) => count > 0,
      });
    });

    // Send messages periodically
    const messageCount = 5 + Math.floor(Math.random() * 10); // 5-15 messages
    for (let i = 0; i < messageCount; i++) {
      // Wait before sending next message
      sleep(getThinkTime());

      const message = {
        type: 'message',
        content: getRandomMessage(),
        timestamp: Date.now(),
        messageId: `msg-${__VU}-${__ITER}-${i}`,
      };

      socket.send(JSON.stringify(message));
      wsSentMessages.add(1);
    }

    // Keep connection open for a bit
    sleep(5 + Math.random() * 10); // 5-15 seconds

    // Graceful disconnect
    socket.send(JSON.stringify({
      type: 'leave',
      sessionId: `${data.sessionId}-${__VU}-${__ITER}`,
    }));

    sleep(1);
    socket.close();
  });

  if (!connected) {
    wsConnectionSuccess.add(0);
    wsErrors.add(1);
  }

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });

  // Think time before next iteration
  sleep(getThinkTime());
}

/**
 * Teardown: Log summary
 */
export function teardown(data) {
  console.log('=== WebSocket Test Summary ===');
  console.log(`URL: ${data.realtimeUrl}`);
  console.log('==============================');
}

/**
 * Handle summary data
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    'stdout': textSummary(data),
    [`results/websocket-load-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/websocket-load-${timestamp}.html`]: htmlReport(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data) {
  const metrics = data.metrics;
  let summary = '\n=== WebSocket Load Test Results ===\n';

  // Connection metrics
  summary += `\nConnections:\n`;
  summary += `  Success Rate: ${((metrics.ws_connection_success?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `  Connect Time (p95): ${(metrics.ws_connect_time?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `  Errors: ${metrics.ws_errors?.values?.count || 0}\n`;

  // Message metrics
  summary += `\nMessages:\n`;
  summary += `  Sent: ${metrics.ws_sent_messages?.values?.count || 0}\n`;
  summary += `  Received: ${metrics.ws_received_messages?.values?.count || 0}\n`;
  summary += `  Latency (p95): ${(metrics.ws_message_latency?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;

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
  <title>WebSocket Load Test Report</title>
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
  <h1>WebSocket Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Test Configuration</h2>
  <div class="metric">
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
      <td>Connection Success Rate</td>
      <td>${((data.metrics.ws_connection_success?.values?.rate || 0) * 100).toFixed(2)}%</td>
      <td class="${(data.metrics.ws_connection_success?.values?.rate || 0) > 0.99 ? 'pass' : 'fail'}">${(data.metrics.ws_connection_success?.values?.rate || 0) > 0.99 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Connect Time (p95)</td>
      <td>${(data.metrics.ws_connect_time?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.ws_connect_time?.values?.['p(95)'] || 0) < 1000 ? 'pass' : 'fail'}">${(data.metrics.ws_connect_time?.values?.['p(95)'] || 0) < 1000 ? '✓' : '✗'}</td>
    </tr>
    <tr>
      <td>Message Latency (p95)</td>
      <td>${(data.metrics.ws_message_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</td>
      <td class="${(data.metrics.ws_message_latency?.values?.['p(95)'] || 0) < 100 ? 'pass' : 'fail'}">${(data.metrics.ws_message_latency?.values?.['p(95)'] || 0) < 100 ? '✓' : '✗'}</td>
    </tr>
  </table>

  <h2>Performance Metrics</h2>
  <div class="metric">
    <h3>Connections</h3>
    <p>Success Rate: ${((data.metrics.ws_connection_success?.values?.rate || 0) * 100).toFixed(2)}%</p>
    <p>Connect Time (p50): ${(data.metrics.ws_connect_time?.values?.['p(50)'] || 0).toFixed(2)}ms</p>
    <p>Connect Time (p95): ${(data.metrics.ws_connect_time?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
    <p>Errors: ${data.metrics.ws_errors?.values?.count || 0}</p>
  </div>

  <div class="metric">
    <h3>Messages</h3>
    <p>Sent: ${data.metrics.ws_sent_messages?.values?.count || 0}</p>
    <p>Received: ${data.metrics.ws_received_messages?.values?.count || 0}</p>
    <p>Latency (p50): ${(data.metrics.ws_message_latency?.values?.['p(50)'] || 0).toFixed(2)}ms</p>
    <p>Latency (p95): ${(data.metrics.ws_message_latency?.values?.['p(95)'] || 0).toFixed(2)}ms</p>
    <p>Latency (p99): ${(data.metrics.ws_message_latency?.values?.['p(99)'] || 0).toFixed(2)}ms</p>
  </div>
</body>
</html>
  `.trim();
}
