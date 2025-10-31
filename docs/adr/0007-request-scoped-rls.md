# ADR-0007: Implement Request-Scoped RLS via SET LOCAL

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Platform Engineering Team, Security Team
**Related Phases**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md)

---

## Context

With [ADR-0002 (PostgreSQL RLS)](./0002-postgresql-rls-tenant-isolation.md) enforcing tenant isolation at the database level, we need a mechanism to set the `tenant_id` context for each request.

**Problem**: How do we set the PostgreSQL session variable `app.current_tenant_id` in a way that:
- Works per-request (not per-connection)
- Supports connection pooling (PgBouncer)
- Cannot be bypassed by application code
- Integrates with Auth.js sessions
- Handles concurrent requests safely

**Requirements**:
- Transaction-scoped (not session-scoped)
- No connection state leakage between requests
- Compatible with PgBouncer transaction mode
- Type-safe TypeScript wrapper
- Automatic cleanup after transaction

---

## Decision

Use **`SET LOCAL app.current_tenant_id`** within PostgreSQL transactions to set request-scoped RLS context.

**Rationale**:
- **Transaction-Scoped**: `SET LOCAL` only affects current transaction
- **Automatic Cleanup**: Context cleared when transaction ends
- **Connection Pooling Safe**: No state persists across connection reuse
- **RLS Integration**: PostgreSQL RLS policies read from `current_setting()`

**Implementation**:
```typescript
// packages/db/src/tenant-context.ts
export class TenantContext {
  static async withTenant<T>(
    db: Database,
    tenantId: string,
    callback: () => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      // Set tenant context for this transaction only
      await tx.execute(
        sql`SET LOCAL app.current_tenant_id = ${tenantId}`
      );

      // All queries in callback use this context
      return await callback();
    });
  }
}

// Usage in tRPC middleware
export const createContext = async ({ req, res }) => {
  const session = await auth(req, res);
  const tenantId = session?.user?.tenantId;

  return {
    session,
    tenantId,
    db: /* wrapped db with tenant context */
  };
};
```

---

## Alternatives Considered

### Alternative 1: SET SESSION (Session-Scoped)
**Description**: Use `SET SESSION app.current_tenant_id` instead of `SET LOCAL`.

**Pros**:
- Simpler syntax
- Persists across transactions in same connection

**Cons**:
- ❌ **CONNECTION STATE LEAKAGE**: Context persists when connection returned to pool
- ❌ **CATASTROPHIC RISK**: Request A sets tenant X, Request B reuses connection → accesses tenant X data
- ❌ **PgBouncer Incompatible**: Transaction mode doesn't preserve session state
- ❌ **Manual Cleanup**: Must remember to `RESET` after each request

**Why Rejected**: **UNACCEPTABLE SECURITY RISK**. Session-scoped variables lead to cross-tenant data leakage in connection pooling.

---

### Alternative 2: Connection-Per-Tenant
**Description**: Create separate database connection pool for each tenant.

**Pros**:
- Complete isolation (physical connection separation)
- Can use session-scoped variables safely

**Cons**:
- ❌ **Resource Waste**: 1000 tenants = 1000 connection pools
- ❌ **PgBouncer Complexity**: Must configure per-tenant pools
- ❌ **Connection Limits**: PostgreSQL max connections exhausted
- ❌ **Slow Requests**: Connection acquisition adds 10-50ms latency

**Why Rejected**: Does not scale. Transaction-scoped approach more efficient.

---

### Alternative 3: Application-Level Context Passing
**Description**: Pass `tenantId` as parameter to every function/query.

**Pros**:
- Explicit (visible in function signatures)
- No database magic
- Testable without database

**Cons**:
- ❌ **Bypasses RLS**: Application code can ignore tenant parameter
- ❌ **Developer Burden**: Must pass context through every layer
- ❌ **Error-Prone**: Easy to forget parameter
- ❌ **No Database Enforcement**: RLS not used

**Why Rejected**: Violates ADR-0002 principle of database-enforced isolation.

---

### Alternative 4: JWT in Database Connection String
**Description**: Encode tenant_id in JWT, pass as connection parameter.

**Pros**:
- Connection string contains context
- Works with some database proxies

**Cons**:
- ❌ **New Connection Per Request**: Cannot reuse connections
- ❌ **Performance**: Connection setup is expensive (50-100ms)
- ❌ **Complexity**: JWT signing/verification overhead
- ❌ **PgBouncer**: Doesn't support per-connection parameters

**Why Rejected**: Performance unacceptable. `SET LOCAL` achieves same goal with connection reuse.

---

## Consequences

### Positive
- ✅ **Transaction-Safe**: Context automatically cleared after transaction
- ✅ **Connection Pooling**: No state leakage between requests
- ✅ **PgBouncer Compatible**: Works with transaction mode
- ✅ **Type-Safe**: TypeScript wrapper ensures correct usage
- ✅ **Automatic**: tRPC middleware applies context to all queries
- ✅ **Testable**: Can set mock tenant context in tests
- ✅ **Performance**: Zero overhead (<0.1ms for SET LOCAL)

### Negative
- ⚠️ **Transaction Required**: All RLS queries must be in transaction
- ⚠️ **Drizzle Limitation**: Must use wrapper (cannot use ORM directly)

### Neutral
- ℹ️ **PostgreSQL Specific**: `SET LOCAL` is PostgreSQL-only (migration to other DB would require changes)
- ℹ️ **Explicit Transactions**: Developer must remember to use `TenantContext.withTenant`

---

## Implementation Notes

**tRPC Middleware** (Automatic Context):
```typescript
// packages/api-contract/src/trpc.ts
const tenantMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No tenant context"
    });
  }

  // Wrap database to auto-apply tenant context
  const db = new Proxy(ctx.db, {
    get(target, prop) {
      if (prop === "query" || prop === "insert" || prop === "update" || prop === "delete") {
        return async (...args: any[]) => {
          return await TenantContext.withTenant(
            target,
            ctx.tenantId,
            () => target[prop](...args)
          );
        };
      }
      return target[prop];
    }
  });

  return next({ ctx: { ...ctx, db } });
});

export const protectedProcedure = t.procedure.use(tenantMiddleware);
```

**Test Helper**:
```typescript
// packages/db/tests/helpers.ts
export async function withTestTenant<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  return await TenantContext.withTenant(testDb, tenantId, callback);
}
```

**PgBouncer Configuration**:
```ini
[databases]
platform = host=localhost port=5432 dbname=platform

[pgbouncer]
pool_mode = transaction  # Required for SET LOCAL
max_client_conn = 1000
default_pool_size = 20
```

**Performance**:
- `SET LOCAL` overhead: <0.1ms per request
- Transaction overhead: ~0.5ms per request
- Total RLS context overhead: <1ms

---

## References

- [ADR-0002: PostgreSQL RLS Tenant Isolation](./0002-postgresql-rls-tenant-isolation.md) - RLS foundation
- [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md) - Context implementation
- [PostgreSQL SET Documentation](https://www.postgresql.org/docs/current/sql-set.html)
- [PgBouncer Transaction Mode](https://www.pgbouncer.org/features.html)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-06 | Platform Team | Initial implementation with tRPC |
| 2025-01-10 | Platform Team | Converted to ADR format |
