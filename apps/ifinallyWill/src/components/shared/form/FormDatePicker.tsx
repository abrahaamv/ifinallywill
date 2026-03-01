/**
 * FormDatePicker — Date picker integrated with react-hook-form.
 *
 * Uses `useFormContext` so the parent must wrap the form in a `<FormProvider>`.
 * Wraps `react-datepicker` and applies ifw design-system styling.
 */

import DatePicker from 'react-datepicker';
import { Controller, useFormContext } from 'react-hook-form';

export interface FormDatePickerProps {
  /** Field name (must match the form schema key) */
  name: string;
  /** Visible label rendered above the picker */
  label: string;
  /** Earliest selectable date */
  minDate?: Date;
  /** Latest selectable date */
  maxDate?: Date;
  /** Placeholder text shown when no date is selected */
  placeholder?: string;
  /** Whether the field is required (appends * to the label) */
  required?: boolean;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Explicit error message — overrides the form-state error */
  error?: string;
  /** Date display format — defaults to yyyy-MM-dd */
  dateFormat?: string;
  /** Whether to show a year dropdown for easier navigation */
  showYearDropdown?: boolean;
  /** Whether to show a month dropdown for easier navigation */
  showMonthDropdown?: boolean;
}

export function FormDatePicker({
  name,
  label,
  minDate,
  maxDate,
  placeholder = 'Select a date...',
  required = false,
  disabled = false,
  error,
  dateFormat = 'yyyy-MM-dd',
  showYearDropdown = false,
  showMonthDropdown = false,
}: FormDatePickerProps) {
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
          <DatePicker
            id={`form-${name}`}
            selected={field.value ? new Date(field.value) : null}
            onChange={(date: Date | null) => {
              field.onChange(date?.toISOString() ?? '');
            }}
            onBlur={field.onBlur}
            minDate={minDate}
            maxDate={maxDate}
            placeholderText={placeholder}
            disabled={disabled}
            dateFormat={dateFormat}
            showYearDropdown={showYearDropdown}
            showMonthDropdown={showMonthDropdown}
            dropdownMode="select"
            autoComplete="off"
            className={[
              'ifw-input',
              fieldError ? 'border-[var(--ifw-error)] focus:border-[var(--ifw-error)]' : '',
              disabled ? 'opacity-60 cursor-not-allowed bg-[var(--ifw-neutral-100)]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            wrapperClassName="w-full"
          />
        )}
      />

      {fieldError && <p className="text-xs text-[var(--ifw-error)] mt-1">{fieldError}</p>}
    </div>
  );
}
