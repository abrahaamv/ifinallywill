/**
 * Wizard navigation hook — URL-based with conditional skip logic
 *
 * Manages current step, next/prev with conditional step skipping,
 * and URL synchronization via React Router.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type StepConfig, type WizardContext, getVisibleSteps } from '../lib/wizard';

interface UseWizardNavigationOptions {
  docId: string;
  context: WizardContext;
}

export function useWizardNavigation({ docId, context }: UseWizardNavigationOptions) {
  const navigate = useNavigate();
  const { stepId } = useParams<{ stepId: string }>();

  const visibleSteps = useMemo(() => getVisibleSteps(context), [context]);

  const currentStepIndex = useMemo(() => {
    const idx = visibleSteps.findIndex((s) => s.id === stepId);
    return idx >= 0 ? idx : 0;
  }, [stepId, visibleSteps]);

  const currentStep: StepConfig | undefined = visibleSteps[currentStepIndex] ?? visibleSteps[0];

  const goToStep = useCallback(
    (id: string) => {
      navigate(`/app/documents/${docId}/${id}`, { replace: true });
    },
    [navigate, docId]
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex < visibleSteps.length - 1) {
      const next = visibleSteps[currentStepIndex + 1];
      if (next) goToStep(next.id);
    }
  }, [currentStepIndex, visibleSteps, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prev = visibleSteps[currentStepIndex - 1];
      if (prev) goToStep(prev.id);
    }
  }, [currentStepIndex, visibleSteps, goToStep]);

  return {
    currentStep,
    currentStepIndex,
    visibleSteps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === visibleSteps.length - 1,
    goToStep,
    nextStep,
    prevStep,
    totalSteps: visibleSteps.length,
  };
}
