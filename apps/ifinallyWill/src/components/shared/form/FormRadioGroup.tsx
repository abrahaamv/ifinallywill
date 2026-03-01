/**
 * FormRadioGroup — A radio button group integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Each option renders as an ifw-option-card-style radio item.
 */

import { Controller, useFormContext } from 'react-hook-form';

export interface RadioOption {
  value: string;
  label: string;
  /** Optional description displayed below the label */
  description?: string;
}

export interface FormRadioGroupProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Group label rendered above the options */
  label: string;
  /** Radio options to render */
  options: RadioOption[];
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the entire group is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
  /** Layout direction — defaults to vertical */
  direction?: 'vertical' | 'horizontal';
}

export function FormRadioGroup({
  name,
  label,
  options,
  required = false,
  disabled = false,
  error,
  direction = 'vertical',
}: FormRadioGroupProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = error || (errors[name]?.message as string | undefined);

  return (
    <fieldset disabled={disabled}>
      <legend className="block text-sm font-medium mb-2 text-[var(--ifw-text)]">
        {label}
        {required && <span className="text-[var(--ifw-error)] ml-0.5">*</span>}
      </legend>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div
            className={direction === 'horizontal' ? 'flex flex-wrap gap-3' : 'flex flex-col gap-2'}
          >
            {options.map((opt) => {
              const isSelected = field.value === opt.value;
              return (
                <label
                  key={opt.value}
                  className={[
                    'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    isSelected
                      ? 'border-[var(--ifw-primary-500)] bg-[oklch(from_var(--ifw-primary-500)_l_c_h_/_0.08)]'
                      : 'border-[var(--ifw-border)] bg-[var(--ifw-bg-light)] hover:border-[var(--ifw-primary-500)] hover:bg-[var(--ifw-surface-hover)]',
                    disabled ? 'opacity-60 cursor-not-allowed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <input
                    type="radio"
                    name={name}
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => field.onChange(opt.value)}
                    onBlur={field.onBlur}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 border-[var(--ifw-border)] text-[var(--ifw-primary-500)] focus:ring-2 focus:ring-[var(--ifw-primary-500)] focus:ring-offset-0"
                  />
                  <span className="select-none">
                    <span className="block text-sm font-medium text-[var(--ifw-text)]">
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="block text-xs text-[var(--ifw-neutral-500)] mt-0.5">
                        {opt.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1">{fieldError}</p>}
    </fieldset>
  );
}
