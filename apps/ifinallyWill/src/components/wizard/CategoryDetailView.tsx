/**
 * Category detail view — step content with bottom navigation
 *
 * Renders the current step component within a category context,
 * with Save & Continue / Finish / Back navigation.
 */

import { Suspense } from 'react';
import type { WizardCategory, StepConfig } from '../../lib/wizard';
import type { WillData } from '../../lib/types';
import type { StepProps } from '../../lib/types';

// Step components — same map as WizardShell
import { PersonalInfoStep } from '../steps/PersonalInfoStep';
import { FamilyStatusStep } from '../steps/FamilyStatusStep';
import { SpouseInfoStep } from '../steps/SpouseInfoStep';
import { ChildrenStep } from '../steps/ChildrenStep';
import { KeyPeopleStep } from '../steps/KeyPeopleStep';
import { GuardianStep } from '../steps/GuardianStep';
import { PetGuardianStep } from '../steps/PetGuardianStep';
import { AssetsStep } from '../steps/AssetsStep';
import { BequestsStep } from '../steps/BequestsStep';
import { ResidueStep } from '../steps/ResidueStep';
import { InheritanceStep } from '../steps/InheritanceStep';
import { ExecutorsStep } from '../steps/ExecutorsStep';
import { WipeoutStep } from '../steps/WipeoutStep';
import { AdditionalStep } from '../steps/AdditionalStep';
import { FinalDetailsStep } from '../steps/FinalDetailsStep';
import { ReviewStep } from '../steps/ReviewStep';

const STEP_COMPONENTS: Record<string, React.ComponentType<StepProps>> = {
  'personal-info': PersonalInfoStep,
  'family-status': FamilyStatusStep,
  'spouse-info': SpouseInfoStep,
  children: ChildrenStep,
  'key-people': KeyPeopleStep,
  guardians: GuardianStep,
  'pet-guardians': PetGuardianStep,
  assets: AssetsStep,
  bequests: BequestsStep,
  residue: ResidueStep,
  inheritance: InheritanceStep,
  executors: ExecutorsStep,
  wipeout: WipeoutStep,
  additional: AdditionalStep,
  'final-details': FinalDetailsStep,
  review: ReviewStep,
};

interface Props {
  category: WizardCategory;
  categoryLabel: string;
  currentStep: StepConfig | null;
  currentIndex: number;
  totalSteps: number;
  estateDocId: string;
  willData: WillData;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onDashboard: () => void;
}

export function CategoryDetailView(props: Props) {
  const {
    categoryLabel,
    currentStep,
    currentIndex,
    totalSteps,
    estateDocId,
    willData,
    isFirstStep,
    isLastStep,
    onNext,
    onPrev,
    onDashboard,
  } = props;
  const StepComponent = currentStep ? STEP_COMPONENTS[currentStep.id] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Category header */}
      <div className="px-6 py-3 border-b border-[var(--ifw-neutral-100)] bg-white flex items-center gap-3">
        <button
          type="button"
          onClick={onDashboard}
          className="text-sm text-[var(--ifw-neutral-500)] hover:text-[var(--ifw-primary-700)] flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>
        <span className="text-[var(--ifw-neutral-300)]">/</span>
        <span className="text-sm font-medium text-[var(--ifw-neutral-900)]">
          {categoryLabel}
        </span>
        <span className="ml-auto text-xs text-[var(--ifw-neutral-400)]">
          Step {currentIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          {StepComponent ? (
            <div className="max-w-3xl">
              <StepComponent
                estateDocId={estateDocId}
                willData={willData as Record<string, unknown>}
                onNext={onNext}
                onPrev={onPrev}
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--ifw-neutral-500)]">
              <p className="text-sm">Step not found.</p>
              <button
                type="button"
                onClick={onDashboard}
                className="mt-2 text-sm font-medium text-[var(--ifw-primary-700)] hover:underline"
              >
                Return to dashboard
              </button>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
