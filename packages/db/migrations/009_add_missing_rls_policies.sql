-- Migration: 009_add_missing_rls_policies.sql
-- Phase 2 Week 3 Day 1: Add RLS policies for Auth.js and other missing tables
--
-- This migration completes RLS coverage for all 14 tenant-scoped tables
-- identified in the test suite (rls-policies.test.ts lines 88-103)
--
-- Missing tables from migration 008:
-- - accounts (Auth.js)
-- - auth_sessions (Auth.js)
-- - verification_tokens (Auth.js - no tenant_id, uses identifier)
-- - widgets
-- - meetings
-- - knowledge_documents
-- - cost_summaries
-- - budget_alerts
-- - ai_personalities

-- =============================================================================
-- STEP 1: Enable RLS on Auth.js tables
-- =============================================================================

-- Accounts table (linked via user_id → users.tenant_id)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO app_user;

-- Auth sessions table (linked via user_id → users.tenant_id)
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO app_user;

-- Verification tokens table (no tenant_id, no isolation needed - public)
-- This table stores email verification tokens and is not tenant-specific
-- No RLS needed, but we enable it for consistency
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON verification_tokens TO app_user;

-- =============================================================================
-- STEP 2: Enable RLS on application tables
-- =============================================================================

-- Widgets table (tenant_id column)
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id ON widgets(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON widgets TO app_user;

-- Meetings table (tenant_id column)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_meetings_tenant_id ON meetings(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON meetings TO app_user;

-- Knowledge documents table (tenant_id column)
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant_id ON knowledge_documents(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_documents TO app_user;

-- Cost summaries table (tenant_id column)
ALTER TABLE cost_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_summaries FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cost_summaries_tenant_id ON cost_summaries(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON cost_summaries TO app_user;

-- Budget alerts table (tenant_id column)
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_budget_alerts_tenant_id ON budget_alerts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_alerts TO app_user;

-- AI personalities table (tenant_id column)
ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personalities FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ai_personalities_tenant_id ON ai_personalities(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_personalities TO app_user;

-- Phase 8 tables (api_keys, audit_logs, data_requests)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO app_user;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO app_user;

ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_data_requests_tenant_id ON data_requests(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON data_requests TO app_user;

-- =============================================================================
-- STEP 3: Create RLS policies
-- =============================================================================

-- Accounts: Tenant isolation via JOIN to users table
CREATE POLICY tenant_isolation_accounts ON accounts
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

-- Auth sessions: Tenant isolation via JOIN to users table
CREATE POLICY tenant_isolation_auth_sessions ON auth_sessions
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

-- Verification tokens: No tenant isolation (public table)
-- Allow all operations without tenant filtering
CREATE POLICY public_access_verification_tokens ON verification_tokens
  FOR ALL TO app_user
  USING (true)
  WITH CHECK (true);

-- Widgets: Direct tenant_id policy
CREATE POLICY tenant_isolation_widgets ON widgets
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Meetings: Direct tenant_id policy
CREATE POLICY tenant_isolation_meetings ON meetings
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Knowledge documents: Direct tenant_id policy
CREATE POLICY tenant_isolation_knowledge_documents ON knowledge_documents
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Cost summaries: Direct tenant_id policy
CREATE POLICY tenant_isolation_cost_summaries ON cost_summaries
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Budget alerts: Direct tenant_id policy
CREATE POLICY tenant_isolation_budget_alerts ON budget_alerts
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- AI personalities: Direct tenant_id policy
CREATE POLICY tenant_isolation_ai_personalities ON ai_personalities
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Phase 8 tables: Direct tenant_id policies
CREATE POLICY tenant_isolation_api_keys ON api_keys
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_data_requests ON data_requests
  FOR ALL TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test 1: Verify all 17 tenant-scoped tables have RLS enabled
-- SELECT tablename, rowsecurity as rls, forcerowsecurity as rlsforce
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenants', 'users', 'accounts', 'auth_sessions', 'widgets', 'meetings',
--     'sessions', 'messages', 'knowledge_documents', 'knowledge_chunks',
--     'cost_events', 'cost_summaries', 'budget_alerts', 'ai_personalities',
--     'api_keys', 'audit_logs', 'data_requests'
--   )
-- ORDER BY tablename;

-- Test 2: Count policies (should have 68 total: 17 tables × 4 policies each)
-- SELECT COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Test 3: Verify indexes on tenant_id
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%_tenant_id'
-- ORDER BY tablename;
