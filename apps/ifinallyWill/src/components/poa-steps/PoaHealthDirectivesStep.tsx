/**
 * POA Health Step: Health Directives
 * Advance directives for medical care decisions.
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { trpc } from '../../utils/trpc';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

interface Statements {
  terminalCondition?: string;
  unconsciousCondition?: string;
  mentalImpairment?: string;
  otherDirectives?: string;
}

export function PoaHealthDirectivesStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const healthDetails = (existingPoa as Record<string, unknown>)?.healthDetails as {
    organDonation?: boolean; dnr?: boolean; statements?: Statements;
  } | undefined;

  const [statements, setStatements] = useState<Statements>(healthDetails?.statements ?? {});
  const updateHealth = trpc.poaData.updateHealthDetails.useMutation();

  const updateField = (key: keyof Statements, value: string) => {
    setStatements((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    updateHealth.mutate({
      estateDocId,
      data: {
        organDonation: healthDetails?.organDonation ?? false,
        dnr: healthDetails?.dnr ?? false,
        statements,
      },
    }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title="Health Care Directives"
      description="Provide instructions for your health care decisions in specific situations."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateHealth.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        <div className="ifw-info-box">
          <strong>These are your wishes.</strong> While not all provinces treat these as legally binding,
          they provide critical guidance to your health care agent and medical professionals about your
          preferences in difficult medical situations.
        </div>

        <div>
          <h3 className="ifw-section-title">Terminal Condition</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            If you have an incurable condition that will result in death in a relatively short time.
          </p>
          <textarea
            value={statements.terminalCondition ?? ''}
            onChange={(e) => updateField('terminalCondition', e.target.value)}
            rows={3}
            className="ifw-input resize-y"
            placeholder="e.g. I do not want life-sustaining treatment if my condition is terminal..."
          />
        </div>

        <div>
          <h3 className="ifw-section-title">Permanent Unconscious Condition</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            If you are in a permanent vegetative state or irreversible coma.
          </p>
          <textarea
            value={statements.unconsciousCondition ?? ''}
            onChange={(e) => updateField('unconsciousCondition', e.target.value)}
            rows={3}
            className="ifw-input resize-y"
            placeholder="e.g. If I am permanently unconscious with no reasonable hope of recovery..."
          />
        </div>

        <div>
          <h3 className="ifw-section-title">Mental Impairment</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            If you have severe and irreversible cognitive decline.
          </p>
          <textarea
            value={statements.mentalImpairment ?? ''}
            onChange={(e) => updateField('mentalImpairment', e.target.value)}
            rows={3}
            className="ifw-input resize-y"
            placeholder="e.g. If I develop severe dementia and can no longer recognize family..."
          />
        </div>

        <div>
          <h3 className="ifw-section-title">Other Directives</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            Any additional health care instructions or wishes.
          </p>
          <textarea
            value={statements.otherDirectives ?? ''}
            onChange={(e) => updateField('otherDirectives', e.target.value)}
            rows={3}
            className="ifw-input resize-y"
            placeholder="e.g. I wish to be kept comfortable with pain management at all times..."
          />
        </div>
      </div>
    </StepLayout>
  );
}
