# Row-Level Security (RLS) Policies

## 🔐 Overview

**Purpose**: Enforce multi-tenant data isolation at the PostgreSQL level to prevent catastrophic data leakage.

**Status**: ✅ Implemented and verified (Phase 2 complete)

**Implementation Date**: 2025-10-06

> **🚨 CRITICAL SECURITY WARNING**:
> - Drizzle ORM has **NO automatic tenant filtering** - catastrophic data leakage risk!
> - RLS policies are **MANDATORY** for all tenant-scoped tables
> - FORCE ROW LEVEL SECURITY ensures even superusers cannot bypass policies
> - Session variable `app.current_tenant_id` MUST be set before ANY database query

---

## 📊 Implementation Summary

**Tables Protected**: 14 tenant-scoped tables
**Policies Created**: 70 total (5 per table: SELECT, INSERT, UPDATE, DELETE + old policies)
**RLS Mode**: FORCE (even superusers must comply)
**Helper Function**: `get_current_tenant_id()` handles edge cases
**Verification Status**: ✅ Tested and working

---

## 🛡️ Security Model

### Session Variable

All RLS policies rely on PostgreSQL session variable `app.current_tenant_id`:

```sql
-- Set tenant context (REQUIRED before ANY database query)
SET SESSION app.current_tenant_id = '72cda7ac-9168-41a5-87ad-895ca68d2fd0';

-- Verify current tenant
SELECT current_setting('app.current_tenant_id', true);
```

### Helper Function

```sql
-- Helper function to get tenant ID (converts empty string to NULL, then to placeholder UUID)
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Why This Function?**:
- `current_setting(..., true)` returns empty string (not NULL) when variable is missing
- NULLIF converts empty string to NULL
- COALESCE provides placeholder UUID to prevent errors
- Placeholder UUID won't match any real tenant IDs

---

## 📋 Policy Structure

Each tenant-scoped table has 4 policies (SELECT, INSERT, UPDATE, DELETE):

### Tenants Table

```sql
-- SELECT: Users can only see their own tenant
CREATE POLICY tenants_select ON tenants
  FOR SELECT
  USING (id = get_current_tenant_id());

-- INSERT: Allow creating new tenants (for admin operations and seeding)
CREATE POLICY tenants_insert ON tenants
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only modify own tenant
CREATE POLICY tenants_update ON tenants
  FOR UPDATE
  USING (id = get_current_tenant_id());

-- DELETE: Only delete own tenant
CREATE POLICY tenants_delete ON tenants
  FOR DELETE
  USING (id = get_current_tenant_id());
```

### Direct Tenant-Scoped Tables

Tables with `tenant_id` column: users, widgets, meetings, sessions, knowledge_documents, cost_events, cost_summaries, budget_alerts, ai_personalities

```sql
-- Example: Users table
CREATE POLICY users_select ON users
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY users_insert ON users
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY users_update ON users
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY users_delete ON users
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());
```

### Indirect Tenant-Scoped Tables

Tables tenant-scoped via foreign key relationships: accounts, auth_sessions, messages, knowledge_chunks

```sql
-- Example: Accounts table (via users.tenant_id)
CREATE POLICY accounts_select ON accounts
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE tenant_id = get_current_tenant_id()
  ));

CREATE POLICY accounts_insert ON accounts
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE tenant_id = get_current_tenant_id()
  ));

-- Similar for UPDATE and DELETE...
```

---

## 🗄️ Complete Policy List

### Tables with FORCE RLS Enabled

| Table | Policies | Isolation Method |
|-------|----------|------------------|
| tenants | 4 | Direct (id = tenant_id) |
| users | 4 | Direct (tenant_id) |
| accounts | 4 | Via users.tenant_id |
| auth_sessions | 4 | Via users.tenant_id |
| widgets | 4 | Direct (tenant_id) |
| meetings | 4 | Direct (tenant_id) |
| sessions | 4 | Direct (tenant_id) |
| messages | 4 | Via sessions.tenant_id |
| knowledge_documents | 4 | Direct (tenant_id) |
| knowledge_chunks | 4 | Via knowledge_documents.tenant_id |
| cost_events | 4 | Direct (tenant_id) |
| cost_summaries | 4 | Direct (tenant_id) |
| budget_alerts | 4 | Direct (tenant_id) |
| ai_personalities | 4 | Direct (tenant_id) |

**Total**: 56 policies across 14 tables

**Note**: Additional old policies exist from migration iterations (total 70 policies). These can be cleaned up in a future migration.

---

## 🔧 Middleware Integration

### Backend (Fastify + tRPC)

```typescript
// packages/api/src/middleware/tenant-context.ts
import { db } from "@platform/db";
import { sql } from "drizzle-orm";

export async function setTenantContext(tenantId: string) {
  // Set PostgreSQL session variable for RLS policies
  await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenantId}'`));
}

// Apply to all protected tRPC procedures
export const protectedProcedure = publicProcedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user?.tenantId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // CRITICAL: Set tenant context before ANY database query
    await setTenantContext(ctx.session.user.tenantId);

    return next({
      ctx: {
        ...ctx,
        tenantId: ctx.session.user.tenantId,
      },
    });
  });
```

---

## 🧪 Verification & Testing

### Verify RLS is Enabled

```sql
-- Check RLS status for all tables
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
```

**Expected Output**: All 14 tables show `Enabled` and `FORCE`

### Test Tenant Isolation

```sql
-- Set tenant context
SET app.current_tenant_id = '72cda7ac-9168-41a5-87ad-895ca68d2fd0';

-- Query should only return data for this tenant
SELECT COUNT(*) FROM sessions;  -- Should return only this tenant's sessions
SELECT COUNT(*) FROM users;     -- Should return only this tenant's users

-- Reset context
RESET app.current_tenant_id;

-- Query should return 0 rows (no tenant context = no access)
SELECT COUNT(*) FROM sessions;  -- Should return 0 (FORCE RLS blocks all access)
```

### Test FORCE RLS

```sql
-- Even database superusers cannot bypass FORCE RLS
RESET app.current_tenant_id;
SELECT * FROM sessions;  -- Returns 0 rows (even for superuser!)
```

---

## 🚀 Seeding with RLS

**Problem**: FORCE RLS blocks all operations (even superuser), including seeding.

**Solution**: Temporarily disable FORCE RLS for seeding, then restore:

```bash
# 1. Disable FORCE RLS
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql

# 2. Run seed script
pnpm db:seed

# 3. Restore FORCE RLS
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

See `packages/db/migrations/004_seed_helper.sql` and `005_restore_force_rls.sql` for implementation.

---

## 📁 Migration Files

| File | Purpose |
|------|---------|
| `001_enable_rls.sql` | Initial RLS policies (outdated) |
| `002_fix_rls_policies.sql` | Separate INSERT/UPDATE/DELETE policies |
| `003_fix_rls_empty_string.sql` | Add helper function + proper policies |
| `004_seed_helper.sql` | Temporarily disable FORCE RLS for seeding |
| `005_restore_force_rls.sql` | Restore FORCE RLS after seeding |

**Current State**: Migrations 001-005 applied, migration 003 is the active policy set.

---

## ⚠️ Common Pitfalls

### 1. Missing Tenant Context

```typescript
// ❌ WRONG: Query before setting tenant context
const sessions = await db.query.sessions.findMany();

// ✅ CORRECT: Set tenant context first
await setTenantContext(tenantId);
const sessions = await db.query.sessions.findMany();
```

### 2. Using SET LOCAL Outside Transaction

```typescript
// ❌ WRONG: SET LOCAL outside transaction
await db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
// Results in: WARNING: SET LOCAL can only be used in transaction blocks

// ✅ CORRECT: Use SET SESSION
await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenantId}'`));
```

### 3. Forgetting to Handle Empty String

```sql
-- ❌ WRONG: current_setting returns empty string, not NULL
USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
-- Results in: ERROR: invalid input syntax for type uuid: ""

-- ✅ CORRECT: Use helper function
USING (tenant_id = get_current_tenant_id())
```

---

## 🔄 Future Improvements

1. **Cleanup Old Policies**: Remove duplicate policies from migrations 001-002 (currently 70 policies, should be 56)
2. **Policy Naming**: Standardize policy names (some have old `tenant_isolation_policy` names)
3. **Audit Logging**: Add RLS audit trail for compliance
4. **Performance**: Monitor policy performance impact on queries
5. **Testing**: Automated RLS policy tests in CI/CD

---

## 📚 References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [FORCE ROW LEVEL SECURITY](https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-ROW-LEVEL-SECURITY)
- [Session Variables in PostgreSQL](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)
- [Drizzle ORM Security Guide](https://orm.drizzle.team/docs/rls)

---

**Next**: See `database.md` for complete schema reference and `DATABASE_SETUP.md` for local setup.
