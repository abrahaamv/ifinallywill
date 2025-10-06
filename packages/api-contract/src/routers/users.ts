/**
 * Users Router (Phase 3 - Week 2.2)
 *
 * User management with automatic RLS enforcement.
 * All queries automatically filtered by tenant_id via PostgreSQL RLS policies.
 *
 * Security:
 * - authMiddleware sets app.current_tenant_id for each request
 * - RLS policies filter all SELECT/UPDATE/DELETE operations
 * - UUID validation prevents SQL injection
 * - Role hierarchy enforced: owner > admin > member
 */

import { users } from '@platform/db';
import { TRPCError } from '@trpc/server';
import { count, eq, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, ownerProcedure, protectedProcedure, router } from '../trpc';

/**
 * Input validation schemas
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  avatarUrl: z.string().url('Invalid URL format').optional(),
});

const updateUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['owner', 'admin', 'member']).optional(),
  avatarUrl: z.string().url().optional(),
});

const getUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

const listUsersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member']).optional(),
});

const deleteUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

/**
 * Users router with RLS enforcement
 */
export const usersRouter = router({
  /**
   * List users in current tenant
   *
   * RLS automatically filters by tenantId
   * Members can list, admins/owners can list all
   */
  list: protectedProcedure.input(listUsersSchema).query(async ({ ctx, input }) => {
    try {
      // Build query with filters
      let query = ctx.db.select().from(users).$dynamic();

      // RLS handles tenant filtering automatically
      // No need for .where(eq(users.tenantId, ctx.tenantId))

      // Apply search filter if provided
      if (input.search) {
        query = query.where(ilike(users.email, `%${input.search}%`));
      }

      // Apply role filter if provided
      if (input.role) {
        query = query.where(eq(users.role, input.role));
      }

      // Apply pagination
      const results = await query.limit(input.limit).offset(input.offset);

      // Get total count
      const countResult = await ctx.db.select({ count: count() }).from(users);

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        users: results.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      console.error('Failed to list users:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve users',
        cause: error,
      });
    }
  }),

  /**
   * Get user by ID
   *
   * RLS ensures user belongs to current tenant
   */
  get: protectedProcedure.input(getUserSchema).query(async ({ ctx, input }) => {
    try {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found or access denied',
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to get user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve user',
        cause: error,
      });
    }
  }),

  /**
   * Create user (admin/owner only)
   *
   * Automatically associates user with current tenant via RLS
   */
  create: adminProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
    try {
      // Check if email already exists in this tenant
      const [existing] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Create user - tenantId automatically set via RLS
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          tenantId: ctx.tenantId, // Explicit for clarity, but RLS enforces match
          email: input.email,
          name: input.name,
          role: input.role,
          avatarUrl: input.avatarUrl,
          passwordHash: 'oauth-user', // Placeholder - OAuth users don't have passwords
        })
        .returning();

      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to create user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
        cause: error,
      });
    }
  }),

  /**
   * Update user (admin/owner only)
   *
   * RLS ensures user belongs to current tenant
   * Only admins/owners can update roles
   */
  update: adminProcedure.input(updateUserSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verify user exists and belongs to tenant (RLS)
      const [existing] = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found or access denied',
        });
      }

      // Update user - RLS ensures we can only update within our tenant
      const [updated] = await ctx.db
        .update(users)
        .set({
          name: input.name,
          role: input.role,
          avatarUrl: input.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
        });
      }

      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to update user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
        cause: error,
      });
    }
  }),

  /**
   * Delete user (owner only)
   *
   * RLS ensures user belongs to current tenant
   * Cannot delete self
   */
  delete: ownerProcedure.input(deleteUserSchema).mutation(async ({ ctx, input }) => {
    try {
      // Prevent self-deletion
      if (input.id === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }

      // Delete user - RLS ensures we can only delete within our tenant
      const [deleted] = await ctx.db
        .delete(users)
        .where(eq(users.id, input.id))
        .returning({ id: users.id });

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found or access denied',
        });
      }

      return {
        id: deleted.id,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Failed to delete user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user',
        cause: error,
      });
    }
  }),
});
