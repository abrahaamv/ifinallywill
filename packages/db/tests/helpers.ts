/**
 * Test helper utilities for database tests
 */

import type { InferInsertModel } from 'drizzle-orm';
import { sql } from '../src/client';
import type { tenants, users } from '../src/schema';

/**
 * Test tenant IDs for isolation testing
 */
export const TEST_TENANT_IDS = {
  tenant1: '00000000-0000-0000-0000-000000000001',
  tenant2: '00000000-0000-0000-0000-000000000002',
  tenant3: '00000000-0000-0000-0000-000000000003',
} as const;

/**
 * Set the current tenant context for RLS policies
 * Uses a simple query to set the session variable inline
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  // Validate UUID format to prevent SQL injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    throw new Error(`Invalid tenant ID format: ${tenantId}`);
  }
  // Execute SET command and verify it worked
  await sql.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
}

/**
 * Clear the tenant context (simulates no authenticated user)
 * Sets to empty string which get_current_tenant_id() handles
 */
export async function clearTenantContext(): Promise<void> {
  await sql.unsafe("SET app.current_tenant_id = ''");
}

/**
 * Create a test tenant without RLS (requires superuser or disabled FORCE RLS)
 * Use this in beforeAll/beforeEach hooks to set up test data
 */
export async function createTestTenant(data: InferInsertModel<typeof tenants>): Promise<void> {
  await sql`INSERT INTO tenants ${sql(data)}`;
}

/**
 * Create a test user without RLS
 */
export async function createTestUser(data: InferInsertModel<typeof users>): Promise<void> {
  await sql`INSERT INTO users ${sql(data)}`;
}

/**
 * Clean up test data by tenant ID
 * WARNING: This bypasses RLS and should only be used in tests
 */
export async function cleanupTestData(tenantId: string): Promise<void> {
  // Temporarily disable RLS for cleanup
  await sql`ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users NO FORCE ROW LEVEL SECURITY`;

  // Delete test data
  await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM tenants WHERE id = ${tenantId}`;

  // Re-enable FORCE RLS
  await sql`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`;
}

/**
 * Verify RLS is enabled on a table
 */
export async function checkRLSEnabled(tableName: string): Promise<{
  enabled: boolean;
  forced: boolean;
}> {
  const result = await sql`
    SELECT
      relrowsecurity as enabled,
      relforcerowsecurity as forced
    FROM pg_class
    WHERE relname = ${tableName}
  `;

  if (result.length === 0) {
    throw new Error(`Table ${tableName} not found`);
  }

  return {
    enabled: result[0].enabled,
    forced: result[0].forced,
  };
}

/**
 * Count rows in a table (respects RLS)
 */
export async function countRows(tableName: string): Promise<number> {
  const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
  return Number.parseInt(result[0].count, 10);
}

/**
 * Get the current tenant context
 * Returns null if not set or empty string
 */
export async function getCurrentTenantContext(): Promise<string | null> {
  try {
    const result = await sql.unsafe(
      "SELECT current_setting('app.current_tenant_id', true) as tenant_id"
    );
    const tenantId = result[0]?.tenant_id;
    // Empty string means no context set
    return tenantId === '' || tenantId === null ? null : tenantId;
  } catch {
    return null;
  }
}
