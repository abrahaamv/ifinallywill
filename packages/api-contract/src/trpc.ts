/**
 * tRPC Server Setup (Phase 3)
 *
 * Core tRPC configuration and procedure builders with auth integration.
 * Enhanced with centralized error handling (Production Readiness)
 * Phase 8: CSRF protection for mutations (Week 1 Critical Fix #8)
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { sql } from 'drizzle-orm';
import type { Context } from './context';
import { logError, sanitizeErrorMessage } from './errors';
import { validateCSRF } from './middleware/csrf';

/**
 * Initialize tRPC with context type and error handling
 */
const t = initTRPC.context<Context>().create({
  /**
   * Global error handler
   *
   * Handles all errors consistently:
   * - Logs errors with context
   * - Sanitizes messages for production
   * - Provides structured error responses
   */
  errorFormatter({ shape, error, ctx }) {
    const isProd = process.env.NODE_ENV === 'production';

    // Log error with request context
    logError(error, {
      path: shape.data.path,
      code: shape.data.code,
      httpStatus: shape.data.httpStatus,
      tenantId: ctx?.tenantId,
      userId: ctx?.userId,
      timestamp: new Date().toISOString(),
    });

    // Sanitize error message for production
    const sanitizedMessage = sanitizeErrorMessage(error, isProd);

    return {
      ...shape,
      message: sanitizedMessage,
      data: {
        ...shape.data,
        // Include additional error details in development only
        ...(isProd
          ? {}
          : {
              cause: error.cause,
              stack: error.stack,
            }),
      },
    };
  },
});

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

/**
 * CSRF-protected procedure - for mutations only
 *
 * Validates CSRF token on all state-changing operations (mutations).
 * Works in conjunction with Auth.js CSRF protection.
 *
 * Security Model:
 * - Queries (GET): No CSRF check (read-only operations)
 * - Mutations (POST): Require valid X-CSRF-Token header
 * - Token validated against Auth.js /api/auth/csrf endpoint
 *
 * Usage:
 * - Use protectedMutation instead of protectedProcedure for mutations
 * - Queries should continue using protectedProcedure
 *
 * Example:
 * ```typescript
 * updateUser: protectedMutation
 *   .input(z.object({ name: z.string() }))
 *   .mutation(async ({ input, ctx }) => {
 *     // CSRF validated, safe to proceed
 *   })
 * ```
 */
export const protectedMutation = protectedProcedure.use(async ({ ctx, next }) => {
  // Validate CSRF token from request headers
  await validateCSRF(ctx.req);

  return next({ ctx });
});
