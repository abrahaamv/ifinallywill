/**
 * Step 8: Partner Name — name fields, email, phone, same-address checkbox
 * Ported from v6 PartnerNameStep.jsx
 */

import { useEffect, useState } from 'react';
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

export function PartnerNameStep({ data, onUpdate, onNext, onBack }: Props) {
  const [sameAddress, setSameAddress] = useState(data.partner_same_address);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setSameAddress(data.partner_same_address);
  }, [data.partner_same_address]);

  const handleSameAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAddress(checked);
    onUpdate({ partner_same_address: checked });
  };

  const handleEmailChange = (val: string) => {
    onUpdate({ partner_email: val });
    if (emailError) setEmailError('');
  };

  const handleContinue = () => {
    if (data.partner_email && data.partner_email === data.email) {
      setEmailError('Partner email cannot be the same as your primary email address.');
      return;
    }
    onNext();
  };

  const isComplete = data.partner_first_name.trim() !== '' && data.partner_last_name.trim() !== '';

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>What is your spouse&apos;s name?</SectionTitle>

      <div className="epilogue-form-container">
        <FloatingInput
          id="partner_first_name"
          label="First Name"
          value={data.partner_first_name}
          onChange={(v) => onUpdate({ partner_first_name: v })}
          autoComplete="given-name"
          required
        />
        <FloatingInput
          id="partner_middle_name"
          label="Middle Name (Optional)"
          value={data.partner_middle_name}
          onChange={(v) => onUpdate({ partner_middle_name: v })}
        />
        <FloatingInput
          id="partner_last_name"
          label="Last Name"
          value={data.partner_last_name}
          onChange={(v) => onUpdate({ partner_last_name: v })}
          autoComplete="family-name"
          required
        />
        <FloatingInput
          id="partner_email"
          label="Email (Optional)"
          value={data.partner_email}
          onChange={handleEmailChange}
          type="email"
          error={emailError}
        />
        <FloatingInput
          id="partner_phone"
          label="Phone Number"
          value={data.partner_phone}
          onChange={(v) => onUpdate({ partner_phone: v })}
          type="tel"
          helperText="Optional \u2014 can be added later"
        />

        {/* Same address checkbox */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '1.5rem',
            backgroundColor: 'var(--color-surface, #fff)',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-border, #E5E7EB)',
          }}
        >
          <label
            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={sameAddress}
              onChange={handleSameAddressChange}
              style={{
                marginTop: '0.25rem',
                width: '1.125rem',
                height: '1.125rem',
                accentColor: '#0A1E86',
              }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 500 }}>
              Same city, province and country as you
            </span>
          </label>
          {!sameAddress && (
            <p
              style={{
                marginTop: '0.75rem',
                marginLeft: '2rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
              }}
            >
              You&apos;ll be asked for your spouse&apos;s city, province and country in the next
              step
            </p>
          )}
        </div>

        <NavButtons
          onBack={onBack}
          onNext={handleContinue}
          nextLabel="Continue &rarr;"
          nextDisabled={!isComplete}
        />
      </div>
    </div>
  );
}
