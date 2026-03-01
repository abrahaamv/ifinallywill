/**
 * Step 10: Planning Together — couples estate planning offer
 * Ported from v6 PlanningTogetherStep.jsx. Auto-advances on selection.
 */

import FamilyImage from '../../assets/family-image.svg';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const featureItems = [
  'Coordinated wills that complement each other',
  'Aligned power of attorney assignments',
  'Shared executor and beneficiary planning',
  'One process, two complete estate plans',
];

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
        Every adult needs their own legal will &mdash; even spouses. Choose the coverage that works
        best for your situation.
      </StepSubtitle>

      {/* CardContainer */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          maxWidth: '700px',
          margin: '0 auto 1.5rem auto',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* ContentPanel */}
        <div
          style={{
            padding: '1.5rem',
            background: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          {/* Family illustration */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <img
              src={FamilyImage}
              alt="Family illustration"
              style={{ maxHeight: '16rem', objectFit: 'contain' }}
            />
          </div>

          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#000000',
              marginBottom: '0.5rem',
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Create documents together
          </h2>

          <p
            style={{
              color: '#000000',
              fontSize: '1rem',
              marginBottom: '1.5rem',
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Estate planning for you and {partnerName}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => selectOption(true)}
              style={{ width: '100%', justifyContent: 'center' }}
              aria-label="Choose estate planning for both"
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
                justifyContent: 'center',
              }}
              aria-label="Choose estate planning for individual"
            >
              No, just for me
            </button>
          </div>
        </div>

        {/* FeaturePanel */}
        <div
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #0C1F3C 0%, #0A1E86 100%)',
          }}
        >
          <h3
            style={{
              color: '#FFFFFF',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '1rem',
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Why choose the couples plan?
          </h3>

          <p
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            When two adults share a household, their estates need to be aligned.
          </p>

          {featureItems.map((text) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
              }}
            >
              {/* Green checkmark */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                style={{ flexShrink: 0, marginRight: '0.75rem', marginTop: '2px' }}
              >
                <path
                  d="M16.667 5L7.5 14.167 3.333 10"
                  stroke="#4ADE80"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p
                style={{
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  margin: 0,
                }}
              >
                {text}
              </p>
            </div>
          ))}

          {/* SaveBadge */}
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <p
              style={{
                color: '#4ADE80',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                margin: 0,
              }}
            >
              Save $69 compared to two individual Complete Plans
            </p>
          </div>
        </div>
      </div>

      {/* Navigation: Back button only, centered */}
      <div className="navigation-buttons" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn-back" onClick={onBack}>
          &larr; Back
        </button>
      </div>
    </div>
  );
}
