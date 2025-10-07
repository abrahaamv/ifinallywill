-- Migration: 008_enable_rls.sql
-- Phase 8 Day 4-5: PostgreSQL Row-Level Security (RLS) for Multi-Tenant Isolation
-- Reference: docs/research/10-07-2025/research-10-07-2025.md lines 194-293
--
-- CRITICAL: Prevents catastrophic data leakage across tenants
-- Drizzle ORM provides ZERO automatic tenant filtering
-- RLS is the only defense-in-depth at database level
--
-- Security Features:
-- - FORCE ROW LEVEL SECURITY prevents table owner bypass
-- - App role with minimal privileges (NOT superuser, NOT owner)
-- - Tenant isolation via app.current_tenant_id session variable
-- - Performance indexes on tenant_id columns
-- - Policies enforce both SELECT and INSERT/UPDATE tenant matching

-- =============================================================================
-- STEP 1: Create application role (NOT superuser, NOT table owner)
-- =============================================================================

-- Drop role if exists (for migration re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    DROP ROLE app_user;
  END IF;
END $$;

-- Create app role with minimal privileges
CREATE ROLE app_user LOGIN PASSWORD 'platform_dev_password';

-- Grant schema access
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant sequence access for UUID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =============================================================================
-- STEP 2: Enable RLS on all tenant-scoped tables
-- =============================================================================

-- Users table (tenant_id column)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;

-- Sessions table (linked via user_id → users.tenant_id)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_user;

-- Messages table (tenant_id column)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO app_user;

-- Knowledge chunks table (tenant_id column)
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant_id ON knowledge_chunks(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_chunks TO app_user;

-- Cost events table (tenant_id column)
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_id ON cost_events(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON cost_events TO app_user;

-- =============================================================================
-- STEP 3: Create RLS policies for tenant isolation
-- =============================================================================

-- Users: Tenant isolation policy
-- USING: Controls which rows are visible in SELECT/UPDATE/DELETE
-- WITH CHECK: Controls which rows can be inserted/updated
CREATE POLICY tenant_isolation_users ON users
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Sessions: Tenant isolation via JOIN to users table
-- Sessions don't have direct tenant_id, but user_id links to users.tenant_id
CREATE POLICY tenant_isolation_sessions ON sessions
  FOR ALL TO app_user
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    )
  );

-- Messages: Tenant isolation policy
CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Knowledge chunks: Tenant isolation policy
CREATE POLICY tenant_isolation_knowledge_chunks ON knowledge_chunks
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Cost events: Tenant isolation policy
CREATE POLICY tenant_isolation_cost_events ON cost_events
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- =============================================================================
-- STEP 4: Tenants table - allow read-only access to own tenant
-- =============================================================================

-- Tenants table doesn't need tenant_id column (it IS the tenants table)
-- Allow app_user to read tenant information but not modify
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
GRANT SELECT ON tenants TO app_user;

-- Tenants: Allow reading own tenant information
CREATE POLICY tenant_self_read ON tenants
  FOR SELECT TO app_user
  USING (id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- =============================================================================
-- VERIFICATION QUERIES (Run manually after migration)
-- =============================================================================

-- Test 1: Verify RLS is enabled with FORCE
-- Expected: All tenant tables show rls=t, rlsforce=t
-- SELECT tablename, rowsecurity as rls, forcerowsecurity as rlsforce
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('users', 'sessions', 'messages', 'knowledge_chunks', 'cost_events', 'tenants')
-- ORDER BY tablename;

-- Test 2: Verify policies exist
-- Expected: One policy per tenant table
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test 3: Verify indexes on tenant_id
-- Expected: idx_*_tenant_id exists for users, messages, knowledge_chunks, cost_events
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%_tenant_id'
-- ORDER BY tablename;

-- =============================================================================
-- ROLLBACK (Emergency Use Only)
-- =============================================================================

-- If migration causes production issues, run this to disable RLS:
-- WARNING: This removes all tenant isolation protections!
--
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_chunks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cost_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- DROP ROLE IF EXISTS app_user;
