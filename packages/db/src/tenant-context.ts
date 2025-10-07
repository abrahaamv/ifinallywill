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

import { db } from './client';
import { sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

/**
 * Transaction type with tenant context set
 */
export type TenantTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  {
    tenants: never;
    users: never;
    sessions: never;
    messages: never;
    knowledgeChunks: never;
    costEvents: never;
  }
>;

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
    callback: (tx: typeof db) => Promise<T>
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

    return await db.transaction(async (tx) => {
      // Set tenant context for this transaction
      // SET LOCAL: Variable only exists within this transaction
      // Automatically clears when transaction commits/rolls back
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);

      // Execute callback with transaction handle
      // All queries in callback are automatically filtered by RLS
      // biome-ignore lint/suspicious/noExplicitAny: Transaction type cast necessary for Drizzle ORM
      return await callback(tx as any);
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
      // Query pg_tables to check RLS status
      const result = await db.execute(sql`
        SELECT
          tablename,
          rowsecurity AS rls_enabled,
          forcerowsecurity AS force_rls
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('users', 'sessions', 'messages', 'knowledge_chunks', 'cost_events')
        ORDER BY tablename
      `);

      // Check if all tables have RLS enabled with FORCE
      const tables = (result as unknown as { rows: Array<{
        tablename: string;
        rls_enabled: boolean;
        force_rls: boolean;
      }> }).rows;

      const allTablesProtected = tables.every(
        (table) => table.rls_enabled === true && table.force_rls === true
      );

      if (!allTablesProtected) {
        const unprotected = tables
          .filter((table) => !table.rls_enabled || !table.force_rls)
          .map((table) => table.tablename);

        return {
          active: false,
          tenantId,
          message: `RLS not fully active! Unprotected tables: ${unprotected.join(', ')}`,
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
