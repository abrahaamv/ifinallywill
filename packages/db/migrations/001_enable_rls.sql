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
--
-- Note: We create separate policies for SELECT/UPDATE/DELETE (USING) and INSERT (WITH CHECK)
-- to allow flexibility in access control and support seeding/admin operations

-- ==================== TENANTS TABLE ====================
-- SELECT/UPDATE/DELETE: users can only see their own tenant
CREATE POLICY tenant_select_policy ON tenants
  FOR SELECT
  USING (id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_update_delete_policy ON tenants
  FOR ALL
  USING (id = current_setting('app.current_tenant_id', true)::uuid);

-- INSERT: Allow creating new tenants (for admin operations and seeding)
-- In production, this should be restricted to admin role
CREATE POLICY tenant_insert_policy ON tenants
  FOR INSERT
  WITH CHECK (true);

-- ==================== USERS TABLE ====================
-- SELECT/UPDATE/DELETE: filter by tenant_id
CREATE POLICY user_select_policy ON users
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY user_update_delete_policy ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- INSERT: Allow creating users within current tenant context
CREATE POLICY user_insert_policy ON users
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== ACCOUNTS TABLE ====================
-- SELECT/UPDATE/DELETE: via user relationship
CREATE POLICY account_select_policy ON accounts
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY account_update_delete_policy ON accounts
  FOR ALL
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- INSERT: Allow creating accounts for users in current tenant
CREATE POLICY account_insert_policy ON accounts
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- ==================== AUTH SESSIONS TABLE ====================
-- SELECT/UPDATE/DELETE: via user relationship
CREATE POLICY auth_session_select_policy ON auth_sessions
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY auth_session_update_delete_policy ON auth_sessions
  FOR ALL
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- INSERT: Allow creating sessions for users in current tenant
CREATE POLICY auth_session_insert_policy ON auth_sessions
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- ==================== WIDGETS TABLE ====================
CREATE POLICY widget_select_policy ON widgets
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY widget_update_delete_policy ON widgets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY widget_insert_policy ON widgets
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== MEETINGS TABLE ====================
CREATE POLICY meeting_select_policy ON meetings
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY meeting_update_delete_policy ON meetings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY meeting_insert_policy ON meetings
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== SESSIONS TABLE ====================
CREATE POLICY session_select_policy ON sessions
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY session_update_delete_policy ON sessions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY session_insert_policy ON sessions
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== MESSAGES TABLE ====================
CREATE POLICY message_select_policy ON messages
  FOR SELECT
  USING (session_id IN (
    SELECT id FROM sessions WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY message_update_delete_policy ON messages
  FOR ALL
  USING (session_id IN (
    SELECT id FROM sessions WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY message_insert_policy ON messages
  FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- ==================== KNOWLEDGE DOCUMENTS TABLE ====================
CREATE POLICY knowledge_doc_select_policy ON knowledge_documents
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY knowledge_doc_update_delete_policy ON knowledge_documents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY knowledge_doc_insert_policy ON knowledge_documents
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== KNOWLEDGE CHUNKS TABLE ====================
CREATE POLICY knowledge_chunk_select_policy ON knowledge_chunks
  FOR SELECT
  USING (document_id IN (
    SELECT id FROM knowledge_documents WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY knowledge_chunk_update_delete_policy ON knowledge_chunks
  FOR ALL
  USING (document_id IN (
    SELECT id FROM knowledge_documents WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

CREATE POLICY knowledge_chunk_insert_policy ON knowledge_chunks
  FOR INSERT
  WITH CHECK (document_id IN (
    SELECT id FROM knowledge_documents WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- ==================== COST EVENTS TABLE ====================
CREATE POLICY cost_event_select_policy ON cost_events
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY cost_event_update_delete_policy ON cost_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY cost_event_insert_policy ON cost_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== COST SUMMARIES TABLE ====================
CREATE POLICY cost_summary_select_policy ON cost_summaries
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY cost_summary_update_delete_policy ON cost_summaries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY cost_summary_insert_policy ON cost_summaries
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== BUDGET ALERTS TABLE ====================
CREATE POLICY budget_alert_select_policy ON budget_alerts
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY budget_alert_update_delete_policy ON budget_alerts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY budget_alert_insert_policy ON budget_alerts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ==================== AI PERSONALITIES TABLE ====================
CREATE POLICY ai_personality_select_policy ON ai_personalities
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY ai_personality_update_delete_policy ON ai_personalities
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY ai_personality_insert_policy ON ai_personalities
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

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
