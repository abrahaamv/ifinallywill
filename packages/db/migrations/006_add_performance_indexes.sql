-- Migration 006: Add Performance Indexes
-- Created: Phase 2, Week 3 (Production Readiness)
-- Purpose: Optimize query performance for multi-tenant operations and vector search
--
-- Index Strategy:
-- 1. Tenant isolation indexes (tenant_id on all tenant-scoped tables)
-- 2. Foreign key indexes (prevent sequential scans on joins)
-- 3. Frequently queried columns (email, timestamps, status fields)
-- 4. Vector similarity search (pgvector IVFFlat index)
--
-- Performance Impact:
-- - Tenant isolation queries: 10-100x faster (O(log n) vs O(n))
-- - JOIN operations: 5-50x faster (indexed lookups vs sequential scans)
-- - Vector search: 100-1000x faster (approximate nearest neighbor vs full scan)
--
-- Index Naming Convention: idx_{table}_{column(s)}

-- ==================== TENANT ISOLATION INDEXES ====================
-- These indexes are CRITICAL for RLS policy performance
-- Without them, every RLS check does a sequential scan

-- Tenants table (self-referential, but useful for lookups)
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email); -- Composite for login
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Accounts table (OAuth providers)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id); -- OAuth lookup

-- Auth sessions table
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires); -- Cleanup expired sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_token ON auth_sessions(session_token); -- Fast session lookup

-- Verification tokens table (not tenant-scoped but needs indexes)
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires); -- Cleanup

-- ==================== WIDGET INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id ON widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widgets_active ON widgets(is_active);
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_active ON widgets(tenant_id, is_active); -- Filter active widgets per tenant

-- ==================== MEETING INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_meetings_tenant_id ON meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by); -- Creator lookup
CREATE INDEX IF NOT EXISTS idx_meetings_started_at ON meetings(started_at DESC); -- Recent meetings
CREATE INDEX IF NOT EXISTS idx_meetings_room_name ON meetings(room_name); -- Room name lookup
CREATE INDEX IF NOT EXISTS idx_meetings_livekit_room_id ON meetings(livekit_room_id); -- LiveKit room lookup

-- ==================== SESSION INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_meeting_id ON sessions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_sessions_widget_id ON sessions(widget_id); -- Widget lookup
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(mode); -- Filter by mode (text/meeting)
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC); -- Recent sessions
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at); -- Ended sessions

-- ==================== MESSAGE INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp ON messages(session_id, timestamp DESC); -- Session timeline
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC); -- Recent messages

-- ==================== KNOWLEDGE INDEXES ====================
-- Documents
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant_id ON knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON knowledge_documents(category); -- Filter by category
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant_category ON knowledge_documents(tenant_id, category); -- Category per tenant
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC); -- Recent documents

-- Chunks (vector embeddings)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_position ON knowledge_chunks(document_id, position); -- Order within document

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
-- This index is CRITICAL for RAG performance (100-1000x speedup)
-- IVFFlat parameters:
-- - lists: Number of clusters (sqrt(total_rows) is a good default, using 100 for <10K docs)
-- - vector_cosine_ops: Cosine similarity (matches Voyage embeddings metric)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: After creating IVFFlat index, run VACUUM ANALYZE for optimal performance
-- Also, IVFFlat is approximate - consider pgvector HNSW for exact search if needed

-- ==================== COST TRACKING INDEXES ====================
-- Cost events
CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_id ON cost_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_events_session_id ON cost_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cost_events_provider ON cost_events(provider);
CREATE INDEX IF NOT EXISTS idx_cost_events_service ON cost_events(service); -- Filter by service type
CREATE INDEX IF NOT EXISTS idx_cost_events_timestamp ON cost_events(timestamp DESC); -- Recent costs
CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_timestamp ON cost_events(tenant_id, timestamp DESC); -- Tenant cost history

-- Cost summaries
CREATE INDEX IF NOT EXISTS idx_cost_summaries_tenant_id ON cost_summaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_summaries_period_start ON cost_summaries(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_cost_summaries_tenant_period ON cost_summaries(tenant_id, period_start DESC); -- Tenant cost trends

-- Budget alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_tenant_id ON budget_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_resolved ON budget_alerts(resolved); -- Filter resolved/unresolved
CREATE INDEX IF NOT EXISTS idx_budget_alerts_tenant_resolved ON budget_alerts(tenant_id, resolved); -- Unresolved alerts per tenant
CREATE INDEX IF NOT EXISTS idx_budget_alerts_triggered_at ON budget_alerts(triggered_at DESC); -- Recent alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_severity ON budget_alerts(severity); -- Filter by severity

-- ==================== AI PERSONALITIES INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_ai_personalities_tenant_id ON ai_personalities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_personalities_active ON ai_personalities(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_personalities_tenant_active ON ai_personalities(tenant_id, is_active); -- Available personalities

-- ==================== VERIFICATION & STATISTICS ====================

-- Count indexes created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

  RAISE NOTICE 'Migration 006 complete: % performance indexes created', index_count;
END $$;

-- Display index sizes for monitoring
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (schemaname, indexname)
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verify vector index was created successfully
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_knowledge_chunks_embedding';

-- ==================== POST-MIGRATION RECOMMENDATIONS ====================
-- Run these commands after applying this migration:
--
-- 1. Analyze tables for query planner:
--    ANALYZE tenants, users, sessions, messages, knowledge_chunks, cost_events;
--
-- 2. Vacuum analyze for IVFFlat index:
--    VACUUM ANALYZE knowledge_chunks;
--
-- 3. Monitor index usage:
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;
--
-- 4. Check for unused indexes:
--    SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public';
