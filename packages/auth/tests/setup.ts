/**
 * Vitest Setup for Auth Package Tests
 *
 * Configures global test environment and helpers.
 */

import { sql } from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import { afterAll, beforeAll } from 'vitest';

const logger = createModuleLogger('auth-tests');

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Ensure database connection is ready
  try {
    await sql`SELECT 1`;
    logger.info('Database connection established for auth tests');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
});

/**
 * Global cleanup - runs once after all tests
 */
afterAll(async () => {
  // Close database connections
  logger.info('Cleaning up auth test environment');
});
