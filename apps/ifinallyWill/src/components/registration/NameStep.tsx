/**
 * Step 3: Name — full legal name and optional phone
 * Ported from v6 NameStep.jsx. Auto-sets gender='other' on mount.
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { useAssistantForm } from '../../hooks/useAssistantForm';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { FloatingInput } from './primitives/FloatingInput';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';

const nameSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Last name is required'),
  phone_number: z.string(),
});

type NameFormData = z.infer<typeof nameSchema>;

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function NameStep({ data, onUpdate, onNext, onBack }: Props) {
  const form = useAssistantForm<NameFormData>({
    schema: nameSchema,
    defaultValues: {
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
    },
  });

  const { watch, setValue } = form;

  useEffect(() => {
    if (data.gender !== 'other') {
      onUpdate({ gender: 'other' });
    }
  }, []);

  // Sync form values back to wizard state
  useEffect(() => {
    const subscription = watch((values: Partial<NameFormData>) => {
      onUpdate({
        first_name: values.first_name ?? '',
        middle_name: values.middle_name ?? '',
        last_name: values.last_name ?? '',
        phone_number: values.phone_number ?? '',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Sync incoming wizard data into form
  useEffect(() => {
    if (data.first_name !== form.getValues('first_name')) setValue('first_name', data.first_name);
    if (data.middle_name !== form.getValues('middle_name'))
      setValue('middle_name', data.middle_name);
    if (data.last_name !== form.getValues('last_name')) setValue('last_name', data.last_name);
    if (data.phone_number !== form.getValues('phone_number'))
      setValue('phone_number', data.phone_number);
  }, [data.first_name, data.middle_name, data.last_name, data.phone_number]);

  const isComplete = data.first_name.trim() !== '' && data.last_name.trim() !== '';

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>What&apos;s your full legal name?</SectionTitle>

      <div className="epilogue-form-container">
        <FloatingInput
          id="first_name"
          label="First Name"
          value={data.first_name}
          onChange={(v) => setValue('first_name', v)}
          autoComplete="given-name"
          required
        />
        <FloatingInput
          id="middle_name"
          label="Middle Name"
          value={data.middle_name}
          onChange={(v) => setValue('middle_name', v)}
          autoComplete="additional-name"
        />
        <FloatingInput
          id="last_name"
          label="Last Name"
          value={data.last_name}
          onChange={(v) => setValue('last_name', v)}
          autoComplete="family-name"
          required
        />
        <FloatingInput
          id="phone_number"
          label="Phone Number"
          value={data.phone_number}
          onChange={(v) => setValue('phone_number', v)}
          type="tel"
          autoComplete="tel"
          helperText="Optional — can be added later"
        />

        <NavButtons
          onBack={onBack}
          onNext={onNext}
          nextLabel="Save & Continue &rarr;"
          nextDisabled={!isComplete}
        />
      </div>
    </div>
  );
}
