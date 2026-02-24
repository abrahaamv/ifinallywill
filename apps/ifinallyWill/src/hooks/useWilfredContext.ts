/**
 * Builds Wilfred AI context from the current wizard state.
 *
 * Passed to wilfred.sendMessage so the AI knows which step
 * the user is on, their province, document type, and form values.
 */

import { useMemo } from 'react';

interface WilfredContextOptions {
  stepId?: string;
  province?: string;
  documentType?: string;
  completedSteps?: string[];
  formValues?: Record<string, unknown>;
}

export function useWilfredContext(options: WilfredContextOptions) {
  return useMemo(
    () => ({
      stepId: options.stepId,
      province: options.province,
      documentType: options.documentType,
      completedSteps: options.completedSteps,
      formValues: options.formValues,
    }),
    [
      options.stepId,
      options.province,
      options.documentType,
      JSON.stringify(options.completedSteps),
      JSON.stringify(options.formValues),
    ],
  );
}
