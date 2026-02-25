/**
 * Step 3: Name — full legal name and optional phone
 * Ported from v6 NameStep.jsx. Auto-sets gender='other' on mount.
 */

import { useEffect } from 'react';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { FloatingInput } from './primitives/FloatingInput';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function NameStep({ data, onUpdate, onNext, onBack }: Props) {
  useEffect(() => {
    if (data.gender !== 'other') {
      onUpdate({ gender: 'other' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isComplete = data.first_name.trim() !== '' && data.last_name.trim() !== '';

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>What&apos;s your full legal name?</SectionTitle>

      <div className="epilogue-form-container">
        <FloatingInput
          id="first_name"
          label="First Name"
          value={data.first_name}
          onChange={(v) => onUpdate({ first_name: v })}
          autoComplete="given-name"
          required
        />
        <FloatingInput
          id="middle_name"
          label="Middle Name"
          value={data.middle_name}
          onChange={(v) => onUpdate({ middle_name: v })}
          autoComplete="additional-name"
        />
        <FloatingInput
          id="last_name"
          label="Last Name"
          value={data.last_name}
          onChange={(v) => onUpdate({ last_name: v })}
          autoComplete="family-name"
          required
        />
        <FloatingInput
          id="phone_number"
          label="Phone Number"
          value={data.phone_number}
          onChange={(v) => onUpdate({ phone_number: v })}
          type="tel"
          autoComplete="tel"
          helperText="Optional \u2014 can be added later"
        />

        <NavButtons
          onBack={onBack}
          onNext={onNext}
          nextLabel="Save & Continue &rarr;"
          nextDisabled={!isComplete}
        />
      </div>
    </div>
  );
}
