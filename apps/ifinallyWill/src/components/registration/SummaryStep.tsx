/**
 * Step 5: Summary — review before account creation
 */

import { useState } from 'react';
import { DOCUMENT_TYPES, BUNDLE_PRICE } from '../../config/documents';
import { PROVINCES } from '../../config/provinces';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { trpc } from '../../utils/trpc';

interface Props {
  data: RegistrationData;
  onPrev: () => void;
  onComplete: () => void;
}

export function SummaryStep({ data, onPrev, onComplete }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = trpc.auth.register.useMutation();

  const provinceName =
    PROVINCES.find((p) => p.code === data.province)?.name ?? data.province;

  const selectedDocs = DOCUMENT_TYPES.filter((d) =>
    data.selectedDocuments.includes(d.type),
  );

  const isBundle = data.selectedDocuments.length === DOCUMENT_TYPES.length;
  const total = isBundle
    ? BUNDLE_PRICE
    : selectedDocs.reduce((sum, d) => sum + d.price, 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        name: data.fullName,
      });

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">Review Your Plan</h1>
      <p className="text-[var(--ifw-neutral-500)] mb-8 text-center">
        Confirm everything looks right before we create your account
      </p>

      <div className="border rounded-xl divide-y">
        {/* Plan type */}
        <div className="p-4 flex justify-between">
          <span className="text-sm text-[var(--ifw-neutral-500)]">Plan</span>
          <span className="text-sm font-medium capitalize">{data.planType}</span>
        </div>

        {/* Province */}
        <div className="p-4 flex justify-between">
          <span className="text-sm text-[var(--ifw-neutral-500)]">Province</span>
          <span className="text-sm font-medium">{provinceName}</span>
        </div>

        {/* Account */}
        <div className="p-4 flex justify-between">
          <span className="text-sm text-[var(--ifw-neutral-500)]">Account</span>
          <span className="text-sm font-medium">{data.email}</span>
        </div>

        {/* Documents */}
        <div className="p-4">
          <span className="text-sm text-[var(--ifw-neutral-500)] block mb-3">Documents</span>
          <div className="space-y-2">
            {selectedDocs.map((doc) => (
              <div key={doc.type} className="flex justify-between text-sm">
                <span>
                  {doc.icon} {doc.name}
                </span>
                <span>${doc.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="p-4 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">${total}</span>
        </div>
      </div>

      <p className="text-xs text-[var(--ifw-neutral-400)] mt-4 text-center">
        Payment is not due until your documents are ready to generate.
        You can fill everything out for free.
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)]">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="px-6 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)] disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account & Start'}
        </button>
      </div>
    </div>
  );
}
