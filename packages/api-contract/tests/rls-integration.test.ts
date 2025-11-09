/**
 * RLS Integration Tests (Phase 3 - Week 3.1)
 *
 * Comprehensive integration tests validating:
 * 1. Multi-tenant isolation across all routers
 * 2. Role-based access control enforcement
 * 3. Request-scoped tenant context (SET LOCAL)
 * 4. Cross-router consistency
 *
 * Test Strategy:
 * - Create two tenants with separate users
 * - Verify each tenant can only access their own data
 * - Test all CRUD operations enforce RLS
 * - Validate role hierarchy (owner > admin > member)
 */

import type { Context } from '@platform/api';
import {
  db,
  knowledgeDocuments,
  messages,
  sessions,
  sql,
  tenants,
  users,
  widgets,
} from '@platform/db';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { knowledgeRouter } from '../src/routers/knowledge';
import { sessionsRouter } from '../src/routers/sessions';
import { usersRouter } from '../src/routers/users';
import { widgetsRouter } from '../src/routers/widgets';

// Test tenant IDs
const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';

// Test user IDs
const USER_A_OWNER_ID = '10000000-0000-0000-0000-000000000001';
const USER_A_ADMIN_ID = '10000000-0000-0000-0000-000000000002';
const USER_A_MEMBER_ID = '10000000-0000-0000-0000-000000000003';
const USER_B_OWNER_ID = '20000000-0000-0000-0000-000000000001';

/**
 * Helper: Create mock context for testing
 */
function createMockContext(
  tenantId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member'
): Context {
  return {
    session: {
      user: {
        id: userId,
        email: `user-${userId}@example.com`,
        name: `Test User ${role}`,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    tenantId,
    userId,
    role,
    db,
  };
}

/**
 * Helper: Set tenant context for RLS
 * Uses set_config() with is_local=false for session-scoped setting
 * This persists across multiple queries/transactions in the same connection
 */
async function setTenantContext(tenantId: string) {
  await sql.unsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`);
}

/**
 * Helper: Reset tenant context
 * Uses set_config() to clear the parameter (session-scoped)
 */
async function resetTenantContext() {
  await sql.unsafe(`SELECT set_config('app.current_tenant_id', '', false)`);
}

describe.skip('RLS Integration Tests (requires real DB)', () => {
  beforeAll(async () => {
    // Temporarily disable RLS for test setup (connection pooling makes session vars unreliable)
    await sql.unsafe(`
			ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
			ALTER TABLE users DISABLE ROW LEVEL SECURITY;
			ALTER TABLE widgets DISABLE ROW LEVEL SECURITY;
			ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY;
			ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
			ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
		`);

    // Clean up any existing test data (RLS is disabled, so no tenant context needed)
    await sql.unsafe(`
			DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}'));
			DELETE FROM sessions WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM knowledge_documents WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM widgets WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM users WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM tenants WHERE id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
		`);

    // Create test tenants
    await db.insert(tenants).values([
      {
        id: TENANT_A_ID,
        name: 'Tenant A Corp',
        apiKey: 'test-key-a',
        plan: 'starter',
      },
      {
        id: TENANT_B_ID,
        name: 'Tenant B Corp',
        apiKey: 'test-key-b',
        plan: 'starter',
      },
    ]);

    // Create test users for Tenant A
    await db.insert(users).values([
      {
        id: USER_A_OWNER_ID,
        tenantId: TENANT_A_ID,
        email: 'owner-a@example.com',
        name: 'Tenant A Owner',
        role: 'owner',
        passwordHash: 'test-hash',
      },
      {
        id: USER_A_ADMIN_ID,
        tenantId: TENANT_A_ID,
        email: 'admin-a@example.com',
        name: 'Tenant A Admin',
        role: 'admin',
        passwordHash: 'test-hash',
      },
      {
        id: USER_A_MEMBER_ID,
        tenantId: TENANT_A_ID,
        email: 'member-a@example.com',
        name: 'Tenant A Member',
        role: 'member',
        passwordHash: 'test-hash',
      },
    ]);

    // Create test user for Tenant B
    await db.insert(users).values({
      id: USER_B_OWNER_ID,
      tenantId: TENANT_B_ID,
      email: 'owner-b@example.com',
      name: 'Tenant B Owner',
      role: 'owner',
      passwordHash: 'test-hash',
    });

    // Re-enable RLS for actual tests
    await sql.unsafe(`
			ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
			ALTER TABLE users ENABLE ROW LEVEL SECURITY;
			ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
			ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
			ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
			ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
		`);
  });

  afterAll(async () => {
    // Disable RLS for cleanup (connection pooling makes session vars unreliable)
    await sql.unsafe(`
			ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
			ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
			ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY;
			ALTER TABLE widgets DISABLE ROW LEVEL SECURITY;
			ALTER TABLE users DISABLE ROW LEVEL SECURITY;
			ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
		`);

    // Clean up test data
    await sql.unsafe(`
			DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}'));
			DELETE FROM sessions WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM knowledge_documents WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM widgets WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM users WHERE tenant_id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
			DELETE FROM tenants WHERE id IN ('${TENANT_A_ID}', '${TENANT_B_ID}');
		`);

    // Re-enable RLS (leave database in clean state)
    await sql.unsafe(`
			ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
			ALTER TABLE users ENABLE ROW LEVEL SECURITY;
			ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
			ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
			ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
			ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
		`);
  });

  beforeEach(async () => {
    await resetTenantContext();
  });

  afterEach(async () => {
    await resetTenantContext();
  });

  describe('Users Router - RLS Isolation', () => {
    it('should only list users from own tenant', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxA = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');

      const result = await usersRouter.createCaller(ctxA).list({ limit: 50, offset: 0 });

      expect(result.total).toBe(3); // Only Tenant A users
      expect(result.users.every((u: any) => u.id.startsWith('10000000'))).toBe(true);
    });

    it('should prevent cross-tenant data access', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to get a Tenant A user while in Tenant B context
      await expect(usersRouter.createCaller(ctxB).get({ id: USER_A_OWNER_ID })).rejects.toThrow(
        'User not found or access denied'
      );
    });

    it('should enforce role-based access for user creation', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxMember = createMockContext(TENANT_A_ID, USER_A_MEMBER_ID, 'member');

      // Member should not be able to create users
      await expect(
        usersRouter.createCaller(ctxMember).create({
          email: 'new-user@example.com',
          name: 'New User',
          role: 'member',
        })
      ).rejects.toThrow('Admin role required');
    });

    it('should allow admin to create users in own tenant', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxAdmin = createMockContext(TENANT_A_ID, USER_A_ADMIN_ID, 'admin');

      const result = await usersRouter.createCaller(ctxAdmin).create({
        email: 'admin-created@example.com',
        name: 'Admin Created User',
        role: 'member',
      });

      expect(result.email).toBe('admin-created@example.com');

      // Cleanup
      await db.delete(users).where(sql`id = ${result.id}`);
    });
  });

  describe('Widgets Router - RLS Isolation', () => {
    let widgetAId: string;
    let widgetBId: string;

    beforeEach(async () => {
      // Create widgets for each tenant
      await setTenantContext(TENANT_A_ID);
      const [widgetA] = await db
        .insert(widgets)
        .values({
          tenantId: TENANT_A_ID,
          name: 'Widget A',
          domainWhitelist: ['https://example-a.com'],
          isActive: true,
        })
        .returning();
      widgetAId = widgetA.id;

      await resetTenantContext();

      await setTenantContext(TENANT_B_ID);
      const [widgetB] = await db
        .insert(widgets)
        .values({
          tenantId: TENANT_B_ID,
          name: 'Widget B',
          domainWhitelist: ['https://example-b.com'],
          isActive: true,
        })
        .returning();
      widgetBId = widgetB.id;

      await resetTenantContext();
    });

    afterEach(async () => {
      await sql.unsafe(`DELETE FROM widgets WHERE id IN ('${widgetAId}', '${widgetBId}')`);
    });

    it('should only list widgets from own tenant', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxA = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');

      const result = await widgetsRouter.createCaller(ctxA).list({ limit: 50, offset: 0 });

      expect(result.total).toBe(1); // Only Tenant A widget
      expect(result.widgets[0].name).toBe('Widget A');
    });

    it('should prevent cross-tenant widget access', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to get Tenant A widget while in Tenant B context
      await expect(widgetsRouter.createCaller(ctxB).get({ id: widgetAId })).rejects.toThrow(
        'Widget not found or access denied'
      );
    });

    it('should prevent cross-tenant widget deletion', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to delete Tenant A widget while in Tenant B context
      await expect(widgetsRouter.createCaller(ctxB).delete({ id: widgetAId })).rejects.toThrow(
        'Widget not found or access denied'
      );
    });
  });

  describe('Knowledge Router - RLS Isolation', () => {
    let docAId: string;
    let docBId: string;

    beforeEach(async () => {
      // Create documents for each tenant
      await setTenantContext(TENANT_A_ID);
      const [docA] = await db
        .insert(knowledgeDocuments)
        .values({
          tenantId: TENANT_A_ID,
          title: 'Document A',
          content: 'Tenant A knowledge',
        })
        .returning();
      docAId = docA.id;

      await resetTenantContext();

      await setTenantContext(TENANT_B_ID);
      const [docB] = await db
        .insert(knowledgeDocuments)
        .values({
          tenantId: TENANT_B_ID,
          title: 'Document B',
          content: 'Tenant B knowledge',
        })
        .returning();
      docBId = docB.id;

      await resetTenantContext();
    });

    afterEach(async () => {
      await sql.unsafe(`DELETE FROM knowledge_documents WHERE id IN ('${docAId}', '${docBId}')`);
    });

    it('should only list documents from own tenant', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxA = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');

      const result = await knowledgeRouter.createCaller(ctxA).list({ limit: 50, offset: 0 });

      expect(result.total).toBe(1); // Only Tenant A document
      expect(result.documents[0].title).toBe('Document A');
    });

    it('should prevent cross-tenant document access', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to get Tenant A document while in Tenant B context
      await expect(knowledgeRouter.createCaller(ctxB).get({ id: docAId })).rejects.toThrow(
        'Document not found or access denied'
      );
    });
  });

  describe('Sessions Router - RLS Isolation', () => {
    let sessionAId: string;
    let sessionBId: string;

    beforeEach(async () => {
      // Create sessions for each tenant
      await setTenantContext(TENANT_A_ID);
      const [sessionA] = await db
        .insert(sessions)
        .values({
          tenantId: TENANT_A_ID,
          mode: 'text',
        })
        .returning();
      sessionAId = sessionA.id;

      await resetTenantContext();

      await setTenantContext(TENANT_B_ID);
      const [sessionB] = await db
        .insert(sessions)
        .values({
          tenantId: TENANT_B_ID,
          mode: 'text',
        })
        .returning();
      sessionBId = sessionB.id;

      await resetTenantContext();
    });

    afterEach(async () => {
      await sql.unsafe(`DELETE FROM sessions WHERE id IN ('${sessionAId}', '${sessionBId}')`);
    });

    it('should only list sessions from own tenant', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxA = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');

      const result = await sessionsRouter.createCaller(ctxA).list({ limit: 50, offset: 0 });

      expect(result.total).toBe(1); // Only Tenant A session
      expect(result.sessions[0].id).toBe(sessionAId);
    });

    it('should prevent cross-tenant session access', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to get Tenant A session while in Tenant B context
      await expect(sessionsRouter.createCaller(ctxB).get({ id: sessionAId })).rejects.toThrow(
        'Session not found or access denied'
      );
    });

    it('should prevent cross-tenant message sending', async () => {
      await setTenantContext(TENANT_B_ID);
      const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');

      // Try to send message to Tenant A session while in Tenant B context
      await expect(
        sessionsRouter.createCaller(ctxB).sendMessage({
          sessionId: sessionAId,
          role: 'user',
          content: 'Test message',
        })
      ).rejects.toThrow('Session not found or access denied');
    });
  });

  describe('Role Hierarchy Enforcement', () => {
    it('should allow owner to perform admin actions', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxOwner = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');

      // Owner should be able to create users (admin action)
      const result = await usersRouter.createCaller(ctxOwner).create({
        email: 'owner-created@example.com',
        name: 'Owner Created User',
        role: 'member',
      });

      expect(result.email).toBe('owner-created@example.com');

      // Cleanup
      await db.delete(users).where(sql`id = ${result.id}`);
    });

    it('should allow admin to create but not delete users', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxAdmin = createMockContext(TENANT_A_ID, USER_A_ADMIN_ID, 'admin');

      // Admin should be able to create users
      const result = await usersRouter.createCaller(ctxAdmin).create({
        email: 'admin-test@example.com',
        name: 'Admin Test User',
        role: 'member',
      });

      expect(result.email).toBe('admin-test@example.com');

      // Admin should NOT be able to delete users (owner only)
      await expect(usersRouter.createCaller(ctxAdmin).delete({ id: result.id })).rejects.toThrow(
        'Owner role required'
      );

      // Cleanup
      await db.delete(users).where(sql`id = ${result.id}`);
    });

    it('should prevent member from performing admin actions', async () => {
      await setTenantContext(TENANT_A_ID);
      const ctxMember = createMockContext(TENANT_A_ID, USER_A_MEMBER_ID, 'member');

      // Member should NOT be able to create widgets (admin action)
      await expect(
        widgetsRouter.createCaller(ctxMember).create({
          name: 'Test Widget',
          domainWhitelist: ['https://example.com'],
        })
      ).rejects.toThrow('Admin role required');
    });
  });

  describe('Request-Scoped Context Isolation', () => {
    it('should isolate tenant context across concurrent requests', async () => {
      // Simulate concurrent requests from different tenants
      const promises = [
        (async () => {
          await setTenantContext(TENANT_A_ID);
          const ctxA = createMockContext(TENANT_A_ID, USER_A_OWNER_ID, 'owner');
          const result = await usersRouter.createCaller(ctxA).list({ limit: 50, offset: 0 });
          return result.total;
        })(),
        (async () => {
          await setTenantContext(TENANT_B_ID);
          const ctxB = createMockContext(TENANT_B_ID, USER_B_OWNER_ID, 'owner');
          const result = await usersRouter.createCaller(ctxB).list({ limit: 50, offset: 0 });
          return result.total;
        })(),
      ];

      const [countA, countB] = await Promise.all(promises);

      // Each tenant should see only their own users
      expect(countA).toBe(3); // Tenant A has 3 users
      expect(countB).toBe(1); // Tenant B has 1 user
    });
  });
});
