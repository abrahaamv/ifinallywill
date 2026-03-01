-- Create service role user with BYPASSRLS for administrative operations
-- This user is used for tenant registration, system tasks, and admin operations
-- ⚠️ CRITICAL: Use SERVICE_DATABASE_URL only for administrative operations

-- Create service role user
CREATE USER ifinallywill_service WITH PASSWORD 'ifinallywill_dev_password';

-- Grant connection permissions
GRANT CONNECT ON DATABASE ifinallywill TO ifinallywill_service;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO ifinallywill_service;

-- Grant table permissions (all tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ifinallywill_service;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ifinallywill_service;

-- Grant BYPASSRLS privilege (critical for service operations)
ALTER USER ifinallywill_service WITH BYPASSRLS;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ifinallywill_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ifinallywill_service;
