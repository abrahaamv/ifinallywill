/**
 * FormPhoneInput — Phone number input with automatic formatting.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Formats the display value as (XXX) XXX-XXXX while storing only digits.
 * Matches the v6 phone-formatting pattern used in PersonalInfoStep.
 */

import { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

export interface FormPhoneInputProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Visible label rendered above the input */
  label: string;
  /** Placeholder text shown when the field is empty */
  placeholder?: string;
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
}

/**
 * Format a digit-only string into (XXX) XXX-XXXX.
 * Returns partial formatting when the string is shorter than 10 digits.
 */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Strip everything except digits */
function stripToDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function FormPhoneInput({
  name,
  label,
  placeholder = '(416) 555-1234',
  required = false,
  disabled = false,
  error,
}: FormPhoneInputProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = error || (errors[name]?.message as string | undefined);

  const handleChange = useCallback((rawValue: string, onChange: (value: string) => void) => {
    const digits = stripToDigits(rawValue);
    onChange(digits);
  }, []);

  return (
    <div>
      <label
        htmlFor={`form-${name}`}
        className="block text-sm font-medium mb-1 text-[var(--ifw-text)]"
      >
        {label}
        {required && <span className="text-[var(--ifw-error)] ml-0.5">*</span>}
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={`form-${name}`}
            type="tel"
            placeholder={placeholder}
            disabled={disabled}
            value={formatPhoneDisplay(field.value ?? '')}
            onChange={(e) => handleChange(e.target.value, field.onChange)}
            onBlur={field.onBlur}
            ref={field.ref}
            autoComplete="tel"
            className={[
              'ifw-input',
              fieldError ? 'border-[var(--ifw-error)] focus:border-[var(--ifw-error)]' : '',
              disabled ? 'opacity-60 cursor-not-allowed bg-[var(--ifw-neutral-100)]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1">{fieldError}</p>}
    </div>
  );
}
