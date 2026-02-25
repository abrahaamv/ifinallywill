/**
 * Step 4: Children — manage child entries in key_names
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';
import { PersonForm } from '../shared/PersonForm';
import type { StepProps } from '../../lib/types';

export function ChildrenStep({ estateDocId: _estateDocId, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
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

  const children = (people ?? []).filter((p) => p.relationship === 'child');

  return (
    <StepLayout
      title="Children"
      description="Add your children. They can be assigned as beneficiaries or have guardians appointed."
      onNext={onNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    >
      {/* Existing children */}
      {children.length > 0 && (
        <div className="space-y-2 mb-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between border border-[var(--ifw-border)] rounded-lg px-4 py-3"
            >
              <div>
                <div className="font-medium text-sm">
                  {child.firstName} {child.lastName}
                </div>
                {child.dateOfBirth && (
                  <div className="text-xs text-[var(--ifw-text-muted)]">
                    Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: child.id })}
                className="text-xs text-[var(--ifw-error)] hover:underline"
                disabled={deleteMutation.isPending}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="border rounded-xl p-4 bg-[var(--ifw-neutral-50)]">
          <h3 className="font-medium text-sm mb-3">Add a Child</h3>
          <PersonForm
            defaultValues={{ relationship: 'child' }}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
            submitLabel="Add Child"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed rounded-lg py-3 text-sm text-[var(--ifw-text-muted)] hover:border-[var(--ifw-primary-500)] hover:text-[var(--ifw-primary-700)] transition-colors"
        >
          + Add a Child
        </button>
      )}

      {children.length === 0 && !showForm && (
        <p className="text-sm text-[var(--ifw-text-muted)] mt-3">
          No children added. You can skip this step if you don&apos;t have children.
        </p>
      )}
    </StepLayout>
  );
}
