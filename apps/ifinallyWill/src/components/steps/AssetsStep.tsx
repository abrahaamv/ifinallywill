/**
 * Step 8: Assets — manage estate assets via CRUD
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';
import type { StepProps } from '../../lib/types';

export function AssetsStep({ estateDocId: _estateDocId, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: assets } = trpc.estateAssets.list.useQuery({});
  const { data: assetClasses } = trpc.assetClasses.list.useQuery();

  const createMutation = trpc.estateAssets.create.useMutation({
    onSuccess: () => {
      utils.estateAssets.list.invalidate();
      setShowForm(false);
      setDescription('');
      setSelectedClassId(null);
    },
  });
  const deleteMutation = trpc.estateAssets.delete.useMutation({
    onSuccess: () => utils.estateAssets.list.invalidate(),
  });

  const handleAdd = () => {
    if (!selectedClassId || !description.trim()) return;
    createMutation.mutate({
      assetClassId: selectedClassId,
      willType: 'primary',
      details: { description },
    });
  };

  return (
    <StepLayout
      title="Assets"
      description="List your assets to be distributed. Common assets include property, vehicles, bank accounts, and investments."
      onNext={onNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    >
      {/* Existing assets */}
      {(assets ?? []).length > 0 && (
        <div className="space-y-2 mb-4">
          {(assets ?? []).map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between border border-[var(--ifw-border)] rounded-lg px-4 py-3"
            >
              <div>
                <div className="font-medium text-sm">
                  {(asset.assetClass as { name?: string } | null)?.name ?? 'Asset'}
                </div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  {(asset.details as { description?: string } | null)?.description ?? ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: asset.id })}
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
        <div className="border rounded-xl p-4 bg-[var(--ifw-neutral-50)] space-y-3">
          <h3 className="font-medium text-sm">Add an Asset</h3>

          <div>
            <label htmlFor="asset-class" className="block text-xs font-medium mb-1">
              Asset Type *
            </label>
            <select
              id="asset-class"
              value={selectedClassId ?? ''}
              onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
              className="ifw-input"
            >
              <option value="">Select type...</option>
              {(assetClasses ?? []).map((ac) => (
                <option key={ac.id} value={ac.id}>
                  {ac.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="asset-desc" className="block text-xs font-medium mb-1">
              Description *
            </label>
            <input
              id="asset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 123 Main Street, Toronto"
              className="ifw-input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedClassId || !description.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Asset'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed rounded-lg py-3 text-sm text-[var(--ifw-text-muted)] hover:border-[var(--ifw-primary-500)] hover:text-[var(--ifw-primary-700)] transition-colors"
        >
          + Add an Asset
        </button>
      )}
    </StepLayout>
  );
}
