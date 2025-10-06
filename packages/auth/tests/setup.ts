/**
 * Vitest Setup for Auth Package Tests
 *
 * Configures global test environment and helpers.
 */

import { beforeAll, afterAll } from 'vitest';
import { sql } from '@platform/db';

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
	// Ensure database connection is ready
	try {
		await sql`SELECT 1`;
		console.log('✅ Database connection established for auth tests');
	} catch (error) {
		console.error('❌ Failed to connect to database:', error);
		throw error;
	}
});

/**
 * Global cleanup - runs once after all tests
 */
afterAll(async () => {
	// Close database connections
	console.log('🧹 Cleaning up auth test environment');
});
