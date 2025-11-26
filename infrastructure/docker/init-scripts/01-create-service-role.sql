-- Create service role user with BYPASSRLS for administrative operations
-- This user is used for tenant registration, system tasks, and admin operations
-- ⚠️ CRITICAL: Use SERVICE_DATABASE_URL only for administrative operations

-- Create service role user
CREATE USER platform_service WITH PASSWORD 'platform_dev_password';

-- Grant connection permissions
GRANT CONNECT ON DATABASE platform TO platform_service;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO platform_service;

-- Grant table permissions (all tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO platform_service;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO platform_service;

-- Grant BYPASSRLS privilege (critical for service operations)
ALTER USER platform_service WITH BYPASSRLS;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO platform_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO platform_service;
