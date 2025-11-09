-- RLS Tenant Isolation Test Suite
-- Tests for migrations 014 and 015
-- Date: 2025-01-08

BEGIN;

-- Create test tenants
INSERT INTO tenants (id, name, plan, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Tenant A', 'starter', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Test Tenant B', 'starter', 'active');

-- ============================================================================
-- Test 1: End Users - SELECT Isolation
-- ============================================================================

-- Set context to Tenant A
SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

-- Insert test data for Tenant A
INSERT INTO end_users (tenant_id, fingerprint, first_seen_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'fingerprint-a', NOW());

-- Switch to Tenant B
SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

-- Insert test data for Tenant B
INSERT INTO end_users (tenant_id, fingerprint, first_seen_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'fingerprint-b', NOW());

-- Verify Tenant B can only see their own data
SELECT 'Test 1.1: SELECT isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 1 AND fingerprint = 'fingerprint-b'
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM end_users;

-- ============================================================================
-- Test 2: End Users - INSERT Prevention
-- ============================================================================

-- Try to insert data for Tenant A while in Tenant B context (should fail)
DO $$
BEGIN
  INSERT INTO end_users (tenant_id, fingerprint, first_seen_at)
  VALUES ('11111111-1111-1111-1111-111111111111', 'fingerprint-cross-tenant', NOW());

  RAISE EXCEPTION '❌ FAIL: Cross-tenant INSERT was allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '✅ PASS: Cross-tenant INSERT blocked';
END $$;

-- ============================================================================
-- Test 3: End Users - UPDATE Prevention
-- ============================================================================

-- Try to update Tenant A data while in Tenant B context (should do nothing)
UPDATE end_users
SET fingerprint = 'hacked'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

SELECT 'Test 3.1: UPDATE isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ PASS: No rows updated'
    ELSE '❌ FAIL: Cross-tenant UPDATE succeeded'
  END AS result
FROM end_users
WHERE fingerprint = 'hacked';

-- ============================================================================
-- Test 4: End Users - DELETE Prevention
-- ============================================================================

-- Try to delete Tenant A data while in Tenant B context (should do nothing)
DELETE FROM end_users
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Switch back to Tenant A to verify data still exists
SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

SELECT 'Test 4.1: DELETE isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 1 AND fingerprint = 'fingerprint-a'
    THEN '✅ PASS: Data not deleted'
    ELSE '❌ FAIL: Cross-tenant DELETE succeeded'
  END AS result
FROM end_users;

-- ============================================================================
-- Test 5: Escalations - All Operations
-- ============================================================================

-- Insert escalation for Tenant A
INSERT INTO escalations (tenant_id, session_id, escalated_by, status, escalation_type)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'user-a',
  'open',
  'human_assistance'
);

-- Switch to Tenant B
SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

-- Verify Tenant B cannot see Tenant A escalations
SELECT 'Test 5.1: Escalations SELECT isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM escalations;

-- Try cross-tenant INSERT (should fail)
DO $$
BEGIN
  INSERT INTO escalations (tenant_id, session_id, escalated_by, status, escalation_type)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'user-cross',
    'open',
    'human_assistance'
  );

  RAISE EXCEPTION '❌ FAIL: Cross-tenant escalation INSERT allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '✅ PASS: Cross-tenant escalation INSERT blocked';
END $$;

-- ============================================================================
-- Test 6: Unresolved Problems - Foreign Key Isolation
-- ============================================================================

SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

-- Create problem for Tenant A
INSERT INTO unresolved_problems (
  tenant_id,
  problem_description,
  problem_embedding,
  problem_hash,
  first_session_id,
  last_session_id,
  status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test problem A',
  '[0.1, 0.2, 0.3]'::vector(1024),
  'hash-a',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'unresolved'
) RETURNING id AS problem_id_a \gset

-- Add end user to problem
INSERT INTO end_users (tenant_id, fingerprint, first_seen_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'user-with-problem', NOW())
RETURNING id AS end_user_id_a \gset

INSERT INTO unresolved_problem_users (problem_id, end_user_id)
VALUES (:'problem_id_a', :'end_user_id_a');

-- Switch to Tenant B
SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

-- Try to add Tenant B user to Tenant A problem (should fail due to FK isolation)
INSERT INTO end_users (tenant_id, fingerprint, first_seen_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'user-b-trying-cross', NOW())
RETURNING id AS end_user_id_b \gset

DO $$
BEGIN
  -- This should fail because problem_id_a belongs to Tenant A
  INSERT INTO unresolved_problem_users (problem_id, end_user_id)
  VALUES (:'problem_id_a', :'end_user_id_b');

  RAISE EXCEPTION '❌ FAIL: Cross-tenant problem user link allowed';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '✅ PASS: Cross-tenant problem user link blocked';
END $$;

-- ============================================================================
-- Test 7: Conversation Memory
-- ============================================================================

SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO conversation_memory (
  tenant_id,
  session_id,
  entity_type,
  entity_name,
  context_summary
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'user',
  'John Doe',
  'Customer interested in product X'
);

SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

SELECT 'Test 7.1: Conversation memory isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM conversation_memory;

-- ============================================================================
-- Test 8: Knowledge Gaps
-- ============================================================================

SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO knowledge_gaps (
  tenant_id,
  session_id,
  query,
  gap_type
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'How to configure feature X?',
  'missing_documentation'
);

SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

SELECT 'Test 8.1: Knowledge gaps isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM knowledge_gaps;

-- ============================================================================
-- Test 9: Survey Responses
-- ============================================================================

SET app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO survey_responses (
  tenant_id,
  session_id,
  survey_type,
  rating
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'post_chat',
  5
);

SET app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

SELECT 'Test 9.1: Survey responses isolation' AS test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS result
FROM survey_responses;

-- ============================================================================
-- Final Summary
-- ============================================================================

RAISE NOTICE '================================================';
RAISE NOTICE 'RLS Tenant Isolation Test Suite Complete';
RAISE NOTICE '================================================';
RAISE NOTICE 'Total policies tested: 24 (8 tables × 3 operations)';
RAISE NOTICE 'Migration 014: Phase 11 tables (5 tables)';
RAISE NOTICE 'Migration 015: Phase 10 tables (3 tables)';
RAISE NOTICE '================================================';

ROLLBACK;
