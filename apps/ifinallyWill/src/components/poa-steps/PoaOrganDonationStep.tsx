/**
 * POA Health Step: Organ Donation & DNR
 * Organ donation preferences and do-not-resuscitate directives.
 */

import { useState } from 'react';
import { StepLayout } from '../shared/StepLayout';
import { trpc } from '../../utils/trpc';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaOrganDonationStep({ estateDocId, poaData: existingPoa, onNext, onPrev, isFirstStep, isLastStep }: PoaStepProps) {
  const healthDetails = (existingPoa as Record<string, unknown>)?.healthDetails as {
    organDonation?: boolean; dnr?: boolean; statements?: Record<string, string>;
  } | undefined;

  const [organDonation, setOrganDonation] = useState(healthDetails?.organDonation ?? false);
  const [dnr, setDnr] = useState(healthDetails?.dnr ?? false);
  const updateHealth = trpc.poaData.updateHealthDetails.useMutation();

  const handleNext = () => {
    updateHealth.mutate({
      estateDocId,
      data: {
        organDonation,
        dnr,
        statements: healthDetails?.statements,
      },
    }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title="Organ Donation & DNR"
      description="Indicate your wishes regarding organ donation and resuscitation."
      onNext={handleNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={updateHealth.isPending ? 'saving' : 'idle'}
    >
      <div className="space-y-6">
        {/* Organ Donation */}
        <div>
          <h3 className="ifw-section-title">Organ & Tissue Donation</h3>
          <div className="space-y-3">
            <button
              type="button"
              className="ifw-option-card w-full text-left"
              data-selected={organDonation}
              onClick={() => setOrganDonation(true)}
            >
              <span className="text-xl flex-shrink-0">❤️</span>
              <div>
                <div className="font-medium text-sm">Yes, I wish to donate</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  I consent to donating my organs and tissues for transplantation or medical research
                </div>
              </div>
            </button>

            <button
              type="button"
              className="ifw-option-card w-full text-left"
              data-selected={!organDonation}
              onClick={() => setOrganDonation(false)}
            >
              <span className="text-xl flex-shrink-0">🚫</span>
              <div>
                <div className="font-medium text-sm">No, I do not wish to donate</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  I do not consent to organ or tissue donation
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* DNR */}
        <div>
          <h3 className="ifw-section-title">Do Not Resuscitate (DNR)</h3>
          <div className="space-y-3">
            <button
              type="button"
              className="ifw-option-card w-full text-left"
              data-selected={dnr}
              onClick={() => setDnr(true)}
            >
              <span className="text-xl flex-shrink-0">⛔</span>
              <div>
                <div className="font-medium text-sm">Yes, DNR</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  I do not wish to be resuscitated if my heart stops or I stop breathing
                </div>
              </div>
            </button>

            <button
              type="button"
              className="ifw-option-card w-full text-left"
              data-selected={!dnr}
              onClick={() => setDnr(false)}
            >
              <span className="text-xl flex-shrink-0">💚</span>
              <div>
                <div className="font-medium text-sm">No, attempt resuscitation</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  I want medical professionals to attempt resuscitation
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="ifw-info-box">
          <strong>Important:</strong> These wishes guide your health care agent and medical team. In some
          provinces, a signed DNR may need to be in a specific format provided by the provincial health authority
          to be legally enforceable. Consult your physician for province-specific requirements.
        </div>
      </div>
    </StepLayout>
  );
}
