/**
 * Tenant Isolation Tests - Phase 8 Day 4-5
 *
 * **CRITICAL SECURITY TESTS**:
 * These tests verify PostgreSQL RLS policies prevent cross-tenant data access.
 * If any test fails, DO NOT deploy to production.
 *
 * **What We're Testing**:
 * 1. SELECT queries only return data for current tenant
 * 2. INSERT with wrong tenant_id is rejected by RLS WITH CHECK
 * 3. UPDATE cannot modify data from other tenants
 * 4. DELETE cannot remove data from other tenants
 * 5. Session-based queries (users → sessions) respect tenant boundaries
 *
 * Reference: docs/research/10-07-2025/research-10-07-2025.md lines 258-293
 */

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '../../tests/helpers'; // Use single-connection SQL client
import { db } from '../client';
import { messages, sessions, tenants, users } from '../schema';
import { TenantContext } from '../tenant-context';

// Test tenant IDs (use fixed UUIDs for reproducibility)
const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_C_ID = '00000000-0000-0000-0000-000000000003';

// Test user IDs
const USER_A1_ID = '10000000-0000-0000-0000-000000000001';
const USER_A2_ID = '10000000-0000-0000-0000-000000000002';
const USER_B1_ID = '20000000-0000-0000-0000-000000000001';

// Test session IDs
const SESSION_A1_ID = '30000000-0000-0000-0000-000000000001';
const SESSION_A2_ID = '30000000-0000-0000-0000-000000000002';
const SESSION_B1_ID = '40000000-0000-0000-0000-000000000001';

describe('PostgreSQL RLS Tenant Isolation', () => {
  beforeAll(async () => {
    // Temporarily disable FORCE RLS to create test data
    await sql`ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE users NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE sessions NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE messages NO FORCE ROW LEVEL SECURITY`;

    // Clean up any existing test data first (ensures deterministic state)
    await sql`DELETE FROM tenants WHERE id IN (${TENANT_A_ID}, ${TENANT_B_ID}, ${TENANT_C_ID})`;

    // Use raw SQL for reliable test data creation
    // Create test tenants
    await sql`
      INSERT INTO tenants (id, name, api_key, plan, created_at, updated_at)
      VALUES
        (${TENANT_A_ID}, 'Tenant A', 'key-tenant-a', 'business', NOW(), NOW()),
        (${TENANT_B_ID}, 'Tenant B', 'key-tenant-b', 'business', NOW(), NOW()),
        (${TENANT_C_ID}, 'Tenant C', 'key-tenant-c', 'business', NOW(), NOW())
    `;

    // Create test users
    await sql`
      INSERT INTO users (id, tenant_id, email, password_hash, password_algorithm, name, role, created_at, updated_at)
      VALUES
        (${USER_A1_ID}, ${TENANT_A_ID}, 'user1@tenant-a.test', 'dummy', 'argon2id', 'User A1', 'owner', NOW(), NOW()),
        (${USER_A2_ID}, ${TENANT_A_ID}, 'user2@tenant-a.test', 'dummy', 'argon2id', 'User A2', 'owner', NOW(), NOW()),
        (${USER_B1_ID}, ${TENANT_B_ID}, 'user1@tenant-b.test', 'dummy', 'argon2id', 'User B1', 'owner', NOW(), NOW())
    `;

    // Create test sessions (CRITICAL: sessions table has NO updated_at column)
    await sql`
      INSERT INTO sessions (id, tenant_id, mode, created_at)
      VALUES
        (${SESSION_A1_ID}, ${TENANT_A_ID}, 'text', NOW()),
        (${SESSION_A2_ID}, ${TENANT_A_ID}, 'text', NOW()),
        (${SESSION_B1_ID}, ${TENANT_B_ID}, 'text', NOW())
    `;

    // Create test messages (timestamp column has default NOW())
    await sql`
      INSERT INTO messages (session_id, role, content)
      VALUES
        (${SESSION_A1_ID}, 'user', 'Message from Tenant A - User 1'),
        (${SESSION_A2_ID}, 'user', 'Message from Tenant A - User 2'),
        (${SESSION_B1_ID}, 'user', 'Message from Tenant B - User 1')
    `;

    // Re-enable FORCE RLS
    await sql`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE sessions FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE messages FORCE ROW LEVEL SECURITY`;
  });

  afterAll(async () => {
    // Temporarily disable FORCE RLS for cleanup
    await sql`ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE users NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE sessions NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE messages NO FORCE ROW LEVEL SECURITY`;

    // Cleanup test data (cascading deletes will handle users, sessions, and messages)
    // Use raw SQL for reliable cleanup
    await sql`DELETE FROM tenants WHERE id IN (${TENANT_A_ID}, ${TENANT_B_ID}, ${TENANT_C_ID})`;

    // Re-enable FORCE RLS
    await sql`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE users FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE sessions FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE messages FORCE ROW LEVEL SECURITY`;
  });

  describe('SELECT Isolation', () => {
    it('should only return data for current tenant', async () => {
      // Query as Tenant A
      const messagesA = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        return await tx.select().from(messages);
      });

      // Should only see 2 messages from Tenant A
      expect(messagesA.length).toBe(2);
      // Verify isolation via session IDs (messages uses JOIN-based RLS, no tenant_id column)
      expect(messagesA.every((m) => [SESSION_A1_ID, SESSION_A2_ID].includes(m.sessionId))).toBe(true);

      // Query as Tenant B
      const messagesB = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        return await tx.select().from(messages);
      });

      // Should only see 1 message from Tenant B
      expect(messagesB.length).toBe(1);
      // Verify isolation via session ID (messages uses JOIN-based RLS, no tenant_id column)
      expect(messagesB.every((m) => m.sessionId === SESSION_B1_ID)).toBe(true);
    });

    it('should return empty array for tenant with no data', async () => {
      // Query as Tenant C (no messages)
      const messagesC = await TenantContext.withTenant(TENANT_C_ID, async (tx) => {
        return await tx.select().from(messages);
      });

      expect(messagesC.length).toBe(0);
    });

    it('should isolate user queries by tenant', async () => {
      // Query users as Tenant A
      const usersA = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        return await tx.select().from(users);
      });

      // Should see 2 users from Tenant A
      expect(usersA.length).toBe(2);
      expect(usersA.every((u) => u.tenantId === TENANT_A_ID)).toBe(true);

      // Query users as Tenant B
      const usersB = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        return await tx.select().from(users);
      });

      // Should see 1 user from Tenant B
      expect(usersB.length).toBe(1);
      expect(usersB.every((u) => u.tenantId === TENANT_B_ID)).toBe(true);
    });
  });

  describe('INSERT Isolation (WITH CHECK)', () => {
    it('should prevent INSERT with wrong session_id from other tenant', async () => {
      // Attempt to insert message with Tenant B's session while in Tenant A context
      // RLS should block this because SESSION_B1_ID belongs to Tenant B, not Tenant A
      await expect(async () => {
        await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
          await tx.insert(messages).values({
            sessionId: SESSION_B1_ID, // Session belongs to Tenant B!
            role: 'user',
            content: 'Malicious cross-tenant insert',
          });
        });
      }).rejects.toThrow(); // Should throw RLS violation error
    });

    it('should allow INSERT with correct session_id', async () => {
      // Insert message for Tenant A while in Tenant A context
      // Note: messages table uses JOIN-based RLS via sessions.tenant_id (no direct tenant_id column)
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.insert(messages).values({
          sessionId: SESSION_A1_ID, // Use existing session UUID belonging to Tenant A
          role: 'user',
          content: 'Valid tenant insert',
        });
      });

      // Verify insert succeeded
      const messagesA = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        return await tx.select().from(messages).where(eq(messages.content, 'Valid tenant insert'));
      });

      expect(messagesA.length).toBe(1);
      expect(messagesA[0]?.sessionId).toBe(SESSION_A1_ID);

      // Cleanup (must be in tenant context)
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.content, 'Valid tenant insert'));
      });
    });
  });

  describe('UPDATE Isolation', () => {
    it('should prevent UPDATE of other tenant data', async () => {
      // Create a message for Tenant B (must be within tenant context due to RLS)
      const insertedMessage = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        const result = await tx
          .insert(messages)
          .values({
            sessionId: SESSION_B1_ID, // Use existing session UUID belonging to Tenant B
            role: 'user',
            content: 'Original message',
          })
          .returning();
        return result[0];
      });

      // Attempt to update from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx
          .update(messages)
          .set({ content: 'Hacked!' })
          .where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was NOT updated (RLS prevented it)
      // Read as Tenant B (owner) to verify content unchanged
      const message = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        const result = await tx
          .select()
          .from(messages)
          .where(eq(messages.id, insertedMessage!.id));
        return result[0];
      });

      expect(message?.content).toBe('Original message'); // Unchanged

      // Cleanup (must be in tenant context)
      await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });
    });

    it('should allow UPDATE of own tenant data', async () => {
      // Create a message for Tenant A (must be within tenant context due to RLS)
      const insertedMessage = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        const result = await tx
          .insert(messages)
          .values({
            sessionId: SESSION_A2_ID, // Use existing session UUID belonging to Tenant A
            role: 'user',
            content: 'Original message',
          })
          .returning();
        return result[0];
      });

      // Update from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx
          .update(messages)
          .set({ content: 'Updated message' })
          .where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was updated (read as Tenant A)
      const message = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        const result = await tx
          .select()
          .from(messages)
          .where(eq(messages.id, insertedMessage!.id));
        return result[0];
      });

      expect(message?.content).toBe('Updated message');

      // Cleanup (must be in tenant context)
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });
    });
  });

  describe('DELETE Isolation', () => {
    it('should prevent DELETE of other tenant data', async () => {
      // Create a message for Tenant B (must be within tenant context due to RLS)
      const insertedMessage = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        const result = await tx
          .insert(messages)
          .values({
            sessionId: SESSION_B1_ID, // Use existing session UUID belonging to Tenant B
            role: 'user',
            content: 'Message to delete',
          })
          .returning();
        return result[0];
      });

      // Attempt to delete from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message still exists (RLS prevented deletion)
      // Read as Tenant B (owner) to verify message still exists
      const message = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        const result = await tx
          .select()
          .from(messages)
          .where(eq(messages.id, insertedMessage!.id));
        return result[0];
      });

      expect(message).toBeDefined();

      // Cleanup (must be in tenant context)
      await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });
    });

    it('should allow DELETE of own tenant data', async () => {
      // Create a message for Tenant A (must be within tenant context due to RLS)
      const insertedMessage = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        const result = await tx
          .insert(messages)
          .values({
            sessionId: SESSION_A2_ID, // Use existing session UUID belonging to Tenant A
            role: 'user',
            content: 'Message to delete',
          })
          .returning();
        return result[0];
      });

      // Delete from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was deleted (read as Tenant A)
      const message = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        const result = await tx
          .select()
          .from(messages)
          .where(eq(messages.id, insertedMessage!.id));
        return result[0];
      });

      expect(message).toBeUndefined();
    });
  });

  describe('RLS Verification', () => {
    it('should confirm RLS is active on all tenant tables', async () => {
      const status = await TenantContext.verifyRLSActive(TENANT_A_ID);

      expect(status.active).toBe(true);
      expect(status.message).toContain('FORCE');
    });
  });
});
