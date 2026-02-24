/**
 * POA Step 1: Personal Information
 * Reuses the same fields as the will PersonalInfoStep.
 * Data saved via poaData.updateSection('personalInfo', ...)
 */

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema } from '@platform/api-contract/schemas';
import type { z } from 'zod';
import { StepLayout } from '../shared/StepLayout';
import type { PoaStepProps } from '../wizard/PoaWizardShell';
import { PROVINCES } from '../../config/provinces';
import { trpc } from '../../utils/trpc';

type FormData = z.infer<typeof personalInfoSchema>;

function formatPhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

const COMMON_CITIES: Array<{ city: string; province: string }> = [
  { city: 'Toronto', province: 'ON' }, { city: 'Montreal', province: 'QC' },
  { city: 'Vancouver', province: 'BC' }, { city: 'Calgary', province: 'AB' },
  { city: 'Edmonton', province: 'AB' }, { city: 'Ottawa', province: 'ON' },
  { city: 'Winnipeg', province: 'MB' }, { city: 'Halifax', province: 'NS' },
  { city: 'Saskatoon', province: 'SK' }, { city: 'Regina', province: 'SK' },
  { city: 'Victoria', province: 'BC' }, { city: 'Hamilton', province: 'ON' },
  { city: 'London', province: 'ON' }, { city: 'Kitchener', province: 'ON' },
];

export function PoaPersonalInfoStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const existing = existingPoa?.personalInfo as FormData | undefined;
  const updateSection = trpc.poaData.updateSection.useMutation();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: existing?.fullName ?? '',
      email: existing?.email ?? '',
      city: existing?.city ?? '',
      province: existing?.province ?? '',
      country: existing?.country ?? 'Canada',
      phone: existing?.phone ?? '',
      gender: existing?.gender,
      dateOfBirth: existing?.dateOfBirth ?? '',
    },
  });

  const values = watch();
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; province: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleCityInput = useCallback((inputValue: string) => {
    setValue('city', inputValue);
    if (inputValue.length >= 2) {
      const matches = COMMON_CITIES.filter((c) =>
        c.city.toLowerCase().startsWith(inputValue.toLowerCase())
      ).slice(0, 5);
      setCitySuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setCitySuggestions([]);
      setShowSuggestions(false);
    }
  }, [setValue]);

  const selectCity = (city: string, province: string) => {
    setValue('city', city);
    setValue('province', province);
    setShowSuggestions(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value));
  };

  useEffect(() => {
    if (values.fullName || values.email) {
      updateSection.mutate({ estateDocId, section: 'personalInfo', data: values });
    }
  }, [values.fullName, values.email, values.city, values.province]);

  const onSubmit = (data: FormData) => {
    updateSection.mutate({ estateDocId, section: 'personalInfo', data }, {
      onSuccess: () => onNext(),
    });
  };

  return (
    <StepLayout
      title="Personal Information"
      description="Your information as it will appear on your Power of Attorney document."
      onNext={handleSubmit(onSubmit)}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateSection.isPending ? 'saving' : updateSection.isSuccess ? 'saved' : 'idle'}
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="poa-pi-name" className="block text-sm font-medium mb-1">Full Legal Name *</label>
          <input id="poa-pi-name" {...register('fullName')} className="ifw-input" placeholder="e.g. John David Smith" />
          {errors.fullName && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.fullName.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="poa-pi-email" className="block text-sm font-medium mb-1">Email *</label>
            <input id="poa-pi-email" type="email" {...register('email')} className="ifw-input" />
            {errors.email && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="poa-pi-phone" className="block text-sm font-medium mb-1">Phone</label>
            <input id="poa-pi-phone" type="tel" value={values.phone ?? ''} onChange={handlePhoneChange} className="ifw-input" maxLength={11} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label htmlFor="poa-pi-city" className="block text-sm font-medium mb-1">City *</label>
            <input
              id="poa-pi-city"
              type="text"
              value={values.city ?? ''}
              onChange={(e) => handleCityInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="ifw-input"
              placeholder="Start typing..."
              autoComplete="off"
            />
            {errors.city && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.city.message}</p>}
            {showSuggestions && citySuggestions.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 border border-[var(--ifw-border)] rounded-lg bg-[var(--ifw-bg-light)] shadow-md max-h-48 overflow-y-auto">
                {citySuggestions.map((s) => (
                  <li key={`${s.city}-${s.province}`}>
                    <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ifw-surface-hover)]" onMouseDown={() => selectCity(s.city, s.province)}>
                      {s.city}, {PROVINCES.find((p) => p.code === s.province)?.name ?? s.province}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="poa-pi-province" className="block text-sm font-medium mb-1">Province *</label>
            <select id="poa-pi-province" {...register('province')} className="ifw-input">
              <option value="">Select province...</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            {errors.province && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.province.message}</p>}
          </div>
        </div>

        <div className="ifw-info-box">
          <strong>Power of Attorney</strong> allows someone you trust to make financial or property decisions
          on your behalf. This document must comply with the laws of your province.
        </div>
      </div>
    </StepLayout>
  );
}
