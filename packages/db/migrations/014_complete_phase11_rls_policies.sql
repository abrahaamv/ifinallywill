-- Migration 014: Complete Phase 11 RLS Policies
-- Date: 2025-01-08
-- Purpose: Add missing RLS policies for Phase 11 end-user engagement tables
-- Addresses: 15 missing policies across 5 tables

-- ============================================================================
-- End Users Table (3 missing policies)
-- ============================================================================

CREATE POLICY end_users_insert_policy ON end_users
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY end_users_update_policy ON end_users
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY end_users_delete_policy ON end_users
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Escalations Table (3 missing policies)
-- ============================================================================

CREATE POLICY escalations_insert_policy ON escalations
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY escalations_update_policy ON escalations
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY escalations_delete_policy ON escalations
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Survey Responses Table (3 missing policies)
-- ============================================================================

CREATE POLICY survey_responses_insert_policy ON survey_responses
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY survey_responses_update_policy ON survey_responses
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY survey_responses_delete_policy ON survey_responses
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Unresolved Problem Users Table (3 missing policies)
-- Special case: Uses foreign key relationship to unresolved_problems for isolation
-- ============================================================================

CREATE POLICY unresolved_problem_users_insert_policy ON unresolved_problem_users
  FOR INSERT
  WITH CHECK (problem_id IN (
    SELECT id FROM unresolved_problems
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY unresolved_problem_users_update_policy ON unresolved_problem_users
  FOR UPDATE
  USING (problem_id IN (
    SELECT id FROM unresolved_problems
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ))
  WITH CHECK (problem_id IN (
    SELECT id FROM unresolved_problems
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY unresolved_problem_users_delete_policy ON unresolved_problem_users
  FOR DELETE
  USING (problem_id IN (
    SELECT id FROM unresolved_problems
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

-- ============================================================================
-- Unresolved Problems Table (3 missing policies)
-- ============================================================================

CREATE POLICY unresolved_problems_insert_policy ON unresolved_problems
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY unresolved_problems_update_policy ON unresolved_problems
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY unresolved_problems_delete_policy ON unresolved_problems
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Verification
-- ============================================================================

-- Total policies added: 15
-- Expected total policies after migration: 79 (64 + 15)

DO $$
DECLARE
  policy_count INTEGER;
  phase11_policy_count INTEGER;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count Phase 11 table policies
  SELECT COUNT(*) INTO phase11_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('end_users', 'escalations', 'survey_responses', 'unresolved_problem_users', 'unresolved_problems');

  -- Log results
  RAISE NOTICE 'Total RLS policies: %', policy_count;
  RAISE NOTICE 'Phase 11 table policies: %', phase11_policy_count;

  -- Verify Phase 11 tables have 4 policies each
  IF phase11_policy_count >= 20 THEN
    RAISE NOTICE 'Phase 11 RLS policies: COMPLETE (20/20)';
  ELSE
    RAISE WARNING 'Phase 11 RLS policies: INCOMPLETE (%/20)', phase11_policy_count;
  END IF;
END $$;
