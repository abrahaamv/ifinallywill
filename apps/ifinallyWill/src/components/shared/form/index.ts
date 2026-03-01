/**
 * Shared form primitives — barrel export.
 *
 * All components use `useFormContext` from react-hook-form,
 * so the consuming page must wrap them in a `<FormProvider>`.
 */

export { FormInput } from './FormInput';
export type { FormInputProps } from './FormInput';

export { FormSelect } from './FormSelect';
export type { FormSelectProps, SelectOption } from './FormSelect';

export { FormCheckbox } from './FormCheckbox';
export type { FormCheckboxProps } from './FormCheckbox';

export { FormRadioGroup } from './FormRadioGroup';
export type { FormRadioGroupProps, RadioOption } from './FormRadioGroup';

export { FormDatePicker } from './FormDatePicker';
export type { FormDatePickerProps } from './FormDatePicker';

export { FormTextArea } from './FormTextArea';
export type { FormTextAreaProps } from './FormTextArea';

export { FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';

export { FormPhoneInput } from './FormPhoneInput';
export type { FormPhoneInputProps } from './FormPhoneInput';
