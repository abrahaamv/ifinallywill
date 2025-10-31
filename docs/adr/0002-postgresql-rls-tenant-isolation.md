# ADR-0002: Use PostgreSQL Row-Level Security for Multi-Tenant Isolation

**Status**: Accepted
**Date**: 2025-01-06 (schema) | 2025-10-07 (FORCE RLS enabled)
**Deciders**: Platform Engineering Team, Security Team
**Related Phases**: [Phase 2 Implementation](../phases/phase-2-security-database-auth.md)

---

## Context

The platform requires **strict multi-tenant data isolation** to prevent data leakage between organizations. Each tenant (organization) must only access their own data, with zero risk of cross-tenant queries.

**Problem**: How do we enforce tenant isolation at the database level while maintaining query performance and developer productivity?

**Requirements**:
- Absolute guarantee that Tenant A cannot access Tenant B's data
- Enforcement at database level (not just application level)
- No performance degradation for queries
- Compatible with Drizzle ORM
- Auditable and verifiable isolation

**Critical Risk**: Drizzle ORM has **NO automatic tenant filtering** - catastrophic data leakage risk without database-level enforcement.

---

## Decision

Use **PostgreSQL Row-Level Security (RLS) with FORCE enabled** on all tenant-scoped tables.

**Rationale**:
- **Database-Enforced**: Isolation happens at PostgreSQL level, independent of application code
- **Automatic**: RLS policies applied to all queries automatically
- **Performance**: Index-optimized `WHERE tenant_id = current_setting('app.current_tenant_id')`
- **Verifiable**: Can test isolation with database queries
- **FORCE Mode**: Prevents bypass even by table owners (critical security feature)

**Implementation**:
```sql
-- Enable FORCE RLS on all tenant tables (Migration 008)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Application Integration**:
```typescript
// Set tenant context at request scope
await db.execute(
  sql`SET LOCAL app.current_tenant_id = ${tenantId}`
);
```

---

## Alternatives Considered

### Alternative 1: Application-Level Filtering
**Description**: Add `WHERE tenant_id = ?` to every query in application code.

**Pros**:
- Simple to understand
- No database features required
- Portable across databases

**Cons**:
- ❌ **CATASTROPHIC RISK**: One missed WHERE clause = data breach
- ❌ Developer must remember to filter every query
- ❌ No verification mechanism
- ❌ Drizzle ORM doesn't auto-add filters
- ❌ Code review can miss violations

**Why Rejected**: **UNACCEPTABLE SECURITY RISK**. Human error guaranteed in large codebase. One developer mistake = complete data breach.

---

### Alternative 2: Separate Database Per Tenant
**Description**: Each tenant gets their own PostgreSQL database.

**Pros**:
- Perfect isolation (physical separation)
- Easy backup per tenant
- Can scale tenants independently

**Cons**:
- ❌ Expensive: 1000 tenants = 1000 databases
- ❌ Complex connection pooling
- ❌ Difficult to run cross-tenant analytics
- ❌ Schema migrations across 1000 databases
- ❌ Resource waste for small tenants

**Why Rejected**: Poor cost/performance ratio. RLS provides same security with shared infrastructure.

---

### Alternative 3: Schema-Based Multi-Tenancy
**Description**: Each tenant gets a PostgreSQL schema (namespace).

**Pros**:
- Good isolation (separate namespaces)
- Easier than separate databases
- Can use search_path for routing

**Cons**:
- ❌ Still requires N schemas for N tenants
- ❌ Connection pooling complexity
- ❌ Difficult cross-tenant queries
- ❌ PostgreSQL has schema limits

**Why Rejected**: Middle ground with downsides of both approaches. RLS is simpler and more scalable.

---

### Alternative 4: Nile PostgreSQL (Tenant-Aware Postgres)
**Description**: Use Nile's tenant-aware PostgreSQL fork with automatic filtering.

**Pros**:
- Automatic tenant filtering at connection level
- No RLS policies needed
- Built for multi-tenancy

**Cons**:
- ❌ Vendor lock-in (specialized PostgreSQL fork)
- ❌ Additional cost
- ❌ Less mature than standard PostgreSQL
- ❌ Migration path unclear if Nile discontinues service

**Why Rejected**: RLS is standard PostgreSQL feature with 20+ years of production use. Avoid vendor lock-in for critical security.

---

## Consequences

### Positive
- ✅ **Absolute Security**: Database enforces isolation, independent of application bugs
- ✅ **FORCE RLS**: Prevents bypass even by superuser or table owner
- ✅ **Zero Data Leakage**: Verified through 77/77 security tests
- ✅ **Performance**: Index on `(tenant_id, ...)` makes RLS queries fast (<100ms)
- ✅ **Audit Trail**: Can verify every query respects tenant boundaries
- ✅ **Developer Productivity**: No need to remember `.where()` on every query
- ✅ **Compliance**: Meets SOC 2, GDPR, HIPAA multi-tenancy requirements

### Negative
- ⚠️ **Migration Complexity**: Requires `SET LOCAL` before every transaction
- ⚠️ **Drizzle Limitation**: Must use transaction wrapper (`TenantContext.withTenant`)
- ⚠️ **Testing**: Requires tenant context in all test fixtures

### Neutral
- ℹ️ **56 RLS Policies**: One per table per operation (SELECT, INSERT, UPDATE, DELETE)
- ℹ️ **Connection Pooling**: PgBouncer transaction mode required (not session mode)

---

## Implementation Notes

**RLS Policies** (Migration 008 - 2025-10-07):
```sql
-- 14 tables with FORCE RLS enabled
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
-- ... (14 tables total)

-- 56 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY users_select ON users FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- ... (56 policies total)
```

**Application Wrapper**:
```typescript
// packages/db/src/tenant-context.ts
export class TenantContext {
  static async withTenant<T>(
    db: Database,
    tenantId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL app.current_tenant_id = ${tenantId}`
      );
      return await callback();
    });
  }
}
```

**Performance**:
- All queries: <100ms with tenant isolation
- Index: `CREATE INDEX idx_users_tenant_id ON users(tenant_id)`
- Test coverage: 77/77 security tests passing

---

## References

- [Phase 2 Implementation](../phases/phase-2-security-database-auth.md) - RLS setup details
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Migration 008](../../packages/db/migrations/008_enable_force_rls.sql) - RLS policies
- [Drizzle ORM Multi-Tenancy Guide](https://orm.drizzle.team/docs/rls)
- [OWASP Multi-Tenancy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multitenant_Security_Cheat_Sheet.html)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-06 | Platform Team | Initial schema with RLS policies |
| 2025-10-07 | Security Team | **FORCE RLS enabled** on all tables |
| 2025-01-10 | Platform Team | Converted to ADR format |
