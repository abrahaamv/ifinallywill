/**
 * tRPC Server Setup (Phase 3)
 *
 * Core tRPC configuration and procedure builders with auth integration.
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { sql } from 'drizzle-orm';
import type { Context } from './context';

/**
 * Initialize tRPC with context type
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure builders
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 *
 * Guarantees ctx.session, ctx.tenantId, ctx.userId, ctx.role are non-null
 * Sets PostgreSQL session variable for RLS policies
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.userId || !ctx.role) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required - please sign in',
    });
  }

  // Type narrowing - capture non-null values before transaction
  const session = ctx.session;
  const tenantId = ctx.tenantId;
  const userId = ctx.userId;
  const role = ctx.role;

  // Wrap in transaction to use SET LOCAL for RLS policies
  // This ensures tenant isolation and automatic cleanup after request
  return await ctx.db.transaction(async (tx) => {
    // Set PostgreSQL session variable for RLS policies
    // SET LOCAL only persists for this transaction, preventing tenant leakage
    await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));

    return next({
      ctx: {
        ...ctx,
        db: tx, // Use transaction connection for all queries
        // Type narrowing - these are guaranteed non-null now
        session,
        tenantId,
        userId,
        role,
      },
    });
  });
});

/**
 * Admin procedure - requires admin or owner role
 *
 * Role hierarchy: owner > admin > member
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const roleHierarchy: Record<'owner' | 'admin' | 'member', number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  if (roleHierarchy[ctx.role] < roleHierarchy.admin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin role required - insufficient permissions',
    });
  }

  return next({ ctx });
});

/**
 * Owner procedure - requires owner role
 */
export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Owner role required - insufficient permissions',
    });
  }

  return next({ ctx });
});
