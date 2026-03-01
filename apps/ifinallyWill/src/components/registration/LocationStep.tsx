/**
 * Step 2: Location — city autocomplete with province/country auto-fill
 * Ported from v6 LocationStep.jsx
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { useAssistantForm } from '../../hooks/useAssistantForm';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { CityAutocomplete } from './primitives/CityAutocomplete';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

const locationSchema = z.object({
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  country: z.string().min(1, 'Country is required'),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LocationStep({ data, onUpdate, onNext, onBack }: Props) {
  const form = useAssistantForm<LocationFormData>({
    schema: locationSchema,
    defaultValues: {
      city: data.city,
      province: data.province,
      country: data.country,
    },
  });

  const { watch, setValue } = form;

  // Sync form values back to wizard state
  useEffect(() => {
    const subscription = watch((values: Partial<LocationFormData>) => {
      onUpdate({
        city: values.city ?? '',
        province: values.province ?? '',
        country: values.country ?? '',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Sync incoming wizard data into form (e.g. if another source updates data)
  useEffect(() => {
    if (data.city !== form.getValues('city')) setValue('city', data.city);
    if (data.province !== form.getValues('province')) setValue('province', data.province);
    if (data.country !== form.getValues('country')) setValue('country', data.country);
  }, [data.city, data.province, data.country]);

  const handleCityChange = (city: string, province: string, country: string) => {
    setValue('city', city);
    setValue('province', province);
    setValue('country', country);
  };

  const isComplete =
    data.city.trim() !== '' && data.province.trim() !== '' && data.country.trim() !== '';

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
