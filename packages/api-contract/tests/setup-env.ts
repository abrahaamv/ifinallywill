/**
 * Test Environment Setup
 *
 * Sets environment variables BEFORE any test files are loaded.
 * This is critical for modules like livekit that check env at load time.
 */

// LiveKit configuration (required by livekit.ts router)
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'test_api_key';
process.env.LIVEKIT_API_SECRET = 'test_api_secret';

// Database configuration (for tests that need it)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

console.log('✅ Test environment variables configured');
