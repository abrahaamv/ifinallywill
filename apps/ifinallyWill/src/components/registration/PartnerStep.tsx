/**
 * Step 7: Partner — two-phase: Yes/No then Married/CommonLaw
 * Ported from v6 PartnerStep.jsx. Auto-advances on "No" and on relationship selection.
 */

import { useState } from 'react';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { OptionCard } from './primitives/OptionCard';
import { SectionTitle } from './primitives/SectionTitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PartnerStep({ data, onUpdate, onNext, onBack }: Props) {
  const [showRelationshipType, setShowRelationshipType] = useState(() => {
    if (data.from_couples_plan_selection) return true;
    return (
      data.has_partner === 'yes' &&
      (data.marital_status === 'married' || data.marital_status === 'commonLaw')
    );
  });

  const selectHasPartner = (value: 'yes' | 'no') => {
    if (value === 'yes') {
      onUpdate({ has_partner: 'yes' });
      setShowRelationshipType(true);
    } else {
      onUpdate({
        has_partner: 'no',
        marital_status: 'single',
        partner_first_name: '',
        partner_middle_name: '',
        partner_last_name: '',
        partner_common_name: '',
        partner_email: '',
        partner_phone: '',
        partner_same_address: true,
        partner_city: '',
        partner_province: '',
        partner_country: '',
        wants_spousal_package: null,
        from_couples_plan_selection: false,
      });
      setShowRelationshipType(false);
      setTimeout(onNext, 200);
    }
  };

  const selectRelationshipType = (type: 'married' | 'commonLaw') => {
    onUpdate({ marital_status: type });
    setTimeout(onNext, 200);
  };

  const handleBack = () => {
    if (showRelationshipType) {
      setShowRelationshipType(false);
      onUpdate({ has_partner: '' });
    } else {
      onBack();
    }
  };

  if (showRelationshipType) {
    return (
      <div className="animate-slide-in-right">
        <SectionTitle>What is your relationship status?</SectionTitle>
        <div className="options-grid-2col">
          <OptionCard
            selected={data.marital_status === 'married'}
            onClick={() => selectRelationshipType('married')}
            icon={<span>&#x2764;&#xFE0F;</span>}
            title="Married"
            description="I'm legally married"
          />
          <OptionCard
            selected={data.marital_status === 'commonLaw'}
            onClick={() => selectRelationshipType('commonLaw')}
            icon={<span>&#x1F495;</span>}
            title="Common-Law"
            description="I'm in a common-law relationship"
          />
        </div>
        <div className="navigation-buttons" style={{ justifyContent: 'center', marginTop: '3rem' }}>
          <button type="button" className="btn-back" onClick={handleBack}>
            &larr; Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-right">
      <SectionTitle>Do you have a spouse or common law partner?</SectionTitle>
      <div className="options-grid-2col">
        <OptionCard
          selected={data.has_partner === 'yes'}
          onClick={() => selectHasPartner('yes')}
          icon={<span>&#x1F46B;</span>}
          title="Yes"
          description="I'm married or in a common-law relationship"
        />
        <OptionCard
          selected={data.has_partner === 'no'}
          onClick={() => selectHasPartner('no')}
          icon={<span>&#x1F464;</span>}
          title="No"
        />
      </div>
      <div className="navigation-buttons" style={{ justifyContent: 'center', marginTop: '3rem' }}>
        <button type="button" className="btn-back" onClick={handleBack}>
          &larr; Back
        </button>
      </div>
    </div>
  );
}
