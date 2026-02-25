/**
 * POA Wizard Shell — sidebar + content for POA Property and POA Health wizards
 *
 * Loads POA data, manages navigation across POA steps, renders step components.
 * Mirrors WizardShell.tsx but uses poa-specific data & step config.
 */

import { useMemo, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { trpc } from '../../utils/trpc';
import { getPoaSteps } from '../../config/poaWizardConfig';
import { WizardProgress } from './WizardProgress';
import { ProfileBanner } from './ProfileBanner';
import { WilfredPanel } from '../wilfred/WilfredPanel';

// POA step components
import { PoaPersonalInfoStep } from '../poa-steps/PoaPersonalInfoStep';
import { PoaAgentSelectionStep } from '../poa-steps/PoaAgentSelectionStep';
import { PoaJointAgentStep } from '../poa-steps/PoaJointAgentStep';
import { PoaBackupAgentsStep } from '../poa-steps/PoaBackupAgentsStep';
import { PoaRestrictionsStep } from '../poa-steps/PoaRestrictionsStep';
import { PoaActivationStep } from '../poa-steps/PoaActivationStep';
import { PoaHealthDirectivesStep } from '../poa-steps/PoaHealthDirectivesStep';
import { PoaOrganDonationStep } from '../poa-steps/PoaOrganDonationStep';
import { PoaReviewStep } from '../poa-steps/PoaReviewStep';

export interface PoaStepProps {
  estateDocId: string;
  poaData: Record<string, unknown> | null;
  documentType: 'poa_property' | 'poa_health';
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const POA_STEP_COMPONENTS: Record<string, React.ComponentType<PoaStepProps>> = {
  'poa-personal-info': PoaPersonalInfoStep,
  'poa-agent-selection': PoaAgentSelectionStep,
  'poa-joint-agent': PoaJointAgentStep,
  'poa-backup-agents': PoaBackupAgentsStep,
  'poa-restrictions': PoaRestrictionsStep,
  'poa-activation': PoaActivationStep,
  'poa-health-directives': PoaHealthDirectivesStep,
  'poa-organ-donation': PoaOrganDonationStep,
  'poa-review': PoaReviewStep,
};

export function PoaWizardShell() {
  const { docId, stepId } = useParams<{ docId: string; stepId: string }>();
  const navigate = useNavigate();

  // Fetch document metadata
  const { data: doc, isLoading: docLoading } = trpc.estateDocuments.get.useQuery(
    { id: docId! },
    { enabled: !!docId },
  );

  // Fetch POA data
  const { data: poaDataResult, isLoading: poaLoading } = trpc.poaData.get.useQuery(
    { estateDocId: docId! },
    { enabled: !!docId },
  );

  // Determine document type (poa_property or poa_health)
  const documentType = (doc?.documentType as 'poa_property' | 'poa_health') ?? 'poa_property';

  // Get steps for this POA type (no conditional steps — all POA steps are always visible)
  const visibleSteps = useMemo(() => getPoaSteps(documentType), [documentType]);

  const currentStepIndex = useMemo(() => {
    const idx = visibleSteps.findIndex((s) => s.id === stepId);
    return idx >= 0 ? idx : 0;
  }, [stepId, visibleSteps]);

  const currentStep = visibleSteps[currentStepIndex] ?? visibleSteps[0];

  const goToStep = useCallback(
    (id: string) => {
      navigate(`/app/poa/${docId}/${id}`, { replace: true });
    },
    [navigate, docId],
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex < visibleSteps.length - 1) {
      const next = visibleSteps[currentStepIndex + 1];
      if (next) goToStep(next.id);
    } else {
      // Last step completed — go back to dashboard
      navigate('/app/dashboard', { replace: true });
    }
  }, [currentStepIndex, visibleSteps, goToStep, navigate]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prev = visibleSteps[currentStepIndex - 1];
      if (prev) goToStep(prev.id);
    }
  }, [currentStepIndex, visibleSteps, goToStep]);

  // Completed steps from server
  const completedSteps = useMemo(() => {
    const poa = poaDataResult as Record<string, unknown> | undefined;
    return (poa?.completedSteps as string[] | null) ?? [];
  }, [poaDataResult]);

  // Loading state
  if (docLoading || poaLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--ifw-text-muted)]">Loading POA document...</p>
        </div>
      </div>
    );
  }

  if (!doc || !docId) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const coupleDocId = (doc as Record<string, unknown>).coupleDocId as string | null | undefined;
  const personalInfo = (poaDataResult as Record<string, unknown> | undefined)?.personalInfo as { fullName?: string } | undefined;
  const ownerName = personalInfo?.fullName ?? 'You';

  // Render current step
  const StepComponent = POA_STEP_COMPONENTS[currentStep?.id ?? ''];
  const poaData = (poaDataResult as Record<string, unknown>) ?? null;

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-[var(--ifw-neutral-50)] p-4 hidden lg:block overflow-y-auto">
        <div className="mb-4">
          <a
            href="/app/dashboard"
            className="text-xs text-[var(--ifw-text-muted)] hover:text-[var(--ifw-primary-700)]"
          >
            &larr; Back to Dashboard
          </a>
        </div>

        <WizardProgress
          currentStep={currentStepIndex}
          totalSteps={visibleSteps.length}
          completionPct={doc.completionPct}
        />

        {/* POA step list (flat — no categories needed) */}
        <nav className="space-y-0.5">
          {visibleSteps.map((step, i) => {
            const isCurrent = step.id === (currentStep?.id ?? '');
            const isCompleted = step.section
              ? completedSteps.includes(step.section)
              : completedSteps.includes(step.id);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                  isCurrent
                    ? 'bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-700)] font-medium'
                    : 'hover:bg-[var(--ifw-neutral-100)] text-[var(--ifw-neutral-600)]'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isCompleted
                      ? 'bg-[var(--ifw-success)] text-white'
                      : isCurrent
                        ? 'border-2 border-[var(--ifw-primary-700)] text-[var(--ifw-primary-700)]'
                        : 'border border-[var(--ifw-neutral-300)] text-[var(--ifw-neutral-400)]'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 max-w-3xl">
        {/* Mobile step indicator */}
        <div className="lg:hidden mb-4">
          <div className="flex justify-between text-xs text-[var(--ifw-text-muted)] mb-1">
            <span>
              Step {currentStepIndex + 1} of {visibleSteps.length}
            </span>
            <span>{doc.completionPct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--ifw-neutral-100)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--ifw-primary-500)]"
              style={{ width: `${doc.completionPct}%` }}
            />
          </div>
        </div>

        <ProfileBanner
          ownerName={ownerName}
          isCouple={!!coupleDocId}
          coupleDocId={coupleDocId}
          onSwitch={() => coupleDocId && navigate(`/app/poa/${coupleDocId}`)}
        />

        {StepComponent ? (
          <StepComponent
            estateDocId={docId}
            poaData={poaData}
            documentType={documentType}
            onNext={nextStep}
            onPrev={prevStep}
            isFirstStep={currentStepIndex === 0}
            isLastStep={currentStepIndex === visibleSteps.length - 1}
          />
        ) : (
          <div className="p-8 text-center text-[var(--ifw-text-muted)]">
            Step not found.{' '}
            <button type="button" onClick={() => goToStep('poa-personal-info')} className="underline">
              Go to first step
            </button>
          </div>
        )}
      </main>

      {/* Wilfred AI sidechat */}
      <WilfredPanel
        estateDocId={docId}
        stepId={currentStep?.id}
        province={doc.province}
        documentType={documentType}
        completedSteps={completedSteps}
      />
    </div>
  );
}
