/**
 * Vitest setup file for database tests
 *
 * This file runs before all tests and sets up the test environment.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseLogger } from '@platform/shared';
import dotenv from 'dotenv';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { sql } from '../src/client';

const logger = createDatabaseLogger();

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

/**
 * Global test setup - runs once before all tests
 */
beforeAll(async () => {
  // Verify database connection
  try {
    const result = await sql`SELECT 1 as connected`;
    if (!result || result.length === 0) {
      throw new Error('Database connection test failed');
    }
  } catch (error) {
    logger.error('Failed to connect to test database', { error });
    throw error;
  }
});

/**
 * Test isolation - runs before each test
 *
 * NOTE: We don't set a default tenant context here because many tests
 * need to explicitly control the tenant context. Tests that need a context
 * should call setTenantContext() explicitly.
 */
beforeEach(async () => {
  // Reset to empty string to ensure clean state
  // Use simple SET (not SET SESSION) which is scoped to current transaction
  await sql.unsafe("SET app.current_tenant_id = ''");
});

/**
 * Global test teardown - runs once after all tests
 */
afterAll(async () => {
  // Close database connection pool
  await sql.end({ timeout: 5 });
});
