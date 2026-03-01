/**
 * Wizard sidebar — category-based collapsible navigation with completion indicators
 *
 * Categories expand/collapse to show steps within. Current step highlighted.
 * Supports both PersonalShell (category-aware) and legacy WizardShell usage.
 */

import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  type StepConfig,
  type WizardCategory,
  type WizardContext,
  getStepsByCategory,
} from '../../lib/wizard';

interface Props {
  wizardContext: WizardContext;
  currentStepId: string;
  completedSteps: string[];
  activeCategory: WizardCategory | null;
  onStepClick: (stepId: string) => void;
  onCategoryClick: (category: WizardCategory) => void;
}

/**
 * @deprecated Legacy props for WizardShell backward compatibility.
 * Use the new Props interface with wizardContext for PersonalShell.
 */
interface LegacyProps {
  steps: StepConfig[];
  currentStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
}

// Type guard for new vs legacy props
function isNewProps(props: Props | LegacyProps): props is Props {
  return 'wizardContext' in props;
}

export function WizardSidebar(props: Props): React.JSX.Element;
export function WizardSidebar(props: LegacyProps): React.JSX.Element;
export function WizardSidebar(props: Props | LegacyProps) {
  if (!isNewProps(props)) {
    // Legacy mode — flat step list grouped by category
    return <LegacySidebar {...props} />;
  }

  return <CategorySidebar {...props} />;
}

// ---------------------------------------------------------------------------
// New category-based sidebar
// ---------------------------------------------------------------------------

function CategorySidebar({
  wizardContext,
  currentStepId,
  completedSteps,
  activeCategory,
  onStepClick,
  onCategoryClick,
}: Props) {
  const grouped = useMemo(() => getStepsByCategory(wizardContext), [wizardContext]);

  const completedSet = useMemo(() => new Set(completedSteps), [completedSteps]);

  // Expand active category by default, collapse others
  const [expanded, setExpanded] = useState<Set<WizardCategory>>(() => {
    const initial = new Set<WizardCategory>();
    if (activeCategory) initial.add(activeCategory);
    return initial;
  });

  const toggleExpand = (category: WizardCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <nav className="space-y-1">
      {grouped.map((group) => {
        const isExpanded = expanded.has(group.category);
        const groupCompleted = group.steps.filter((s) => completedSet.has(s.id)).length;
        const allDone = groupCompleted === group.steps.length;
        const isActive = group.category === activeCategory;

        return (
          <div key={group.category}>
            {/* Category header */}
            <button
              type="button"
              onClick={() => {
                toggleExpand(group.category);
                if (!isExpanded) {
                  onCategoryClick(group.category);
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                isActive
                  ? 'bg-[rgba(124,58,237,0.15)] text-[var(--ifw-primary-700)] font-medium'
                  : 'hover:bg-[var(--ifw-neutral-100)] text-[var(--ifw-neutral-700)]'
              }`}
            >
              {/* Completion indicator */}
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  allDone
                    ? 'bg-[var(--ifw-success)] text-white'
                    : 'border border-[var(--ifw-neutral-300)] text-[var(--ifw-neutral-400)]'
                }`}
              >
                {allDone ? '✓' : `${groupCompleted}`}
              </span>

              <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider">
                {group.label}
              </span>

              {/* Expand/collapse chevron */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 transition-transform duration-200"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Steps (expanded) */}
            {isExpanded && (
              <div className="ml-2 mt-0.5 space-y-0.5">
                {group.steps.map((step) => {
                  const isCurrent = step.id === currentStepId;
                  const isCompleted = completedSet.has(step.id);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onStepClick(step.id)}
                      className={`w-full flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-lg text-left text-sm transition-all ${
                        isCurrent
                          ? 'bg-[rgba(124,58,237,0.15)] text-[var(--ifw-primary-700)] font-medium'
                          : 'hover:bg-[var(--ifw-neutral-100)] text-[var(--ifw-neutral-600)]'
                      }`}
                    >
                      {/* Step indicator */}
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isCurrent
                            ? 'bg-[var(--ifw-primary-700)] text-white'
                            : isCompleted
                              ? 'bg-[var(--ifw-neutral-300)] text-white'
                              : 'border border-[var(--ifw-neutral-200)]'
                        }`}
                      >
                        {isCompleted ? '✓' : ''}
                      </span>

                      <span className="truncate">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Legacy flat sidebar (backward compatibility with WizardShell)
// ---------------------------------------------------------------------------

function LegacySidebar({ steps, currentStepId, completedSteps, onStepClick }: LegacyProps) {
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
