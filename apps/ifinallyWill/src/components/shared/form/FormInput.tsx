/**
 * FormInput — Labeled text input integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Renders the standard `ifw-input` class for design-system consistency.
 */

import { Controller, useFormContext } from 'react-hook-form';

export interface FormInputProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Visible label rendered above the input */
  label: string;
  /** Placeholder text shown when the field is empty */
  placeholder?: string;
  /** HTML input type */
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'url';
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
  /** Extra CSS class names appended to the input element */
  className?: string;
  /** Auto-complete hint forwarded to the underlying `<input>` */
  autoComplete?: string;
}

export function FormInput({
  name,
  label,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  error,
  className,
  autoComplete,
}: FormInputProps) {
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
          <input
            {...field}
            id={`form-${name}`}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            value={field.value ?? ''}
            className={[
              'ifw-input',
              fieldError ? 'border-[var(--ifw-error)] focus:border-[var(--ifw-error)]' : '',
              disabled ? 'opacity-60 cursor-not-allowed bg-[var(--ifw-neutral-100)]' : '',
              className ?? '',
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
