-- Migration 0012: Phase 12 Week 1 - BM25 Full-Text Search Indexes
-- Add tsvector columns and GIN indexes for BM25 keyword search

-- Add tsvector column to knowledge_chunks for full-text search
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_tsv
ON knowledge_chunks USING GIN(content_tsv);

-- Create trigger to auto-update tsvector on content changes
CREATE OR REPLACE FUNCTION update_knowledge_chunks_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv = to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_knowledge_chunks_tsv ON knowledge_chunks;

CREATE TRIGGER trigger_knowledge_chunks_tsv
  BEFORE INSERT OR UPDATE ON knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_chunks_tsv();

-- Backfill existing rows
UPDATE knowledge_chunks
SET content_tsv = to_tsvector('english', content)
WHERE content_tsv IS NULL;

-- Add parent_chunk_id for hierarchical retrieval (Small2Big pattern)
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS parent_chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL;

-- Create index for parent-child lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_parent
ON knowledge_chunks(parent_chunk_id)
WHERE parent_chunk_id IS NOT NULL;

-- Add token_count column for chunk sizing
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Comments
COMMENT ON COLUMN knowledge_chunks.content_tsv IS 'Phase 12 Week 1: Full-text search vector for BM25 ranking';
COMMENT ON COLUMN knowledge_chunks.parent_chunk_id IS 'Phase 12 Week 1: Parent chunk for Small2Big hierarchical retrieval';
COMMENT ON COLUMN knowledge_chunks.token_count IS 'Phase 12 Week 1: Token count for optimal chunk sizing (target 300-400)';
