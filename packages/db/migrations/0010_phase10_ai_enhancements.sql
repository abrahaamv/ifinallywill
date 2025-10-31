-- Migration 0010: Phase 10 AI Enhancements
-- Add tables and columns for prompt caching, reranking, clustering, and memory

-- ============================================================================
-- 1. Cache Statistics Tracking
-- ============================================================================
-- Add cache statistics columns to cost_events table
ALTER TABLE cost_events
ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cache_hit_rate DECIMAL(5, 4) DEFAULT 0.0;

COMMENT ON COLUMN cost_events.cache_write_tokens IS 'Tokens written to cache (Anthropic prompt caching)';
COMMENT ON COLUMN cost_events.cache_read_tokens IS 'Tokens read from cache (Anthropic prompt caching)';
COMMENT ON COLUMN cost_events.cache_hit_rate IS 'Cache hit rate (0.0-1.0)';

-- ============================================================================
-- 2. Reranking Usage Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS reranking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  document_count INTEGER NOT NULL,
  top_n INTEGER NOT NULL,
  model VARCHAR(100) NOT NULL DEFAULT 'rerank-v3.5',
  relevance_scores JSONB NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reranking_events_tenant_id ON reranking_events(tenant_id);
CREATE INDEX idx_reranking_events_session_id ON reranking_events(session_id);
CREATE INDEX idx_reranking_events_created_at ON reranking_events(created_at DESC);

COMMENT ON TABLE reranking_events IS 'Phase 10: Cohere reranking usage tracking';
COMMENT ON COLUMN reranking_events.query IS 'User query that was reranked';
COMMENT ON COLUMN reranking_events.document_count IS 'Number of documents reranked';
COMMENT ON COLUMN reranking_events.top_n IS 'Number of top results returned';
COMMENT ON COLUMN reranking_events.relevance_scores IS 'Array of relevance scores from Cohere';
COMMENT ON COLUMN reranking_events.processing_time_ms IS 'Reranking processing time in milliseconds';

-- ============================================================================
-- 3. Knowledge Gap Detection Results
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cluster_id INTEGER NOT NULL,
  representative_queries JSONB NOT NULL,
  importance DECIMAL(3, 2) NOT NULL,
  suggested_topics JSONB NOT NULL,
  query_count INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'identified',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_gaps_tenant_id ON knowledge_gaps(tenant_id);
CREATE INDEX idx_knowledge_gaps_importance ON knowledge_gaps(importance DESC);
CREATE INDEX idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX idx_knowledge_gaps_created_at ON knowledge_gaps(created_at DESC);

COMMENT ON TABLE knowledge_gaps IS 'Phase 10: DBSCAN clustering knowledge gap detection results';
COMMENT ON COLUMN knowledge_gaps.cluster_id IS 'DBSCAN cluster identifier';
COMMENT ON COLUMN knowledge_gaps.representative_queries IS 'Sample queries from this gap cluster';
COMMENT ON COLUMN knowledge_gaps.importance IS 'Gap importance score (0.0-1.0)';
COMMENT ON COLUMN knowledge_gaps.suggested_topics IS 'Extracted topics to add to knowledge base';
COMMENT ON COLUMN knowledge_gaps.status IS 'Gap status: identified, in_progress, resolved, ignored';

-- ============================================================================
-- 4. Conversation Memory Persistence
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  summary TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_memory_tenant_id ON conversation_memory(tenant_id);
CREATE INDEX idx_conversation_memory_session_id ON conversation_memory(session_id);
CREATE INDEX idx_conversation_memory_last_updated ON conversation_memory(last_updated DESC);

COMMENT ON TABLE conversation_memory IS 'Phase 10: LlamaIndex conversation memory persistence';
COMMENT ON COLUMN conversation_memory.messages IS 'Array of ChatMessage objects from LlamaIndex';
COMMENT ON COLUMN conversation_memory.summary IS 'Conversation summary for long sessions';
COMMENT ON COLUMN conversation_memory.token_count IS 'Estimated token count for memory buffer';

-- ============================================================================
-- 5. Enhanced Cost Tracking
-- ============================================================================
-- Add Phase 10 specific cost event types
ALTER TABLE cost_events
ADD COLUMN IF NOT EXISTS reranking_cost DECIMAL(10, 6) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS memory_cost DECIMAL(10, 6) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS clustering_cost DECIMAL(10, 6) DEFAULT 0.0;

COMMENT ON COLUMN cost_events.reranking_cost IS 'Cohere reranking cost';
COMMENT ON COLUMN cost_events.memory_cost IS 'LlamaIndex memory operations cost';
COMMENT ON COLUMN cost_events.clustering_cost IS 'DBSCAN clustering embedding cost';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE reranking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

-- Force RLS for all operations
ALTER TABLE reranking_events FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps FORCE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory FORCE ROW LEVEL SECURITY;

-- Reranking events policies
CREATE POLICY reranking_events_tenant_isolation ON reranking_events
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Knowledge gaps policies
CREATE POLICY knowledge_gaps_tenant_isolation ON knowledge_gaps
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Conversation memory policies
CREATE POLICY conversation_memory_tenant_isolation ON conversation_memory
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_cache ON cost_events(tenant_id, cache_hit_rate) WHERE cache_hit_rate > 0;
CREATE INDEX IF NOT EXISTS idx_reranking_events_tenant_date ON reranking_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_status ON knowledge_gaps(tenant_id, status, importance DESC);

-- ============================================================================
-- Triggers for Updated Timestamps
-- ============================================================================

-- Update knowledge_gaps updated_at on modification
CREATE OR REPLACE FUNCTION update_knowledge_gaps_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_gaps_timestamp
  BEFORE UPDATE ON knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_gaps_timestamp();

-- Update conversation_memory last_updated on modification
CREATE OR REPLACE FUNCTION update_conversation_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_memory_timestamp
  BEFORE UPDATE ON conversation_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_memory_timestamp();
