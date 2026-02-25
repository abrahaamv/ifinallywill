/**
 * Step 9: Partner Location — city autocomplete for spouse
 * Same pattern as LocationStep but for partner fields.
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { CityAutocomplete } from './primitives/CityAutocomplete';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PartnerLocationStep({ data, onUpdate, onNext, onBack }: Props) {
  const handleCityChange = (city: string, province: string, country: string) => {
    onUpdate({ partner_city: city, partner_province: province, partner_country: country });
  };

  const isComplete =
    data.partner_city.trim() !== '' &&
    data.partner_province.trim() !== '' &&
    data.partner_country.trim() !== '';

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>Where does your spouse live?</SectionTitle>
      <StepSubtitle>
        We&apos;ll use their province to ensure their documents comply with local laws.
      </StepSubtitle>

      <div className="epilogue-form-container">
        <CityAutocomplete
          value={data.partner_city}
          province={data.partner_province}
          country={data.partner_country}
          onCityChange={handleCityChange}
          label="City"
        />

        <NavButtons
          onBack={onBack}
          onNext={onNext}
          nextLabel="Continue &rarr;"
          nextDisabled={!isComplete}
        />
      </div>
    </div>
  );
}
