/**
 * Step 12: Executors — choose who will manage your estate
 */

import { useState, useEffect } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { PersonSelector } from '../shared/PersonSelector';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../wizard/WizardShell';

interface ExecutorEntry {
  keyNameId: string;
  position: 'primary' | 'alternate' | 'backup';
}

export function ExecutorsStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.executors as ExecutorEntry[] | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'executors' });

  const [primaryId, setPrimaryId] = useState(
    existing?.find((e) => e.position === 'primary')?.keyNameId ?? '',
  );
  const [alternateId, setAlternateId] = useState(
    existing?.find((e) => e.position === 'alternate')?.keyNameId ?? '',
  );

  useEffect(() => {
    if (!primaryId) return;
    const entries: ExecutorEntry[] = [{ keyNameId: primaryId, position: 'primary' }];
    if (alternateId) entries.push({ keyNameId: alternateId, position: 'alternate' });
    autoSave.save(entries);
  }, [primaryId, alternateId]);

  const handleNext = () => {
    if (!primaryId) return;
    const entries: ExecutorEntry[] = [{ keyNameId: primaryId, position: 'primary' }];
    if (alternateId) entries.push({ keyNameId: alternateId, position: 'alternate' });
    autoSave.saveNow(entries);
    onNext();
  };

  return (
    <StepLayout
      title="Executors"
      description="Choose who will manage your estate after you pass. Your executor handles distributing assets, paying debts, and filing taxes."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
      canProceed={!!primaryId}
    >
      <div className="space-y-6">
        <div>
          <h3 className="ifw-section-title">Primary Executor *</h3>
          <p className="text-xs text-[var(--ifw-neutral-500)] mb-3">
            This person will be responsible for carrying out the instructions in your will.
          </p>
          <PersonSelector
            selectedIds={primaryId ? [primaryId] : []}
            onChange={(ids) => setPrimaryId(ids[0] ?? '')}
            excludeIds={alternateId ? [alternateId] : []}
          />
        </div>

        <div>
          <h3 className="ifw-section-title">Alternate Executor</h3>
          <p className="text-xs text-[var(--ifw-neutral-500)] mb-3">
            If your primary executor is unable or unwilling to act.
          </p>
          <PersonSelector
            selectedIds={alternateId ? [alternateId] : []}
            onChange={(ids) => setAlternateId(ids[0] ?? '')}
            excludeIds={primaryId ? [primaryId] : []}
          />
        </div>
      </div>
    </StepLayout>
  );
}
