/**
 * WizardBreadcrumb — horizontal numbered-pill breadcrumb showing ALL visible steps
 *
 * Renders two bars:
 * 1. Pill bar: scrollable row of numbered step pills (gold = current, green = done, gray = pending)
 * 2. Info bar: current step number + label + description
 *
 * Following the pills left-to-right completes the entire will.
 */

import { useEffect, useRef } from 'react';
import type { StepConfig } from '../../lib/wizard';

/** Step descriptions keyed by step ID */
const STEP_DESCRIPTIONS: Record<string, string> = {
  'personal-info': 'Your full legal name, date of birth, and contact details for your will.',
  children: 'Add key names — family members and important people for your will.',
  'key-people': 'Trusted people who may serve as executors, guardians, or witnesses.',
  guardians: 'Choose who will care for your minor children if needed.',
  'pet-guardians': 'Designate a guardian for your pets and any care funds.',
  assets: 'List what you own: property, accounts, investments, and things you value.',
  bequests: 'Assign specific gifts of money or items to people or charities.',
  residue: 'Decide how to divide whatever remains after specific gifts.',
  inheritance: 'Set up trusting arrangements and age conditions for inheritance.',
  executors: 'Choose who will carry out the instructions in your will.',
  wipeout: 'A backup plan if all your named beneficiaries pass away before you.',
  additional: 'Funeral wishes, organ donation, and other personal requests.',
  'final-details': 'Review key dates, signing instructions, and witness requirements.',
  'poa-property': 'Authorize someone to manage your finances and legal matters if you become incapacitated.',
  'poa-health': 'Designate someone to make medical decisions on your behalf.',
  enhance: 'Review optional add-ons to strengthen your estate plan.',
  review: 'Review, edit, and download your completed estate planning documents.',
};

interface Props {
  /** All visible steps in order (across all categories) */
  allSteps: StepConfig[];
  /** Currently active step ID */
  currentStepId: string | null;
  /** Set of completed step IDs */
  completedSteps: Set<string>;
  /** Called when user clicks a step pill */
  onStepClick: (stepId: string) => void;
}

export function WizardBreadcrumb({ allSteps, currentStepId, completedSteps, onStepClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the active pill into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const pillLeft = pill.offsetLeft;
      const pillWidth = pill.offsetWidth;
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      // If pill is out of view, scroll to center it
      if (pillLeft < scrollLeft || pillLeft + pillWidth > scrollLeft + containerWidth) {
        container.scrollTo({
          left: pillLeft - containerWidth / 2 + pillWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [currentStepId]);

  const currentGlobalIndex = allSteps.findIndex((s) => s.id === currentStepId);
  const currentStep = currentGlobalIndex >= 0 ? allSteps[currentGlobalIndex] : null;
  const description = currentStep ? (STEP_DESCRIPTIONS[currentStep.id] ?? '') : '';

  return (
    <div>
      {/* Pill bar */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 px-6 py-2.5 overflow-x-auto scrollbar-hide bg-white border-b border-[var(--ifw-neutral-100)]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allSteps.map((step, index) => {
          const isCurrent = step.id === currentStepId;
          const isCompleted = completedSteps.has(step.id);
          const stepNum = index + 1;

          return (
            <button
              key={step.id}
              ref={isCurrent ? activeRef : undefined}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`
                flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                text-xs font-medium transition-all whitespace-nowrap
                ${
                  isCurrent
                    ? 'text-[#0C1F3C] shadow-sm'
                    : isCompleted
                      ? 'text-green-800 hover:opacity-80'
                      : 'text-[var(--ifw-neutral-500)] hover:bg-[var(--ifw-neutral-100)]'
                }
              `}
              style={
                isCurrent
                  ? { backgroundColor: '#FFBF00' }
                  : isCompleted
                    ? { backgroundColor: 'rgba(34, 197, 94, 0.15)' }
                    : { backgroundColor: 'var(--ifw-neutral-50, #F9FAFB)' }
              }
            >
              <span
                className={`
                  flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${
                    isCurrent
                      ? 'bg-[#0C1F3C] text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-[var(--ifw-neutral-200)] text-[var(--ifw-neutral-500)]'
                  }
                `}
              >
                {isCompleted && !isCurrent ? '✓' : stepNum}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Info bar */}
      {currentStep && (
        <div className="px-6 py-2 bg-[var(--ifw-neutral-50,#F9FAFB)] border-b border-[var(--ifw-neutral-100)] flex items-center gap-3">
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
          >
            {currentGlobalIndex + 1}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--ifw-neutral-900)]">
              {currentStep.label}
            </span>
            {description && (
              <span className="text-sm text-[var(--ifw-neutral-500)] ml-2">{description}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
