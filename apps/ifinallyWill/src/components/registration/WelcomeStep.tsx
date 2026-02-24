/**
 * Step 1: Welcome — individual or couples
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
}

export function WelcomeStep({ data, onUpdate, onNext }: Props) {
  const select = (planType: 'individual' | 'couples') => {
    onUpdate({ planType });
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-3">Welcome to IFinallyWill</h1>
      <p className="text-[var(--ifw-neutral-500)] mb-10">
        Who are we creating estate documents for?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => select('individual')}
          className={`border-2 rounded-xl p-8 text-left transition-all hover:border-[var(--ifw-primary-500)] hover:shadow-md ${
            data.planType === 'individual'
              ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)]'
              : 'border-[var(--ifw-neutral-200)]'
          }`}
        >
          <div className="text-4xl mb-4">👤</div>
          <h2 className="text-xl font-semibold mb-2">Just Me</h2>
          <p className="text-sm text-[var(--ifw-neutral-500)]">
            Create your will and powers of attorney as an individual
          </p>
        </button>

        <button
          type="button"
          onClick={() => select('couples')}
          className={`border-2 rounded-xl p-8 text-left transition-all hover:border-[var(--ifw-primary-500)] hover:shadow-md ${
            data.planType === 'couples'
              ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)]'
              : 'border-[var(--ifw-neutral-200)]'
          }`}
        >
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-xl font-semibold mb-2">My Partner & I</h2>
          <p className="text-sm text-[var(--ifw-neutral-500)]">
            Create matching mirror wills and POAs for both of you
          </p>
        </button>
      </div>
    </div>
  );
}
