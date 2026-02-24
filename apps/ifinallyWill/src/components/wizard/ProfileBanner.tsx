/**
 * Profile banner for couples flow — shows whose will you're editing
 */

interface Props {
  ownerName: string;
  isCouple: boolean;
  coupleDocId?: string | null;
  onSwitch?: () => void;
}

export function ProfileBanner({ ownerName, isCouple, coupleDocId, onSwitch }: Props) {
  if (!isCouple) return null;

  return (
    <div className="bg-[var(--ifw-primary-50)] border border-[var(--ifw-primary-200)] rounded-lg px-4 py-2 flex items-center justify-between mb-4">
      <div className="text-sm">
        <span className="text-[var(--ifw-neutral-500)]">Editing:</span>{' '}
        <span className="font-medium text-[var(--ifw-primary-700)]">{ownerName}&apos;s Will</span>
      </div>
      {coupleDocId && onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          className="text-xs font-medium text-[var(--ifw-primary-700)] hover:underline"
        >
          Switch to partner&apos;s will &rarr;
        </button>
      )}
    </div>
  );
}
