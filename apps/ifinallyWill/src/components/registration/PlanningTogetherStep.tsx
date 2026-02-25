/**
 * Step 10: Planning Together — couples estate planning offer
 * Ported from v6 PlanningTogetherStep.jsx. Auto-advances on selection.
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlanningTogetherStep({ data, onUpdate, onNext, onBack }: Props) {
  const partnerName = data.partner_first_name || 'your spouse';

  const selectOption = (value: boolean) => {
    onUpdate({ wants_spousal_package: value });
    setTimeout(onNext, 200);
  };

  return (
    <div className="animate-slide-in-right" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <SectionTitle>Planning for the Future Together?</SectionTitle>
      <StepSubtitle>
        Every adult needs their own legal will &mdash; even spouses. Choose the coverage
        that works best for your situation.
      </StepSubtitle>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--color-border, #E5E7EB)',
          maxWidth: '700px',
          margin: '0 auto 1.5rem auto',
          overflow: 'hidden',
        }}
      >
        {/* Family illustration */}
        <div style={{ textAlign: 'center', padding: '2rem 1.5rem 1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;&#x200D;&#x1F466;</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000', marginBottom: '0.5rem' }}>
            Create documents together
          </h2>
          <p style={{ color: '#000', fontSize: '1rem', marginBottom: '1.5rem' }}>
            Estate planning for you and {partnerName}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => selectOption(true)}
              style={{ width: '100%' }}
            >
              Yes, make documents for both of us
            </button>
            <button
              type="button"
              onClick={() => selectOption(false)}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                fontWeight: 500,
                border: '2px solid #D1D5DB',
                background: '#F3F4F6',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background 0.2s',
              }}
            >
              No, just for me
            </button>
          </div>
        </div>
      </div>

      <div className="navigation-buttons" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back
        </button>
      </div>
    </div>
  );
}
