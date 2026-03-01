/**
 * Step 15: Final Details — witnesses and signing info
 */

import { finalDetailsSchema } from '@platform/api-contract/schemas';
import { useEffect } from 'react';
import type { z } from 'zod';
import { useAssistantForm } from '../../hooks/useAssistantForm';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';
import { StepLayout } from '../shared/StepLayout';

type FormData = z.infer<typeof finalDetailsSchema>;

export function FinalDetailsStep({
  estateDocId,
  willData,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: StepProps) {
  const existing = willData.finalDetails as FormData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'finalDetails' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useAssistantForm<FormData>({
    schema: finalDetailsSchema,
    defaultValues: {
      witnessOne: existing?.witnessOne ?? '',
      witnessTwo: existing?.witnessTwo ?? '',
      signingLocation: existing?.signingLocation ?? '',
      signingDate: existing?.signingDate ?? '',
    },
  });

  const values = watch();
  useEffect(() => {
    autoSave.save(values);
  }, [values.witnessOne, values.witnessTwo, values.signingLocation, values.signingDate]);

  const onSubmit = (data: FormData) => {
    autoSave.saveNow(data);
    onNext();
  };

  return (
    <StepLayout
      title="Final Details"
      description="Information needed when you sign your will. Your witnesses must be present when you sign."
      onNext={handleSubmit(onSubmit)}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-4">
        <div className="ifw-info-box">
          <strong>Important:</strong> Your will must be signed in the presence of two witnesses who
          are <em>not</em> beneficiaries of your will.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fd-w1" className="block text-sm font-medium mb-1">
              Witness 1 Name
            </label>
            <input
              id="fd-w1"
              {...register('witnessOne')}
              className="ifw-input"
              placeholder="Full legal name"
            />
            {errors.witnessOne && (
              <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.witnessOne.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="fd-w2" className="block text-sm font-medium mb-1">
              Witness 2 Name
            </label>
            <input
              id="fd-w2"
              {...register('witnessTwo')}
              className="ifw-input"
              placeholder="Full legal name"
            />
            {errors.witnessTwo && (
              <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.witnessTwo.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fd-loc" className="block text-sm font-medium mb-1">
              Signing Location
            </label>
            <input
              id="fd-loc"
              {...register('signingLocation')}
              className="ifw-input"
              placeholder="City, Province"
            />
          </div>
          <div>
            <label htmlFor="fd-date" className="block text-sm font-medium mb-1">
              Signing Date
            </label>
            <input id="fd-date" type="date" {...register('signingDate')} className="ifw-input" />
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
