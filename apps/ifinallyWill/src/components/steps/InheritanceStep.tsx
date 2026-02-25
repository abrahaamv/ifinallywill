/**
 * Step 11: Inheritance / Trusting — set ages for minor children's inheritance
 */

import { useState, useEffect } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import { trpc } from '../../utils/trpc';
import type { StepProps } from '../../lib/types';

interface TrustEntry {
  childKeyNameId: string;
  age: number;
  trustees: string[];
}

export function InheritanceStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.trusting as TrustEntry[] | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'trusting' });
  const { data: people } = trpc.keyNames.list.useQuery();

  const children = (people ?? []).filter((p) => p.relationship === 'child');
  const nonChildren = (people ?? []).filter((p) => p.relationship !== 'child');

  const [entries, setEntries] = useState<TrustEntry[]>(() => {
    if (existing && existing.length > 0) return existing;
    // Initialize with all children at age 25
    return children.map((c) => ({
      childKeyNameId: c.id,
      age: 25,
      trustees: [],
    }));
  });

  useEffect(() => {
    if (entries.length > 0) autoSave.save(entries);
  }, [entries]);

  const updateEntry = (idx: number, updates: Partial<TrustEntry>) => {
    setEntries(entries.map((e, i) => (i === idx ? { ...e, ...updates } : e)));
  };

  const handleNext = () => {
    autoSave.saveNow(entries);
    onNext();
  };

  return (
    <StepLayout
      title="Inheritance Age"
      description="Set the age at which each child receives their inheritance. Until then, a trustee manages it."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-4">
        {entries.map((entry, i) => {
          const child = children.find((c) => c.id === entry.childKeyNameId);
          if (!child) return null;

          return (
            <div key={entry.childKeyNameId} className="border border-[var(--ifw-border)] rounded-xl p-4">
              <div className="font-medium text-sm mb-3">
                {child.firstName} {child.lastName}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`age-${i}`} className="block text-xs font-medium mb-1">
                    Inheritance Age
                  </label>
                  <input
                    id={`age-${i}`}
                    type="number"
                    min={18}
                    max={30}
                    value={entry.age}
                    onChange={(e) => updateEntry(i, { age: Number(e.target.value) })}
                    className="ifw-input"
                  />
                </div>

                <div>
                  <label htmlFor={`trustee-${i}`} className="block text-xs font-medium mb-1">
                    Trustee
                  </label>
                  <select
                    id={`trustee-${i}`}
                    value={entry.trustees[0] ?? ''}
                    onChange={(e) =>
                      updateEntry(i, {
                        trustees: e.target.value ? [e.target.value] : [],
                      })
                    }
                    className="ifw-input"
                  >
                    <option value="">Select trustee...</option>
                    {nonChildren.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </StepLayout>
  );
}
