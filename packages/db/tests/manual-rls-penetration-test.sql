-- ============================================================================
-- Manual RLS Penetration Testing Script
-- ============================================================================
-- Purpose: Validate PostgreSQL Row-Level Security (RLS) tenant isolation
-- Status: CRITICAL - Must pass before production deployment
-- Reference: docs/deployment/SECURITY_REQUIREMENTS.md line 263
--
-- TEST METHODOLOGY:
-- 1. Attempt cross-tenant data access (should FAIL)
-- 2. Attempt NULL context bypass (should return 0 rows)
-- 3. Attempt superuser bypass (should FAIL with FORCE RLS)
-- 4. Validate all 28 tenant-scoped tables
-- 5. Test SQL injection resistance
--
-- Expected Behavior:
-- - All SELECT queries return ONLY data for current tenant
-- - INSERT/UPDATE/DELETE blocked for wrong tenant_id
-- - FORCE RLS prevents superuser bypass
-- - NULL context returns 0 rows (placeholder UUID has no data)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SETUP: Create test tenants for penetration testing
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'SETUP: Creating test tenants for penetration testing'
\echo '======================================================================'

-- Temporarily disable RLS to create test data
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE widgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events DISABLE ROW LEVEL SECURITY;

-- Clean up any existing penetration test data
DELETE FROM users WHERE tenant_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
DELETE FROM tenants WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Create Tenant A (Victim)
INSERT INTO tenants (id, name, api_key, plan, created_at, updated_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Victim Tenant (Penetration Test)',
  'pentest_victim_key',
  'enterprise',
  NOW(),
  NOW()
);

-- Create Tenant B (Attacker)
INSERT INTO tenants (id, name, api_key, plan, created_at, updated_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Attacker Tenant (Penetration Test)',
  'pentest_attacker_key',
  'business',
  NOW(),
  NOW()
);

-- Create users for Tenant A (sensitive data)
INSERT INTO users (id, tenant_id, email, password_hash, password_algorithm, name, role, created_at, updated_at)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'sensitive@victim-tenant.com',
    '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
    'argon2id',
    'Sensitive User Data',
    'owner',
    NOW(),
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'confidential@victim-tenant.com',
    '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
    'argon2id',
    'Confidential User',
    'admin',
    NOW(),
    NOW()
  );

-- Create users for Tenant B (attacker)
INSERT INTO users (id, tenant_id, email, password_hash, password_algorithm, name, role, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'attacker@attacker-tenant.com',
  '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
  'argon2id',
  'Attacker User',
  'owner',
  NOW(),
  NOW()
);

-- Create sessions for Tenant A
INSERT INTO sessions (id, tenant_id, mode, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'text', NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'text', NOW());

-- Create widgets for Tenant A (sensitive configuration)
INSERT INTO widgets (id, tenant_id, name, config, created_at, updated_at)
VALUES (
  'aw111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Victim Widget',
  '{"api_key": "SENSITIVE_SECRET_KEY_12345"}',
  NOW(),
  NOW()
);

-- Create cost events for Tenant A (financial data)
INSERT INTO cost_events (id, tenant_id, provider, model, input_tokens, output_tokens, cost, metadata, created_at)
VALUES (
  'ac111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'openai',
  'gpt-4o',
  1000,
  500,
  0.05,
  '{"customer_id": "SENSITIVE_CUSTOMER_123"}',
  NOW()
);

-- Re-enable FORCE RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_events FORCE ROW LEVEL SECURITY;

\echo ''
\echo '✅ Test data created successfully'
\echo ''

-- ----------------------------------------------------------------------------
-- TEST 1: Cross-Tenant Data Access Attempt (MUST FAIL)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 1: Cross-Tenant Data Access Attempt'
\echo 'Expected: Attacker (Tenant B) should see 0 rows from Victim (Tenant A)'
\echo '======================================================================'

-- Set context to Attacker (Tenant B)
SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Attempt to query Victim's users
\echo ''
\echo 'TEST 1a: Attempting to read victim users as attacker...'
SELECT
  email,
  name,
  role,
  CASE WHEN tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN '🚨 RLS BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM users
WHERE email LIKE '%victim-tenant.com';
-- Expected: 0 rows (RLS should block access)

\echo ''
\echo 'TEST 1b: Attempting to read victim widgets as attacker...'
SELECT
  name,
  config::text,
  CASE WHEN tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN '🚨 RLS BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM widgets
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: 0 rows (RLS should block access)

\echo ''
\echo 'TEST 1c: Attempting to read victim cost events as attacker...'
SELECT
  provider,
  model,
  cost,
  metadata::text,
  CASE WHEN tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN '🚨 RLS BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM cost_events
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: 0 rows (RLS should block access)

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 2: NULL Context Bypass Attempt (MUST RETURN 0 ROWS)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 2: NULL Context Bypass Attempt'
\echo 'Expected: Queries with no tenant context return 0 rows'
\echo '======================================================================'

-- Clear tenant context
RESET app.current_tenant_id;

\echo ''
\echo 'TEST 2a: Query users without tenant context...'
SELECT
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '🚨 NULL CONTEXT BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM users;
-- Expected: 0 rows (get_current_tenant_id() returns placeholder UUID with no data)

\echo ''
\echo 'TEST 2b: Query tenants without tenant context...'
SELECT
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '🚨 NULL CONTEXT BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM tenants;
-- Expected: 0 rows

\echo ''
\echo 'TEST 2c: Query sessions without tenant context...'
SELECT
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '🚨 NULL CONTEXT BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM sessions;
-- Expected: 0 rows

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 3: INSERT with Wrong Tenant ID (MUST FAIL)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 3: INSERT with Wrong Tenant ID (WITH CHECK Policy)'
\echo 'Expected: INSERT fails with RLS policy violation error'
\echo '======================================================================'

-- Set context to Tenant B (Attacker)
SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo ''
\echo 'TEST 3a: Attempting to INSERT user for Tenant A while in Tenant B context...'
-- This should FAIL with RLS policy violation
INSERT INTO users (id, tenant_id, email, password_hash, password_algorithm, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Victim's tenant_id
  'injected@victim-tenant.com',
  'fake',
  'argon2id',
  'Injected User',
  'owner',
  NOW(),
  NOW()
);
-- Expected: ERROR: new row violates row-level security policy for table "users"

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 4: UPDATE Other Tenant's Data (MUST NOT UPDATE)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 4: UPDATE Other Tenant''s Data'
\echo 'Expected: UPDATE silently does nothing (0 rows affected)'
\echo '======================================================================'

-- Set context to Tenant B (Attacker)
SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo ''
\echo 'TEST 4a: Attempting to UPDATE victim user email as attacker...'
UPDATE users
SET email = 'hacked@attacker-controlled.com'
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: UPDATE 0 (no rows updated due to RLS)

\echo ''
\echo 'TEST 4b: Verifying victim user email unchanged...'
SET app.current_tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT
  email,
  CASE WHEN email LIKE '%hacked%' OR email LIKE '%attacker%' THEN '🚨 UPDATE BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM users
WHERE id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: email = 'sensitive@victim-tenant.com' (unchanged)

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 5: DELETE Other Tenant's Data (MUST NOT DELETE)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 5: DELETE Other Tenant''s Data'
\echo 'Expected: DELETE silently does nothing (0 rows deleted)'
\echo '======================================================================'

-- Set context to Tenant B (Attacker)
SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo ''
\echo 'TEST 5a: Attempting to DELETE victim cost events as attacker...'
DELETE FROM cost_events
WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: DELETE 0 (no rows deleted due to RLS)

\echo ''
\echo 'TEST 5b: Verifying victim cost events still exist...'
SET app.current_tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) = 0 THEN '🚨 DELETE BYPASS DETECTED!' ELSE '✅ RLS Working' END as security_status
FROM cost_events;
-- Expected: row_count = 1 (cost event still exists)

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 6: SQL Injection Resistance
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 6: SQL Injection Resistance'
\echo 'Expected: Malicious SQL injection attempts are blocked'
\echo '======================================================================'

-- Set context to Tenant B (Attacker)
SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo ''
\echo 'TEST 6a: SQL injection attempt via UNION (should return 0 rows)...'
-- Simulate SQL injection attempt
SELECT * FROM users
WHERE email = 'attacker@attacker-tenant.com'
   OR '1'='1' -- Classic SQL injection attempt
   OR tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- Expected: Only rows for Tenant B (RLS filters before OR conditions apply)

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 7: Verify FORCE RLS is Active (Superuser Cannot Bypass)
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 7: FORCE RLS Verification'
\echo 'Expected: All 28 tenant-scoped tables have FORCE RLS enabled'
\echo '======================================================================'

\echo ''
\echo 'Checking FORCE RLS status on all tenant-scoped tables...'
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS force_rls,
  CASE
    WHEN relrowsecurity = false THEN '🚨 RLS DISABLED!'
    WHEN relforcerowsecurity = false THEN '⚠️  FORCE RLS DISABLED (superuser can bypass)'
    ELSE '✅ Fully Protected'
  END as security_status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN (
    'tenants', 'users', 'accounts', 'auth_sessions',
    'widgets', 'meetings', 'sessions', 'messages',
    'knowledge_documents', 'knowledge_chunks',
    'cost_events', 'cost_summaries', 'budget_alerts', 'ai_personalities',
    'api_keys', 'audit_logs', 'data_requests',
    'rag_evaluation_runs', 'rag_evaluations', 'rag_test_sets', 'rag_quality_thresholds',
    'end_users', 'survey_responses', 'unresolved_problems', 'unresolved_problem_users', 'escalations',
    'reranking_events', 'knowledge_gaps', 'conversation_memory'
  )
ORDER BY
  CASE WHEN relrowsecurity = false THEN 1
       WHEN relforcerowsecurity = false THEN 2
       ELSE 3
  END,
  relname;
-- Expected: All tables show rls_enabled=t AND force_rls=t

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 8: Verify RLS Policy Count
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 8: RLS Policy Count Verification'
\echo 'Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)'
\echo '======================================================================'

\echo ''
\echo 'Checking RLS policy count per table...'
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) < 4 THEN '🚨 MISSING POLICIES!'
    WHEN COUNT(*) = 4 THEN '✅ Complete'
    ELSE '⚠️  Extra Policies'
  END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants', 'users', 'accounts', 'auth_sessions',
    'widgets', 'meetings', 'sessions', 'messages',
    'knowledge_documents', 'knowledge_chunks',
    'cost_events', 'cost_summaries', 'budget_alerts', 'ai_personalities',
    'api_keys', 'audit_logs', 'data_requests',
    'rag_evaluation_runs', 'rag_evaluations', 'rag_test_sets', 'rag_quality_thresholds',
    'end_users', 'survey_responses', 'unresolved_problems', 'unresolved_problem_users', 'escalations',
    'reranking_events', 'knowledge_gaps', 'conversation_memory'
  )
GROUP BY tablename
ORDER BY
  CASE WHEN COUNT(*) < 4 THEN 1
       WHEN COUNT(*) > 4 THEN 2
       ELSE 3
  END,
  tablename;
-- Expected: All tables show policy_count=4

\echo ''

-- ----------------------------------------------------------------------------
-- TEST 9: Verify Tenant Context Helper Function
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'TEST 9: get_current_tenant_id() Helper Function'
\echo 'Expected: Function returns correct UUID or placeholder'
\echo '======================================================================'

\echo ''
\echo 'TEST 9a: Helper function with valid tenant context...'
SET app.current_tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT
  get_current_tenant_id() as tenant_id,
  CASE
    WHEN get_current_tenant_id()::text = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN '✅ Correct'
    ELSE '🚨 INCORRECT TENANT ID!'
  END as validation
FROM (SELECT 1) as dummy;
-- Expected: tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

\echo ''
\echo 'TEST 9b: Helper function with cleared context (NULL)...'
RESET app.current_tenant_id;
SELECT
  get_current_tenant_id() as tenant_id,
  CASE
    WHEN get_current_tenant_id()::text = '00000000-0000-0000-0000-000000000000' THEN '✅ Placeholder UUID'
    ELSE '🚨 UNEXPECTED VALUE!'
  END as validation
FROM (SELECT 1) as dummy;
-- Expected: tenant_id = '00000000-0000-0000-0000-000000000000' (placeholder)

\echo ''

-- ----------------------------------------------------------------------------
-- CLEANUP: Remove test data
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'CLEANUP: Removing penetration test data'
\echo '======================================================================'

-- Temporarily disable RLS for cleanup
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE widgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events DISABLE ROW LEVEL SECURITY;

-- Delete penetration test data
DELETE FROM users WHERE tenant_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
DELETE FROM tenants WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Re-enable FORCE RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_events FORCE ROW LEVEL SECURITY;

\echo ''
\echo '✅ Test data cleaned up successfully'
\echo ''

-- ----------------------------------------------------------------------------
-- RESULTS SUMMARY
-- ----------------------------------------------------------------------------
\echo '======================================================================'
\echo 'PENETRATION TEST SUMMARY'
\echo '======================================================================'
\echo ''
\echo 'If all tests passed:'
\echo '  ✅ Cross-tenant data access BLOCKED'
\echo '  ✅ NULL context bypass BLOCKED (returns 0 rows)'
\echo '  ✅ INSERT with wrong tenant_id BLOCKED'
\echo '  ✅ UPDATE other tenant data BLOCKED'
\echo '  ✅ DELETE other tenant data BLOCKED'
\echo '  ✅ SQL injection attempts MITIGATED by RLS'
\echo '  ✅ FORCE RLS enabled on all 28 tables'
\echo '  ✅ All tables have 4 RLS policies (SELECT/INSERT/UPDATE/DELETE)'
\echo '  ✅ get_current_tenant_id() helper function working correctly'
\echo ''
\echo '🎉 RLS TENANT ISOLATION: PRODUCTION READY'
\echo ''
\echo '======================================================================'
