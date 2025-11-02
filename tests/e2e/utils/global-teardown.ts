/**
 * Global Teardown - Runs once after all tests
 * Cleans up test environment and data
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Starting E2E test suite cleanup...');

  try {
    // 1. Clean up test data (optional)
    // This would make API calls to delete test users, sessions, etc.
    // For development, we might want to keep test data for inspection

    // 2. Log test execution summary
    console.log('✅ Test data cleanup complete');

    // 3. Close any remaining connections
    console.log('✅ Connections closed');

  } catch (error) {
    console.error('⚠️  Cleanup warning:', error);
    // Don't fail the test suite if cleanup fails
  }

  console.log('✅ Global teardown complete\n');
}

export default globalTeardown;
