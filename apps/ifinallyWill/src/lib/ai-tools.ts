/**
 * AI Tool Definitions for Wilfred Assistant
 *
 * These tools allow the AI to interact with forms, navigate the wizard,
 * and provide contextual help to users.
 */

import { z } from 'zod';

/** Tool: Set a form field value */
export const setFormFieldTool = {
  name: 'set_form_field' as const,
  description:
    'Sets the value of a form field. Use this to help users fill out their estate planning forms.',
  parameters: z.object({
    fieldName: z.string().describe('The name/path of the form field to set'),
    value: z.union([z.string(), z.number(), z.boolean()]).describe('The value to set'),
  }),
};

/** Tool: Submit the current form */
export const submitFormTool = {
  name: 'submit_form' as const,
  description: 'Submits the current form after confirming with the user.',
  parameters: z.object({
    confirm: z.boolean().describe('Whether the user has confirmed submission'),
  }),
};

/** Tool: Navigate to a different wizard step */
export const navigateStepTool = {
  name: 'navigate_step' as const,
  description: 'Navigates to a different step in the wizard.',
  parameters: z.object({
    stepId: z.string().describe('The step ID to navigate to'),
    direction: z.enum(['next', 'previous', 'specific']).describe('Navigation direction'),
  }),
};

/** Tool: Explain a legal term or form field */
export const explainFieldTool = {
  name: 'explain_field' as const,
  description: 'Provides a plain-language explanation of a legal term or form field.',
  parameters: z.object({
    fieldName: z.string().describe('The field or legal term to explain'),
    context: z.string().optional().describe('Additional context about what the user is asking'),
  }),
};

/** Tool: Suggest a value for a form field */
export const suggestValueTool = {
  name: 'suggest_value' as const,
  description: 'Suggests an appropriate value for a form field based on context.',
  parameters: z.object({
    fieldName: z.string().describe('The field to suggest a value for'),
    currentValues: z.record(z.unknown()).optional().describe('Current form values for context'),
  }),
};

/** All tool definitions */
export const aiTools = [
  setFormFieldTool,
  submitFormTool,
  navigateStepTool,
  explainFieldTool,
  suggestValueTool,
] as const;

export type AIToolName = (typeof aiTools)[number]['name'];
