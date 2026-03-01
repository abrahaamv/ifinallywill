/**
 * Step 5: Key People — manage entire people pool (non-child entries)
 */

import { useState } from 'react';
import type { StepProps } from '../../lib/types';
import { trpc } from '../../utils/trpc';
import { PersonForm } from '../shared/PersonForm';
import { StepLayout } from '../shared/StepLayout';

export function KeyPeopleStep({
  estateDocId: _estateDocId,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: StepProps) {
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();
  const { data: people } = trpc.keyNames.list.useQuery();
  const createMutation = trpc.keyNames.create.useMutation({
    onSuccess: () => {
      utils.keyNames.list.invalidate();
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.keyNames.delete.useMutation({
    onSuccess: () => utils.keyNames.list.invalidate(),
  });

  // Show all people except children (managed in Children step)
  const nonChildren = (people ?? []).filter((p) => p.relationship !== 'child');

  return (
    <StepLayout
      title="Key People"
      description="Add important people who may serve as executors, guardians, beneficiaries, or agents."
      onNext={onNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    >
      {nonChildren.length > 0 && (
        <div className="space-y-2 mb-4">
          {nonChildren.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between border border-[var(--ifw-border)] rounded-lg px-4 py-3"
            >
              <div>
                <div className="font-medium text-sm">
                  {person.firstName} {person.lastName}
                </div>
                <div className="text-xs text-[var(--ifw-text-muted)] capitalize">
                  {person.relationship}
                  {person.city ? ` \u2022 ${person.city}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: person.id })}
                className="text-xs text-[var(--ifw-error)] hover:underline"
                disabled={deleteMutation.isPending}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border rounded-xl p-4 bg-[var(--ifw-neutral-50)]">
          <h3 className="font-medium text-sm mb-3">Add a Person</h3>
          <PersonForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
            submitLabel="Add Person"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed rounded-lg py-3 text-sm text-[var(--ifw-text-muted)] hover:border-[var(--ifw-primary-500)] hover:text-[var(--ifw-primary-700)] transition-colors"
        >
          + Add a Person
        </button>
      )}
    </StepLayout>
  );
}
