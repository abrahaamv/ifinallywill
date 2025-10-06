-- ==================== FIX RLS POLICIES ====================
-- Fix policies to properly separate INSERT from UPDATE/DELETE
-- Previous policies used FOR ALL which incorrectly applied USING clause to INSERTs

-- Drop all existing policies
DROP POLICY IF EXISTS tenant_select_policy ON tenants;
DROP POLICY IF EXISTS tenant_update_delete_policy ON tenants;
DROP POLICY IF EXISTS tenant_insert_policy ON tenants;
DROP POLICY IF EXISTS user_select_policy ON users;
DROP POLICY IF EXISTS user_update_delete_policy ON users;
DROP POLICY IF EXISTS user_insert_policy ON users;
DROP POLICY IF EXISTS account_select_policy ON accounts;
DROP POLICY IF EXISTS account_update_delete_policy ON accounts;
DROP POLICY IF EXISTS account_insert_policy ON accounts;
DROP POLICY IF EXISTS auth_session_select_policy ON auth_sessions;
DROP POLICY IF EXISTS auth_session_update_delete_policy ON auth_sessions;
DROP POLICY IF EXISTS auth_session_insert_policy ON auth_sessions;
DROP POLICY IF EXISTS widget_select_policy ON widgets;
DROP POLICY IF EXISTS widget_update_delete_policy ON widgets;
DROP POLICY IF EXISTS widget_insert_policy ON widgets;
DROP POLICY IF EXISTS meeting_select_policy ON meetings;
DROP POLICY IF EXISTS meeting_update_delete_policy ON meetings;
DROP POLICY IF EXISTS meeting_insert_policy ON meetings;
DROP POLICY IF EXISTS session_select_policy ON sessions;
DROP POLICY IF EXISTS session_update_delete_policy ON sessions;
DROP POLICY IF EXISTS session_insert_policy ON sessions;
DROP POLICY IF EXISTS message_select_policy ON messages;
DROP POLICY IF EXISTS message_update_delete_policy ON messages;
DROP POLICY IF EXISTS message_insert_policy ON messages;
DROP POLICY IF EXISTS knowledge_doc_select_policy ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_doc_update_delete_policy ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_doc_insert_policy ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_chunk_select_policy ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunk_update_delete_policy ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunk_insert_policy ON knowledge_chunks;
DROP POLICY IF EXISTS cost_event_select_policy ON cost_events;
DROP POLICY IF EXISTS cost_event_update_delete_policy ON cost_events;
DROP POLICY IF EXISTS cost_event_insert_policy ON cost_events;
DROP POLICY IF EXISTS cost_summary_select_policy ON cost_summaries;
DROP POLICY IF EXISTS cost_summary_update_delete_policy ON cost_summaries;
DROP POLICY IF EXISTS cost_summary_insert_policy ON cost_summaries;
DROP POLICY IF EXISTS budget_alert_select_policy ON budget_alerts;
DROP POLICY IF EXISTS budget_alert_update_delete_policy ON budget_alerts;
DROP POLICY IF EXISTS budget_alert_insert_policy ON budget_alerts;
DROP POLICY IF EXISTS ai_personality_select_policy ON ai_personalities;
DROP POLICY IF EXISTS ai_personality_update_delete_policy ON ai_personalities;
DROP POLICY IF EXISTS ai_personality_insert_policy ON ai_personalities;

-- ==================== TENANTS TABLE ====================
CREATE POLICY tenants_select ON tenants FOR SELECT USING (id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY tenants_delete ON tenants FOR DELETE USING (id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== USERS TABLE ====================
CREATE POLICY users_select ON users FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY users_update ON users FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY users_delete ON users FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== ACCOUNTS TABLE ====================
CREATE POLICY accounts_select ON accounts FOR SELECT USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY accounts_insert ON accounts FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY accounts_update ON accounts FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY accounts_delete ON accounts FOR DELETE USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- ==================== AUTH_SESSIONS TABLE ====================
CREATE POLICY auth_sessions_select ON auth_sessions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY auth_sessions_insert ON auth_sessions FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY auth_sessions_update ON auth_sessions FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY auth_sessions_delete ON auth_sessions FOR DELETE USING (user_id IN (SELECT id FROM users WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- ==================== WIDGETS TABLE ====================
CREATE POLICY widgets_select ON widgets FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY widgets_insert ON widgets FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY widgets_update ON widgets FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY widgets_delete ON widgets FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== MEETINGS TABLE ====================
CREATE POLICY meetings_select ON meetings FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY meetings_insert ON meetings FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY meetings_update ON meetings FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY meetings_delete ON meetings FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== SESSIONS TABLE ====================
CREATE POLICY sessions_select ON sessions FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY sessions_update ON sessions FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY sessions_delete ON sessions FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== MESSAGES TABLE ====================
CREATE POLICY messages_select ON messages FOR SELECT USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (session_id IN (SELECT id FROM sessions WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY messages_update ON messages FOR UPDATE USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY messages_delete ON messages FOR DELETE USING (session_id IN (SELECT id FROM sessions WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- ==================== KNOWLEDGE_DOCUMENTS TABLE ====================
CREATE POLICY knowledge_documents_select ON knowledge_documents FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY knowledge_documents_insert ON knowledge_documents FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY knowledge_documents_update ON knowledge_documents FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY knowledge_documents_delete ON knowledge_documents FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== KNOWLEDGE_CHUNKS TABLE ====================
CREATE POLICY knowledge_chunks_select ON knowledge_chunks FOR SELECT USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY knowledge_chunks_insert ON knowledge_chunks FOR INSERT WITH CHECK (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY knowledge_chunks_update ON knowledge_chunks FOR UPDATE USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE POLICY knowledge_chunks_delete ON knowledge_chunks FOR DELETE USING (document_id IN (SELECT id FROM knowledge_documents WHERE tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)));

-- ==================== COST_EVENTS TABLE ====================
CREATE POLICY cost_events_select ON cost_events FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_events_insert ON cost_events FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_events_update ON cost_events FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_events_delete ON cost_events FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== COST_SUMMARIES TABLE ====================
CREATE POLICY cost_summaries_select ON cost_summaries FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_summaries_insert ON cost_summaries FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_summaries_update ON cost_summaries FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY cost_summaries_delete ON cost_summaries FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== BUDGET_ALERTS TABLE ====================
CREATE POLICY budget_alerts_select ON budget_alerts FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY budget_alerts_insert ON budget_alerts FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY budget_alerts_update ON budget_alerts FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY budget_alerts_delete ON budget_alerts FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));

-- ==================== AI_PERSONALITIES TABLE ====================
CREATE POLICY ai_personalities_select ON ai_personalities FOR SELECT USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY ai_personalities_insert ON ai_personalities FOR INSERT WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY ai_personalities_update ON ai_personalities FOR UPDATE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY ai_personalities_delete ON ai_personalities FOR DELETE USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
