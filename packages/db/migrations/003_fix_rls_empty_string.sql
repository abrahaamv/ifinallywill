-- Fix RLS policies to handle empty string from current_setting
-- When current_setting() is called with missing_ok=true, it returns empty string (not NULL)
-- We need to use NULLIF to convert empty string to NULL, then COALESCE to provide default

-- Drop all existing policies
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
DROP POLICY IF EXISTS tenants_delete ON tenants;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;
DROP POLICY IF EXISTS accounts_select ON accounts;
DROP POLICY IF EXISTS accounts_insert ON accounts;
DROP POLICY IF EXISTS accounts_update ON accounts;
DROP POLICY IF EXISTS accounts_delete ON accounts;
DROP POLICY IF EXISTS auth_sessions_select ON auth_sessions;
DROP POLICY IF EXISTS auth_sessions_insert ON auth_sessions;
DROP POLICY IF EXISTS auth_sessions_update ON auth_sessions;
DROP POLICY IF EXISTS auth_sessions_delete ON auth_sessions;
DROP POLICY IF EXISTS widgets_select ON widgets;
DROP POLICY IF EXISTS widgets_insert ON widgets;
DROP POLICY IF EXISTS widgets_update ON widgets;
DROP POLICY IF EXISTS widgets_delete ON widgets;
DROP POLICY IF EXISTS meetings_select ON meetings;
DROP POLICY IF EXISTS meetings_insert ON meetings;
DROP POLICY IF EXISTS meetings_update ON meetings;
DROP POLICY IF EXISTS meetings_delete ON meetings;
DROP POLICY IF EXISTS sessions_select ON sessions;
DROP POLICY IF EXISTS sessions_insert ON sessions;
DROP POLICY IF EXISTS sessions_update ON sessions;
DROP POLICY IF EXISTS sessions_delete ON sessions;
DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DROP POLICY IF EXISTS messages_delete ON messages;
DROP POLICY IF EXISTS knowledge_documents_select ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_insert ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_update ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_delete ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_chunks_select ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_insert ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_update ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_delete ON knowledge_chunks;
DROP POLICY IF EXISTS cost_events_select ON cost_events;
DROP POLICY IF EXISTS cost_events_insert ON cost_events;
DROP POLICY IF EXISTS cost_events_update ON cost_events;
DROP POLICY IF EXISTS cost_events_delete ON cost_events;
DROP POLICY IF EXISTS cost_summaries_select ON cost_summaries;
DROP POLICY IF EXISTS cost_summaries_insert ON cost_summaries;
DROP POLICY IF EXISTS cost_summaries_update ON cost_summaries;
DROP POLICY IF EXISTS cost_summaries_delete ON cost_summaries;
DROP POLICY IF EXISTS budget_alerts_select ON budget_alerts;
DROP POLICY IF EXISTS budget_alerts_insert ON budget_alerts;
DROP POLICY IF EXISTS budget_alerts_update ON budget_alerts;
DROP POLICY IF EXISTS budget_alerts_delete ON budget_alerts;
DROP POLICY IF EXISTS ai_personalities_select ON ai_personalities;
DROP POLICY IF EXISTS ai_personalities_insert ON ai_personalities;
DROP POLICY IF EXISTS ai_personalities_update ON ai_personalities;
DROP POLICY IF EXISTS ai_personalities_delete ON ai_personalities;

-- Helper function to get tenant ID (converts empty string to NULL, then to placeholder UUID)
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==================== TENANTS TABLE ====================
CREATE POLICY tenants_select ON tenants FOR SELECT USING (id = get_current_tenant_id());
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (id = get_current_tenant_id());
CREATE POLICY tenants_delete ON tenants FOR DELETE USING (id = get_current_tenant_id());

-- ==================== USERS TABLE ====================
CREATE POLICY users_select ON users FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY users_update ON users FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY users_delete ON users FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== ACCOUNTS TABLE ====================
CREATE POLICY accounts_select ON accounts FOR SELECT USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY accounts_insert ON accounts FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY accounts_update ON accounts FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY accounts_delete ON accounts FOR DELETE USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

-- ==================== AUTH_SESSIONS TABLE ====================
CREATE POLICY auth_sessions_select ON auth_sessions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY auth_sessions_insert ON auth_sessions FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY auth_sessions_update ON auth_sessions FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY auth_sessions_delete ON auth_sessions FOR DELETE USING (user_id IN (SELECT id FROM users WHERE tenant_id = get_current_tenant_id()));

-- ==================== WIDGETS TABLE ====================
CREATE POLICY widgets_select ON widgets FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY widgets_insert ON widgets FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY widgets_update ON widgets FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY widgets_delete ON widgets FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== MEETINGS TABLE ====================
CREATE POLICY meetings_select ON meetings FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY meetings_insert ON meetings FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY meetings_update ON meetings FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY meetings_delete ON meetings FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== SESSIONS TABLE ====================
CREATE POLICY sessions_select ON sessions FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY sessions_update ON sessions FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY sessions_delete ON sessions FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== MESSAGES TABLE ====================
CREATE POLICY messages_select ON messages FOR SELECT USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (session_id IN (SELECT id FROM sessions WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY messages_update ON messages FOR UPDATE USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY messages_delete ON messages FOR DELETE USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = get_current_tenant_id()));

-- ==================== KNOWLEDGE_DOCUMENTS TABLE ====================
CREATE POLICY knowledge_documents_select ON knowledge_documents FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY knowledge_documents_insert ON knowledge_documents FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY knowledge_documents_update ON knowledge_documents FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY knowledge_documents_delete ON knowledge_documents FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== KNOWLEDGE_CHUNKS TABLE ====================
CREATE POLICY knowledge_chunks_select ON knowledge_chunks FOR SELECT USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY knowledge_chunks_insert ON knowledge_chunks FOR INSERT WITH CHECK (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY knowledge_chunks_update ON knowledge_chunks FOR UPDATE USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = get_current_tenant_id()));
CREATE POLICY knowledge_chunks_delete ON knowledge_chunks FOR DELETE USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = get_current_tenant_id()));

-- ==================== COST_EVENTS TABLE ====================
CREATE POLICY cost_events_select ON cost_events FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY cost_events_insert ON cost_events FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY cost_events_update ON cost_events FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY cost_events_delete ON cost_events FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== COST_SUMMARIES TABLE ====================
CREATE POLICY cost_summaries_select ON cost_summaries FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY cost_summaries_insert ON cost_summaries FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY cost_summaries_update ON cost_summaries FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY cost_summaries_delete ON cost_summaries FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== BUDGET_ALERTS TABLE ====================
CREATE POLICY budget_alerts_select ON budget_alerts FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY budget_alerts_insert ON budget_alerts FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY budget_alerts_update ON budget_alerts FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY budget_alerts_delete ON budget_alerts FOR DELETE USING (tenant_id = get_current_tenant_id());

-- ==================== AI_PERSONALITIES TABLE ====================
CREATE POLICY ai_personalities_select ON ai_personalities FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY ai_personalities_insert ON ai_personalities FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY ai_personalities_update ON ai_personalities FOR UPDATE USING (tenant_id = get_current_tenant_id());
CREATE POLICY ai_personalities_delete ON ai_personalities FOR DELETE USING (tenant_id = get_current_tenant_id());
