/**
 * Profile banner — shows current profile and document context
 *
 * Full indicator for couples flow showing whose will is being edited,
 * with switch button and document type badge.
 */

import { useState } from 'react';

interface Props {
  ownerName: string;
  isCouple: boolean;
  coupleDocId?: string | null;
  onSwitch?: () => void;
}

export function ProfileBanner({ ownerName, isCouple, coupleDocId, onSwitch }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isCouple) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-800/20 flex items-center justify-center text-amber-900 text-xs font-bold">
          {ownerName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-amber-900 hidden sm:inline">{ownerName}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-800/10 hover:bg-amber-800/20 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-amber-800/20 flex items-center justify-center text-amber-900 text-xs font-bold">
          {ownerName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-amber-900">{ownerName}&apos;s Will</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-800"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-[var(--ifw-neutral-200)] py-1 min-w-[200px]">
            <div className="px-3 py-2 text-xs text-[var(--ifw-neutral-400)] font-medium">
              Editing
            </div>
            <div className="px-3 py-2 flex items-center gap-2 bg-[var(--ifw-primary-50)]">
              <div className="w-6 h-6 rounded-full bg-[var(--ifw-primary-100)] flex items-center justify-center text-[var(--ifw-primary-700)] text-xs font-bold">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--ifw-primary-700)]">{ownerName}</div>
                <div className="text-[10px] text-[var(--ifw-neutral-400)]">Primary Will</div>
              </div>
            </div>

            {coupleDocId && onSwitch && (
              <>
                <div className="border-t border-[var(--ifw-neutral-100)] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    onSwitch();
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--ifw-neutral-50)] text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--ifw-neutral-100)] flex items-center justify-center text-[var(--ifw-neutral-500)] text-xs font-bold">
                    P
                  </div>
                  <div>
                    <div className="text-sm text-[var(--ifw-neutral-700)]">Partner&apos;s Will</div>
                    <div className="text-[10px] text-[var(--ifw-neutral-400)]">Switch profile</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
