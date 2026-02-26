/**
 * Checkout page — create order, apply discount, pay via Stripe
 *
 * Users arrive here after selecting documents from the dashboard.
 * URL: /app/checkout?docs=uuid1,uuid2,...
 */

import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { trpc } from '../../utils/trpc';
import { DOCUMENT_TYPES, BUNDLE_PRICE, BUNDLE_SAVINGS } from '../../config/documents';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docIds = useMemo(
    () => (searchParams.get('docs') ?? '').split(',').filter(Boolean),
    [searchParams],
  );

  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Fetch documents for display
  const { data: documents } = trpc.estateDocuments.list.useQuery();
  const selectedDocs = useMemo(
    () => (documents ?? []).filter((d) => docIds.includes(d.id)),
    [documents, docIds],
  );

  const createOrder = trpc.documentOrders.create.useMutation();
  const applyCode = trpc.documentOrders.applyCode.useMutation();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();
  const { data: order } = trpc.documentOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId },
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

  const handleCreateOrder = async () => {
    if (docIds.length === 0) return;
    try {
      const result = await createOrder.mutateAsync({ estateDocIds: docIds });
      setOrderId(result.id);
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  const handleApplyCode = async () => {
    if (!orderId || !discountCode.trim()) return;
    setDiscountError(null);
    try {
      await applyCode.mutateAsync({
        orderId,
        code: discountCode.trim(),
      });
      setDiscountCode('');
    } catch (err) {
      setDiscountError(err instanceof Error ? err.message : 'Invalid code');
    }
  };

  const handlePay = async () => {
    if (!orderId) return;
    setPayError(null);

    // If order is free after discount, go straight to success
    if (finalPrice === 0) {
      navigate(`/app/checkout/success?order=${orderId}`);
      return;
    }

    try {
      const result = await createCheckout.mutateAsync({ orderId });
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

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
              <span className="text-sm font-medium">
                ${(item.price / 100).toFixed(2)}
              </span>
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
          {discountError && (
            <p className="text-xs text-[var(--ifw-error)] mt-2">{discountError}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!orderId ? (
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={createOrder.isPending}
            className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {createOrder.isPending ? 'Creating Order...' : 'Continue to Payment'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePay}
            disabled={createCheckout.isPending}
            className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {createCheckout.isPending ? 'Redirecting to Stripe...' : `Pay $${(finalPrice / 100).toFixed(2)} with Stripe`}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="px-6 py-3 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
        >
          Cancel
        </button>
      </div>

      {payError && (
        <p className="text-xs text-[var(--ifw-error)] mt-3 text-center">{payError}</p>
      )}

      <p className="text-xs text-[var(--ifw-text-muted)] mt-4 text-center">
        Secure payment powered by Stripe. Your payment details are never stored on our servers.
      </p>
    </div>
  );
}
