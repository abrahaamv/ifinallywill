/**
 * Wizard step configuration and navigation logic
 * Ported from: Willsystem-v6/resources/js/utils/stepUtils.js
 *
 * Declarative step list with categories, shared step flags, conditions.
 * Step IDs match the component keys in WizardShell.tsx.
 */

import type { WillData } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WizardCategory =
  | 'aboutYou'
  | 'yourFamily'
  | 'yourEstate'
  | 'yourArrangements';

export type MaritalStatus = 'married' | 'single' | 'common_law';

export interface WizardContext {
  maritalStatus: MaritalStatus | null;
  hasChildren: boolean;
  hasMinorChildren: boolean;
  hasPets: boolean;
  hasAssets: boolean;
  /** Whether this is a secondary will (reduced steps) */
  isSecondaryWill: boolean;
  /** Whether the user is in a couples package */
  isCouples: boolean;
}

export interface StepConfig {
  id: string;
  label: string;
  category: WizardCategory;
  /** willData section name for auto-save (null = uses separate CRUD) */
  section: string | null;
  /** Step is shared between both profiles in couples mode */
  isShared: boolean;
  /** Step is hidden for secondary wills */
  skipForSecondary: boolean;
  /** Condition to show this step — evaluated per context */
  condition: ((ctx: WizardContext) => boolean) | null;
}

/**
 * Simplified step type for POA wizard compatibility.
 * POA steps don't need categories, shared flags, or conditions.
 */
export interface SimpleStep {
  id: string;
  label: string;
  section?: string;
  icon?: string;
  condition?: (ctx: WizardContext) => boolean;
}

// ---------------------------------------------------------------------------
// Category definitions (sidebar navigation order)
// ---------------------------------------------------------------------------

export const CATEGORIES: { key: WizardCategory; label: string }[] = [
  { key: 'aboutYou', label: 'About You' },
  { key: 'yourFamily', label: 'Your Family' },
  { key: 'yourEstate', label: 'Your Estate' },
  { key: 'yourArrangements', label: 'Your Arrangements' },
];

// ---------------------------------------------------------------------------
// Step definitions — IDs match STEP_COMPONENTS keys in WizardShell.tsx
// ---------------------------------------------------------------------------

export const STEPS: StepConfig[] = [
  // ═══ ABOUT YOU ═══
  {
    id: 'personal-info',
    label: 'Personal Information',
    category: 'aboutYou',
    section: 'personalInfo',
    isShared: false,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'family-status',
    label: 'Family Status',
    category: 'aboutYou',
    section: 'maritalStatus',
    isShared: false,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'spouse-info',
    label: 'Spouse Information',
    category: 'aboutYou',
    section: 'spouseInfo',
    isShared: false,
    skipForSecondary: false,
    condition: (ctx) =>
      ctx.maritalStatus === 'married' || ctx.maritalStatus === 'common_law',
  },

  // ═══ YOUR FAMILY ═══
  {
    id: 'children',
    label: 'Children',
    category: 'yourFamily',
    section: null, // uses key_names CRUD
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'key-people',
    label: 'Key People',
    category: 'yourFamily',
    section: null, // uses key_names CRUD
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'guardians',
    label: 'Guardians',
    category: 'yourFamily',
    section: 'guardians',
    isShared: true,
    skipForSecondary: true,
    condition: (ctx) => ctx.hasMinorChildren,
  },
  {
    id: 'pet-guardians',
    label: 'Pet Guardians',
    category: 'yourFamily',
    section: 'pets',
    isShared: true,
    skipForSecondary: true,
    condition: (ctx) => ctx.hasPets,
  },

  // ═══ YOUR ESTATE ═══
  {
    id: 'assets',
    label: 'My Assets',
    category: 'yourEstate',
    section: null, // uses estate_assets CRUD
    isShared: true,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'bequests',
    label: 'Gifts',
    category: 'yourEstate',
    section: null, // uses bequests CRUD
    isShared: false,
    skipForSecondary: true,
    condition: (ctx) => ctx.hasAssets,
  },
  {
    id: 'residue',
    label: "What's Left",
    category: 'yourEstate',
    section: 'residue',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'inheritance',
    label: 'Inheritance for Children',
    category: 'yourEstate',
    section: 'trusting',
    isShared: true,
    skipForSecondary: false,
    condition: (ctx) => ctx.hasMinorChildren,
  },

  // ═══ YOUR ARRANGEMENTS ═══
  {
    id: 'executors',
    label: 'Will Executors',
    category: 'yourArrangements',
    section: 'executors',
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'wipeout',
    label: 'Wipeout Information',
    category: 'yourArrangements',
    section: 'wipeout',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'additional',
    label: 'Additional Information',
    category: 'yourArrangements',
    section: 'additional',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'final-details',
    label: 'Final Details',
    category: 'yourArrangements',
    section: 'finalDetails',
    isShared: false,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'review',
    label: 'Review & Download',
    category: 'yourArrangements',
    section: null,
    isShared: false,
    skipForSecondary: false,
    condition: null,
  },
];

// ---------------------------------------------------------------------------
// Step visibility and navigation
// ---------------------------------------------------------------------------

/**
 * Get visible steps for the current wizard context.
 * Filters out: conditional steps that don't apply, secondary will skips.
 */
export function getVisibleSteps(ctx: WizardContext): StepConfig[] {
  return STEPS.filter((step) => {
    if (ctx.isSecondaryWill && step.skipForSecondary) return false;
    if (step.condition && !step.condition(ctx)) return false;
    return true;
  });
}

/**
 * Get steps grouped by category (for sidebar navigation).
 */
export function getStepsByCategory(
  ctx: WizardContext,
): { category: WizardCategory; label: string; steps: StepConfig[] }[] {
  const visible = getVisibleSteps(ctx);
  return CATEGORIES.map((cat) => ({
    ...cat,
    steps: visible.filter((s) => s.category === cat.key),
  })).filter((cat) => cat.steps.length > 0);
}

/**
 * Find a step by ID.
 */
export function getStepById(id: string): StepConfig | undefined {
  return STEPS.find((s) => s.id === id);
}

/**
 * Find the next step after the given step ID.
 */
export function findNextStep(
  currentId: string,
  ctx: WizardContext,
): StepConfig | null {
  const visible = getVisibleSteps(ctx);
  const currentIndex = visible.findIndex((s) => s.id === currentId);
  if (currentIndex === -1 || currentIndex >= visible.length - 1) return null;
  return visible[currentIndex + 1];
}

/**
 * Calculate completion percentage based on completedSteps array.
 */
export function calculateProgress(
  ctx: WizardContext,
  completedSteps: Set<string>,
): number {
  const visible = getVisibleSteps(ctx);
  if (visible.length === 0) return 0;
  const completed = visible.filter((s) => completedSteps.has(s.id)).length;
  return Math.round((completed / visible.length) * 100);
}

/**
 * Check if a step is shared (relevant for couples workflow).
 */
export function isSharedStep(stepId: string): boolean {
  return getStepById(stepId)?.isShared ?? false;
}

/**
 * Get the category a step belongs to.
 */
export function getStepCategory(stepId: string): WizardCategory | null {
  return getStepById(stepId)?.category ?? null;
}

/**
 * Check if all visible steps in a category are complete.
 */
export function isCategoryComplete(
  category: WizardCategory,
  ctx: WizardContext,
  completedSteps: Set<string>,
): boolean {
  const visible = getVisibleSteps(ctx);
  const categorySteps = visible.filter((s) => s.category === category);
  return categorySteps.every((s) => completedSteps.has(s.id));
}

/**
 * Build a WizardContext from will data + related entities.
 */
export function buildWizardContext(opts: {
  willData: WillData | null;
  children: { dateOfBirth?: string | null }[];
  assetCount: number;
  isSecondaryWill?: boolean;
  isCouples?: boolean;
}): WizardContext {
  const minorChildren = opts.children.filter((c) => {
    if (!c.dateOfBirth) return true; // assume minor if no DOB
    const age =
      (Date.now() - new Date(c.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return age < 18;
  });

  return {
    maritalStatus: (opts.willData?.maritalStatus as MaritalStatus) ?? null,
    hasChildren: opts.children.length > 0,
    hasMinorChildren: minorChildren.length > 0,
    hasPets:
      Array.isArray(opts.willData?.pets) &&
      (opts.willData!.pets as unknown[]).length > 0,
    hasAssets: opts.assetCount > 0,
    isSecondaryWill: opts.isSecondaryWill ?? false,
    isCouples: opts.isCouples ?? false,
  };
}
