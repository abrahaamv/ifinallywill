/**
 * Wizard progress bar — shows overall completion
 */

interface Props {
  currentStep: number;
  totalSteps: number;
  completionPct: number;
}

export function WizardProgress({ currentStep, totalSteps, completionPct }: Props) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-[var(--ifw-neutral-500)] mb-2">
        <span>
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span>{completionPct}% complete</span>
      </div>
      <div className="h-2 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${completionPct}%`,
            backgroundColor:
              completionPct === 100 ? 'var(--ifw-success)' : 'var(--ifw-primary-500)',
          }}
        />
      </div>
    </div>
  );
}
