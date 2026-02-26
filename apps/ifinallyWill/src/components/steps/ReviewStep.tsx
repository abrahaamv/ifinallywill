/**
 * Step 16: Review — summary of all will data before finalizing
 * Includes document preview via template renderer.
 */

import { useState, useCallback } from 'react';
import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';
import { DocumentPreview } from '../shared/DocumentPreview';
import { PROVINCES } from '../../config/provinces';
import { loadTemplate } from '../../templates/index';
import { renderDocument } from '../../lib/template-renderer';
import { mapWillToTemplateData, mapBequestsToTemplateFormat } from '../../lib/template-data-mapper';
import type { StepProps } from '../../lib/types';
import type { WillData, KeyName } from '../../lib/types';
import type { DbBequest } from '../../lib/template-data-mapper';

export function ReviewStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const { data: people } = trpc.keyNames.list.useQuery();
  const { data: assets } = trpc.estateAssets.list.useQuery({});
  const { data: bequestsList } = trpc.bequests.listByDoc.useQuery({ estateDocId });

  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const completedSteps = (willData.completedSteps as string[] | null) ?? [];
  const personalInfo = willData.personalInfo as { fullName?: string; email?: string; city?: string; province?: string } | undefined;
  const maritalStatus = willData.maritalStatus as string | undefined;
  const spouseInfo = willData.spouseInfo as { firstName?: string; lastName?: string } | undefined;
  const executors = willData.executors as Array<{ keyNameId: string; position: string }> | undefined;
  const residue = willData.residue as { selected?: string; beneficiary?: Array<{ beneficiary: string }> } | undefined;
  const additional = willData.additional as { organDonation?: boolean; finalRestingPlace?: string; otherWishes?: string[] } | undefined;

  const getPersonName = (id: string) => {
    const p = (people ?? []).find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const getProvinceName = (code: string) =>
    PROVINCES.find((p) => p.code === code)?.name ?? code;

  const sections = [
    {
      title: 'Personal Information',
      completed: completedSteps.includes('personalInfo'),
      content: personalInfo?.fullName
        ? `${personalInfo.fullName}, ${personalInfo.city ?? ''}, ${getProvinceName(personalInfo.province ?? '')}`
        : null,
    },
    {
      title: 'Marital Status',
      completed: completedSteps.includes('maritalStatus'),
      content: maritalStatus ? maritalStatus.replace('_', ' ') : null,
    },
    {
      title: 'Spouse',
      completed: completedSteps.includes('spouseInfo'),
      content: spouseInfo?.firstName ? `${spouseInfo.firstName} ${spouseInfo.lastName}` : null,
      hidden: maritalStatus === 'single',
    },
    {
      title: 'Children',
      completed: true,
      content: `${(people ?? []).filter((p) => p.relationship === 'child').length} children`,
    },
    {
      title: 'Key People',
      completed: true,
      content: `${(people ?? []).filter((p) => p.relationship !== 'child').length} people`,
    },
    {
      title: 'Assets',
      completed: (assets ?? []).length > 0,
      content: `${(assets ?? []).length} assets`,
    },
    {
      title: 'Bequests',
      completed: (bequestsList ?? []).length > 0,
      content: `${(bequestsList ?? []).length} assignments`,
    },
    {
      title: 'Residue',
      completed: completedSteps.includes('residue'),
      content: residue?.selected
        ? residue.selected === 'Specific Beneficiaries'
          ? `Specific Beneficiaries — ${residue.beneficiary?.length ?? 0} recipients`
          : residue.selected === 'Custom Clause'
            ? 'Custom Clause'
            : residue.selected.slice(0, 60)
        : null,
    },
    {
      title: 'Executors',
      completed: completedSteps.includes('executors'),
      content: executors
        ? executors.map((e) => `${getPersonName(e.keyNameId)} (${e.position})`).join(', ')
        : null,
    },
    {
      title: 'Additional Wishes',
      completed: completedSteps.includes('additional'),
      content: additional
        ? [
            additional.organDonation ? 'Organ donor' : null,
            additional.finalRestingPlace ? `Resting place: ${additional.finalRestingPlace}` : null,
            additional.otherWishes?.length ? `${additional.otherWishes.length} wishes` : null,
          ]
            .filter(Boolean)
            .join(', ') || 'None specified'
        : null,
    },
  ].filter((s) => !s.hidden);

  const statusMutation = trpc.estateDocuments.updateStatus.useMutation();

  const handleFinish = () => {
    statusMutation.mutate(
      { id: estateDocId, status: 'complete' },
      { onSuccess: () => onNext() },
    );
  };

  const handlePreview = useCallback(async () => {
    const province = personalInfo?.province;
    if (!province) {
      setPreviewError('Province is required to preview your document.');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const templateSections = await loadTemplate(province, 'defaultWill');
      if (!templateSections) {
        setPreviewError('No template available for your province yet.');
        setPreviewLoading(false);
        return;
      }

      const templateData = mapWillToTemplateData(
        willData as WillData,
        (people ?? []) as KeyName[],
        'defaultWill',
      );

      if (bequestsList && bequestsList.length > 0) {
        const bequestData = mapBequestsToTemplateFormat(
          bequestsList as unknown as DbBequest[],
          (people ?? []) as KeyName[],
        );
        (templateData as Record<string, unknown>).bequests = bequestData;
      }

      const html = renderDocument(templateSections, templateData);
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to generate preview.');
    } finally {
      setPreviewLoading(false);
    }
  }, [willData, people, bequestsList, personalInfo?.province]);

  // Preview mode
  if (showPreview && previewHtml) {
    return (
      <StepLayout
        title="Document Preview"
        description="Review how your will document will look."
        onNext={handleFinish}
        onPrev={onPrev}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
      >
        <DocumentPreview
          html={previewHtml}
          title="Last Will and Testament — Preview"
          onClose={() => setShowPreview(false)}
        />
      </StepLayout>
    );
  }

  // Checklist mode
  return (
    <StepLayout
      title="Review Your Will"
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
            <span
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                section.completed
                  ? 'bg-[var(--ifw-success)] text-white'
                  : 'border border-[var(--ifw-neutral-300)] text-[var(--ifw-neutral-400)]'
              }`}
            >
              {section.completed ? '✓' : ''}
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

      {/* Preview button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewLoading}
          className="px-4 py-2 text-sm font-medium border border-[var(--ifw-primary-300)] text-[var(--ifw-primary-700)] rounded-lg hover:bg-[var(--ifw-primary-50)] disabled:opacity-40 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {previewLoading ? 'Generating Preview...' : 'Preview Document'}
        </button>
        {previewError && (
          <span className="text-xs text-[var(--ifw-error)]">{previewError}</span>
        )}
      </div>

      {statusMutation.isPending && (
        <div className="mt-4 text-sm text-[var(--ifw-text-muted)] text-center">
          Finalizing your will...
        </div>
      )}
    </StepLayout>
  );
}
