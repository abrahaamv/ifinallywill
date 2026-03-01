/**
 * POA Step 3: Joint Agent (Optional)
 * Optionally add a co-attorney who acts alongside the primary agent.
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { PersonSelector } from '../shared/PersonSelector';
import { StepLayout } from '../shared/StepLayout';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaJointAgentStep({
  estateDocId,
  poaData: existingPoa,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: PoaStepProps) {
  const currentJoint = existingPoa?.jointAgent as string | null | undefined;
  const primaryAgent = existingPoa?.primaryAgent as string | undefined;
  const [jointAgentId, setJointAgentId] = useState(currentJoint ?? '');
  const [skipJoint, setSkipJoint] = useState(!currentJoint);
  const updateSection = trpc.poaData.updateSection.useMutation();

  const handleNext = () => {
    updateSection.mutate(
      {
        estateDocId,
        section: 'agents',
        data: {
          primaryAgent: primaryAgent ?? '',
          jointAgent: skipJoint ? null : jointAgentId || null,
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
      title="Joint Agent (Optional)"
      description="You can appoint a second person to act jointly with your primary agent."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateSection.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>Joint agents</strong> must act together on all decisions. This provides checks and
          balances but can slow down decision-making. Most people skip this step unless they have
          specific reasons.
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={skipJoint}
            onChange={(e) => {
              setSkipJoint(e.target.checked);
              if (e.target.checked) setJointAgentId('');
            }}
            className="h-4 w-4 rounded"
          />
          I do not want a joint agent (skip this step)
        </label>

        {!skipJoint && (
          <div>
            <h3 className="ifw-section-title">Select Joint Agent</h3>
            <PersonSelector
              selectedIds={jointAgentId ? [jointAgentId] : []}
              onChange={(ids) => setJointAgentId(ids[0] ?? '')}
              excludeIds={primaryAgent ? [primaryAgent] : []}
              filterRelationship={['spouse', 'child', 'sibling', 'parent', 'friend', 'other']}
            />
          </div>
        )}
      </div>
    </StepLayout>
  );
}
