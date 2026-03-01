/**
 * POA Step 7 (Property) / Step 9 (Health): Review
 * Summary of all POA data before finalizing.
 */

import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';
import type { PoaStepProps } from '../wizard/PoaWizardShell';

export function PoaReviewStep({
  estateDocId,
  poaData: existingPoa,
  documentType,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: PoaStepProps) {
  const { data: people } = trpc.keyNames.list.useQuery();
  const statusMutation = trpc.estateDocuments.updateStatus.useMutation();

  const getPersonName = (id: string | null | undefined) => {
    if (!id) return '—';
    const p = (people ?? []).find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const personalInfo = existingPoa?.personalInfo as
    | { fullName?: string; city?: string; province?: string }
    | undefined;
  const primaryAgent = existingPoa?.primaryAgent as string | undefined;
  const jointAgent = existingPoa?.jointAgent as string | null | undefined;
  const backupAgents = (existingPoa?.backupAgents as string[] | undefined) ?? [];
  const restrictions = existingPoa?.restrictions as string | null | undefined;
  const activationType = existingPoa?.activationType as string | undefined;
  const healthDetails = existingPoa?.healthDetails;

  const isHealth = documentType === 'poa_health';

  const sections = [
    {
      title: 'Personal Information',
      content: personalInfo?.fullName
        ? `${personalInfo.fullName}, ${personalInfo.city ?? ''}, ${personalInfo.province ?? ''}`
        : null,
    },
    {
      title: 'Primary Agent',
      content: getPersonName(primaryAgent),
    },
    {
      title: 'Joint Agent',
      content: jointAgent ? getPersonName(jointAgent) : 'None',
    },
    {
      title: 'Backup Agents',
      content:
        backupAgents.length > 0 ? backupAgents.map((id) => getPersonName(id)).join(', ') : 'None',
    },
    {
      title: 'Restrictions',
      content: restrictions || 'No restrictions (full authority)',
    },
    {
      title: 'Activation',
      content:
        activationType === 'immediate'
          ? 'Immediately (Continuing)'
          : activationType === 'incapacity'
            ? 'On Incapacity (Springing)'
            : 'Not set',
    },
    ...(isHealth
      ? [
          {
            title: 'Health Directives',
            content: healthDetails?.statements
              ? Object.values(healthDetails.statements).filter(Boolean).length + ' directive(s) set'
              : 'None set',
          },
          {
            title: 'Organ Donation',
            content: healthDetails?.organDonation ? 'Yes' : 'No',
          },
          {
            title: 'Do Not Resuscitate',
            content: healthDetails?.dnr ? 'Yes' : 'No',
          },
        ]
      : []),
  ];

  const handleFinish = () => {
    statusMutation.mutate({ id: estateDocId, status: 'complete' }, { onSuccess: () => onNext() });
  };

  return (
    <StepLayout
      title={`Review Your POA${isHealth ? ' for Health' : ' for Property'}`}
      description="Review all sections before finalizing. You can go back and edit any section."
      onNext={handleFinish}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    >
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex items-start gap-3 border border-[var(--ifw-border)] rounded-lg px-4 py-3"
          >
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-[var(--ifw-success)] text-white">
              ✓
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{section.title}</div>
              <div className="text-xs text-[var(--ifw-text-muted)] mt-0.5">
                {section.content ?? 'Not completed'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {statusMutation.isPending && (
        <div className="mt-4 text-sm text-[var(--ifw-text-muted)] text-center">
          Finalizing your document...
        </div>
      )}
    </StepLayout>
  );
}
