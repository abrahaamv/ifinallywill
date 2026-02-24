/**
 * Step 7: Pet Guardians
 */

import { useState, useEffect } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import { trpc } from '../../utils/trpc';
import type { StepProps } from '../wizard/WizardShell';

interface PetEntry {
  name: string;
  type: string;
  breed?: string;
  amount?: number;
  guardianKeyNameId: string;
  backupKeyNameId?: string;
}

export function PetGuardianStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.pets as PetEntry[] | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'pets' });
  const { data: people } = trpc.keyNames.list.useQuery();

  const [pets, setPets] = useState<PetEntry[]>(existing ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<PetEntry>>({});

  useEffect(() => {
    if (pets.length > 0) autoSave.save(pets);
  }, [pets]);

  const addPet = () => {
    if (!draft.name || !draft.type || !draft.guardianKeyNameId) return;
    const entry: PetEntry = {
      name: draft.name,
      type: draft.type,
      breed: draft.breed,
      amount: draft.amount,
      guardianKeyNameId: draft.guardianKeyNameId,
      backupKeyNameId: draft.backupKeyNameId,
    };
    setPets([...pets, entry]);
    setDraft({});
    setEditing(null);
  };

  const removePet = (idx: number) => {
    setPets(pets.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    autoSave.saveNow(pets);
    onNext();
  };

  const nonChildren = (people ?? []).filter((p) => p.relationship !== 'child');

  return (
    <StepLayout
      title="Pet Guardians"
      description="Ensure your pets are cared for by someone you trust."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      {/* Existing pets */}
      {pets.map((pet, i) => (
        <div key={i} className="flex items-center justify-between border border-[var(--ifw-border)] rounded-lg px-4 py-3 mb-2">
          <div>
            <div className="font-medium text-sm">{pet.name}</div>
            <div className="text-xs text-[var(--ifw-text-muted)]">
              {pet.type}{pet.breed ? ` \u2022 ${pet.breed}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => removePet(i)}
            className="text-xs text-[var(--ifw-error)] hover:underline"
          >
            Remove
          </button>
        </div>
      ))}

      {/* Add form */}
      {editing !== null || pets.length === 0 ? (
        <div className="border rounded-xl p-4 bg-[var(--ifw-neutral-50)] space-y-3 mt-4">
          <h3 className="font-medium text-sm">Add a Pet</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pet-name" className="block text-xs font-medium mb-1">Pet Name *</label>
              <input
                id="pet-name"
                value={draft.name ?? ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="ifw-input"
              />
            </div>
            <div>
              <label htmlFor="pet-type" className="block text-xs font-medium mb-1">Type *</label>
              <select
                id="pet-type"
                value={draft.type ?? ''}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="ifw-input"
              >
                <option value="">Select...</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="fish">Fish</option>
                <option value="reptile">Reptile</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pet-guardian" className="block text-xs font-medium mb-1">Guardian *</label>
            <select
              id="pet-guardian"
              value={draft.guardianKeyNameId ?? ''}
              onChange={(e) => setDraft({ ...draft, guardianKeyNameId: e.target.value })}
              className="ifw-input"
            >
              <option value="">Select a person...</option>
              {nonChildren.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={addPet}
              disabled={!draft.name || !draft.type || !draft.guardianKeyNameId}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
            >
              Add Pet
            </button>
            {pets.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(-1)}
          className="w-full border-2 border-dashed rounded-lg py-3 text-sm text-[var(--ifw-text-muted)] hover:border-[var(--ifw-primary-500)] hover:text-[var(--ifw-primary-700)] transition-colors mt-4"
        >
          + Add Another Pet
        </button>
      )}
    </StepLayout>
  );
}
