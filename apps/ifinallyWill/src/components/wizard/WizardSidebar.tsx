/**
 * Wizard sidebar — step list grouped by category with completion indicators
 */

import type { StepConfig, WizardCategory } from '../../lib/wizard';
import { CATEGORIES } from '../../lib/wizard';

interface Props {
  steps: StepConfig[];
  currentStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
}

export function WizardSidebar({ steps, currentStepId, completedSteps, onStepClick }: Props) {
  // Group steps by category for visual separation
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    steps: steps.filter((s) => s.category === cat.key),
  })).filter((g) => g.steps.length > 0);

  let stepNumber = 0;

  return (
    <nav className="space-y-5">
      {grouped.map((group) => (
        <div key={group.key}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ifw-neutral-400)] mb-1.5 px-3">
            {group.label}
          </h4>
          <div className="space-y-0.5">
            {group.steps.map((step) => {
              stepNumber += 1;
              const isCurrent = step.id === currentStepId;
              const isCompleted = step.section
                ? completedSteps.includes(step.section)
                : completedSteps.includes(step.id);

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
                    {isCompleted ? '✓' : stepNumber}
                  </span>

                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
