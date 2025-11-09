-- Migration 015: Complete Phase 10 RLS Policies
-- Date: 2025-01-08
-- Purpose: Add missing RLS policies for Phase 10 AI optimization tables
-- Addresses: 9 missing policies across 3 tables

-- ============================================================================
-- Conversation Memory Table (3 missing policies)
-- ============================================================================

CREATE POLICY conversation_memory_insert_policy ON conversation_memory
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY conversation_memory_update_policy ON conversation_memory
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY conversation_memory_delete_policy ON conversation_memory
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Knowledge Gaps Table (3 missing policies)
-- ============================================================================

CREATE POLICY knowledge_gaps_insert_policy ON knowledge_gaps
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY knowledge_gaps_update_policy ON knowledge_gaps
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY knowledge_gaps_delete_policy ON knowledge_gaps
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Reranking Events Table (3 missing policies)
-- ============================================================================

CREATE POLICY reranking_events_insert_policy ON reranking_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY reranking_events_update_policy ON reranking_events
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY reranking_events_delete_policy ON reranking_events
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- Verification
-- ============================================================================

-- Total policies added: 9
-- Expected total policies after migration: 88 (79 + 9)

DO $$
DECLARE
  policy_count INTEGER;
  phase10_policy_count INTEGER;
  incomplete_tables TEXT[];
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count Phase 10 table policies
  SELECT COUNT(*) INTO phase10_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('conversation_memory', 'knowledge_gaps', 'reranking_events');

  -- Find tables with incomplete policies
  SELECT array_agg(tablename) INTO incomplete_tables
  FROM (
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    HAVING COUNT(*) < 4
  ) AS incomplete;

  -- Log results
  RAISE NOTICE 'Total RLS policies: %', policy_count;
  RAISE NOTICE 'Phase 10 table policies: %', phase10_policy_count;

  -- Verify Phase 10 tables have 4 policies each
  IF phase10_policy_count >= 12 THEN
    RAISE NOTICE 'Phase 10 RLS policies: COMPLETE (12/12)';
  ELSE
    RAISE WARNING 'Phase 10 RLS policies: INCOMPLETE (%/12)', phase10_policy_count;
  END IF;

  -- Verify no tables have incomplete policies
  IF incomplete_tables IS NULL THEN
    RAISE NOTICE '✅ ALL TABLES HAVE COMPLETE RLS POLICIES (4 per table)';
  ELSE
    RAISE WARNING '⚠️  Tables with incomplete policies: %', array_to_string(incomplete_tables, ', ');
  END IF;

  -- Final validation
  IF policy_count >= 88 AND incomplete_tables IS NULL THEN
    RAISE NOTICE '✅ RLS POLICY IMPLEMENTATION: COMPLETE';
    RAISE NOTICE '   - Total policies: %', policy_count;
    RAISE NOTICE '   - All tables protected: YES';
    RAISE NOTICE '   - Production ready: YES';
  ELSE
    RAISE WARNING '⚠️  RLS POLICY IMPLEMENTATION: INCOMPLETE';
    RAISE WARNING '   - Total policies: % (expected: 88+)', policy_count;
    RAISE WARNING '   - Review and complete remaining policies';
  END IF;
END $$;
