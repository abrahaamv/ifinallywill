/**
 * Personal data hook — loads all will-related data via tRPC
 *
 * Replaces v6's axios-based loadDataFromDatabase() with tRPC queries.
 * Provides will data, key people, assets, wizard context, and completion tracking.
 */

import { useMemo } from 'react';
import type { WillData } from '../lib/types';
import {
  buildWizardContext,
  calculateProgress,
  getStepsByCategory,
  isCategoryComplete,
} from '../lib/wizard';
import type { WizardCategory, WizardContext } from '../lib/wizard';
import { trpc } from '../utils/trpc';

export interface CategoryCompletion {
  category: WizardCategory;
  label: string;
  total: number;
  completed: number;
  pct: number;
  isComplete: boolean;
}

export interface PersonalData {
  doc: {
    id: string;
    documentType: string;
    province: string;
    country: string;
    status: string;
    completionPct: number;
    coupleDocId?: string | null;
  } | null;
  willData: WillData;
  keyPeople: Array<{
    id: string;
    fullName: string;
    relationship: string;
    dateOfBirth?: string | null;
  }>;
  assets: Array<{ id: string; name: string; category: string }>;
  wizardContext: WizardContext;
  completedSteps: Set<string>;
  completedStepsArray: string[];
  categoryCompletions: CategoryCompletion[];
  overallProgress: number;
  ownerName: string;
  isCouple: boolean;
  isLoading: boolean;
}

export function usePersonalData(docId: string | undefined): PersonalData {
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

  const willData = (willDataResult as WillData) ?? {};

  const wizardContext = useMemo(() => {
    const children = (keyPeople ?? []).filter(
      (p: { relationship: string }) => p.relationship === 'child'
    );
    return buildWizardContext({
      willData: willData ?? null,
      children,
      assetCount: (assets ?? []).length,
      isSecondaryWill: doc?.documentType === 'secondary_will',
      isCouples: !!(doc as { coupleDocId?: string | null } | undefined)?.coupleDocId,
    });
  }, [willData, keyPeople, assets, doc]);

  const completedStepsArray = useMemo(() => willData?.completedSteps ?? [], [willData]);

  const completedSteps = useMemo(() => new Set(completedStepsArray), [completedStepsArray]);

  const categoryCompletions = useMemo((): CategoryCompletion[] => {
    const grouped = getStepsByCategory(wizardContext);
    return grouped.map((g) => {
      const completed = g.steps.filter((s) => completedSteps.has(s.id)).length;
      const total = g.steps.length;
      return {
        category: g.category,
        label: g.label,
        total,
        completed,
        pct: total === 0 ? 0 : Math.round((completed / total) * 100),
        isComplete: isCategoryComplete(g.category, wizardContext, completedSteps),
      };
    });
  }, [wizardContext, completedSteps]);

  const overallProgress = useMemo(
    () => calculateProgress(wizardContext, completedSteps),
    [wizardContext, completedSteps]
  );

  const personalInfo = willData?.personalInfo as { fullName?: string } | undefined;
  const ownerName = personalInfo?.fullName ?? 'You';
  const isCouple = !!(doc as { coupleDocId?: string | null } | undefined)?.coupleDocId;

  return {
    doc: doc
      ? {
          id: doc.id,
          documentType: doc.documentType,
          province: doc.province,
          country: doc.country,
          status: doc.status,
          completionPct: doc.completionPct,
          coupleDocId: (doc as { coupleDocId?: string | null }).coupleDocId ?? null,
        }
      : null,
    willData,
    keyPeople: (keyPeople ?? []) as unknown as PersonalData['keyPeople'],
    assets: (assets ?? []) as unknown as PersonalData['assets'],
    wizardContext,
    completedSteps,
    completedStepsArray,
    categoryCompletions,
    overallProgress,
    ownerName,
    isCouple,
    isLoading: docLoading || willLoading,
  };
}
