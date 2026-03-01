/**
 * Category detail view — step content with bottom navigation
 *
 * Renders the current step component within a category context,
 * with Save & Continue / Finish / Back navigation.
 */

import { Suspense } from 'react';
import type { WillData } from '../../lib/types';
import type { StepProps } from '../../lib/types';
import type { StepConfig, WizardCategory } from '../../lib/wizard';
import { WizardBreadcrumb } from './WizardBreadcrumb';

import { AdditionalStep } from '../steps/AdditionalStep';
import { AssetsStep } from '../steps/AssetsStep';
import { BequestsStep } from '../steps/BequestsStep';
import { ChildrenStep } from '../steps/ChildrenStep';
import { EnhanceStep } from '../steps/EnhanceStep';
import { ExecutorsStep } from '../steps/ExecutorsStep';
import { FinalDetailsStep } from '../steps/FinalDetailsStep';
import { GuardianStep } from '../steps/GuardianStep';
import { InheritanceStep } from '../steps/InheritanceStep';
import { KeyPeopleStep } from '../steps/KeyPeopleStep';
// Step components — map matches wizard.ts STEPS
import { PersonalInfoStep } from '../steps/PersonalInfoStep';
import { PetGuardianStep } from '../steps/PetGuardianStep';
import { PoaHealthStep } from '../steps/PoaHealthStep';
import { PoaPropertyStep } from '../steps/PoaPropertyStep';
import { ResidueStep } from '../steps/ResidueStep';
import { ReviewStep } from '../steps/ReviewStep';
import { WipeoutStep } from '../steps/WipeoutStep';

const STEP_COMPONENTS: Record<string, React.ComponentType<StepProps>> = {
  'personal-info': PersonalInfoStep,
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
  'poa-property': PoaPropertyStep,
  'poa-health': PoaHealthStep,
  enhance: EnhanceStep,
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
  /** All visible steps across all categories (for breadcrumb) */
  allSteps: StepConfig[];
  /** Set of completed step IDs (for breadcrumb) */
  completedSteps: Set<string>;
  /** Called when user clicks a breadcrumb pill */
  onBreadcrumbStepClick: (stepId: string) => void;
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
    allSteps,
    completedSteps,
    onBreadcrumbStepClick,
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>
        <span className="text-[var(--ifw-neutral-300)]">/</span>
        <span className="text-sm font-medium text-[var(--ifw-neutral-900)]">{categoryLabel}</span>
        <span className="ml-auto text-xs text-[var(--ifw-neutral-400)]">
          Step {currentIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Breadcrumb — all steps as numbered pills */}
      <WizardBreadcrumb
        allSteps={allSteps}
        currentStepId={currentStep?.id ?? null}
        completedSteps={completedSteps}
        onStepClick={onBreadcrumbStepClick}
      />

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
                willData={willData}
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
