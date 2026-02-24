/**
 * Standard step layout — title, description, content, navigation buttons
 */

import { SaveIndicator } from '../wizard/SaveIndicator';
import type { SaveStatus } from '../../hooks/useAutoSave';

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  saveStatus?: SaveStatus;
  canProceed?: boolean;
}

export function StepLayout({
  title,
  description,
  children,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  saveStatus,
  canProceed = true,
}: Props) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          {saveStatus && <SaveIndicator status={saveStatus} />}
        </div>
        {description && (
          <p className="text-sm text-[var(--ifw-neutral-500)] mt-1">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="mb-8">{children}</div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirstStep}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          &larr; Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          {isLastStep ? 'Finish' : 'Next \u2192'}
        </button>
      </div>
    </div>
  );
}
