/**
 * Person confirmation modal — gates shared steps for couples packages
 *
 * Shown before entering Key Names, Assets, Bequests steps when the user
 * has a couples package. Confirms which profile the step applies to.
 */

interface Props {
  open: boolean;
  ownerName: string;
  stepLabel: string;
  isSharedStep: boolean;
  onConfirm: () => void;
}

export function PersonConfirmationModal({
  open,
  ownerName,
  stepLabel,
  isSharedStep,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 z-10">
        <div className="w-12 h-12 rounded-full bg-[var(--ifw-primary-50)] flex items-center justify-center mx-auto mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ifw-primary-700)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] text-center mb-2">
          {stepLabel}
        </h3>

        <p className="text-sm text-[var(--ifw-neutral-500)] text-center mb-2">
          You are currently editing{' '}
          <strong className="text-[var(--ifw-primary-700)]">{ownerName}&apos;s</strong> documents.
        </p>

        {isSharedStep && (
          <p className="text-xs text-[var(--ifw-neutral-400)] text-center mb-6 bg-[var(--ifw-neutral-50)] rounded-lg px-3 py-2">
            This is a shared step. Changes here will apply to both profiles.
          </p>
        )}

        {!isSharedStep && (
          <p className="text-xs text-[var(--ifw-neutral-400)] text-center mb-6">
            Changes in this step apply only to {ownerName}&apos;s will.
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
