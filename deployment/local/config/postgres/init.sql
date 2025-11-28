-- =============================================================================
-- PostgreSQL Initialization Script
-- Runs on first container start only
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- Create application schema (optional, use public for simplicity)
-- CREATE SCHEMA IF NOT EXISTS platform;

-- Set timezone
SET timezone = 'UTC';

-- Create helper function for tenant isolation (RLS)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE platform TO platform;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO platform;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO platform;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully with extensions: uuid-ossp, pgcrypto, vector';
END $$;
