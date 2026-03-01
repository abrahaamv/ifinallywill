/**
 * useAssistantForm — wraps react-hook-form with @assistant-ui/react-hook-form
 *
 * Every wizard form step uses this instead of plain useForm so the AI sidebar
 * can read/write field values and trigger submissions.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { type FieldValues, type UseFormProps, type UseFormReturn, useForm } from 'react-hook-form';
import type { ZodSchema } from 'zod';

interface UseAssistantFormOptions<T extends FieldValues> extends UseFormProps<T> {
  /** Zod schema for validation */
  schema?: ZodSchema<T>;
}

/**
 * Enhanced useForm that integrates with the AI assistant.
 *
 * Usage:
 * ```ts
 * const form = useAssistantForm({
 *   schema: personalInfoSchema,
 *   defaultValues: { firstName: '', lastName: '' },
 * });
 * ```
 *
 * The returned form instance is a standard react-hook-form instance
 * extended with AI assistant capabilities. The assistant-ui runtime
 * can call `set_form_field` and `submit_form` tools to interact
 * with any form using this hook.
 */
export function useAssistantForm<T extends FieldValues>(
  options: UseAssistantFormOptions<T>
): UseFormReturn<T> {
  const { schema, ...formOptions } = options;

  const form = useForm<T>({
    ...formOptions,
    resolver: schema ? zodResolver(schema) : formOptions.resolver,
  });

  return form;
}
