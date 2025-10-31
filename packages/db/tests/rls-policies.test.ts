/**
 * RLS (Row-Level Security) Policy Tests
 *
 * These tests verify that multi-tenant isolation is properly enforced
 * through PostgreSQL Row-Level Security policies.
 *
 * Test Coverage:
 * 1. Tenant isolation - users can't access other tenants' data
 * 2. FORCE RLS enforcement - even superusers must comply
 * 3. Helper function edge cases - NULL, empty string, invalid UUID
 * 4. Cross-table consistency - all 14 tables behave identically
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TEST_TENANT_IDS,
  checkRLSEnabled,
  clearTenantContext,
  getCurrentTenantContext,
  setTenantContext,
  sql, // Use single-connection SQL client from helpers to avoid pooling issues
} from './helpers';

/**
 * Test Setup: Create test tenants and users
 */
beforeAll(async () => {
  // Temporarily disable FORCE RLS to create test data
  await sql`ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users NO FORCE ROW LEVEL SECURITY`;

  // Clean up any existing test data first (ensures deterministic state)
  await sql`DELETE FROM users WHERE tenant_id IN (${TEST_TENANT_IDS.tenant1}, ${TEST_TENANT_IDS.tenant2}, ${TEST_TENANT_IDS.tenant3})`;
  await sql`DELETE FROM tenants WHERE id IN (${TEST_TENANT_IDS.tenant1}, ${TEST_TENANT_IDS.tenant2}, ${TEST_TENANT_IDS.tenant3})`;

  // Create test tenants (api_key is required and must be unique)
  await sql`
    INSERT INTO tenants (id, name, api_key, plan, created_at, updated_at)
    VALUES
      (${TEST_TENANT_IDS.tenant1}, 'Test Tenant 1', 'test_key_tenant1', 'business', NOW(), NOW()),
      (${TEST_TENANT_IDS.tenant2}, 'Test Tenant 2', 'test_key_tenant2', 'business', NOW(), NOW()),
      (${TEST_TENANT_IDS.tenant3}, 'Test Tenant 3', 'test_key_tenant3', 'business', NOW(), NOW())
  `;

  // Create test users for each tenant (password_hash is required)
  await sql`
    INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
    VALUES
      (gen_random_uuid(), ${TEST_TENANT_IDS.tenant1}, 'user1@tenant1.com', 'fake_hash_1', 'User 1', 'owner', NOW(), NOW()),
      (gen_random_uuid(), ${TEST_TENANT_IDS.tenant2}, 'user2@tenant2.com', 'fake_hash_2', 'User 2', 'owner', NOW(), NOW()),
      (gen_random_uuid(), ${TEST_TENANT_IDS.tenant3}, 'user3@tenant3.com', 'fake_hash_3', 'User 3', 'owner', NOW(), NOW())
  `;

  // Re-enable FORCE RLS
  await sql`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`;
});

/**
 * Test Cleanup: Remove test data
 */
afterAll(async () => {
  // Temporarily disable FORCE RLS for cleanup
  await sql`ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users NO FORCE ROW LEVEL SECURITY`;

  // Delete test data
  await sql`DELETE FROM users WHERE tenant_id IN (${TEST_TENANT_IDS.tenant1}, ${TEST_TENANT_IDS.tenant2}, ${TEST_TENANT_IDS.tenant3})`;
  await sql`DELETE FROM tenants WHERE id IN (${TEST_TENANT_IDS.tenant1}, ${TEST_TENANT_IDS.tenant2}, ${TEST_TENANT_IDS.tenant3})`;

  // Re-enable FORCE RLS
  await sql`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`;
});

describe('RLS Configuration', () => {
  it('should have RLS enabled on tenants table', async () => {
    const { enabled, forced } = await checkRLSEnabled('tenants');
    expect(enabled).toBe(true);
    expect(forced).toBe(true);
  });

  it('should have RLS enabled on users table', async () => {
    const { enabled, forced } = await checkRLSEnabled('users');
    expect(enabled).toBe(true);
    expect(forced).toBe(true);
  });

  it('should have RLS enabled on all 14 tenant-scoped tables', async () => {
    const tenantScopedTables = [
      'tenants',
      'users',
      'accounts',
      'auth_sessions',
      'widgets',
      'meetings',
      'sessions',
      'messages',
      'knowledge_documents',
      'knowledge_chunks',
      'cost_events',
      'cost_summaries',
      'budget_alerts',
      'ai_personalities',
    ];

    for (const tableName of tenantScopedTables) {
      const { enabled, forced } = await checkRLSEnabled(tableName);
      expect(enabled, `${tableName} should have RLS enabled`).toBe(true);
      expect(forced, `${tableName} should have FORCE RLS enabled`).toBe(true);
    }
  });
});

describe('Helper Function: get_current_tenant_id()', () => {
  it('should return tenant ID when set', async () => {
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const context = await getCurrentTenantContext();
    expect(context).toBe(TEST_TENANT_IDS.tenant1);
  });

  it('should return null when context is cleared', async () => {
    await clearTenantContext();
    const context = await getCurrentTenantContext();
    expect(context).toBeNull();
  });

  it('should handle empty string correctly', async () => {
    // Set empty string (edge case from migration 002)
    await sql`SET SESSION app.current_tenant_id = ''`;
    const context = await getCurrentTenantContext();
    expect(context).toBeNull(); // Helper function converts empty string to NULL
  });

  it('should return default UUID for invalid context', async () => {
    await clearTenantContext();
    const result = await sql`SELECT get_current_tenant_id() as tenant_id`;
    // Helper function returns 00000000-0000-0000-0000-000000000000 for missing context
    expect(result[0].tenant_id).toBe('00000000-0000-0000-0000-000000000000');
  });
});

describe('Tenant Isolation: SELECT Operations', () => {
  it('should only return data for the current tenant', async () => {
    // Set context to tenant 1
    await setTenantContext(TEST_TENANT_IDS.tenant1);

    // Query users - should only see tenant 1's users
    const users = await sql`SELECT * FROM users`;
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.tenant_id).toBe(TEST_TENANT_IDS.tenant1);
    }
  });

  it('should not return data from other tenants', async () => {
    // Set context to tenant 1
    await setTenantContext(TEST_TENANT_IDS.tenant1);

    // Try to query tenant 2's users - should return 0
    const users = await sql`SELECT * FROM users WHERE tenant_id = ${TEST_TENANT_IDS.tenant2}`;
    expect(users.length).toBe(0);
  });

  it('should return different data for different tenant contexts', async () => {
    // Query as tenant 1
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const tenant1Users = await sql`SELECT COUNT(*) as count FROM users`;
    const tenant1Count = Number.parseInt(tenant1Users[0].count, 10);

    // Query as tenant 2
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const tenant2Users = await sql`SELECT COUNT(*) as count FROM users`;
    const tenant2Count = Number.parseInt(tenant2Users[0].count, 10);

    // Counts should be different (unless by coincidence they're equal)
    // More importantly, verify we're getting tenant-specific data
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const user1 = await sql`SELECT email FROM users LIMIT 1`;
    expect(user1[0].email).toBe('user1@tenant1.com');

    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const user2 = await sql`SELECT email FROM users LIMIT 1`;
    expect(user2[0].email).toBe('user2@tenant2.com');
  });

  it('should return 0 rows when no tenant context is set', async () => {
    // Clear context and verify
    await clearTenantContext();
    const context = await getCurrentTenantContext();
    expect(context).toBeNull();

    // FORCE RLS blocks access without tenant context
    // Note: With empty string, get_current_tenant_id() returns default UUID
    // which won't match any real tenant, so we get 0 rows
    const users = await sql`SELECT * FROM users`;
    expect(users.length).toBe(0);
  });
});

describe('Tenant Isolation: INSERT Operations', () => {
  it('should allow INSERT with tenant context', async () => {
    await setTenantContext(TEST_TENANT_IDS.tenant1);

    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
      VALUES (${userId}, ${TEST_TENANT_IDS.tenant1}, 'test-insert@tenant1.com', 'fake_hash', 'Test User', 'member', NOW(), NOW())
    `;

    // Verify insertion
    const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
    expect(users.length).toBe(1);
    expect(users[0].email).toBe('test-insert@tenant1.com');

    // Cleanup
    await sql`DELETE FROM users WHERE id = ${userId}`;
  });

  it('should enforce tenant_id match on INSERT (WITH CHECK policy)', async () => {
    // INSERT policies have WITH CHECK (tenant_id = get_current_tenant_id())
    // This means you can't insert data for a different tenant
    await setTenantContext(TEST_TENANT_IDS.tenant1);

    // Try to insert for tenant 2 while context is tenant 1 - should FAIL
    const userId = crypto.randomUUID();
    await expect(
      sql`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
        VALUES (${userId}, ${TEST_TENANT_IDS.tenant2}, 'test-cross@tenant2.com', 'fake_hash', 'Test User', 'member', NOW(), NOW())
      `
    ).rejects.toThrow(/row-level security policy/);

    // Verify no insertion occurred
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
    expect(users.length).toBe(0);
  });
});

describe('Tenant Isolation: UPDATE Operations', () => {
  it('should only update rows belonging to current tenant', async () => {
    await setTenantContext(TEST_TENANT_IDS.tenant1);

    // Update tenant 1's user
    await sql`UPDATE users SET name = 'Updated Name' WHERE email = 'user1@tenant1.com'`;

    // Verify update
    const users = await sql`SELECT name FROM users WHERE email = 'user1@tenant1.com'`;
    expect(users[0].name).toBe('Updated Name');

    // Restore original name
    await sql`UPDATE users SET name = 'User 1' WHERE email = 'user1@tenant1.com'`;
  });

  it('should not update rows from other tenants', async () => {
    // First verify tenant 2's user exists and get original name
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const beforeUpdate = await sql`SELECT name FROM users WHERE email = 'user2@tenant2.com'`;
    expect(beforeUpdate.length).toBeGreaterThan(0);
    const originalName = beforeUpdate[0].name;

    // Switch to tenant 1 and try to update tenant 2's user - should affect 0 rows
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const result = await sql`
      UPDATE users
      SET name = 'Hacked Name'
      WHERE email = 'user2@tenant2.com'
    `;

    // PostgreSQL returns affected row count
    expect(result.count).toBe(0);

    // Verify tenant 2's user is unchanged
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const afterUpdate = await sql`SELECT name FROM users WHERE email = 'user2@tenant2.com'`;
    expect(afterUpdate.length).toBeGreaterThan(0);
    expect(afterUpdate[0].name).toBe(originalName);
  });
});

describe('Tenant Isolation: DELETE Operations', () => {
  it('should only delete rows belonging to current tenant', async () => {
    // Create a test user for tenant 1
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const userId = crypto.randomUUID();
    const email = `test-delete-1-${userId.slice(0, 8)}@tenant1.com`;
    await sql`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
      VALUES (${userId}, ${TEST_TENANT_IDS.tenant1}, ${email}, 'fake_hash', 'Test User', 'member', NOW(), NOW())
    `;

    // Delete the user
    await sql`DELETE FROM users WHERE id = ${userId}`;

    // Verify deletion
    const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
    expect(users.length).toBe(0);
  });

  it('should not delete rows from other tenants', async () => {
    // Create a test user for tenant 2 (must match tenant context)
    await setTenantContext(TEST_TENANT_IDS.tenant2);

    // Verify context is correct before INSERT
    const contextBefore = await getCurrentTenantContext();
    expect(contextBefore).toBe(TEST_TENANT_IDS.tenant2);

    const userId = crypto.randomUUID();
    const email = `test-delete-2-${userId.slice(0, 8)}@tenant2.com`;
    await sql`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
      VALUES (${userId}, ${TEST_TENANT_IDS.tenant2}, ${email}, 'fake_hash', 'Test User', 'member', NOW(), NOW())
    `;

    // Verify insertion succeeded
    const insertedUsers = await sql`SELECT * FROM users WHERE id = ${userId}`;
    expect(insertedUsers.length).toBe(1);

    // Switch to tenant 1 and try to delete tenant 2's user
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    const result = await sql`DELETE FROM users WHERE id = ${userId}`;
    expect(result.count).toBe(0);

    // Verify user still exists
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
    expect(users.length).toBe(1);

    // Cleanup
    await sql`DELETE FROM users WHERE id = ${userId}`;
  });
});

describe('FORCE RLS Enforcement', () => {
  it('should block access without tenant context even for superuser', async () => {
    // Clear tenant context
    await clearTenantContext();

    // Verify context is cleared
    const context = await getCurrentTenantContext();
    expect(context).toBeNull();

    // FORCE RLS blocks even superuser access without tenant context
    const users = await sql`SELECT * FROM users`;
    expect(users.length).toBe(0);

    const tenants = await sql`SELECT * FROM tenants`;
    expect(tenants.length).toBe(0);
  });

  it('should require tenant context for all operations', async () => {
    // Clear tenant context
    await clearTenantContext();

    // Verify context is cleared
    const context = await getCurrentTenantContext();
    expect(context).toBeNull();

    // SELECT returns 0 rows
    const selectResult = await sql`SELECT * FROM users`;
    expect(selectResult.length).toBe(0);

    // INSERT with explicit tenant_id but no context - should fail WITH CHECK policy
    const userId = crypto.randomUUID();
    const email = `no-context-${userId.slice(0, 8)}@test.com`;
    await expect(
      sql`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
        VALUES (${userId}, ${TEST_TENANT_IDS.tenant1}, ${email}, 'fake_hash', 'Test User', 'member', NOW(), NOW())
      `
    ).rejects.toThrow(/row-level security policy/);
  });
});

describe('Cross-Table Policy Consistency', () => {
  it('should enforce tenant isolation across all tenant-scoped tables', async () => {
    const tenantScopedTables = [
      'tenants',
      'users',
      'widgets',
      'sessions',
      'messages',
      'cost_events',
    ];

    // Set tenant 1 context and verify multiple times to ensure it sticks
    await setTenantContext(TEST_TENANT_IDS.tenant1);
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
    const context1 = await getCurrentTenantContext();
    expect(context1).toBe(TEST_TENANT_IDS.tenant1);

    // Each table should return tenant 1's data only
    for (const tableName of tenantScopedTables) {
      const rows = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 10`);
      // If rows exist, all should belong to tenant 1
      for (const row of rows) {
        if (tableName === 'tenants') {
          expect(row.id).toBe(TEST_TENANT_IDS.tenant1);
        } else {
          expect(row.tenant_id).toBe(TEST_TENANT_IDS.tenant1);
        }
      }
    }

    // Switch to tenant 2 and verify context changed
    await setTenantContext(TEST_TENANT_IDS.tenant2);
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
    const context2 = await getCurrentTenantContext();
    expect(context2).toBe(TEST_TENANT_IDS.tenant2);

    for (const tableName of tenantScopedTables) {
      const rows = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 10`);
      for (const row of rows) {
        if (tableName === 'tenants') {
          expect(row.id).toBe(TEST_TENANT_IDS.tenant2);
        } else {
          expect(row.tenant_id).toBe(TEST_TENANT_IDS.tenant2);
        }
      }
    }
  });
});

describe('RLS Policy Count', () => {
  it('should have 56 RLS policies (4 per table × 14 tables)', async () => {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public'
    `;

    const policyCount = Number.parseInt(result[0].count, 10);
    // Migration 003 creates 56 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
    // Old policies from 001-002 may still exist, so count should be >= 56
    expect(policyCount).toBeGreaterThanOrEqual(56);
  });

  it('should have 4 policies per tenant-scoped table', async () => {
    const tenantScopedTables = [
      'tenants',
      'users',
      'accounts',
      'auth_sessions',
      'widgets',
      'meetings',
      'sessions',
      'messages',
      'knowledge_documents',
      'knowledge_chunks',
      'cost_events',
      'cost_summaries',
      'budget_alerts',
      'ai_personalities',
    ];

    for (const tableName of tenantScopedTables) {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${tableName}
      `;

      const policyCount = Number.parseInt(result[0].count, 10);
      // Each table should have at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
      expect(policyCount, `${tableName} should have at least 4 policies`).toBeGreaterThanOrEqual(4);
    }
  });
});
