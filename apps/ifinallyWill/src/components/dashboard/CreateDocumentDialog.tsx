/**
 * Dialog to create a new estate document
 */

import { useState } from 'react';
import { DOCUMENT_TYPES } from '../../config/documents';
import { PROVINCES } from '../../config/provinces';
import { trpc } from '../../utils/trpc';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateDocumentDialog({ isOpen, onClose, onCreated }: Props) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.estateDocuments.create.useMutation();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!selectedType || !province) return;

    setError(null);
    try {
      await createMutation.mutateAsync({
        documentType: selectedType as 'primary_will' | 'secondary_will' | 'poa_property' | 'poa_health',
        province,
      });
      setSelectedType('');
      setProvince('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Create New Document</h2>

        {/* Document type */}
        <label className="block text-sm font-medium mb-2">Document Type</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DOCUMENT_TYPES.map((doc) => (
            <button
              key={doc.type}
              type="button"
              onClick={() => setSelectedType(doc.type)}
              className={`border rounded-lg p-3 text-left text-sm transition-all ${
                selectedType === doc.type
                  ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)]'
                  : 'border-[var(--ifw-neutral-200)] hover:border-[var(--ifw-neutral-400)]'
              }`}
            >
              <span className="text-lg">{doc.icon}</span>
              <div className="font-medium mt-1 text-xs">{doc.name}</div>
            </button>
          ))}
        </div>

        {/* Province */}
        <label htmlFor="province-select" className="block text-sm font-medium mb-2">
          Province
        </label>
        <select
          id="province-select"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
        >
          <option value="">Select province...</option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)]">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedType || !province || createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
