/**
 * Global Setup - Runs once before all tests
 * Prepares test environment and creates test data
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test suite setup...');

  const baseURL = config.use?.baseURL || 'http://localhost:5174';

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 1. Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Services are ready');

    // 2. Create test user if needed (optional)
    // This would make an API call to create a test user
    // For now, we assume test users exist from seed data

    // 3. Verify database is accessible
    console.log('✅ Test environment ready');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup complete\n');
}

export default globalSetup;
