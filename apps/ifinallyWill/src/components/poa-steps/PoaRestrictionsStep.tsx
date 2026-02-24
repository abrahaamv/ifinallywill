/**
 * POA Step 5: Restrictions
 * Optional restrictions on what the agent can do.
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { trpc } from '../../utils/trpc';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaRestrictionsStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const currentRestrictions = (existingPoa?.restrictions as string | null) ?? '';
  const [restrictions, setRestrictions] = useState(currentRestrictions);
  const [hasRestrictions, setHasRestrictions] = useState(!!currentRestrictions);
  const updateSection = trpc.poaData.updateSection.useMutation();

  const handleNext = () => {
    updateSection.mutate({
      estateDocId,
      section: 'restrictions',
      data: hasRestrictions ? restrictions : null,
    }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title="Restrictions & Conditions"
      description="You can limit what your agent is allowed to do with your property and finances."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateSection.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>Restrictions are optional.</strong> Without restrictions, your agent has broad authority to manage
          your property and finances. You can add conditions like "cannot sell the family home" or
          "maximum $50,000 per transaction."
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="ifw-option-card w-full text-left"
            data-selected={!hasRestrictions}
            onClick={() => { setHasRestrictions(false); setRestrictions(''); }}
          >
            <span className="text-xl flex-shrink-0">🔓</span>
            <div>
              <div className="font-medium text-sm">No Restrictions</div>
              <div className="text-xs text-[var(--ifw-text-muted)]">My agent has full authority over my property and finances</div>
            </div>
          </button>

          <button
            type="button"
            className="ifw-option-card w-full text-left"
            data-selected={hasRestrictions}
            onClick={() => setHasRestrictions(true)}
          >
            <span className="text-xl flex-shrink-0">🔒</span>
            <div>
              <div className="font-medium text-sm">Add Restrictions</div>
              <div className="text-xs text-[var(--ifw-text-muted)]">I want to limit my agent's authority</div>
            </div>
          </button>
        </div>

        {hasRestrictions && (
          <div>
            <label className="block text-sm font-medium mb-2">Describe Your Restrictions</label>
            <textarea
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              rows={5}
              className="ifw-input resize-y"
              style={{ minHeight: '120px' }}
              placeholder="e.g. My agent may not sell, mortgage, or encumber any real property without court approval..."
            />
          </div>
        )}
      </div>
    </StepLayout>
  );
}
