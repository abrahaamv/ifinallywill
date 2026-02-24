/**
 * POA Step 6: Activation Type
 * When does the POA take effect — immediately or on incapacity?
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { trpc } from '../../utils/trpc';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaActivationStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const currentType = (existingPoa?.activationType as string | undefined) ?? '';
  const [activationType, setActivationType] = useState(currentType);
  const updateSection = trpc.poaData.updateSection.useMutation();

  const handleNext = () => {
    if (!activationType) return;
    updateSection.mutate({
      estateDocId,
      section: 'activationType',
      data: activationType,
    }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title="When Does This Take Effect?"
      description="Choose when your Power of Attorney becomes active."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      canProceed={!!activationType}
      saveStatus={updateSection.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>This is an important choice.</strong> An "immediate" POA gives your agent authority right away,
          even while you're still capable. An "incapacity" POA only activates when you become unable to make
          decisions yourself — typically confirmed by a physician.
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="ifw-option-card w-full text-left"
            data-selected={activationType === 'immediate'}
            onClick={() => setActivationType('immediate')}
          >
            <span className="text-xl flex-shrink-0">⚡</span>
            <div>
              <div className="font-medium text-sm">Immediately (Continuing)</div>
              <div className="text-xs text-[var(--ifw-text-muted)]">
                Takes effect as soon as it's signed. Continues even if you become incapacitated.
                Most common choice for trusted family members.
              </div>
            </div>
          </button>

          <button
            type="button"
            className="ifw-option-card w-full text-left"
            data-selected={activationType === 'incapacity'}
            onClick={() => setActivationType('incapacity')}
          >
            <span className="text-xl flex-shrink-0">🏥</span>
            <div>
              <div className="font-medium text-sm">On Incapacity (Springing)</div>
              <div className="text-xs text-[var(--ifw-text-muted)]">
                Only takes effect if you become mentally incapable of managing your affairs.
                Requires a capacity assessment by a qualified assessor.
              </div>
            </div>
          </button>
        </div>
      </div>
    </StepLayout>
  );
}
