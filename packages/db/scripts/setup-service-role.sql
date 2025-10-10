-- Service Role Setup for Production RLS Bypass
-- This role is used ONLY for administrative operations like user registration
-- that need to bypass RLS policies.
--
-- Industry standard pattern used by Supabase, Firebase, Auth0
--
-- Usage: psql $DATABASE_URL -f packages/db/scripts/setup-service-role.sql

-- Create service role with login capability
CREATE ROLE platform_service WITH LOGIN PASSWORD 'platform_dev_password';

-- Grant schema access
GRANT USAGE ON SCHEMA public TO platform_service;

-- Grant table permissions (all tables in public schema)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO platform_service;

-- Grant sequence permissions (for auto-increment columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO platform_service;

-- Grant permissions on future tables (when new tables are created)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO platform_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO platform_service;

-- CRITICAL: Grant BYPASS RLS privilege
-- This allows the service role to ignore Row-Level Security policies
-- Use ONLY for administrative operations
ALTER ROLE platform_service WITH BYPASSRLS;

-- Disable RLS for this role's connections (redundant but explicit)
ALTER ROLE platform_service SET row_security = off;

-- Verify setup
\echo '✅ Service role created successfully'
\echo '🔒 RLS bypass enabled for platform_service'
\echo '⚠️  Use this role ONLY for admin operations (registration, system tasks)'
\echo ''
\echo 'Connection string:'
\echo 'postgresql://platform_service:platform_dev_password@localhost:5432/platform'
