/**
 * FormTextArea — Labeled textarea integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Renders the standard `ifw-input` class for design-system consistency.
 */

import { Controller, useFormContext } from 'react-hook-form';

export interface FormTextAreaProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Visible label rendered above the textarea */
  label: string;
  /** Placeholder text shown when the field is empty */
  placeholder?: string;
  /** Number of visible text rows — defaults to 4 */
  rows?: number;
  /** Maximum character count. When set, a counter is shown. */
  maxLength?: number;
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the textarea is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
  /** Extra CSS class names appended to the textarea element */
  className?: string;
}

export function FormTextArea({
  name,
  label,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  disabled = false,
  error,
  className,
}: FormTextAreaProps) {
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
          <>
            <textarea
              {...field}
              id={`form-${name}`}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              disabled={disabled}
              value={field.value ?? ''}
              className={[
                'ifw-input resize-y',
                fieldError ? 'border-[var(--ifw-error)] focus:border-[var(--ifw-error)]' : '',
                disabled ? 'opacity-60 cursor-not-allowed bg-[var(--ifw-neutral-100)]' : '',
                className ?? '',
              ]
                .filter(Boolean)
                .join(' ')}
            />

            {maxLength && (
              <p className="text-xs text-[var(--ifw-neutral-400)] mt-1 text-right">
                {(field.value as string)?.length ?? 0} / {maxLength}
              </p>
            )}
          </>
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1">{fieldError}</p>}
    </div>
  );
}
