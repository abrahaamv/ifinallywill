/**
 * Payment modal — Stripe Elements integration
 *
 * Creates a PaymentIntent via tRPC, renders Stripe PaymentElement,
 * handles success/error and navigates to checkout success.
 */

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, Lock, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface Props {
  open: boolean;
  packageName?: string;
  packagePrice?: number;
  orderId?: string;
  onSuccess: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function PaymentModal({
  open,
  packageName = 'Individual Will Package',
  packagePrice = 99,
  orderId,
  onSuccess,
  onSkip,
  onClose,
}: Props) {
  const createPaymentIntent = trpc.stripe.createPaymentIntent.useMutation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create payment intent when modal opens
  useMemo(() => {
    if (open && !clientSecret && orderId && !createPaymentIntent.isPending) {
      createPaymentIntent.mutate(
        { orderId },
        {
          onSuccess: (result) => {
            setClientSecret(result.clientSecret);
          },
          onError: (err) => {
            setError(err.message || 'Failed to initialize payment. Please try again.');
          },
        }
      );
    }
  }, [open, orderId]);

  if (!open) return null;

  // If Stripe is not configured, show the placeholder flow
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-[var(--ifw-neutral-400)] hover:text-[var(--ifw-neutral-600)]"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1">
            Complete Your Order
          </h3>
          <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">
            Payment processing is not configured yet.
          </p>

          <div className="border border-[var(--ifw-neutral-200)] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--ifw-neutral-900)]">
                {packageName}
              </span>
              <span className="text-lg font-bold text-[var(--ifw-primary-700)]">
                ${packagePrice}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onSkip}
              className="w-full px-4 py-2 rounded-lg text-sm text-[var(--ifw-neutral-500)] hover:bg-[var(--ifw-neutral-50)]"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 z-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--ifw-neutral-400)] hover:text-[var(--ifw-neutral-600)]"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1">
          Complete Your Order
        </h3>
        <p className="text-sm text-[var(--ifw-neutral-500)] mb-4">
          Unlock your completed documents with a one-time payment.
        </p>

        {/* Package summary */}
        <div className="border border-[var(--ifw-neutral-200)] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--ifw-neutral-900)]">{packageName}</span>
            <span className="text-lg font-bold text-[var(--ifw-primary-700)]">${packagePrice}</span>
          </div>
          <ul className="text-xs text-[var(--ifw-neutral-500)] space-y-1">
            <li>- Legally valid documents</li>
            <li>- Unlimited edits for 1 year</li>
            <li>- PDF download &amp; print</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripePaymentForm
              onSuccess={onSuccess}
              onError={setError}
              packagePrice={packagePrice}
            />
          </Elements>
        ) : createPaymentIntent.isPending ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ifw-primary-700)] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onSkip}
              className="w-full px-4 py-2 rounded-lg text-sm text-[var(--ifw-neutral-500)] hover:bg-[var(--ifw-neutral-50)]"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inner Stripe payment form — must be wrapped in <Elements>
 */
function StripePaymentForm({
  onSuccess,
  onError,
  packagePrice,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  packagePrice: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setProcessing(true);

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/app/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Payment failed. Please try again.');
        setProcessing(false);
      } else {
        onSuccess();
      }
    },
    [stripe, elements, onSuccess, onError]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--ifw-primary-700)' }}
      >
        <Lock className="h-3.5 w-3.5" />
        {processing ? 'Processing...' : `Pay $${packagePrice}`}
      </button>

      <p className="text-center text-[10px] text-[var(--ifw-neutral-400)]">
        Secured by Stripe. Your payment information is encrypted.
      </p>
    </form>
  );
}
