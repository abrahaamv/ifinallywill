/**
 * Document selector modal — switch between document contexts
 *
 * Shown when a user with multiple documents (primary/secondary/spousal)
 * needs to switch which document they're editing.
 */

import type { DocumentType } from '../../lib/types';

interface DocumentOption {
  id: string;
  documentType: DocumentType;
  label: string;
  ownerName: string;
  completionPct: number;
}

interface Props {
  open: boolean;
  documents: DocumentOption[];
  currentDocId: string;
  onSelect: (docId: string) => void;
  onClose: () => void;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  primary_will: 'Primary Will',
  secondary_will: 'Secondary Will',
  poa_property: 'POA for Property',
  poa_health: 'POA for Health',
};

export function DocumentSelectorModal({
  open,
  documents,
  currentDocId,
  onSelect,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 z-10">
        <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1">
          Switch Document
        </h3>
        <p className="text-sm text-[var(--ifw-neutral-500)] mb-4">
          Select the document you&apos;d like to work on.
        </p>

        <div className="space-y-2">
          {documents.map((doc) => {
            const isCurrent = doc.id === currentDocId;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  onSelect(doc.id);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-[var(--ifw-primary-500)] bg-[var(--ifw-primary-50)]'
                    : 'border-[var(--ifw-neutral-200)] hover:border-[var(--ifw-primary-300)] hover:bg-[var(--ifw-neutral-50)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--ifw-neutral-900)]">
                      {DOC_TYPE_LABELS[doc.documentType]}
                    </div>
                    <div className="text-xs text-[var(--ifw-neutral-500)]">
                      {doc.ownerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--ifw-neutral-400)]">
                      {doc.completionPct}%
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-medium text-[var(--ifw-primary-700)]">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-2 h-1 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${doc.completionPct}%`,
                      backgroundColor: doc.completionPct === 100 ? 'var(--ifw-success)' : '#FFBF00',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg text-sm text-[var(--ifw-neutral-500)] hover:bg-[var(--ifw-neutral-50)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
