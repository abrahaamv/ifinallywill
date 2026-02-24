/**
 * IFinallyWill: Document Orders Router
 * Handles order creation, discount codes, status tracking.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure, protectedMutation } from '../trpc';
import {
  documentOrders,
  documentOrderItems,
  documentTypes,
  estateDocuments,
  discountCodes,
  codeUsages,
} from '@platform/db';

export const documentOrdersRouter = router({
  /** Create an order for one or more estate documents */
  create: protectedMutation
    .input(z.object({
      estateDocIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fetch the documents and their document types
      const docs = await Promise.all(
        input.estateDocIds.map((id) =>
          ctx.db.query.estateDocuments.findFirst({
            where: and(eq(estateDocuments.id, id), eq(estateDocuments.tenantId, ctx.tenantId)),
          }),
        ),
      );

      const validDocs = docs.filter(Boolean);
      if (validDocs.length !== input.estateDocIds.length) {
        throw new Error('One or more documents not found');
      }

      // Get pricing from document_types
      const docTypeRows = await ctx.db.select().from(documentTypes);
      const priceMap = new Map(docTypeRows.map((dt) => [dt.name, dt.basePrice]));

      // Calculate totals
      let subtotal = 0;
      const items: Array<{ estateDocId: string; documentTypeId: number; unitPrice: number }> = [];

      for (const doc of validDocs) {
        if (!doc) continue;
        const price = priceMap.get(doc.documentType) ?? 0;
        subtotal += price;

        const docTypeRow = docTypeRows.find((dt) => dt.name === doc.documentType);
        if (docTypeRow) {
          items.push({
            estateDocId: doc.id,
            documentTypeId: docTypeRow.id,
            unitPrice: price,
          });
        }
      }

      // Create the order
      const [order] = await ctx.db
        .insert(documentOrders)
        .values({
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          status: 'pending',
          subtotal,
          discountAmount: 0,
          finalPrice: subtotal,
        })
        .returning();

      if (!order) throw new Error('Failed to create order');

      // Create order items
      if (items.length > 0) {
        await ctx.db.insert(documentOrderItems).values(
          items.map((item) => ({
            orderId: order.id,
            estateDocId: item.estateDocId,
            documentTypeId: item.documentTypeId,
            unitPrice: item.unitPrice,
          })),
        );
      }

      return order;
    }),

  /** List orders for current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.documentOrders.findMany({
      where: and(
        eq(documentOrders.userId, ctx.userId),
        eq(documentOrders.tenantId, ctx.tenantId),
      ),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });
  }),

  /** Get a single order with items */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, input.id),
          eq(documentOrders.tenantId, ctx.tenantId),
        ),
      });

      if (!order) throw new Error('Order not found');

      const items = await ctx.db.query.documentOrderItems.findMany({
        where: eq(documentOrderItems.orderId, order.id),
      });

      return { ...order, items };
    }),

  /** Apply a discount code to an order */
  applyCode: protectedMutation
    .input(z.object({
      orderId: z.string().uuid(),
      code: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, input.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
        ),
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'pending') throw new Error('Order already processed');

      // Find the discount code
      const [code] = await ctx.db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.code, input.code.toUpperCase()));

      if (!code) throw new Error('Invalid discount code');
      if (!code.isActive) throw new Error('Discount code is no longer active');

      // Check max uses
      if (code.maxUses) {
        const usageCount = await ctx.db
          .select()
          .from(codeUsages)
          .where(eq(codeUsages.codeId, code.id));
        if (usageCount.length >= code.maxUses) {
          throw new Error('Discount code has reached maximum uses');
        }
      }

      // Calculate discount
      const discountAmount = code.isFree
        ? order.subtotal
        : Math.round(order.subtotal * (code.discountPct / 100));

      const finalPrice = Math.max(0, order.subtotal - discountAmount);

      // Update order
      const [updated] = await ctx.db
        .update(documentOrders)
        .set({
          discountCodeId: code.id,
          discountAmount,
          finalPrice,
        })
        .where(eq(documentOrders.id, order.id))
        .returning();

      // Record usage
      await ctx.db.insert(codeUsages).values({
        codeId: code.id,
        userId: ctx.userId,
        orderId: order.id,
        tenantId: ctx.tenantId,
        discountAmount,
        partnerEarnings: 0, // Calculated on payout
      });

      return updated;
    }),

  /** Update order status (e.g., after payment webhook) */
  updateStatus: protectedMutation
    .input(z.object({
      orderId: z.string().uuid(),
      status: z.enum(['pending', 'paid', 'generated', 'downloaded', 'expired']),
      stripeSessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await ctx.db
        .update(documentOrders)
        .set({
          status: input.status,
          ...(input.stripeSessionId ? { stripeSessionId: input.stripeSessionId } : {}),
        })
        .where(
          and(
            eq(documentOrders.id, input.orderId),
            eq(documentOrders.tenantId, ctx.tenantId),
          ),
        )
        .returning();

      return updated;
    }),
});
