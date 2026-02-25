/**
 * Step 6: POA type selection — 4 option cards
 * Ported from v6 POAStep.jsx. Auto-advances 200ms after selection.
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

type PoaValue = 'property' | 'health' | 'both' | 'none';

export function POAStep({ data, onUpdate, onNext, onBack }: Props) {
  const selectOption = (value: PoaValue) => {
    onUpdate({ poa_type: value, wants_poa: value !== 'none' });
    setTimeout(onNext, 200);
  };

  return (
    <div className="animate-slide-in-right">
      <SectionTitle>What if you are incapacitated?</SectionTitle>
      <StepSubtitle>
        If you&apos;re incapacitated and unable to make decisions, who will manage your
        finances and medical care? A Power of Attorney lets your chosen person make
        decisions for you.
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
          selected={data.poa_type === 'property'}
          onClick={() => selectOption('property')}
          icon={<span>&#x1F3E0;</span>}
          title="I want POA for Property"
          description="Manage financial decisions"
        />
        <OptionCard
          selected={data.poa_type === 'health'}
          onClick={() => selectOption('health')}
          icon={<span>&#x2764;&#xFE0F;</span>}
          title="I want POA for Health"
          description="Manage medical decisions"
        />
        <OptionCard
          selected={data.poa_type === 'both'}
          onClick={() => selectOption('both')}
          icon={<span>&#x1F6E1;&#xFE0F;</span>}
          title="I want Both"
          badge="SMART CHOICE"
        />
        <OptionCard
          selected={data.poa_type === 'none'}
          onClick={() => selectOption('none')}
          icon={<span>&#x1F4C4;</span>}
          title="I just need a Will"
          description="Skip Power of Attorney"
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
