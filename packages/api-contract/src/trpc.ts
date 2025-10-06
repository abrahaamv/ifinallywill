/**
 * tRPC Server Setup (Phase 3)
 *
 * Core tRPC configuration and procedure builders with auth integration.
 */

import type { Context } from '@platform/api';
import { TRPCError, initTRPC } from '@trpc/server';

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
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.userId || !ctx.role) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required - please sign in',
    });
  }

  return next({
    ctx: {
      ...ctx,
      // Type narrowing - these are guaranteed non-null now
      session: ctx.session,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
    },
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
