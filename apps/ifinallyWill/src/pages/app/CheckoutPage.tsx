/**
 * Checkout page — create order, apply discount, pay via Stripe Elements
 *
 * Users arrive here after selecting documents from the dashboard.
 * URL: /app/checkout?docs=uuid1,uuid2,...
 *
 * Payment flow:
 * 1. User reviews line items and clicks "Continue to Payment"
 * 2. Order is created server-side via tRPC
 * 3. A PaymentIntent is created and the client secret is returned
 * 4. Stripe Elements renders PaymentElement inline
 * 5. On submit, stripe.confirmPayment redirects to the success page
 */

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BUNDLE_PRICE, BUNDLE_SAVINGS, DOCUMENT_TYPES } from '../../config/documents';
import { trpc } from '../../utils/trpc';

// ── Stripe promise (singleton, loaded once at module level) ──────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '');

// ── Inline Stripe payment form rendered inside <Elements> ────────────────────

interface StripePaymentFormProps {
  orderId: string;
  amount: number; // cents
}

function StripePaymentForm({ orderId, amount }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
    const returnUrl = `${appUrl}/app/checkout/success?order=${orderId}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    // If we reach this point, it means an immediate error occurred.
    // (Successful payments redirect to return_url, so this code only
    // runs when the payment fails without a redirect.)
    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setPaymentError(error.message ?? 'Payment failed. Please try again.');
      } else {
        setPaymentError('An unexpected error occurred. Please try again.');
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-sm mb-4">Payment Details</h3>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {paymentError && (
        <div className="rounded-lg border border-[var(--ifw-error)] bg-red-50 p-3 mb-4">
          <p className="text-sm text-[var(--ifw-error)]">{paymentError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${(amount / 100).toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main checkout page ───────────────────────────────────────────────────────

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docIds = useMemo(
    () => (searchParams.get('docs') ?? '').split(',').filter(Boolean),
    [searchParams]
  );

  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch documents for display
  const { data: documents } = trpc.estateDocuments.list.useQuery();
  const selectedDocs = useMemo(
    () => (documents ?? []).filter((d) => docIds.includes(d.id)),
    [documents, docIds]
  );

  const createOrder = trpc.documentOrders.create.useMutation();
  const applyCode = trpc.documentOrders.applyCode.useMutation();
  const createPaymentIntent = trpc.stripe.createPaymentIntent.useMutation();
  const { data: order } = trpc.documentOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId }
  );

  // Calculate prices from doc types
  const lineItems = useMemo(() => {
    return selectedDocs.map((doc) => {
      const meta = DOCUMENT_TYPES.find((dt) => dt.type === doc.documentType);
      return {
        id: doc.id,
        name: meta?.name ?? doc.documentType,
        icon: meta?.icon ?? '📄',
        price: (meta?.price ?? 0) * 100, // Convert to cents
      };
    });
  }, [selectedDocs]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
  const isBundle = lineItems.length === DOCUMENT_TYPES.length;
  const effectiveSubtotal = isBundle ? BUNDLE_PRICE * 100 : subtotal;
  const discountAmount = order?.discountAmount ?? 0;
  const finalPrice = order ? order.finalPrice : effectiveSubtotal;

  const handleCreateOrder = useCallback(async () => {
    if (docIds.length === 0) return;
    try {
      const result = await createOrder.mutateAsync({ estateDocIds: docIds });
      setOrderId(result.id);

      // Immediately create the PaymentIntent so we can show the Elements form
      const { clientSecret: secret } = await createPaymentIntent.mutateAsync({
        orderId: result.id,
      });
      setClientSecret(secret);
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  }, [docIds, createOrder, createPaymentIntent]);

  const handleApplyCode = useCallback(async () => {
    if (!orderId || !discountCode.trim()) return;
    setDiscountError(null);
    try {
      await applyCode.mutateAsync({
        orderId,
        code: discountCode.trim(),
      });
      setDiscountCode('');

      // Re-create the PaymentIntent with the updated amount after discount
      const { clientSecret: secret } = await createPaymentIntent.mutateAsync({
        orderId,
      });
      setClientSecret(secret);
    } catch (err) {
      setDiscountError(err instanceof Error ? err.message : 'Invalid code');
    }
  }, [orderId, discountCode, applyCode, createPaymentIntent]);

  if (docIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">No Documents Selected</h1>
        <p className="text-[var(--ifw-text-muted)] mb-6">
          Go to your dashboard and select documents to purchase.
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Order Items */}
      <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-lg mb-4">Your Documents</h2>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-medium">${(item.price / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <hr className="my-4 border-[var(--ifw-border)]" />

        {/* Bundle savings */}
        {isBundle && (
          <div className="flex items-center justify-between py-1 text-sm text-[var(--ifw-success)]">
            <span>Bundle Savings</span>
            <span>-${BUNDLE_SAVINGS.toFixed(2)}</span>
          </div>
        )}

        {/* Subtotal */}
        <div className="flex items-center justify-between py-1 text-sm">
          <span>Subtotal</span>
          <span>${(effectiveSubtotal / 100).toFixed(2)}</span>
        </div>

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between py-1 text-sm text-[var(--ifw-success)]">
            <span>Discount</span>
            <span>-${(discountAmount / 100).toFixed(2)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between py-2 text-lg font-bold border-t border-[var(--ifw-border)] mt-2 pt-3">
          <span>Total</span>
          <span>${(finalPrice / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Discount Code */}
      {orderId && (
        <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
          <h3 className="font-medium text-sm mb-3">Have a discount code?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="ifw-input flex-1"
              placeholder="Enter code"
            />
            <button
              type="button"
              onClick={handleApplyCode}
              disabled={applyCode.isPending || !discountCode.trim()}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-[var(--ifw-neutral-100)] disabled:opacity-40"
            >
              {applyCode.isPending ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {discountError && <p className="text-xs text-[var(--ifw-error)] mt-2">{discountError}</p>}
        </div>
      )}

      {/* Payment Section */}
      {orderId && clientSecret ? (
        <>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0A1E86',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <StripePaymentForm orderId={orderId} amount={finalPrice} />
          </Elements>

          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={() => navigate('/app/dashboard')}
              className="px-6 py-3 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        /* Pre-order actions: Create Order or show loading */
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={createOrder.isPending || createPaymentIntent.isPending}
            className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {createOrder.isPending || createPaymentIntent.isPending
              ? 'Setting up payment...'
              : 'Continue to Payment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="px-6 py-3 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
          >
            Cancel
          </button>
        </div>
      )}

      <p className="text-xs text-[var(--ifw-text-muted)] mt-4 text-center">
        Secure payment powered by Stripe. Your payment details are never stored on our servers.
      </p>
    </div>
  );
}
