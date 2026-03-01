/**
 * Enhance Your Plan step — optional add-ons and services
 */

import type { StepProps } from '../../lib/types';

export function EnhanceStep({ onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--ifw-neutral-900)]">Enhance Your Plan</h2>
        <p className="mt-1 text-sm text-[var(--ifw-neutral-500)]">
          Review optional add-ons to strengthen your estate plan with additional documents or
          services.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--ifw-neutral-200)] bg-white p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-2">
            Strengthen Your Estate Plan
          </h3>
          <p className="text-sm text-[var(--ifw-neutral-500)] max-w-md mx-auto">
            Consider additional documents such as a secondary will, POA documents, or professional
            review services to ensure comprehensive protection.
          </p>
          <p className="text-xs text-[var(--ifw-neutral-400)] mt-4">
            Enhancement options coming soon. Click Save & Continue to proceed.
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
