/**
 * k6 Load Testing Configuration
 * Shared configuration for all load test scenarios
 */

import { check } from 'k6';

/**
 * Load profiles for different testing scenarios
 */
export const LOAD_PROFILES = {
  smoke: {
    vus: 1,
    duration: '1m',
    description: 'Smoke test - validates test scripts work',
  },
  light: {
    vus: 100,
    duration: '5m',
    description: 'Light load - normal traffic',
  },
  medium: {
    vus: 500,
    duration: '10m',
    description: 'Medium load - peak hours',
  },
  heavy: {
    vus: 1000,
    duration: '15m',
    description: 'Heavy load - high traffic',
  },
  stress: {
    vus: 5000,
    duration: '20m',
    description: 'Stress test - capacity planning',
  },
};

/**
 * Get load profile from environment or use default
 */
export function getLoadProfile() {
  const profile = __ENV.LOAD_PROFILE || 'light';
  return LOAD_PROFILES[profile] || LOAD_PROFILES.light;
}

/**
 * Environment configuration
 */
export const CONFIG = {
  apiUrl: __ENV.API_URL || 'http://localhost:3001',
  realtimeUrl: __ENV.REALTIME_URL || 'ws://localhost:3002',
  testEmail: __ENV.TEST_EMAIL || 'loadtest@example.com',
  testPassword: __ENV.TEST_PASSWORD || 'LoadTest123!@#',
  tenantId: __ENV.TENANT_ID || 'test-tenant-id',
};

/**
 * Performance thresholds (production targets)
 */
export const THRESHOLDS = {
  // API thresholds
  'http_req_duration': ['p(95)<200', 'p(99)<500'], // 95th percentile < 200ms, 99th < 500ms
  'http_req_failed': ['rate<0.01'], // Error rate < 1%
  'http_reqs': ['rate>100'], // Minimum 100 requests/sec

  // WebSocket thresholds
  'ws_connecting': ['p(95)<1000'], // Connection < 1s
  'ws_session_duration': ['avg>30000'], // Average session > 30s
  'ws_msgs_sent': ['count>1000'], // Message throughput

  // Custom thresholds
  'auth_duration': ['p(95)<300'], // Auth flow < 300ms
  'chat_response_time': ['p(95)<500'], // Chat response < 500ms
  'knowledge_search_time': ['p(95)<300'], // RAG query < 300ms
};

/**
 * Stage configuration for ramping load
 */
export const STAGES = {
  light: [
    { duration: '1m', target: 50 },  // Ramp-up to 50 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp-down to 0 users
  ],
  medium: [
    { duration: '2m', target: 250 },  // Ramp-up
    { duration: '5m', target: 500 },  // Steady
    { duration: '2m', target: 750 },  // Spike
    { duration: '1m', target: 0 },    // Cool-down
  ],
  heavy: [
    { duration: '3m', target: 500 },   // Ramp-up
    { duration: '8m', target: 1000 },  // Steady
    { duration: '3m', target: 1500 },  // Spike
    { duration: '1m', target: 0 },     // Cool-down
  ],
  stress: [
    { duration: '5m', target: 2500 },  // Ramp-up
    { duration: '10m', target: 5000 }, // Stress
    { duration: '3m', target: 2500 },  // Cool-down
    { duration: '2m', target: 0 },     // Shutdown
  ],
};

/**
 * Get stages for current load profile
 */
export function getStages() {
  const profile = __ENV.LOAD_PROFILE || 'light';
  return STAGES[profile] || STAGES.light;
}

/**
 * Think time configuration (pauses between actions)
 */
export const THINK_TIME = {
  min: 1,   // Minimum 1 second
  max: 5,   // Maximum 5 seconds
  avg: 2.5, // Average 2.5 seconds
};

/**
 * Test data configuration
 */
export const TEST_DATA = {
  // Sample chat messages
  messages: [
    'Hello, I need help with my account',
    'What are your business hours?',
    'Can you help me reset my password?',
    'How do I upgrade my subscription?',
    'I have a question about billing',
  ],

  // Sample knowledge queries
  queries: [
    'How do I integrate the API?',
    'What is the pricing model?',
    'Do you offer enterprise support?',
    'What are the API rate limits?',
    'How do I handle authentication?',
  ],
};

/**
 * Validate HTTP response
 */
export function validateResponse(response, expectedStatus = 200) {
  return check(response, {
    'status is correct': (r) => r.status === expectedStatus,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'response body exists': (r) => r.body && r.body.length > 0,
  });
}

/**
 * Validate WebSocket connection
 */
export function validateWebSocket(response) {
  return check(response, {
    'WebSocket connected': (r) => r.status === 101,
    'upgrade header present': (r) => r.headers['Upgrade'] === 'websocket',
  });
}

/**
 * Log configuration at test start
 */
export function logConfig() {
  const profile = getLoadProfile();
  console.log('=== k6 Load Testing Configuration ===');
  console.log(`Profile: ${__ENV.LOAD_PROFILE || 'light'}`);
  console.log(`VUs: ${profile.vus}`);
  console.log(`Duration: ${profile.duration}`);
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Realtime URL: ${CONFIG.realtimeUrl}`);
  console.log('=====================================');
}

/**
 * Generate random think time
 */
export function getThinkTime() {
  return THINK_TIME.min + Math.random() * (THINK_TIME.max - THINK_TIME.min);
}

/**
 * Get random message from test data
 */
export function getRandomMessage() {
  return TEST_DATA.messages[Math.floor(Math.random() * TEST_DATA.messages.length)];
}

/**
 * Get random query from test data
 */
export function getRandomQuery() {
  return TEST_DATA.queries[Math.floor(Math.random() * TEST_DATA.queries.length)];
}
