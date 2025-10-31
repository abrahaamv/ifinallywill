/**
 * Test Setup (Phase 3 - Week 3.1)
 *
 * Global test configuration and utilities for RLS integration tests
 *
 * CRITICAL: Import env setup FIRST to configure environment before any test modules load
 */
import './setup-env';

import { resolve } from 'node:path';
import { db, sql } from '@platform/db';
import { config } from 'dotenv';
import { afterAll, beforeAll } from 'vitest';

// Load .env file from project root
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('🧪 Test suite starting...');
  console.log('📊 Database connection initialized');
  console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✅' : 'MISSING ❌');
  console.log('🎥 LIVEKIT_URL:', process.env.LIVEKIT_URL ? 'SET ✅' : 'MISSING ❌');
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  console.log('✅ Test suite complete');
});
