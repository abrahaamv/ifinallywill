/**
 * Step 3: Spouse Information (conditional — married/common_law only)
 */

import { spouseInfoSchema } from '@platform/api-contract/schemas';
import { useEffect } from 'react';
import type { z } from 'zod';
import { useAssistantForm } from '../../hooks/useAssistantForm';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';
import { StepLayout } from '../shared/StepLayout';

type FormData = z.infer<typeof spouseInfoSchema>;

export function SpouseInfoStep({
  estateDocId,
  willData,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: StepProps) {
  const existing = willData.spouseInfo as FormData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'spouseInfo' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useAssistantForm<FormData>({
    schema: spouseInfoSchema,
    defaultValues: {
      firstName: existing?.firstName ?? '',
      lastName: existing?.lastName ?? '',
      email: existing?.email ?? '',
      phone: existing?.phone ?? '',
      city: existing?.city ?? '',
      province: existing?.province ?? '',
    },
  });

  const values = watch();
  useEffect(() => {
    if (values.firstName || values.lastName) {
      autoSave.save(values);
    }
  }, [values.firstName, values.lastName, values.email, values.phone]);

  const onSubmit = (data: FormData) => {
    autoSave.saveNow(data);
    onNext();
  };

  return (
    <StepLayout
      title="Spouse Information"
      description="Tell us about your spouse or common-law partner."
      onNext={handleSubmit(onSubmit)}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="si-firstName" className="block text-sm font-medium mb-1">
              First Name *
            </label>
            <input id="si-firstName" {...register('firstName')} className="ifw-input" />
            {errors.firstName && (
              <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="si-lastName" className="block text-sm font-medium mb-1">
              Last Name *
            </label>
            <input id="si-lastName" {...register('lastName')} className="ifw-input" />
            {errors.lastName && (
              <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="si-email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input id="si-email" type="email" {...register('email')} className="ifw-input" />
          </div>
          <div>
            <label htmlFor="si-phone" className="block text-sm font-medium mb-1">
              Phone
            </label>
            <input id="si-phone" {...register('phone')} className="ifw-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="si-city" className="block text-sm font-medium mb-1">
              City
            </label>
            <input id="si-city" {...register('city')} className="ifw-input" />
          </div>
          <div>
            <label htmlFor="si-province" className="block text-sm font-medium mb-1">
              Province
            </label>
            <input id="si-province" {...register('province')} className="ifw-input" />
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
