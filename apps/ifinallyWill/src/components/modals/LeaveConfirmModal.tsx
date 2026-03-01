/**
 * Leave confirmation modal — prompts when navigating away from a step
 */

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveConfirmModal({ open, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 z-10">
        <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-2">
          Leave this section?
        </h3>
        <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">
          Your progress has been auto-saved. You can return to this step at any time from the
          dashboard.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--ifw-neutral-600)] border border-[var(--ifw-neutral-200)] hover:bg-[var(--ifw-neutral-50)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
