/**
 * IFinallyWill: Partners & Discount Codes Router
 * Partner/affiliate management, discount code CRUD, earnings tracking.
 */

import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { router, protectedProcedure, protectedMutation, adminProcedure } from '../trpc';
import {
  partners,
  discountCodes,
  codeUsages,
} from '@platform/db';

export const partnersRouter = router({
  // ==================== PARTNER CRUD (admin) ====================

  /** Create a new partner (admin only) */
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      contactEmail: z.string().email(),
      subdomain: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
      contactName: z.string().optional(),
      revenueSharePct: z.number().min(0).max(100).default(0),
      defaultDiscountPct: z.number().min(0).max(100).default(0),
      primaryColor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [partner] = await ctx.db
        .insert(partners)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          contactEmail: input.contactEmail,
          subdomain: input.subdomain,
          contactName: input.contactName,
          revenueSharePct: input.revenueSharePct,
          defaultDiscountPct: input.defaultDiscountPct,
          primaryColor: input.primaryColor,
          status: 'pending',
        })
        .returning();

      return partner;
    }),

  /** List all partners */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(partners)
      .where(eq(partners.tenantId, ctx.tenantId))
      .orderBy(desc(partners.createdAt));
  }),

  /** Get a single partner with stats */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [partner] = await ctx.db
        .select()
        .from(partners)
        .where(and(eq(partners.id, input.id), eq(partners.tenantId, ctx.tenantId)));

      if (!partner) throw new Error('Partner not found');
      return partner;
    }),

  /** Update a partner (admin only) */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      contactEmail: z.string().email().optional(),
      contactName: z.string().optional(),
      status: z.enum(['active', 'suspended', 'pending']).optional(),
      revenueSharePct: z.number().min(0).max(100).optional(),
      defaultDiscountPct: z.number().min(0).max(100).optional(),
      primaryColor: z.string().optional(),
      logoUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const [updated] = await ctx.db
        .update(partners)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(partners.id, id), eq(partners.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  // ==================== DISCOUNT CODES ====================

  /** Create a discount code for a partner */
  createCode: adminProcedure
    .input(z.object({
      partnerId: z.string().uuid(),
      code: z.string().min(3).max(30),
      description: z.string().optional(),
      discountPct: z.number().min(0).max(100),
      isFree: z.boolean().default(false),
      maxUses: z.number().min(1).optional(),
      expiresAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [code] = await ctx.db
        .insert(discountCodes)
        .values({
          partnerId: input.partnerId,
          tenantId: ctx.tenantId,
          code: input.code.toUpperCase(),
          description: input.description,
          discountPct: input.discountPct,
          isFree: input.isFree,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        })
        .returning();

      return code;
    }),

  /** List discount codes for a partner */
  listCodes: protectedProcedure
    .input(z.object({ partnerId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db
        .select()
        .from(discountCodes)
        .where(
          and(
            eq(discountCodes.partnerId, input.partnerId),
            eq(discountCodes.tenantId, ctx.tenantId),
          ),
        )
        .orderBy(desc(discountCodes.createdAt));
    }),

  /** Deactivate a discount code */
  deactivateCode: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(discountCodes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(discountCodes.id, input.id), eq(discountCodes.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  // ==================== EARNINGS & STATS ====================

  /** Get partner earnings summary */
  getEarnings: protectedProcedure
    .input(z.object({ partnerId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [partner] = await ctx.db
        .select()
        .from(partners)
        .where(and(eq(partners.id, input.partnerId), eq(partners.tenantId, ctx.tenantId)));

      if (!partner) throw new Error('Partner not found');

      // Get code usage stats
      const partnerCodes = await ctx.db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.partnerId, input.partnerId));

      const codeIds = partnerCodes.map((c) => c.id);
      let totalUsages = 0;
      let totalDiscountGiven = 0;
      let totalPartnerEarnings = 0;

      if (codeIds.length > 0) {
        for (const codeId of codeIds) {
          const usages = await ctx.db
            .select()
            .from(codeUsages)
            .where(eq(codeUsages.codeId, codeId));

          totalUsages += usages.length;
          for (const usage of usages) {
            totalDiscountGiven += usage.discountAmount;
            totalPartnerEarnings += usage.partnerEarnings;
          }
        }
      }

      return {
        totalEarnings: partner.totalEarnings,
        creditsBalance: partner.creditsBalance,
        outstandingBalance: partner.outstandingBalance,
        totalDocumentsGiven: partner.totalDocumentsGiven,
        totalCodeUsages: totalUsages,
        totalDiscountGiven,
        totalPartnerEarnings,
        activeCodes: partnerCodes.filter((c) => c.isActive).length,
        totalCodes: partnerCodes.length,
      };
    }),

  /** Resolve partner from subdomain (public — for partner branding) */
  resolveSubdomain: protectedProcedure
    .input(z.object({ subdomain: z.string() }))
    .query(async ({ input, ctx }) => {
      const [partner] = await ctx.db
        .select({
          id: partners.id,
          name: partners.name,
          logoUrl: partners.logoUrl,
          primaryColor: partners.primaryColor,
          subdomain: partners.subdomain,
          defaultDiscountPct: partners.defaultDiscountPct,
        })
        .from(partners)
        .where(
          and(
            eq(partners.subdomain, input.subdomain),
            eq(partners.status, 'active'),
          ),
        );

      return partner ?? null;
    }),
});
