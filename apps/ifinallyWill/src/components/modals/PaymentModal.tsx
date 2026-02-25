/**
 * Payment modal — placeholder for Stripe integration
 *
 * Shows selected package info and provides Pay Now / Skip actions.
 * Actual Stripe checkout will be integrated in the payment phase.
 */

interface Props {
  open: boolean;
  packageName?: string;
  packagePrice?: number;
  onPay: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function PaymentModal({
  open,
  packageName = 'Individual Will Package',
  packagePrice = 99,
  onPay,
  onSkip,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 z-10">
        <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1">
          Complete Your Order
        </h3>
        <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">
          Unlock your completed documents with a one-time payment.
        </p>

        {/* Package card */}
        <div className="border border-[var(--ifw-neutral-200)] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--ifw-neutral-900)]">
              {packageName}
            </span>
            <span className="text-lg font-bold text-[var(--ifw-primary-700)]">
              ${packagePrice}
            </span>
          </div>
          <ul className="text-xs text-[var(--ifw-neutral-500)] space-y-1">
            <li>- Legally valid documents</li>
            <li>- Unlimited edits for 1 year</li>
            <li>- PDF download &amp; print</li>
          </ul>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onPay}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Pay Now — ${packagePrice}
          </button>
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
