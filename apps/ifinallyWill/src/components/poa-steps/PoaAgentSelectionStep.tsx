/**
 * POA Step 2: Primary Agent Selection
 * Select who will be your attorney for property decisions.
 */

import { useEffect, useState } from 'react';
import { trpc } from '../../utils/trpc';
import { PersonSelector } from '../shared/PersonSelector';
import { StepLayout } from '../shared/StepLayout';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaAgentSelectionStep({
  estateDocId,
  poaData: existingPoa,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: PoaStepProps) {
  const currentAgent = existingPoa?.primaryAgent as string | undefined;
  const [primaryAgentId, setPrimaryAgentId] = useState(currentAgent ?? '');
  const updateSection = trpc.poaData.updateSection.useMutation();

  useEffect(() => {
    if (primaryAgentId && primaryAgentId !== currentAgent) {
      updateSection.mutate({
        estateDocId,
        section: 'agents',
        data: {
          primaryAgent: primaryAgentId,
          jointAgent: existingPoa?.jointAgent ?? null,
          backupAgents: existingPoa?.backupAgents ?? [],
          restrictions: existingPoa?.restrictions ?? null,
          activationType: existingPoa?.activationType ?? 'immediate',
        },
      });
    }
  }, [primaryAgentId]);

  const handleNext = () => {
    if (!primaryAgentId) return;
    updateSection.mutate(
      {
        estateDocId,
        section: 'agents',
        data: {
          primaryAgent: primaryAgentId,
          jointAgent: existingPoa?.jointAgent ?? null,
          backupAgents: existingPoa?.backupAgents ?? [],
          restrictions: existingPoa?.restrictions ?? null,
          activationType: existingPoa?.activationType ?? 'immediate',
        },
      },
      { onSuccess: () => onNext() }
    );
  };

  return (
    <StepLayout
      title="Primary Agent (Attorney)"
      description="Choose the person who will manage your financial and property affairs on your behalf."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      canProceed={!!primaryAgentId}
      saveStatus={updateSection.isPending ? 'saving' : updateSection.isSuccess ? 'saved' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>What is an agent?</strong> Your agent (also called attorney) is the person you
          authorize to make financial and property decisions on your behalf. Choose someone you
          trust completely — they will have broad authority over your finances.
        </div>

        <div>
          <h3 className="ifw-section-title">Select Your Agent *</h3>
          <PersonSelector
            selectedIds={primaryAgentId ? [primaryAgentId] : []}
            onChange={(ids) => setPrimaryAgentId(ids[0] ?? '')}
            filterRelationship={['spouse', 'child', 'sibling', 'parent', 'friend', 'other']}
          />
        </div>
      </div>
    </StepLayout>
  );
}
