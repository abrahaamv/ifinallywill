# Database Migrations

## 📊 Overview

This document describes all database migrations applied to the AI Assistant Platform.

**Migration Tool**: PostgreSQL SQL files (manual execution)
**Schema Manager**: Drizzle Kit for schema push
**Total Migrations**: 5 files
**Status**: All migrations applied ✅

---

## 🗂️ Migration Files

All migration files are located in `packages/db/migrations/`

### Execution Order

```bash
# 1. Push schema (Drizzle Kit)
pnpm db:push

# 2. Apply RLS policies
psql -U platform -d platform -f packages/db/migrations/001_enable_rls.sql
psql -U platform -d platform -f packages/db/migrations/002_fix_rls_policies.sql
psql -U platform -d platform -f packages/db/migrations/003_fix_rls_empty_string.sql

# 3. Seed database (with temporary RLS disable)
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql
pnpm db:seed
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

---

## 📋 Migration Details

### `001_enable_rls.sql` - Initial RLS Setup

**Purpose**: Enable Row-Level Security on all tenant-scoped tables

**Created**: Phase 2, Week 2

**Status**: ⚠️ Superseded by migration 003 (but kept for reference)

**Changes**:
- Enables RLS on 14 tenant-scoped tables
- Enables FORCE RLS (even superusers must comply)
- Creates initial RLS policies using `current_setting('app.current_tenant_id')`

**Key Commands**:
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);
```

**Issues Found**:
- `FOR ALL` policies incorrectly applied USING clause to INSERT operations
- Missing separate INSERT policies with `WITH CHECK` clauses
- Resulted in RLS violations during INSERT operations

---

### `002_fix_rls_policies.sql` - Separate INSERT Policies

**Purpose**: Fix RLS policy structure to properly separate SELECT/INSERT/UPDATE/DELETE

**Created**: Phase 2, Week 2 (during seed debugging)

**Status**: ⚠️ Superseded by migration 003 (but kept for reference)

**Changes**:
- Drops all existing policies
- Creates separate policies for each operation type:
  - `*_select` - SELECT operations with USING clause
  - `*_insert` - INSERT operations with WITH CHECK clause
  - `*_update` - UPDATE operations with USING clause
  - `*_delete` - DELETE operations with USING clause
- Uses COALESCE for missing tenant context

**Key Commands**:
```sql
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT USING (...);
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (true);
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (...);
CREATE POLICY tenants_delete ON tenants FOR DELETE USING (...);
```

**Issues Found**:
- `current_setting('app.current_tenant_id', true)` returns empty string (not NULL)
- `COALESCE(...::uuid, '00000000-0000-0000-0000-000000000000'::uuid)` fails when string is empty
- Error: `invalid input syntax for type uuid: ""`

---

### `003_fix_rls_empty_string.sql` - Production-Ready RLS ✅

**Purpose**: Handle empty string from `current_setting()` and implement helper function

**Created**: Phase 2, Week 2 (final RLS implementation)

**Status**: ✅ **ACTIVE** - Current production policy set

**Changes**:
- Drops all existing policies (from 001 and 002)
- Creates helper function `get_current_tenant_id()` to handle edge cases
- Implements proper RLS policies for all 14 tables
- Each table gets 4 policies: SELECT, INSERT, UPDATE, DELETE

**Helper Function**:
```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Policy Example**:
```sql
CREATE POLICY tenants_select ON tenants
  FOR SELECT
  USING (id = get_current_tenant_id());

CREATE POLICY tenants_insert ON tenants
  FOR INSERT
  WITH CHECK (true);  -- Admin operations and seeding

CREATE POLICY tenants_update ON tenants
  FOR UPDATE
  USING (id = get_current_tenant_id());

CREATE POLICY tenants_delete ON tenants
  FOR DELETE
  USING (id = get_current_tenant_id());
```

**Tables Protected** (14 total):
- tenants, users, accounts, auth_sessions
- widgets, meetings, sessions, messages
- knowledge_documents, knowledge_chunks
- cost_events, cost_summaries, budget_alerts
- ai_personalities

**Result**: 56 policies created (4 per table)

---

### `004_seed_helper.sql` - Disable FORCE RLS for Seeding

**Purpose**: Temporarily disable FORCE RLS to allow database seeding

**Created**: Phase 2, Week 2 (seed script support)

**Status**: ✅ Applied (re-run when reseeding)

**Changes**:
```sql
ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
-- ... for all 14 tables
```

**Why Needed**:
- FORCE RLS blocks ALL operations (even superusers)
- Seeding requires creating records without existing tenant context
- Chicken-and-egg problem: can't set tenant_id before tenant exists

**Usage**:
```bash
# Before seeding
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql

# Run seed
pnpm db:seed

# After seeding (CRITICAL!)
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

**⚠️ SECURITY WARNING**: Never run this in production! Seed data should be created via admin API with proper tenant context.

---

### `005_restore_force_rls.sql` - Restore FORCE RLS

**Purpose**: Re-enable FORCE RLS after seeding completes

**Created**: Phase 2, Week 2 (seed script support)

**Status**: ✅ Applied

**Changes**:
```sql
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
-- ... for all 14 tables
```

**Why Needed**:
- Restores security boundary after seeding
- Ensures even superusers cannot bypass RLS policies
- Required for production-grade multi-tenant security

**⚠️ CRITICAL**: ALWAYS run this after 004_seed_helper.sql!

---

## 🧪 Verification

### Check Migration Status

```sql
-- Verify RLS is enabled
SELECT
  c.relname as table_name,
  CASE WHEN c.relrowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_enabled,
  CASE WHEN c.relforcerowsecurity THEN 'FORCE' ELSE 'Standard' END as rls_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relname;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: 14 tables with RLS enabled, FORCE mode
-- Expected: 56+ policies (4 per table, plus old policies from migrations 001-002)
```

### Test RLS Isolation

```sql
-- Set tenant context
SET app.current_tenant_id = '72cda7ac-9168-41a5-87ad-895ca68d2fd0';

-- Should return only tenant's data
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM users;

-- Reset context
RESET app.current_tenant_id;

-- Should return 0 (FORCE RLS blocks access without tenant context)
SELECT COUNT(*) FROM sessions;  -- Returns: 0
```

---

## 🔄 Rollback Procedures

### Rollback Migration 003 (RLS Policies)

```sql
-- Drop all policies
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
DROP POLICY IF EXISTS tenants_delete ON tenants;
-- ... repeat for all 14 tables

-- Drop helper function
DROP FUNCTION IF EXISTS get_current_tenant_id();

-- Disable RLS
ALTER TABLE tenants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- ... repeat for all 14 tables
```

**⚠️ WARNING**: Only rollback in development! Never disable RLS in production!

---

## 📊 Migration History

| Migration | Date | Status | Breaking Change |
|-----------|------|--------|-----------------|
| 001_enable_rls.sql | 2025-10-06 | Superseded | No |
| 002_fix_rls_policies.sql | 2025-10-06 | Superseded | No |
| 003_fix_rls_empty_string.sql | 2025-10-06 | ✅ Active | No |
| 004_seed_helper.sql | 2025-10-06 | ✅ Applied | No |
| 005_restore_force_rls.sql | 2025-10-06 | ✅ Applied | No |

---

## 🔮 Future Migrations

### Planned Improvements

1. **Cleanup Old Policies**
   - Remove duplicate policies from migrations 001-002
   - Standardize policy naming convention
   - Reduce total policy count from 70 to 56

2. **Performance Indexes**
   - Add indexes for RLS policy subqueries
   - Create composite indexes for common query patterns
   - Benchmark policy performance impact

3. **Audit Trail**
   - Add RLS audit logging table
   - Track policy violations and access attempts
   - Compliance reporting

4. **Verification Tokens RLS**
   - Currently no RLS on `verification_tokens` table
   - Decide if RLS needed (tokens are single-use, time-limited)
   - Implement if compliance requires

---

## 🛠️ Development Workflow

### Creating New Migrations

```bash
# 1. Update schema in packages/db/src/schema/
# (Edit *.ts files)

# 2. Push schema changes
pnpm db:push

# 3. Create migration SQL file (if needed)
# packages/db/migrations/006_your_migration.sql

# 4. Apply migration
psql -U platform -d platform -f packages/db/migrations/006_your_migration.sql

# 5. Verify changes
psql -U platform -d platform -c "\d table_name"
```

### Migration Best Practices

1. **Always Test Locally First**: Never apply untested migrations to production
2. **Backup Before Migration**: `pg_dump` before applying any migration
3. **Idempotent Migrations**: Use `IF EXISTS` and `IF NOT EXISTS`
4. **Document Breaking Changes**: Note any API or schema breaking changes
5. **Version Control**: All migrations committed to git
6. **Rollback Plan**: Always have a tested rollback procedure

---

## 📚 References

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle Kit Push](https://orm.drizzle.team/kit-docs/overview#prototyping-with-db-push)
- [Migration Best Practices](https://www.prisma.io/docs/guides/database/production-troubleshooting)

---

**Next**: See `rls-policies.md` for detailed RLS policy documentation and `database.md` for complete schema reference.
