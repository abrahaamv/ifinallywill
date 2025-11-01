/**
 * End Users Router
 * CRUD operations for widget/landing page visitors (separate from tenant admin users)
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { endUsers } from '@platform/db';
import { eq, and, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const endUsersRouter = router({
  /**
   * Create or get existing end user
   * Used by widget on first contact
   */
  createOrGet: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        phone: z
          .string()
          .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)')
          .optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        source: z.enum(['widget', 'landing_demo']).default('widget'),
        deviceFingerprint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate at least one contact method provided
      if (!input.phone && !input.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either phone or email is required',
        });
      }

      // Check if end user already exists (by phone OR email)
      const whereConditions = [];
      if (input.phone) {
        whereConditions.push(eq(endUsers.phoneNumber, input.phone));
      }
      if (input.email) {
        whereConditions.push(eq(endUsers.email, input.email));
      }

      const existing = await ctx.db.query.endUsers.findFirst({
        where: and(eq(endUsers.tenantId, input.tenantId), or(...whereConditions)),
      });

      if (existing) {
        // Check if user is blocked
        if (existing.isBlocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: existing.blockedReason || 'User is blocked',
          });
        }
        return existing;
      }

      // Check for device fingerprint abuse (max 5 accounts per device)
      if (input.deviceFingerprint) {
        const deviceCount = await ctx.db
          .select({ count: endUsers.id })
          .from(endUsers)
          .where(
            and(
              eq(endUsers.tenantId, input.tenantId),
              eq(endUsers.deviceFingerprint, input.deviceFingerprint)
            )
          );

        if (deviceCount.length >= 5) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Too many accounts from this device. Please contact support.',
          });
        }
      }

      // Create new end user
      const [newUser] = await ctx.db
        .insert(endUsers)
        .values({
          tenantId: input.tenantId,
          phoneNumber: input.phone,
          email: input.email,
          name: input.name,
          source: input.source,
          deviceFingerprint: input.deviceFingerprint,
          isPotentialTenant: input.source === 'landing_demo',
        })
        .returning();

      return newUser;
    }),

  /**
   * Get end user by ID
   */
  getById: publicProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.endUsers.findFirst({
        where: eq(endUsers.id, input.endUserId),
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return user;
    }),

  /**
   * Check if user is blocked
   */
  checkBlocked: publicProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.endUsers.findFirst({
        where: eq(endUsers.id, input.endUserId),
      });

      return {
        isBlocked: user?.isBlocked || false,
        reason: user?.blockedReason,
        blockedAt: user?.blockedAt,
      };
    }),

  /**
   * Update end user consent flags
   */
  updateConsent: publicProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
        consentSms: z.boolean().optional(),
        consentEmail: z.boolean().optional(),
        consentCalls: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { endUserId, ...consents } = input;

      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          ...consents,
          consentedAt: new Date(),
        })
        .where(eq(endUsers.id, endUserId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return updated;
    }),

  /**
   * Mark phone as verified
   */
  markPhoneVerified: publicProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        })
        .where(eq(endUsers.id, input.endUserId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return updated;
    }),

  /**
   * Mark email as verified
   */
  markEmailVerified: publicProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
        .where(eq(endUsers.id, input.endUserId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return updated;
    }),

  /**
   * Block end user (tenant admin only)
   */
  block: protectedProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          isBlocked: true,
          blockedReason: input.reason,
          blockedAt: new Date(),
        })
        .where(
          and(
            eq(endUsers.id, input.endUserId),
            eq(endUsers.tenantId, ctx.tenantId) // Ensure tenant isolation
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return updated;
    }),

  /**
   * Unblock end user (tenant admin only)
   */
  unblock: protectedProcedure
    .input(
      z.object({
        endUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(endUsers)
        .set({
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
        })
        .where(
          and(
            eq(endUsers.id, input.endUserId),
            eq(endUsers.tenantId, ctx.tenantId) // Ensure tenant isolation
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      return updated;
    }),

  /**
   * List end users (tenant admin only)
   */
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          source: z.enum(['widget', 'landing_demo']).optional(),
          isBlocked: z.boolean().optional(),
          isPotentialTenant: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const conditions = [eq(endUsers.tenantId, ctx.tenantId)];

      if (input.source) {
        conditions.push(eq(endUsers.source, input.source));
      }
      if (input.isBlocked !== undefined) {
        conditions.push(eq(endUsers.isBlocked, input.isBlocked));
      }
      if (input.isPotentialTenant !== undefined) {
        conditions.push(eq(endUsers.isPotentialTenant, input.isPotentialTenant));
      }

      const users = await ctx.db.query.endUsers.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset: input.offset,
        orderBy: (endUsers, { desc }) => [desc(endUsers.createdAt)],
      });

      return users;
    }),
});
