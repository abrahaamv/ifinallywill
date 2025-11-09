-- Migration 017: Secure Chat File Storage
-- Phase 11 Week 5: File upload security with Supabase Storage integration

-- Create chat_files table for secure file metadata storage
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE, -- Storage path: {tenant}/{session}/{timestamp}-{uuid}-{filename}
  file_type TEXT NOT NULL, -- MIME type
  file_size INTEGER NOT NULL, -- Bytes
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Optional: auto-delete after X days
  metadata JSONB
);

-- Enable RLS on chat_files
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files FORCE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY chat_files_tenant_isolation ON chat_files
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Indexes for performance
CREATE INDEX idx_chat_files_tenant_id ON chat_files(tenant_id);
CREATE INDEX idx_chat_files_user_id ON chat_files(user_id);
CREATE INDEX idx_chat_files_session_id ON chat_files(session_id);
CREATE INDEX idx_chat_files_uploaded_at ON chat_files(uploaded_at DESC);
CREATE INDEX idx_chat_files_expires_at ON chat_files(expires_at) WHERE expires_at IS NOT NULL;

-- Comment
COMMENT ON TABLE chat_files IS 'Phase 11 Week 5: Secure file storage metadata with Supabase Storage integration. Files use signed URLs for temporary access.';
