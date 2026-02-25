/**
 * Step 2: Location — city autocomplete with province/country auto-fill
 * Ported from v6 LocationStep.jsx
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

export function LocationStep({ data, onUpdate, onNext, onBack }: Props) {
  const handleCityChange = (city: string, province: string, country: string) => {
    onUpdate({ city, province, country });
  };

  const isComplete =
    data.city.trim() !== '' &&
    data.province.trim() !== '' &&
    data.country.trim() !== '';

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>Where do you currently live?</SectionTitle>
      <StepSubtitle>
        We&apos;ll use your province to ensure your documents comply with local laws.
      </StepSubtitle>

      <div className="epilogue-form-container">
        <CityAutocomplete
          value={data.city}
          province={data.province}
          country={data.country}
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
