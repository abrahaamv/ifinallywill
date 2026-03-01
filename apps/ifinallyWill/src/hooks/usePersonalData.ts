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
import * as demoStore from '../stores/demoDocumentStore';
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
    { enabled: !!docId, retry: false }
  );

  const { data: willDataResult, isLoading: willLoading } = trpc.willData.get.useQuery(
    { estateDocId: docId! },
    { enabled: !!docId, retry: false }
  );

  const { data: keyPeople } = trpc.keyNames.list.useQuery(undefined, { retry: false });
  const { data: assets } = trpc.estateAssets.list.useQuery({}, { retry: false });

  // Demo fallback — use localStorage store when tRPC returns null (no backend)
  const demoDoc = useMemo(() => {
    if (doc || docLoading) return null;
    return docId ? demoStore.getDocument(docId) : null;
  }, [doc, docLoading, docId]);

  const demoWillData = useMemo(() => {
    if (willDataResult || willLoading) return null;
    return docId ? demoStore.getWillData(docId) : null;
  }, [willDataResult, willLoading, docId]);

  const demoKeyPeople = useMemo(() => {
    if (keyPeople) return null;
    return demoStore.getKeyPeople();
  }, [keyPeople]);

  const demoAssets = useMemo(() => {
    if (assets) return null;
    return demoStore.getAssets();
  }, [assets]);

  const effectiveDoc = doc ?? demoDoc;
  const willData = ((willDataResult ?? demoWillData) as WillData) ?? {};
  const effectiveKeyPeople = keyPeople ?? demoKeyPeople ?? [];
  const effectiveAssets = assets ?? demoAssets ?? [];

  const wizardContext = useMemo(() => {
    const children = (effectiveKeyPeople as Array<{ relationship: string }>).filter(
      (p) => p.relationship === 'child'
    );
    return buildWizardContext({
      willData: willData ?? null,
      children: children as { dateOfBirth?: string | null }[],
      assetCount: (effectiveAssets as unknown[]).length,
      isSecondaryWill: effectiveDoc?.documentType === 'secondary_will',
      isCouples: !!(effectiveDoc as { coupleDocId?: string | null } | undefined)?.coupleDocId,
    });
  }, [willData, effectiveKeyPeople, effectiveAssets, effectiveDoc]);

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
  const isCouple = !!(effectiveDoc as { coupleDocId?: string | null } | undefined)?.coupleDocId;

  return {
    doc: effectiveDoc
      ? {
          id: effectiveDoc.id,
          documentType: effectiveDoc.documentType,
          province: effectiveDoc.province,
          country: effectiveDoc.country,
          status: effectiveDoc.status,
          completionPct: effectiveDoc.completionPct,
          coupleDocId: (effectiveDoc as { coupleDocId?: string | null }).coupleDocId ?? null,
        }
      : null,
    willData,
    keyPeople: effectiveKeyPeople as unknown as PersonalData['keyPeople'],
    assets: effectiveAssets as unknown as PersonalData['assets'],
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
