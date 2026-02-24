/**
 * Step 2: Province selection
 * Province determines which template is used for document generation
 */

import { PROVINCES } from '../../config/provinces';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function LocationStep({ data, onUpdate, onNext, onPrev }: Props) {
  const select = (province: string) => {
    onUpdate({ province });
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">Where do you live?</h1>
      <p className="text-[var(--ifw-neutral-500)] mb-8 text-center">
        Estate laws vary by province. We&apos;ll use the right templates for your location.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PROVINCES.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => select(p.code)}
            className={`border rounded-lg px-4 py-3 text-left text-sm transition-all hover:border-[var(--ifw-primary-500)] ${
              data.province === p.code
                ? 'border-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)] font-medium'
                : 'border-[var(--ifw-neutral-200)]'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
        >
          Back
        </button>
      </div>
    </div>
  );
}
