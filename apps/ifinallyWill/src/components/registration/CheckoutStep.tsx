/**
 * Step 12: Checkout — order summary with tax breakdown
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { getTaxBreakdown, formatPrice } from '../../utils/taxUtils';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CheckoutStep({ data, onUpdate, onNext, onBack }: Props) {
  const tax = getTaxBreakdown(data.package_price, data.province);

  const handleComplete = () => {
    onUpdate({ payment_status: 'pending' });
    onNext();
  };

  const handleSkip = () => {
    onUpdate({ payment_status: 'skipped' });
    onNext();
  };

  return (
    <div className="epilogue-step-card animate-slide-in-right" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <SectionTitle>Review &amp; Complete</SectionTitle>
      <StepSubtitle>Confirm your order before we create your account.</StepSubtitle>

      {/* Order summary */}
      <div
        style={{
          border: '1px solid var(--color-border, #E5E7EB)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border, #E5E7EB)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>{data.package_name || 'No package selected'}</span>
          <span style={{ fontWeight: 600 }}>{formatPrice(data.package_price)}</span>
        </div>

        {tax.hst > 0 && (
          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: '#374151' }}>
            <span>{tax.taxLabel}</span>
            <span>{formatPrice(tax.hst)}</span>
          </div>
        )}
        {tax.gst > 0 && (
          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: '#374151' }}>
            <span>GST ({((tax.gst / data.package_price) * 100).toFixed(0)}%)</span>
            <span>{formatPrice(tax.gst)}</span>
          </div>
        )}
        {tax.pst > 0 && (
          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: '#374151' }}>
            <span>PST</span>
            <span>{formatPrice(tax.pst)}</span>
          </div>
        )}

        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--color-border, #E5E7EB)',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          <span>Total</span>
          <span>{formatPrice(tax.total)}</span>
        </div>
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
        Payment is not due until your documents are ready to generate.
        You can fill everything out for free.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <button type="button" className="btn-primary" onClick={handleComplete} style={{ width: '100%' }}>
          Complete Registration
        </button>
        <button
          type="button"
          onClick={handleSkip}
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
          }}
        >
          Skip Payment &mdash; Start Free
        </button>
      </div>

      <NavButtons onBack={onBack} onNext={() => {}} nextLabel="" nextDisabled showBack />
    </div>
  );
}
