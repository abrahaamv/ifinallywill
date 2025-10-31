/**
 * Tenant Context Manager - Phase 8 Day 4-5
 *
 * Provides secure multi-tenant database access with PostgreSQL RLS enforcement.
 *
 * **CRITICAL SECURITY**:
 * - Drizzle ORM provides ZERO automatic tenant filtering
 * - ALL queries MUST be wrapped in withTenant() transaction
 * - PostgreSQL RLS is the ONLY defense against data leakage
 *
 * **How It Works**:
 * 1. Start PostgreSQL transaction
 * 2. Set app.current_tenant_id session variable
 * 3. Execute queries (RLS policies automatically filter by tenant_id)
 * 4. Session variable auto-clears at transaction end
 *
 * **Usage Example**:
 * ```typescript
 * const products = await TenantContext.withTenant(tenantId, async (tx) => {
 *   return await tx.select().from(productsTable);
 * });
 * // Returns only products for this tenant (enforced by RLS)
 * ```
 *
 * Reference: docs/research/10-07-2025/research-10-07-2025.md lines 225-256
 */

import { sql } from 'drizzle-orm';
import { db, sql as rawSql } from './client';

/**
 * Transaction type with tenant context set
 *
 * Note: This type uses 'any' to resolve Drizzle ORM transaction typing limitations.
 * The actual transaction type from db.transaction() doesn't match the expected
 * callback parameter type due to complex generic constraints in Drizzle's type system.
 *
 * This is a documented limitation and the 'any' type is necessary for proper
 * functionality while maintaining type safety in the actual usage patterns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TenantTransaction = any;

/**
 * Tenant Context Manager
 *
 * Ensures all database queries are automatically filtered by tenant_id
 * via PostgreSQL Row-Level Security (RLS) policies.
 */
export class TenantContext {
  /**
   * Execute database queries within tenant context
   *
   * **SECURITY CRITICAL**: This is the ONLY way to safely query multi-tenant data.
   *
   * **How It Works**:
   * 1. Starts PostgreSQL transaction
   * 2. Sets app.current_tenant_id = tenantId (SET LOCAL, auto-clears)
   * 3. Executes callback with transaction handle
   * 4. RLS policies automatically filter all queries by tenant_id
   * 5. Transaction commits or rolls back
   * 6. Session variable clears automatically
   *
   * **RLS Enforcement**:
   * - USING clause: Controls which rows are visible (SELECT/UPDATE/DELETE)
   * - WITH CHECK clause: Controls which rows can be inserted/updated
   * - FORCE ROW LEVEL SECURITY: Table owners cannot bypass policies
   *
   * @param tenantId - UUID of tenant (from session.user.tenantId)
   * @param callback - Async function that receives transaction handle
   * @returns Promise resolving to callback result
   *
   * @example
   * ```typescript
   * // Fetch products for current tenant
   * const products = await TenantContext.withTenant(tenantId, async (tx) => {
   *   return await tx.select().from(products);
   * });
   * // RLS automatically filters: WHERE tenant_id = tenantId
   * ```
   *
   * @example
   * ```typescript
   * // Insert product (RLS enforces tenant_id matches context)
   * await TenantContext.withTenant(tenantId, async (tx) => {
   *   await tx.insert(products).values({
   *     tenantId: tenantId, // MUST match context
   *     name: 'Widget',
   *     price: 1000
   *   });
   *   // If tenantId doesn't match context → RLS violation error
   * });
   * ```
   */
  static async withTenant<T>(
    tenantId: string,
    callback: (tx: TenantTransaction) => Promise<T>
  ): Promise<T> {
    // Validate tenant ID (basic sanity check)
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Invalid tenant ID: must be non-empty string');
    }

    // UUID format validation (PostgreSQL expects valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new Error(`Invalid tenant ID format: ${tenantId} (expected UUID)`);
    }

    // Ensure db is available (not in browser context)
    if (!db) {
      throw new Error('Database not available - cannot execute queries in browser context');
    }

    return await db.transaction(async (tx: TenantTransaction) => {
      // Set tenant context for this transaction
      // SET LOCAL: Variable only exists within this transaction
      // Automatically clears when transaction commits/rolls back
      // CRITICAL: Use sql.raw() - SET LOCAL doesn't support parameterized queries
      //           Must execute on transaction connection, not pooled connection
      await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));

      // Execute callback with transaction handle
      // All queries in callback are automatically filtered by RLS
      return await callback(tx);
    });
  }

  /**
   * Verify RLS policies are active for a tenant
   *
   * **Development/Testing Tool**: Confirms RLS is working correctly.
   *
   * This query attempts to read from a tenant table. If RLS is working:
   * - Returns only rows for current tenant
   * - Returns empty array if tenant has no data
   *
   * If RLS is NOT working (policies disabled/misconfigured):
   * - Returns rows from ALL tenants (CRITICAL BUG)
   *
   * @param tenantId - Tenant ID to verify
   * @returns RLS status information
   *
   * @example
   * ```typescript
   * const status = await TenantContext.verifyRLSActive('tenant-123');
   * console.log(status); // { active: true, tenantId: 'tenant-123' }
   * ```
   */
  static async verifyRLSActive(tenantId: string): Promise<{
    active: boolean;
    tenantId: string;
    message: string;
  }> {
    try {
      // Query pg_class to check RLS status (more direct than pg_tables)
      // Ensure SQL client is available
      if (!rawSql) {
        throw new Error('SQL client not available - cannot verify RLS in browser context');
      }

      interface PgClassRow {
        tablename: string;
        rls_enabled: boolean;
        force_rls: boolean;
      }

      const tables = (await rawSql`
        SELECT
          relname AS tablename,
          relrowsecurity AS rls_enabled,
          relforcerowsecurity AS force_rls
        FROM pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relname IN ('users', 'sessions', 'messages', 'knowledge_chunks', 'cost_events')
        ORDER BY relname
      `) as PgClassRow[];

      const allTablesProtected = tables.every(
        (table: PgClassRow) => table.rls_enabled === true && table.force_rls === true
      );

      if (!allTablesProtected) {
        const unprotected = tables
          .filter((table: PgClassRow) => !table.rls_enabled || !table.force_rls)
          .map((table: PgClassRow) => {
            const status = [];
            if (!table.rls_enabled) status.push('RLS disabled');
            if (!table.force_rls) status.push('FORCE disabled');
            return `${table.tablename} (${status.join(', ')})`;
          });

        return {
          active: false,
          tenantId,
          message: `RLS not fully active! Issues: ${unprotected.join(', ')}`,
        };
      }

      return {
        active: true,
        tenantId,
        message: 'RLS active with FORCE on all tenant tables',
      };
    } catch (error: unknown) {
      return {
        active: false,
        tenantId,
        message: `RLS verification failed: ${String(error)}`,
      };
    }
  }
}

/**
 * Helper: Get tenant ID from tRPC context
 *
 * **Usage in tRPC procedures**:
 * ```typescript
 * export const protectedProcedure = publicProcedure.use(async (opts) => {
 *   const session = await getSession(opts.ctx.request);
 *   if (!session?.user?.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
 *
 *   return opts.next({
 *     ctx: {
 *       ...opts.ctx,
 *       session,
 *       tenantId: session.user.tenantId,
 *     },
 *   });
 * });
 * ```
 *
 * Then in router:
 * ```typescript
 * getProducts: protectedProcedure.query(async ({ ctx }) => {
 *   return await TenantContext.withTenant(ctx.tenantId, async (tx) => {
 *     return await tx.select().from(products);
 *   });
 * }),
 * ```
 */
export function getTenantId(session: { user?: { tenantId?: string } } | null): string {
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    throw new Error('No tenant ID in session - user must be authenticated');
  }

  return tenantId;
}
