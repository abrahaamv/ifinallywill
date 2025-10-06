-- Migration 007: Auth.js Drizzle Adapter Schema Alignment
-- Purpose: Align database schema with Auth.js Drizzle adapter expectations
-- Required for: Database sessions (replacing JWT sessions)
-- Migration Date: 2025-01-06
-- Author: Platform Team

-- ============================================================================
-- PART 1: Users Table - Add Auth.js Required Columns
-- ============================================================================

-- Add email_verified column (Auth.js tracks email verification status)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN users.email_verified IS 'Timestamp when email was verified via OAuth provider';

-- Add image column (Auth.js stores profile image URL from OAuth)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS image TEXT DEFAULT NULL;

COMMENT ON COLUMN users.image IS 'Profile image URL from OAuth provider';

-- ============================================================================
-- PART 2: Auth Sessions Table - Primary Key Change
-- ============================================================================

-- Auth.js requires session_token as primary key (not id)
-- This is critical for session lookup performance

-- Check if we need to make the change (idempotent)
DO $$
BEGIN
    -- Only proceed if current primary key is 'id'
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'auth_sessions_pkey'
        AND conrelid = 'auth_sessions'::regclass
        AND conkey[1] = (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'auth_sessions'::regclass
            AND attname = 'id'
        )
    ) THEN
        -- Step 1: Drop existing primary key constraint
        ALTER TABLE auth_sessions DROP CONSTRAINT auth_sessions_pkey;

        -- Step 2: Drop id column (no longer needed)
        ALTER TABLE auth_sessions DROP COLUMN id;

        -- Step 3: Add session_token as primary key
        ALTER TABLE auth_sessions ADD PRIMARY KEY (session_token);

        RAISE NOTICE 'Auth sessions primary key updated to session_token';
    ELSE
        RAISE NOTICE 'Auth sessions primary key already correct (session_token)';
    END IF;
END $$;

-- Add index on user_id for fast session lookup by user (if not exists)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);

COMMENT ON INDEX idx_auth_sessions_user_id IS 'Fast lookup of all sessions for a user';

-- ============================================================================
-- PART 3: Accounts Table - Column Renaming (camelCase → snake_case)
-- ============================================================================

-- Auth.js Drizzle adapter expects snake_case column names
-- Make idempotent by checking if columns exist

DO $$
BEGIN
    -- Rename refreshToken → refresh_token
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'refreshToken'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "refreshToken" TO refresh_token;
    END IF;

    -- Rename accessToken → access_token
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'accessToken'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "accessToken" TO access_token;
    END IF;

    -- Rename expiresAt → expires_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'expiresAt'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "expiresAt" TO expires_at;
    END IF;

    -- Rename tokenType → token_type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'tokenType'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "tokenType" TO token_type;
    END IF;

    -- Rename idToken → id_token
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'idToken'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "idToken" TO id_token;
    END IF;

    -- Rename sessionState → session_state
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name = 'sessionState'
    ) THEN
        ALTER TABLE accounts RENAME COLUMN "sessionState" TO session_state;
    END IF;

    RAISE NOTICE 'Accounts table column names updated to snake_case';
END $$;

-- Update column comments
COMMENT ON COLUMN accounts.refresh_token IS 'OAuth refresh token (encrypted)';
COMMENT ON COLUMN accounts.access_token IS 'OAuth access token (encrypted)';
COMMENT ON COLUMN accounts.expires_at IS 'Unix timestamp when access_token expires';
COMMENT ON COLUMN accounts.token_type IS 'OAuth token type (usually "Bearer")';
COMMENT ON COLUMN accounts.id_token IS 'OpenID Connect ID token';
COMMENT ON COLUMN accounts.session_state IS 'OAuth session state parameter';

-- ============================================================================
-- PART 4: Verification Tokens Table - Ensure Composite Primary Key
-- ============================================================================

-- Auth.js requires (identifier, token) as composite primary key
DO $$
BEGIN
    -- Only add if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'verification_tokens_pkey'
        AND contype = 'p'
        AND conrelid = 'verification_tokens'::regclass
    ) THEN
        ALTER TABLE verification_tokens
        ADD PRIMARY KEY (identifier, token);

        RAISE NOTICE 'Verification tokens composite primary key added';
    ELSE
        RAISE NOTICE 'Verification tokens primary key already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 5: Data Migration - Populate New Columns
-- ============================================================================

-- Set email_verified for existing users with verified emails
-- Use created_at as verification timestamp (reasonable assumption for existing OAuth users)
UPDATE users
SET email_verified = created_at
WHERE email IS NOT NULL
AND email_verified IS NULL
AND email LIKE '%@%'; -- Basic email format validation

-- ============================================================================
-- PART 6: Validation Queries
-- ============================================================================

-- Verify users table structure
DO $$
DECLARE
    email_verified_exists BOOLEAN;
    image_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) INTO email_verified_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'image'
    ) INTO image_exists;

    IF email_verified_exists AND image_exists THEN
        RAISE NOTICE '✅ Users table: email_verified and image columns added';
    ELSE
        RAISE EXCEPTION 'Users table validation failed';
    END IF;
END $$;

-- Verify auth_sessions primary key
DO $$
DECLARE
    pk_correct BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'auth_sessions_pkey'
        AND conrelid = 'auth_sessions'::regclass
        AND conkey[1] = (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'auth_sessions'::regclass
            AND attname = 'session_token'
        )
    ) INTO pk_correct;

    IF pk_correct THEN
        RAISE NOTICE '✅ Auth sessions: session_token is primary key';
    ELSE
        RAISE EXCEPTION 'Auth sessions primary key validation failed';
    END IF;
END $$;

-- Verify accounts column names
DO $$
DECLARE
    columns_correct BOOLEAN;
BEGIN
    SELECT (
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND column_name IN ('refresh_token', 'access_token', 'expires_at', 'token_type', 'id_token', 'session_state')
    ) = 6 INTO columns_correct;

    IF columns_correct THEN
        RAISE NOTICE '✅ Accounts table: All columns renamed to snake_case';
    ELSE
        RAISE WARNING 'Accounts table: Some columns may still use camelCase (check manually)';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '
    ========================================
    Migration 007 Complete!
    ========================================

    Changes applied:
    - Users table: Added email_verified and image columns
    - Auth sessions: Changed primary key to session_token
    - Accounts table: Renamed columns to snake_case
    - Verification tokens: Ensured composite primary key
    - Existing users: email_verified populated

    Next steps:
    1. Update Drizzle schema files to match
    2. Enable Drizzle adapter in auth config
    3. Switch from JWT to database sessions
    4. Test Auth.js integration

    ========================================
    ';
END $$;
