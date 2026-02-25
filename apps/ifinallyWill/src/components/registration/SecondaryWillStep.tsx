/**
 * Step 5: Secondary Will — business owner question (ON/BC only)
 * Ported from v6 SecondaryWillStep.jsx. Auto-advances 200ms after selection.
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { OptionCard } from './primitives/OptionCard';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SecondaryWillStep({ data, onUpdate, onNext, onBack }: Props) {
  const selectOption = (value: boolean) => {
    onUpdate({ wants_secondary_will: value });
    setTimeout(onNext, 200);
  };

  return (
    <div className="animate-slide-in-right">
      <SectionTitle>Are you an owner of an incorporated or limited company?</SectionTitle>
      <StepSubtitle>
        A secondary Will for your business shares and investments can save your family
        thousands in probate. Plus, it keeps your business private.
      </StepSubtitle>

      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.25rem',
        }}
      >
        <OptionCard
          selected={data.wants_secondary_will === true}
          onClick={() => selectOption(true)}
          icon={<span>&#x1F3E2;</span>}
          title="Yes. I have a business and I want to save on probate fees"
        />
        <OptionCard
          selected={data.wants_secondary_will === false}
          onClick={() => selectOption(false)}
          icon={<span>&#x2716;</span>}
          title="No"
          description="Continue without secondary will"
        />
      </div>

      <div className="navigation-buttons" style={{ justifyContent: 'center', marginTop: '3rem' }}>
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back
        </button>
      </div>
    </div>
  );
}
