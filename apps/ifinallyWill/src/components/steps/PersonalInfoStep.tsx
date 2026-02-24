/**
 * Step 1: Personal Information
 * Ported from v6 FormCity.jsx (1,193 lines) + Personal.jsx (8,601 lines)
 *
 * V6 features preserved:
 * - Full name, email, phone (digits-only formatting), gender, date of birth
 * - City input with province auto-fill from PROVINCES list
 * - Province dropdown with all Canadian provinces/territories
 * - Country locked to Canada
 * - Info box explaining why we ask for this information
 */

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema } from '@platform/api-contract/schemas';
import type { z } from 'zod';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../wizard/WizardShell';
import { PROVINCES } from '../../config/provinces';

type FormData = z.infer<typeof personalInfoSchema>;

/** V6 pattern: strip non-digits from phone input */
function formatPhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function PersonalInfoStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.personalInfo as FormData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'personalInfo' });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
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

  // V6 pattern: province suggestion based on city match (simplified from CityAutocomplete.jsx)
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; province: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common Canadian cities for local autocomplete (v6 used an API endpoint, we use a local list)
  const COMMON_CITIES: Array<{ city: string; province: string }> = [
    { city: 'Toronto', province: 'ON' }, { city: 'Montreal', province: 'QC' },
    { city: 'Vancouver', province: 'BC' }, { city: 'Calgary', province: 'AB' },
    { city: 'Edmonton', province: 'AB' }, { city: 'Ottawa', province: 'ON' },
    { city: 'Winnipeg', province: 'MB' }, { city: 'Quebec City', province: 'QC' },
    { city: 'Hamilton', province: 'ON' }, { city: 'Kitchener', province: 'ON' },
    { city: 'London', province: 'ON' }, { city: 'Victoria', province: 'BC' },
    { city: 'Halifax', province: 'NS' }, { city: 'Oshawa', province: 'ON' },
    { city: 'Windsor', province: 'ON' }, { city: 'Saskatoon', province: 'SK' },
    { city: 'Regina', province: 'SK' }, { city: 'St. John\'s', province: 'NL' },
    { city: 'Barrie', province: 'ON' }, { city: 'Kelowna', province: 'BC' },
    { city: 'Abbotsford', province: 'BC' }, { city: 'Sudbury', province: 'ON' },
    { city: 'Kingston', province: 'ON' }, { city: 'Guelph', province: 'ON' },
    { city: 'Brampton', province: 'ON' }, { city: 'Mississauga', province: 'ON' },
    { city: 'Markham', province: 'ON' }, { city: 'Surrey', province: 'BC' },
    { city: 'Burnaby', province: 'BC' }, { city: 'Richmond', province: 'BC' },
    { city: 'Fredericton', province: 'NB' }, { city: 'Saint John', province: 'NB' },
    { city: 'Moncton', province: 'NB' }, { city: 'Charlottetown', province: 'PE' },
    { city: 'Yellowknife', province: 'NT' }, { city: 'Whitehorse', province: 'YT' },
    { city: 'Iqaluit', province: 'NU' }, { city: 'Thunder Bay', province: 'ON' },
    { city: 'Lethbridge', province: 'AB' }, { city: 'Red Deer', province: 'AB' },
    { city: 'Kamloops', province: 'BC' }, { city: 'Nanaimo', province: 'BC' },
    { city: 'Brantford', province: 'ON' }, { city: 'Chatham-Kent', province: 'ON' },
    { city: 'Peterborough', province: 'ON' }, { city: 'Sault Ste. Marie', province: 'ON' },
  ];

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

  // V6 pattern: phone formatting — strip non-digits on change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value));
  };

  // Auto-save on changes
  useEffect(() => {
    if (values.fullName || values.email) {
      autoSave.save(values);
    }
  }, [values.fullName, values.email, values.city, values.province, values.phone, values.gender, values.dateOfBirth]);

  const onSubmit = (data: FormData) => {
    autoSave.saveNow(data);
    onNext();
  };

  return (
    <StepLayout
      title="Personal Information"
      description="Tell us about yourself. This information will appear on your will."
      onNext={handleSubmit(onSubmit)}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-5">
        {/* Full Legal Name */}
        <div>
          <label htmlFor="pi-fullName" className="block text-sm font-medium mb-1">Full Legal Name *</label>
          <input
            id="pi-fullName"
            {...register('fullName')}
            className="ifw-input"
            placeholder="e.g. John David Smith"
          />
          {errors.fullName && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.fullName.message}</p>}
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pi-email" className="block text-sm font-medium mb-1">Email *</label>
            <input
              id="pi-email"
              type="email"
              {...register('email')}
              className="ifw-input"
              placeholder="you@email.com"
            />
            {errors.email && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="pi-phone" className="block text-sm font-medium mb-1">Phone</label>
            <input
              id="pi-phone"
              type="tel"
              value={values.phone ?? ''}
              onChange={handlePhoneChange}
              className="ifw-input"
              placeholder="e.g. 4165551234"
              maxLength={11}
            />
          </div>
        </div>

        {/* Gender + Date of Birth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="pi-gender" className="block text-sm font-medium mb-1">Gender</label>
            <select id="pi-gender" {...register('gender')} className="ifw-input">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="pi-dob" className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              id="pi-dob"
              type="date"
              {...register('dateOfBirth')}
              className="ifw-input"
            />
          </div>
        </div>

        {/* City + Province (v6: CityAutocomplete pattern with province auto-fill) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label htmlFor="pi-city" className="block text-sm font-medium mb-1">City *</label>
            <input
              id="pi-city"
              type="text"
              value={values.city ?? ''}
              onChange={(e) => handleCityInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => { if (citySuggestions.length > 0) setShowSuggestions(true); }}
              className="ifw-input"
              placeholder="Start typing your city..."
              autoComplete="off"
            />
            {errors.city && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.city.message}</p>}

            {/* City suggestions dropdown (v6 CityAutocomplete pattern) */}
            {showSuggestions && citySuggestions.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 mt-1 border border-[var(--ifw-border)] rounded-lg bg-[var(--ifw-bg-light)] shadow-md max-h-48 overflow-y-auto">
                {citySuggestions.map((s) => (
                  <li key={`${s.city}-${s.province}`}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ifw-surface-hover)] transition-colors"
                      onMouseDown={() => selectCity(s.city, s.province)}
                    >
                      {s.city}, {PROVINCES.find((p) => p.code === s.province)?.name ?? s.province}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="pi-province" className="block text-sm font-medium mb-1">Province *</label>
            <select id="pi-province" {...register('province')} className="ifw-input">
              <option value="">Select province...</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            {errors.province && <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.province.message}</p>}
          </div>
        </div>

        {/* Country (locked to Canada — v6 pattern) */}
        <div>
          <label htmlFor="pi-country" className="block text-sm font-medium mb-1">Country</label>
          <input
            id="pi-country"
            {...register('country')}
            className="ifw-input bg-[var(--ifw-neutral-100)]"
            readOnly
          />
        </div>

        {/* Info box */}
        <div className="ifw-info-box">
          <strong>Why do we need this?</strong> Your legal name, location, and date of birth are required to
          create a valid will in Canada. Provincial laws determine specific requirements for your will, so your
          city and province help us generate the correct legal document for your jurisdiction.
        </div>
      </div>
    </StepLayout>
  );
}
