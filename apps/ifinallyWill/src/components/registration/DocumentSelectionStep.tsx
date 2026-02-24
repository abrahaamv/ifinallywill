/**
 * Step 3: Document selection
 * Choose which estate documents to create (replaces v6 package selection)
 */

import { BUNDLE_PRICE, BUNDLE_SAVINGS, DOCUMENT_TYPES } from '../../config/documents';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function DocumentSelectionStep({ data, onUpdate, onNext, onPrev }: Props) {
  const toggleDoc = (type: string) => {
    const current = data.selectedDocuments;
    const next = current.includes(type)
      ? current.filter((d) => d !== type)
      : [...current, type];
    onUpdate({ selectedDocuments: next });
  };

  const selectBundle = () => {
    onUpdate({ selectedDocuments: DOCUMENT_TYPES.map((d) => d.type) });
  };

  const selectedTotal = data.selectedDocuments.reduce((sum, type) => {
    const doc = DOCUMENT_TYPES.find((d) => d.type === type);
    return sum + (doc?.price ?? 0);
  }, 0);

  const isBundle = data.selectedDocuments.length === DOCUMENT_TYPES.length;
  const displayPrice = isBundle ? BUNDLE_PRICE : selectedTotal;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">What would you like to create?</h1>
      <p className="text-[var(--ifw-neutral-500)] mb-8 text-center">
        Select individual documents or get the complete bundle and save.
      </p>

      {/* Bundle option */}
      <button
        type="button"
        onClick={selectBundle}
        className={`w-full border-2 rounded-xl p-6 mb-6 text-left transition-all hover:border-[var(--ifw-accent-500)] ${
          isBundle
            ? 'border-[var(--ifw-accent-500)] bg-[var(--ifw-accent-50)]'
            : 'border-[var(--ifw-neutral-200)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Complete Bundle — All 4 Documents</h2>
            <p className="text-sm text-[var(--ifw-neutral-500)] mt-1">
              Everything you need for complete estate protection
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${BUNDLE_PRICE}</div>
            <div className="text-sm text-[var(--ifw-success)] font-medium">
              Save ${BUNDLE_SAVINGS}
            </div>
          </div>
        </div>
      </button>

      <div className="text-center text-sm text-[var(--ifw-neutral-400)] mb-6">
        — or select individually —
      </div>

      {/* Individual documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map((doc) => {
          const selected = data.selectedDocuments.includes(doc.type);
          return (
            <button
              key={doc.type}
              type="button"
              onClick={() => toggleDoc(doc.type)}
              className={`border-2 rounded-xl p-5 text-left transition-all hover:border-[var(--ifw-primary-500)] ${
                selected
                  ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)]'
                  : 'border-[var(--ifw-neutral-200)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl mb-2">{doc.icon}</div>
                  <h3 className="font-semibold">{doc.name}</h3>
                  <p className="text-sm text-[var(--ifw-neutral-500)] mt-1">{doc.description}</p>
                </div>
                <div className="text-lg font-bold ml-4">${doc.price}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
        >
          Back
        </button>

        <div className="flex items-center gap-4">
          {data.selectedDocuments.length > 0 && (
            <span className="text-sm text-[var(--ifw-neutral-500)]">
              Total: <strong className="text-[var(--ifw-neutral-900)]">${displayPrice}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={data.selectedDocuments.length === 0}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
