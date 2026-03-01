/**
 * Wizard shell — sidebar + content area + Wilfred placeholder
 *
 * Loads will data, manages wizard navigation, renders step components.
 */

import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import type { StepProps, WillData } from '../../lib/types';
import { buildWizardContext } from '../../lib/wizard';
import { trpc } from '../../utils/trpc';
import { WilfredPanel } from '../wilfred/WilfredPanel';
import { ProfileBanner } from './ProfileBanner';
import { WizardProgress } from './WizardProgress';
import { WizardSidebar } from './WizardSidebar';

import { AdditionalStep } from '../steps/AdditionalStep';
import { AssetsStep } from '../steps/AssetsStep';
import { BequestsStep } from '../steps/BequestsStep';
import { ChildrenStep } from '../steps/ChildrenStep';
import { ExecutorsStep } from '../steps/ExecutorsStep';
import { FamilyStatusStep } from '../steps/FamilyStatusStep';
import { FinalDetailsStep } from '../steps/FinalDetailsStep';
import { GuardianStep } from '../steps/GuardianStep';
import { InheritanceStep } from '../steps/InheritanceStep';
import { KeyPeopleStep } from '../steps/KeyPeopleStep';
// Step components
import { PersonalInfoStep } from '../steps/PersonalInfoStep';
import { PetGuardianStep } from '../steps/PetGuardianStep';
import { ResidueStep } from '../steps/ResidueStep';
import { ReviewStep } from '../steps/ReviewStep';
import { SpouseInfoStep } from '../steps/SpouseInfoStep';
import { WipeoutStep } from '../steps/WipeoutStep';

/** Re-export for backward compat */
export type { StepProps } from '../../lib/types';

const STEP_COMPONENTS: Record<string, React.ComponentType<StepProps>> = {
  'personal-info': PersonalInfoStep,
  'family-status': FamilyStatusStep,
  'spouse-info': SpouseInfoStep,
  children: ChildrenStep,
  'key-people': KeyPeopleStep,
  guardians: GuardianStep,
  'pet-guardians': PetGuardianStep,
  assets: AssetsStep,
  bequests: BequestsStep,
  residue: ResidueStep,
  inheritance: InheritanceStep,
  executors: ExecutorsStep,
  wipeout: WipeoutStep,
  additional: AdditionalStep,
  'final-details': FinalDetailsStep,
  review: ReviewStep,
};

export function WizardShell() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  // Fetch document + will data
  const { data: doc, isLoading: docLoading } = trpc.estateDocuments.get.useQuery(
    { id: docId! },
    { enabled: !!docId }
  );

  const { data: willDataResult, isLoading: willLoading } = trpc.willData.get.useQuery(
    { estateDocId: docId! },
    { enabled: !!docId }
  );

  const { data: keyPeople } = trpc.keyNames.list.useQuery();
  const { data: assets } = trpc.estateAssets.list.useQuery({});

  // Build wizard context from current data
  const wizardContext = useMemo(() => {
    const children = (keyPeople ?? []).filter((p) => p.relationship === 'child');
    return buildWizardContext({
      willData: (willDataResult as WillData) ?? null,
      children,
      assetCount: (assets ?? []).length,
      isSecondaryWill: doc?.documentType === 'secondary_will',
      isCouples: !!(doc as { coupleDocId?: string | null })?.coupleDocId,
    });
  }, [willDataResult, keyPeople, assets, doc]);

  const nav = useWizardNavigation({
    docId: docId!,
    context: wizardContext,
  });

  const completedSteps = useMemo(() => {
    const wd = willDataResult as WillData | undefined;
    return wd?.completedSteps ?? [];
  }, [willDataResult]);

  // Loading state
  if (docLoading || willLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--ifw-neutral-500)]">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!doc || !docId) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const coupleDocId = (doc as { coupleDocId?: string | null }).coupleDocId ?? null;
  const willData = (willDataResult as WillData) ?? {};
  const personalInfo = willData.personalInfo as { fullName?: string } | undefined;
  const ownerName = personalInfo?.fullName ?? 'You';

  // Render current step
  const StepComponent = STEP_COMPONENTS[nav.currentStep?.id ?? ''];

  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-[var(--ifw-neutral-50)] p-4 hidden lg:block overflow-y-auto">
        <div className="mb-4">
          <a
            href="/app/dashboard"
            className="text-xs text-[var(--ifw-neutral-500)] hover:text-[var(--ifw-primary-700)]"
          >
            &larr; Back to Dashboard
          </a>
        </div>

        <WizardProgress
          currentStep={nav.currentStepIndex}
          totalSteps={nav.totalSteps}
          completionPct={doc.completionPct}
        />

        <WizardSidebar
          steps={nav.visibleSteps}
          currentStepId={nav.currentStep?.id ?? ''}
          completedSteps={completedSteps}
          onStepClick={nav.goToStep}
        />
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 max-w-3xl">
        {/* Mobile step indicator */}
        <div className="lg:hidden mb-4">
          <div className="flex justify-between text-xs text-[var(--ifw-neutral-500)] mb-1">
            <span>
              Step {nav.currentStepIndex + 1} of {nav.totalSteps}
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
          onSwitch={() => coupleDocId && navigate(`/app/documents/${coupleDocId}`)}
        />

        {StepComponent ? (
          <StepComponent
            estateDocId={docId}
            willData={willData}
            onNext={nav.nextStep}
            onPrev={nav.prevStep}
            isFirstStep={nav.isFirstStep}
            isLastStep={nav.isLastStep}
          />
        ) : (
          <div className="p-8 text-center text-[var(--ifw-neutral-500)]">
            Step not found.{' '}
            <button
              type="button"
              onClick={() => nav.goToStep('personal-info')}
              className="underline"
            >
              Go to first step
            </button>
          </div>
        )}
      </main>

      {/* Wilfred AI sidechat */}
      <WilfredPanel
        estateDocId={docId}
        stepId={nav.currentStep?.id}
        province={doc.province}
        documentType={doc.documentType}
        completedSteps={completedSteps}
      />
    </div>
  );
}
