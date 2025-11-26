-- Migration 019: Phase 12 Week 7 - Knowledge Connector Columns
-- Adds fields needed for external knowledge base synchronization
-- Created: 2025-11-25

-- ==================== KNOWLEDGE DOCUMENTS ====================
-- Add columns for knowledge connector integration

ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text/plain';
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tags JSONB;

-- Add constraint for content_type enum values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_documents_content_type_check') THEN
    ALTER TABLE knowledge_documents ADD CONSTRAINT knowledge_documents_content_type_check
    CHECK (content_type IN ('text/plain', 'text/markdown', 'text/html'));
  END IF;
END $$;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_url ON knowledge_documents(url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_path ON knowledge_documents(path) WHERE path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_author ON knowledge_documents(author) WHERE author IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_parent_id ON knowledge_documents(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tags ON knowledge_documents USING GIN (tags) WHERE tags IS NOT NULL;

-- ==================== KNOWLEDGE CHUNKS ====================
-- Add columns for chunk tracking and tenant RLS

ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS start_offset INTEGER;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS end_offset INTEGER;

-- Backfill tenant_id from documents for existing chunks
UPDATE knowledge_chunks kc
SET tenant_id = kd.tenant_id
FROM knowledge_documents kd
WHERE kc.document_id = kd.id AND kc.tenant_id IS NULL;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant_id ON knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_offsets ON knowledge_chunks(document_id, start_offset, end_offset);

-- ==================== RLS POLICIES FOR NEW COLUMNS ====================
-- Ensure RLS policies cover new columns

-- Note: Existing RLS policies on knowledge_documents and knowledge_chunks should
-- already cover these new columns as they're based on tenant_id filtering.
-- The policies are inherited automatically.

-- Verify table statistics
ANALYZE knowledge_documents, knowledge_chunks;
