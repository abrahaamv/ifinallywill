/**
 * Step 1: Welcome — intro screen with bullet list and CTA
 * Ported from v6 WelcomeStep.jsx
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

const INTRO =
  "Create your will in minutes with clear, step-by-step guidance \u2014 we'll ask the right questions and turn your answers into a proper will.";

const BULLETS = [
  "Prepare information about your spouse or partner, if you have one \u2014 full legal name, relationship status, and whether you'd like to include them in your will or name them as executor or beneficiary.",
  "Prepare information for your business, if you have one \u2014 whether you're incorporated or run a limited company, and how you'd like the business to be handled in your estate plan.",
  "Be ready to see your plan that fits you \u2014 we'll tailor your will and any power of attorney to your situation so you can review a draft that matches your wishes.",
];

export function WelcomeStep({ onNext }: Props) {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1rem', maxWidth: '700px', margin: '0 auto' }}>
      <SectionTitle>Let&apos;s Get Started</SectionTitle>
      <StepSubtitle>{INTRO}</StepSubtitle>

      {/* Bullet list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto 2rem auto', maxWidth: '520px' }}>
        {BULLETS.map((text, i) => (
          <li
            key={i}
            style={{
              position: 'relative',
              padding: '1rem 0 1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#1a1a1a',
              lineHeight: 1.5,
              borderBottom: i < BULLETS.length - 1 ? '1px solid var(--color-border, #E5E7EB)' : 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: '1.35rem',
                width: '6px',
                height: '6px',
                background: '#0A1E86',
                borderRadius: '50%',
              }}
            />
            {text}
          </li>
        ))}
      </ul>

      <div style={{ textAlign: 'center' }}>
        <button type="button" className="btn-primary" onClick={onNext}>
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
