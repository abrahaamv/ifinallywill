/**
 * POA Step 4: Backup Agents
 * Select one or more backup agents who take over if primary/joint can't act.
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { PersonSelector } from '../shared/PersonSelector';
import { trpc } from '../../utils/trpc';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaBackupAgentsStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const currentBackups = (existingPoa?.backupAgents as string[] | undefined) ?? [];
  const primaryAgent = existingPoa?.primaryAgent as string | undefined;
  const jointAgent = existingPoa?.jointAgent as string | null | undefined;
  const [backupIds, setBackupIds] = useState<string[]>(currentBackups);
  const updateSection = trpc.poaData.updateSection.useMutation();

  const excludeIds = [primaryAgent, jointAgent].filter(Boolean) as string[];

  const handleNext = () => {
    updateSection.mutate({
      estateDocId,
      section: 'agents',
      data: {
        primaryAgent: primaryAgent ?? '',
        jointAgent: jointAgent ?? null,
        backupAgents: backupIds,
        restrictions: existingPoa?.restrictions ?? null,
        activationType: existingPoa?.activationType ?? 'immediate',
      },
    }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title="Backup Agents"
      description="If your primary agent is unable or unwilling to act, who should take over?"
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateSection.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>Backup agents</strong> are activated in order if your primary agent cannot fulfill their
          duties. You can select multiple backups — they will serve in the order listed.
        </div>

        <div>
          <h3 className="ifw-section-title">Select Backup Agents</h3>
          <PersonSelector
            selectedIds={backupIds}
            onChange={setBackupIds}
            multiple
            excludeIds={excludeIds}
            filterRelationship={['spouse', 'child', 'sibling', 'parent', 'friend', 'other']}
          />
        </div>

        {backupIds.length === 0 && (
          <p className="text-xs text-[var(--ifw-text-muted)]">
            No backup agents selected. You can skip this step, but it's recommended to have at least one backup.
          </p>
        )}
      </div>
    </StepLayout>
  );
}
