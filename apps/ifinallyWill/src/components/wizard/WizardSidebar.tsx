/**
 * Wizard sidebar — step list with completion indicators
 */

import type { WizardStep } from '../../config/wizardConfig';

interface Props {
  steps: WizardStep[];
  currentStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
}

export function WizardSidebar({ steps, currentStepId, completedSteps, onStepClick }: Props) {
  return (
    <nav className="space-y-1">
      {steps.map((step, i) => {
        const isCurrent = step.id === currentStepId;
        const isCompleted = step.section
          ? completedSteps.includes(step.section)
          : false;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
              isCurrent
                ? 'bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)] font-medium'
                : 'hover:bg-[var(--ifw-neutral-100)] text-[var(--ifw-neutral-600)]'
            }`}
          >
            {/* Step indicator */}
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isCompleted
                  ? 'bg-[var(--ifw-success)] text-white'
                  : isCurrent
                    ? 'border-2 border-[var(--ifw-primary-700)] text-[var(--ifw-primary-700)]'
                    : 'border border-[var(--ifw-neutral-300)] text-[var(--ifw-neutral-400)]'
              }`}
            >
              {isCompleted ? '✓' : i + 1}
            </span>

            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
