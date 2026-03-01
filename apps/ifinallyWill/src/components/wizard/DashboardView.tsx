/**
 * Dashboard view — category card grid with completion tracking
 *
 * Shows overview of all will categories with progress bars,
 * "Continue where you left off" recommendation, and overall progress.
 */

import type { CategoryCompletion } from '../../hooks/usePersonalData';
import type { StepConfig, WizardCategory } from '../../lib/wizard';

interface Props {
  ownerName: string;
  categoryCompletions: CategoryCompletion[];
  overallProgress: number;
  recommendedStep: StepConfig | null;
  onCategoryClick: (category: WizardCategory) => void;
  onStepClick: (stepId: string) => void;
}

const CATEGORY_META: Record<
  WizardCategory,
  { icon: string; description: string; estimate: string }
> = {
  aboutYou: {
    icon: '📝',
    description: 'Personal details, family status, and spouse information',
    estimate: '5-10 min',
  },
  people: {
    icon: '👥',
    description: 'Key names, key people, and pet guardians',
    estimate: '10-15 min',
  },
  assets: {
    icon: '💰',
    description: 'List and describe your assets',
    estimate: '10-15 min',
  },
  gifts: {
    icon: '🎁',
    description: 'Assign specific gifts to people or charities',
    estimate: '5-10 min',
  },
  residue: {
    icon: '📊',
    description: 'Distribute whatever remains after specific gifts',
    estimate: '5 min',
  },
  children: {
    icon: '👶',
    description: 'Trusting arrangements and guardians for minor children',
    estimate: '5-10 min',
  },
  wipeout: {
    icon: '🔄',
    description: 'Backup plan if all named beneficiaries pass away',
    estimate: '5 min',
  },
  finalArrangements: {
    icon: '📋',
    description: 'Executors, POAs, additional wishes, and final review',
    estimate: '15-20 min',
  },
};

export function DashboardView({
  ownerName,
  categoryCompletions,
  overallProgress,
  recommendedStep,
  onCategoryClick,
  onStepClick,
}: Props) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Overall progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)]">
            {ownerName}&apos;s Will
          </h2>
          <span className="text-sm font-medium text-[var(--ifw-neutral-500)]">
            {overallProgress}% complete
          </span>
        </div>
        <div className="h-3 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallProgress}%`,
              background:
                overallProgress === 100
                  ? 'var(--ifw-success)'
                  : 'linear-gradient(90deg, #FFBF00, #FFD54F)',
            }}
          />
        </div>
      </div>

      {/* Recommended next step */}
      {recommendedStep && overallProgress < 100 && (
        <button
          type="button"
          onClick={() => onStepClick(recommendedStep.id)}
          className="w-full mb-6 p-4 rounded-xl border border-dashed border-[var(--ifw-primary-300)] bg-[var(--ifw-primary-50)] hover:bg-[var(--ifw-primary-100)] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #FFBF00, #FFD54F)' }}
            >
              ▶
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--ifw-primary-700)]">
                Continue where you left off
              </div>
              <div className="text-xs text-[var(--ifw-neutral-500)]">{recommendedStep.label}</div>
            </div>
          </div>
        </button>
      )}

      {/* Category cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryCompletions.map((cat) => {
          const meta = CATEGORY_META[cat.category];
          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => onCategoryClick(cat.category)}
              className="text-left p-5 rounded-xl border border-[var(--ifw-neutral-200)] bg-white hover:border-[var(--ifw-primary-300)] hover:shadow-md transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--ifw-neutral-900)] group-hover:text-[var(--ifw-primary-700)]">
                      {cat.label}
                    </h3>
                    <span className="text-[10px] text-[var(--ifw-neutral-400)]">
                      {meta.estimate}
                    </span>
                  </div>
                </div>
                {cat.isComplete && (
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--ifw-success)] flex items-center justify-center text-white text-xs">
                    ✓
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--ifw-neutral-500)] mb-3">{meta.description}</p>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.isComplete ? 'var(--ifw-success)' : '#FFBF00',
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[var(--ifw-neutral-400)] tabular-nums">
                  {cat.completed}/{cat.total}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
