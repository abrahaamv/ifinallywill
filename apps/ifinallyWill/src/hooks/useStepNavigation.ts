/**
 * Category-aware step navigation hook
 *
 * Navigates within a category's visible steps. At the end of a category,
 * returns to dashboard and triggers celebration. At the start, returns to dashboard.
 */

import { useCallback, useMemo } from 'react';
import {
  type StepConfig,
  type WizardCategory,
  type WizardContext,
  getAllSteps,
} from '../lib/wizard';

interface UseStepNavigationOptions {
  wizardContext: WizardContext;
  currentCategory: WizardCategory | null;
  currentStepId: string | null;
  completedSteps: Set<string>;
  onNavigate: (stepId: string) => void;
  onReturnToDashboard: () => void;
  onCategoryComplete?: (category: WizardCategory) => void;
}

export function useStepNavigation({
  wizardContext,
  currentCategory,
  currentStepId,
  completedSteps,
  onNavigate,
  onReturnToDashboard,
  onCategoryComplete,
}: UseStepNavigationOptions) {
  const visibleSteps = useMemo(() => getAllSteps(wizardContext), [wizardContext]);

  /** Steps in the current category only */
  const categorySteps = useMemo(
    () => (currentCategory ? visibleSteps.filter((s) => s.category === currentCategory) : []),
    [visibleSteps, currentCategory]
  );

  const currentIndex = useMemo(
    () => categorySteps.findIndex((s) => s.id === currentStepId),
    [categorySteps, currentStepId]
  );

  const currentStep: StepConfig | null = categorySteps[currentIndex] ?? null;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === categorySteps.length - 1;

  const nextStep = useCallback(() => {
    if (currentIndex < categorySteps.length - 1) {
      const next = categorySteps[currentIndex + 1];
      if (next) onNavigate(next.id);
    } else {
      // End of category — check if all steps are completed
      if (currentCategory) {
        const allDone = categorySteps.every((s) => completedSteps.has(s.id));
        if (allDone) {
          onCategoryComplete?.(currentCategory);
        }
      }
      onReturnToDashboard();
    }
  }, [
    currentIndex,
    categorySteps,
    currentCategory,
    completedSteps,
    onNavigate,
    onReturnToDashboard,
    onCategoryComplete,
  ]);

  const prevStep = useCallback(() => {
    if (currentIndex > 0) {
      const prev = categorySteps[currentIndex - 1];
      if (prev) onNavigate(prev.id);
    } else {
      onReturnToDashboard();
    }
  }, [currentIndex, categorySteps, onNavigate, onReturnToDashboard]);

  const goToStep = useCallback(
    (stepId: string) => {
      const step = visibleSteps.find((s) => s.id === stepId);
      if (step) onNavigate(step.id);
    },
    [visibleSteps, onNavigate]
  );

  /** Get the first incomplete step in a category (for "Continue" CTA) */
  const getFirstIncompleteStep = useCallback(
    (category: WizardCategory): StepConfig | null => {
      const steps = visibleSteps.filter((s) => s.category === category);
      return steps.find((s) => !completedSteps.has(s.id)) ?? steps[0] ?? null;
    },
    [visibleSteps, completedSteps]
  );

  /** Get recommended next step across all categories */
  const getRecommendedStep = useCallback((): StepConfig | null => {
    return visibleSteps.find((s) => !completedSteps.has(s.id)) ?? null;
  }, [visibleSteps, completedSteps]);

  return {
    visibleSteps,
    categorySteps,
    currentStep,
    currentIndex,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    getFirstIncompleteStep,
    getRecommendedStep,
  };
}
