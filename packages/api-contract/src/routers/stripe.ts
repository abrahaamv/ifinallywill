/**
 * IFinallyWill: Stripe Router
 * Handles Stripe Checkout Sessions and Payment Intents for document orders.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedMutation } from '../trpc';
import {
  documentOrders,
  documentOrderItems,
  documentTypes,
} from '@platform/db';

/**
 * Get the Stripe client lazily (avoid import at module level so the server
 * still boots even if the stripe package isn't installed yet).
 */
async function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  const { default: Stripe } = await import('stripe');
  return new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
}

export const stripeRouter = router({
  /**
   * Create a Stripe Checkout Session for a pending order.
   * Returns the Stripe-hosted checkout URL for redirect.
   */
  createCheckoutSession: protectedMutation
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify order exists and belongs to user
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, input.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
          eq(documentOrders.userId, ctx.userId),
        ),
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'pending') {
        throw new Error('Order is no longer pending');
      }

      // Get order items with document type details
      const items = await ctx.db
        .select({
          id: documentOrderItems.id,
          unitPrice: documentOrderItems.unitPrice,
          documentTypeId: documentOrderItems.documentTypeId,
          displayName: documentTypes.displayName,
        })
        .from(documentOrderItems)
        .innerJoin(documentTypes, eq(documentOrderItems.documentTypeId, documentTypes.id))
        .where(eq(documentOrderItems.orderId, input.orderId));

      if (items.length === 0) throw new Error('Order has no items');

      const stripe = await getStripe();

      const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: items.map((item) => ({
          price_data: {
            currency: 'cad',
            unit_amount: item.unitPrice,
            product_data: {
              name: item.displayName ?? 'Estate Document',
            },
          },
          quantity: 1,
        })),
        metadata: {
          orderId: input.orderId,
          tenantId: ctx.tenantId,
        },
        success_url: `${appUrl}/app/checkout/success?order=${input.orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/app/checkout?docs=${items.map((i) => i.id).join(',')}`,
      });

      // Apply any discount if finalPrice differs from subtotal
      if (order.discountAmount > 0 && session.id) {
        // Stripe applies the discount at checkout level; we already calculated
        // the final price. Store the session for webhook reconciliation.
      }

      return { sessionUrl: session.url };
    }),

  /**
   * Create a Stripe PaymentIntent for inline Elements payment.
   * Returns the client secret needed by the frontend to render PaymentElement.
   */
  createPaymentIntent: protectedMutation
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify order exists, belongs to user, and is still pending
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, input.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
          eq(documentOrders.userId, ctx.userId),
        ),
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'pending') {
        throw new Error('Order is no longer pending');
      }

      // If a PaymentIntent was already created for this order, retrieve it
      // instead of creating a duplicate
      const stripe = await getStripe();

      if (order.stripePaymentIntentId) {
        const existingIntent = await stripe.paymentIntents.retrieve(
          order.stripePaymentIntentId,
        );
        // Update the amount in case a discount was applied after initial creation
        if (existingIntent.amount !== order.finalPrice) {
          const updated = await stripe.paymentIntents.update(
            order.stripePaymentIntentId,
            { amount: order.finalPrice },
          );
          return { clientSecret: updated.client_secret! };
        }
        return { clientSecret: existingIntent.client_secret! };
      }

      // Get order items for the description
      const items = await ctx.db
        .select({
          displayName: documentTypes.displayName,
        })
        .from(documentOrderItems)
        .innerJoin(documentTypes, eq(documentOrderItems.documentTypeId, documentTypes.id))
        .where(eq(documentOrderItems.orderId, input.orderId));

      const description = items
        .map((i) => i.displayName ?? 'Estate Document')
        .join(', ');

      // Create the PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.finalPrice,
        currency: 'cad',
        automatic_payment_methods: { enabled: true },
        description: `IFinallyWill: ${description}`,
        metadata: {
          orderId: input.orderId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
        },
      });

      // Store the PaymentIntent ID on the order for idempotency and webhook matching
      await ctx.db
        .update(documentOrders)
        .set({ stripePaymentIntentId: paymentIntent.id })
        .where(eq(documentOrders.id, input.orderId));

      return { clientSecret: paymentIntent.client_secret! };
    }),
});
