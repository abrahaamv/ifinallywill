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
import { db } from '../client';
import { messages, sessions, users } from '../schema';
import { TenantContext } from '../tenant-context';

// Test tenant IDs (use fixed UUIDs for reproducibility)
const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_C_ID = '00000000-0000-0000-0000-000000000003';

// Test user IDs
const USER_A1_ID = '10000000-0000-0000-0000-000000000001';
const USER_A2_ID = '10000000-0000-0000-0000-000000000002';
const USER_B1_ID = '20000000-0000-0000-0000-000000000001';

describe('PostgreSQL RLS Tenant Isolation', () => {
  beforeAll(async () => {
    // Create test tenants
    await db.insert(db.query.tenants).values([
      { id: TENANT_A_ID, name: 'Tenant A', domain: 'tenant-a.test' },
      { id: TENANT_B_ID, name: 'Tenant B', domain: 'tenant-b.test' },
      { id: TENANT_C_ID, name: 'Tenant C', domain: 'tenant-c.test' },
    ]);

    // Create test users (NOT using withTenant - direct insert for setup)
    // In production, user creation would be done by superuser role
    await db.insert(users).values([
      {
        id: USER_A1_ID,
        tenantId: TENANT_A_ID,
        email: 'user1@tenant-a.test',
        name: 'User A1',
        passwordHash: 'dummy',
        passwordAlgorithm: 'argon2id',
      },
      {
        id: USER_A2_ID,
        tenantId: TENANT_A_ID,
        email: 'user2@tenant-a.test',
        name: 'User A2',
        passwordHash: 'dummy',
        passwordAlgorithm: 'argon2id',
      },
      {
        id: USER_B1_ID,
        tenantId: TENANT_B_ID,
        email: 'user1@tenant-b.test',
        name: 'User B1',
        passwordHash: 'dummy',
        passwordAlgorithm: 'argon2id',
      },
    ]);

    // Create test messages for each tenant
    await db.insert(messages).values([
      {
        tenantId: TENANT_A_ID,
        sessionId: 'session-a1',
        userId: USER_A1_ID,
        role: 'user',
        content: 'Message from Tenant A - User 1',
      },
      {
        tenantId: TENANT_A_ID,
        sessionId: 'session-a2',
        userId: USER_A2_ID,
        role: 'user',
        content: 'Message from Tenant A - User 2',
      },
      {
        tenantId: TENANT_B_ID,
        sessionId: 'session-b1',
        userId: USER_B1_ID,
        role: 'user',
        content: 'Message from Tenant B - User 1',
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(messages).where(eq(messages.tenantId, TENANT_A_ID));
    await db.delete(messages).where(eq(messages.tenantId, TENANT_B_ID));
    await db.delete(users).where(eq(users.id, USER_A1_ID));
    await db.delete(users).where(eq(users.id, USER_A2_ID));
    await db.delete(users).where(eq(users.id, USER_B1_ID));
    await db.delete(db.query.tenants).where(eq(db.query.tenants.id, TENANT_A_ID));
    await db.delete(db.query.tenants).where(eq(db.query.tenants.id, TENANT_B_ID));
    await db.delete(db.query.tenants).where(eq(db.query.tenants.id, TENANT_C_ID));
  });

  describe('SELECT Isolation', () => {
    it('should only return data for current tenant', async () => {
      // Query as Tenant A
      const messagesA = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        return await tx.select().from(messages);
      });

      // Should only see 2 messages from Tenant A
      expect(messagesA.length).toBe(2);
      expect(messagesA.every((m) => m.tenantId === TENANT_A_ID)).toBe(true);

      // Query as Tenant B
      const messagesB = await TenantContext.withTenant(TENANT_B_ID, async (tx) => {
        return await tx.select().from(messages);
      });

      // Should only see 1 message from Tenant B
      expect(messagesB.length).toBe(1);
      expect(messagesB.every((m) => m.tenantId === TENANT_B_ID)).toBe(true);
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
    it('should prevent INSERT with wrong tenant_id', async () => {
      // Attempt to insert message for Tenant B while in Tenant A context
      await expect(async () => {
        await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
          await tx.insert(messages).values({
            tenantId: TENANT_B_ID, // Wrong tenant!
            sessionId: 'malicious-session',
            userId: USER_B1_ID,
            role: 'user',
            content: 'Malicious cross-tenant insert',
          });
        });
      }).rejects.toThrow(); // Should throw RLS violation error
    });

    it('should allow INSERT with correct tenant_id', async () => {
      // Insert message for Tenant A while in Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.insert(messages).values({
          tenantId: TENANT_A_ID, // Correct tenant
          sessionId: 'valid-session',
          userId: USER_A1_ID,
          role: 'user',
          content: 'Valid tenant insert',
        });
      });

      // Verify insert succeeded
      const messagesA = await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        return await tx.select().from(messages).where(eq(messages.content, 'Valid tenant insert'));
      });

      expect(messagesA.length).toBe(1);
      expect(messagesA[0]?.tenantId).toBe(TENANT_A_ID);

      // Cleanup
      await db.delete(messages).where(eq(messages.content, 'Valid tenant insert'));
    });
  });

  describe('UPDATE Isolation', () => {
    it('should prevent UPDATE of other tenant data', async () => {
      // Create a message for Tenant B
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          tenantId: TENANT_B_ID,
          sessionId: 'update-test',
          userId: USER_B1_ID,
          role: 'user',
          content: 'Original message',
        })
        .returning();

      // Attempt to update from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx
          .update(messages)
          .set({ content: 'Hacked!' })
          .where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was NOT updated (RLS prevented it)
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, insertedMessage!.id));

      expect(message?.content).toBe('Original message'); // Unchanged

      // Cleanup
      await db.delete(messages).where(eq(messages.id, insertedMessage!.id));
    });

    it('should allow UPDATE of own tenant data', async () => {
      // Create a message for Tenant A
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          tenantId: TENANT_A_ID,
          sessionId: 'update-test-valid',
          userId: USER_A1_ID,
          role: 'user',
          content: 'Original message',
        })
        .returning();

      // Update from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx
          .update(messages)
          .set({ content: 'Updated message' })
          .where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was updated
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, insertedMessage!.id));

      expect(message?.content).toBe('Updated message');

      // Cleanup
      await db.delete(messages).where(eq(messages.id, insertedMessage!.id));
    });
  });

  describe('DELETE Isolation', () => {
    it('should prevent DELETE of other tenant data', async () => {
      // Create a message for Tenant B
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          tenantId: TENANT_B_ID,
          sessionId: 'delete-test',
          userId: USER_B1_ID,
          role: 'user',
          content: 'Message to delete',
        })
        .returning();

      // Attempt to delete from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message still exists (RLS prevented deletion)
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, insertedMessage!.id));

      expect(message).toBeDefined();

      // Cleanup
      await db.delete(messages).where(eq(messages.id, insertedMessage!.id));
    });

    it('should allow DELETE of own tenant data', async () => {
      // Create a message for Tenant A
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          tenantId: TENANT_A_ID,
          sessionId: 'delete-test-valid',
          userId: USER_A1_ID,
          role: 'user',
          content: 'Message to delete',
        })
        .returning();

      // Delete from Tenant A context
      await TenantContext.withTenant(TENANT_A_ID, async (tx) => {
        await tx.delete(messages).where(eq(messages.id, insertedMessage!.id));
      });

      // Verify message was deleted
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, insertedMessage!.id));

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
