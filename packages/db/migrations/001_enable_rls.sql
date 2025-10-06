-- ==================== ENABLE RLS ====================
-- Enable Row-Level Security on all tenant-scoped tables
-- CRITICAL: This prevents catastrophic data leakage in multi-tenant architecture

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY;

-- ==================== FORCE RLS ====================
-- CRITICAL: Force RLS even for table owners (PostgreSQL superusers)
-- This ensures NO ONE can bypass tenant isolation, not even superusers

ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE meetings FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_events FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_personalities FORCE ROW LEVEL SECURITY;

-- ==================== CREATE RLS POLICIES ====================
-- All policies use current_setting('app.current_tenant_id') to filter by tenant
-- This session variable MUST be set by middleware before any database query

-- Tenants table: users can only see their own tenant
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);

-- Users table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Accounts table: via user relationship
CREATE POLICY tenant_isolation_policy ON accounts
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Auth sessions table: via user relationship
CREATE POLICY tenant_isolation_policy ON auth_sessions
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Widgets table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON widgets
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Meetings table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON meetings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Sessions table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Messages table: via session relationship
CREATE POLICY tenant_isolation_policy ON messages
  USING (session_id IN (
    SELECT id FROM sessions WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Knowledge documents table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON knowledge_documents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Knowledge chunks table: via document relationship
CREATE POLICY tenant_isolation_policy ON knowledge_chunks
  USING (document_id IN (
    SELECT id FROM knowledge_documents WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- Cost events table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON cost_events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Cost summaries table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON cost_summaries
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Budget alerts table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON budget_alerts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- AI personalities table: filter by tenant_id
CREATE POLICY tenant_isolation_policy ON ai_personalities
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ==================== VERIFICATION QUERIES ====================
-- Use these to verify RLS policies are working correctly:
--
-- 1. Test tenant 1 isolation:
--    SET app.current_tenant_id = '<tenant-1-uuid>';
--    SELECT * FROM sessions;  -- Should only return tenant-1 sessions
--
-- 2. Test tenant 2 isolation:
--    SET app.current_tenant_id = '<tenant-2-uuid>';
--    SELECT * FROM sessions;  -- Should only return tenant-2 sessions
--
-- 3. Test FORCE RLS (even superuser cannot bypass):
--    RESET app.current_tenant_id;
--    SELECT * FROM sessions;  -- Should return 0 rows (no tenant context)
