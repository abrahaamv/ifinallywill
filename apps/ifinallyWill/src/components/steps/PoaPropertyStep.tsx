/**
 * POA for Property step — authorize someone to manage finances and property
 */

import type { StepProps } from '../../lib/types';

export function PoaPropertyStep({ onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--ifw-neutral-900)]">POA for Property</h2>
        <p className="mt-1 text-sm text-[var(--ifw-neutral-500)]">
          Authorize someone to manage your finances, property, and legal matters if you become
          incapacitated.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--ifw-neutral-200)] bg-white p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏠</div>
          <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-2">
            Property Power of Attorney
          </h3>
          <p className="text-sm text-[var(--ifw-neutral-500)] max-w-md mx-auto">
            This document allows your chosen attorney to manage your financial affairs, including
            banking, investments, real estate, and tax matters on your behalf.
          </p>
          <p className="text-xs text-[var(--ifw-neutral-400)] mt-4">
            Full POA form coming soon. Click Save & Continue to proceed.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--ifw-neutral-100)]">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onPrev}
            className="px-4 py-2 text-sm font-medium text-[var(--ifw-neutral-600)] hover:text-[var(--ifw-neutral-900)] transition-colors"
          >
            Back
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
          >
            {isLastStep ? 'Finish' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
