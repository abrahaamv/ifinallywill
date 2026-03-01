/**
 * Step 6: Guardians — assign guardians for minor children
 */

import { useEffect, useState } from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';
import { trpc } from '../../utils/trpc';
import { PersonSelector } from '../shared/PersonSelector';
import { StepLayout } from '../shared/StepLayout';

interface GuardianEntry {
  keyNameId: string;
  position: 'primary' | 'alternate';
  childKeyNameIds: string[];
}

export function GuardianStep({
  estateDocId,
  willData,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: StepProps) {
  const existing = willData.guardians as GuardianEntry[] | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'guardians' });
  const { data: people } = trpc.keyNames.list.useQuery();

  const children = (people ?? []).filter((p) => p.relationship === 'child');
  const childIds = children.map((c) => c.id);

  const [primaryId, setPrimaryId] = useState<string>(
    existing?.find((g) => g.position === 'primary')?.keyNameId ?? ''
  );
  const [alternateId, setAlternateId] = useState<string>(
    existing?.find((g) => g.position === 'alternate')?.keyNameId ?? ''
  );

  useEffect(() => {
    if (!primaryId) return;
    const entries: GuardianEntry[] = [];
    entries.push({ keyNameId: primaryId, position: 'primary', childKeyNameIds: childIds });
    if (alternateId) {
      entries.push({ keyNameId: alternateId, position: 'alternate', childKeyNameIds: childIds });
    }
    autoSave.save(entries);
  }, [primaryId, alternateId]);

  const handleNext = () => {
    if (!primaryId) return;
    const entries: GuardianEntry[] = [
      { keyNameId: primaryId, position: 'primary', childKeyNameIds: childIds },
    ];
    if (alternateId) {
      entries.push({ keyNameId: alternateId, position: 'alternate', childKeyNameIds: childIds });
    }
    autoSave.saveNow(entries);
    onNext();
  };

  return (
    <StepLayout
      title="Guardians"
      description="Choose who will care for your minor children if something happens to you."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
      canProceed={!!primaryId}
    >
      <div className="space-y-6">
        <div>
          <h3 className="ifw-section-title">Primary Guardian *</h3>
          <PersonSelector
            selectedIds={primaryId ? [primaryId] : []}
            onChange={(ids) => setPrimaryId(ids[0] ?? '')}
            excludeIds={alternateId ? [alternateId] : []}
            filterRelationship={[
              'spouse',
              'sibling',
              'parent',
              'grandparent',
              'pibling',
              'friend',
              'other',
            ]}
          />
        </div>

        <div>
          <h3 className="ifw-section-title">Alternate Guardian</h3>
          <PersonSelector
            selectedIds={alternateId ? [alternateId] : []}
            onChange={(ids) => setAlternateId(ids[0] ?? '')}
            excludeIds={primaryId ? [primaryId] : []}
            filterRelationship={[
              'spouse',
              'sibling',
              'parent',
              'grandparent',
              'pibling',
              'friend',
              'other',
            ]}
          />
        </div>
      </div>
    </StepLayout>
  );
}
