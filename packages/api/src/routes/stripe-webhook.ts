/**
 * Stripe Webhook Handler
 *
 * Raw body Fastify route (NOT tRPC — Stripe needs raw body for signature verification).
 * Handles checkout.session.completed events to mark orders as paid.
 */

import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { documentOrders } from '@platform/db';
import Stripe from 'stripe';

export async function registerStripeWebhook(fastify: FastifyInstance, db: unknown) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeSecretKey) {
    fastify.log.info('Stripe webhook not configured (STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing)');
    return;
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

  fastify.post('/api/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
      // Body should be raw string/buffer for signature verification
      const rawBody = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      fastify.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      const sessionId = session.id;
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null;

      if (!orderId) {
        fastify.log.warn('checkout.session.completed without orderId in metadata');
        return reply.status(200).send({ received: true });
      }

      try {
        const drizzleDb = db as {
          update: (table: typeof documentOrders) => {
            set: (values: Record<string, unknown>) => {
              where: (condition: unknown) => Promise<unknown>;
            };
          };
        };
        await drizzleDb
          .update(documentOrders)
          .set({
            status: 'paid' as const,
            paidAt: new Date(),
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId,
          })
          .where(eq(documentOrders.id, orderId));

        fastify.log.info({ orderId, sessionId }, 'Order marked as paid via Stripe webhook');
      } catch (err) {
        fastify.log.error({ err, orderId }, 'Failed to update order status');
        return reply.status(500).send({ error: 'Internal error' });
      }
    }

    return reply.status(200).send({ received: true });
  });

  fastify.log.info('Stripe webhook endpoint registered at /api/webhooks/stripe');
}
