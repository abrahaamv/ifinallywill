/**
 * FormCheckbox — Labeled checkbox integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Renders a checkbox with an optional description line beneath the label.
 */

import { Controller, useFormContext } from 'react-hook-form';

export interface FormCheckboxProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Primary label rendered beside the checkbox */
  label: string;
  /** Optional secondary description shown below the label */
  description?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
}

export function FormCheckbox({
  name,
  label,
  description,
  disabled = false,
  error,
}: FormCheckboxProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const fieldError = error || (errors[name]?.message as string | undefined);

  return (
    <div>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <label
            htmlFor={`form-${name}`}
            className={[
              'flex items-start gap-3 cursor-pointer',
              disabled ? 'opacity-60 cursor-not-allowed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              id={`form-${name}`}
              type="checkbox"
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
              className={[
                'mt-0.5 h-4 w-4 rounded border-[var(--ifw-border)] text-[var(--ifw-primary-500)]',
                'focus:ring-2 focus:ring-[var(--ifw-primary-500)] focus:ring-offset-0',
                'transition-colors',
                fieldError ? 'border-[var(--ifw-error)]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            <span className="select-none">
              <span className="block text-sm font-medium text-[var(--ifw-text)]">{label}</span>
              {description && (
                <span className="block text-xs text-[var(--ifw-neutral-500)] mt-0.5">
                  {description}
                </span>
              )}
            </span>
          </label>
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1 ml-7">{fieldError}</p>}
    </div>
  );
}
