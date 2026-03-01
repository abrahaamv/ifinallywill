/**
 * Wizard sidebar — category-based collapsible navigation
 *
 * Design language matches EstatePlanningPage:
 *  - Gold (#FFBF00) active, green (#4CAF50) complete, gray (#E5E7EB) inactive
 *  - Navy (#0C1F3C) text, numbered category circles, left pill accents
 *  - Check/arrow icons for step status
 */

import { useEffect, useMemo, useState } from 'react';
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

/** @deprecated Legacy props for WizardShell backward compatibility. */
interface LegacyProps {
  steps: StepConfig[];
  currentStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
}

function isNewProps(props: Props | LegacyProps): props is Props {
  return 'wizardContext' in props;
}

export function WizardSidebar(props: Props): React.JSX.Element;
export function WizardSidebar(props: LegacyProps): React.JSX.Element;
export function WizardSidebar(props: Props | LegacyProps) {
  if (!isNewProps(props)) return <LegacySidebar {...props} />;
  return <CategorySidebar {...props} />;
}

// ---------------------------------------------------------------------------
// Category-based sidebar
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

  const [expanded, setExpanded] = useState<Set<WizardCategory>>(() => {
    const initial = new Set<WizardCategory>();
    if (activeCategory) initial.add(activeCategory);
    return initial;
  });

  // Keep active category expanded when it changes
  useEffect(() => {
    if (activeCategory) {
      setExpanded((prev) => {
        if (prev.has(activeCategory)) return prev;
        const next = new Set(prev);
        next.add(activeCategory);
        return next;
      });
    }
  }, [activeCategory]);

  const toggleExpand = (category: WizardCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <nav className="space-y-1">
      {grouped.map((group, catIndex) => {
        const isExpanded = expanded.has(group.category);
        const groupCompleted = group.steps.filter((s) => completedSet.has(s.id)).length;
        const allDone = groupCompleted === group.steps.length;
        const isActive = group.category === activeCategory;

        return (
          <div
            key={group.category}
            className="rounded-lg overflow-hidden"
            style={{
              boxShadow: isActive ? '0 1px 4px rgba(10, 30, 134, 0.08)' : 'none',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
            }}
          >
            {/* Category header */}
            <button
              type="button"
              onClick={() => {
                toggleExpand(group.category);
                if (!isExpanded) onCategoryClick(group.category);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors relative"
              style={{
                borderLeft: isActive
                  ? '3px solid #FFBF00'
                  : allDone
                    ? '3px solid #4CAF50'
                    : '3px solid transparent',
              }}
            >
              {/* Numbered circle */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  backgroundColor: allDone ? '#4CAF50' : isActive ? '#FFBF00' : '#E5E7EB',
                  color: allDone ? '#FFFFFF' : isActive ? '#0C1F3C' : '#9CA3AF',
                  boxShadow: isActive ? '0 0 6px rgba(255, 191, 0, 0.35)' : 'none',
                }}
              >
                {allDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  catIndex + 1
                )}
              </div>

              {/* Label + progress */}
              <div className="flex-1 min-w-0">
                <span
                  className="block text-sm font-bold truncate"
                  style={{ color: '#0C1F3C' }}
                >
                  {group.label}
                </span>
                <span
                  className="block text-[10px] leading-tight"
                  style={{ color: allDone ? '#4CAF50' : '#9CA3AF' }}
                >
                  {allDone ? 'Complete' : `${groupCompleted}/${group.steps.length} steps`}
                </span>
              </div>

              {/* Chevron */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 transition-transform duration-200"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Steps list */}
            {isExpanded && (
              <div className="pb-1.5 pl-3 pr-1">
                {group.steps.map((step) => {
                  const isCurrent = step.id === currentStepId;
                  const isCompleted = completedSet.has(step.id);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onStepClick(step.id)}
                      className="w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-left transition-colors group"
                      style={{
                        backgroundColor: isCurrent ? 'rgba(255, 191, 0, 0.12)' : 'transparent',
                      }}
                    >
                      {/* Step status circle */}
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: isCompleted
                            ? '#4CAF50'
                            : isCurrent
                              ? '#FFBF00'
                              : 'transparent',
                          border: !isCompleted && !isCurrent ? '1.5px solid #D1D5DB' : 'none',
                          boxShadow: isCurrent ? '0 0 4px rgba(255, 191, 0, 0.3)' : 'none',
                        }}
                      >
                        {isCompleted ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0C1F3C' }} />
                        ) : null}
                      </div>

                      {/* Step label */}
                      <span
                        className="flex-1 text-[13px] truncate transition-colors"
                        style={{
                          color: isCurrent ? '#0C1F3C' : isCompleted ? '#374151' : '#6B7280',
                          fontWeight: isCurrent ? 600 : isCompleted ? 500 : 400,
                        }}
                      >
                        {step.label}
                      </span>
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
// Legacy flat sidebar (WizardShell backward compatibility)
// ---------------------------------------------------------------------------

function LegacySidebar({ steps, currentStepId, completedSteps, onStepClick }: LegacyProps) {
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    steps: steps.filter((s) => s.category === cat.key),
  })).filter((g) => g.steps.length > 0);

  let stepNumber = 0;

  return (
    <nav className="space-y-4">
      {grouped.map((group) => (
        <div key={group.key}>
          <h4
            className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-3"
            style={{ color: '#9CA3AF' }}
          >
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors"
                  style={{
                    backgroundColor: isCurrent ? 'rgba(255, 191, 0, 0.12)' : 'transparent',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: isCompleted ? '#4CAF50' : isCurrent ? '#FFBF00' : '#E5E7EB',
                      color: isCompleted ? '#FFFFFF' : isCurrent ? '#0C1F3C' : '#9CA3AF',
                    }}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      color: isCurrent ? '#0C1F3C' : isCompleted ? '#374151' : '#6B7280',
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
