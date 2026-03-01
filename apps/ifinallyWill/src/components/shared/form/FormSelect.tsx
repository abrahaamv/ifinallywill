/**
 * FormSelect — Labeled select dropdown integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Renders the standard `ifw-input` class for design-system consistency.
 */

import { Controller, useFormContext } from 'react-hook-form';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Visible label rendered above the select */
  label: string;
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Placeholder shown as the first disabled option */
  placeholder?: string;
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
  /** Extra CSS class names appended to the select element */
  className?: string;
}

export function FormSelect({
  name,
  label,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  className,
}: FormSelectProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = error || (errors[name]?.message as string | undefined);

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
          <select
            {...field}
            id={`form-${name}`}
            disabled={disabled}
            value={field.value ?? ''}
            className={[
              'ifw-input',
              fieldError ? 'border-[var(--ifw-error)] focus:border-[var(--ifw-error)]' : '',
              disabled ? 'opacity-60 cursor-not-allowed bg-[var(--ifw-neutral-100)]' : '',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1">{fieldError}</p>}
    </div>
  );
}
