/**
 * Step 2: Family/Marital Status
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';

const STATUSES = [
  { value: 'single', label: 'Single', icon: '👤', description: 'Not married or in a common-law relationship' },
  { value: 'married', label: 'Married', icon: '💍', description: 'Legally married' },
  { value: 'common_law', label: 'Common Law', icon: '💑', description: 'Living together in a conjugal relationship' },
] as const;

export function FamilyStatusStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.maritalStatus as string | undefined;
  const [selected, setSelected] = useState(existing ?? '');
  const autoSave = useAutoSave({ estateDocId, section: 'maritalStatus' });

  const handleSelect = (value: string) => {
    setSelected(value);
    autoSave.save(value);
  };

  const handleNext = () => {
    if (selected) {
      autoSave.saveNow(selected);
      onNext();
    }
  };

  return (
    <StepLayout
      title="Family Status"
      description="Your marital status affects how your estate is distributed."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
      canProceed={!!selected}
    >
      <div className="space-y-3">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => handleSelect(s.value)}
            className="ifw-option-card w-full text-left"
            data-selected={selected === s.value}
          >
            <span className="text-3xl flex-shrink-0">{s.icon}</span>
            <div>
              <div className="font-medium text-sm">{s.label}</div>
              <div className="text-xs text-[var(--ifw-text-muted)]">{s.description}</div>
            </div>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}
