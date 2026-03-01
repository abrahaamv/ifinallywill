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
  | 'people'
  | 'assets'
  | 'gifts'
  | 'residue'
  | 'children'
  | 'wipeout'
  | 'finalArrangements';

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
  { key: 'people', label: 'People' },
  { key: 'assets', label: 'Assets' },
  { key: 'gifts', label: 'Gifts' },
  { key: 'residue', label: 'Residue' },
  { key: 'children', label: 'Children' },
  { key: 'wipeout', label: 'Wipeout' },
  { key: 'finalArrangements', label: 'Final Arrangements' },
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

  // ═══ PEOPLE ═══
  {
    id: 'children',
    label: 'Key Names',
    category: 'people',
    section: null, // uses key_names CRUD
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'key-people',
    label: 'Key People',
    category: 'people',
    section: null, // uses key_names CRUD
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'pet-guardians',
    label: 'Pet Guardians',
    category: 'people',
    section: 'pets',
    isShared: true,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ ASSETS ═══
  {
    id: 'assets',
    label: 'My Assets',
    category: 'assets',
    section: null, // uses estate_assets CRUD
    isShared: true,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ GIFTS ═══
  {
    id: 'bequests',
    label: 'Gifts & Bequests',
    category: 'gifts',
    section: null, // uses bequests CRUD
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ RESIDUE ═══
  {
    id: 'residue',
    label: "What's Left",
    category: 'residue',
    section: 'residue',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ CHILDREN (trusting + guardians) ═══
  {
    id: 'inheritance',
    label: 'Trusting',
    category: 'children',
    section: 'trusting',
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'guardians',
    label: 'Guardians',
    category: 'children',
    section: 'guardians',
    isShared: true,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ WIPEOUT ═══
  {
    id: 'wipeout',
    label: 'Wipeout',
    category: 'wipeout',
    section: 'wipeout',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },

  // ═══ FINAL ARRANGEMENTS ═══
  {
    id: 'executors',
    label: 'Executors',
    category: 'finalArrangements',
    section: 'executors',
    isShared: true,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'poa-property',
    label: 'POA for Property',
    category: 'finalArrangements',
    section: 'poaProperty',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'poa-health',
    label: 'POA for Health',
    category: 'finalArrangements',
    section: 'poaHealth',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'additional',
    label: 'Additional Requests',
    category: 'finalArrangements',
    section: 'additional',
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'final-details',
    label: 'Final Details',
    category: 'finalArrangements',
    section: 'finalDetails',
    isShared: false,
    skipForSecondary: false,
    condition: null,
  },
  {
    id: 'enhance',
    label: 'Enhance Your Plan',
    category: 'finalArrangements',
    section: null,
    isShared: false,
    skipForSecondary: true,
    condition: null,
  },
  {
    id: 'review',
    label: 'Review Documents',
    category: 'finalArrangements',
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
 * Get ALL steps regardless of conditions.
 * Only filters secondary will skips. Used by sidebar and breadcrumb
 * so the navigation always shows the full estate plan structure.
 */
export function getAllSteps(ctx: WizardContext): StepConfig[] {
  return STEPS.filter((step) => {
    if (ctx.isSecondaryWill && step.skipForSecondary) return false;
    return true;
  });
}

/**
 * Get steps grouped by category (for sidebar navigation).
 * Shows ALL categories and steps regardless of conditions,
 * matching the estate-planning dashboard structure.
 */
export function getStepsByCategory(
  ctx: WizardContext
): { category: WizardCategory; label: string; steps: StepConfig[] }[] {
  const all = getAllSteps(ctx);
  return CATEGORIES.map((cat) => ({
    category: cat.key,
    label: cat.label,
    steps: all.filter((s) => s.category === cat.key),
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
export function findNextStep(currentId: string, ctx: WizardContext): StepConfig | null {
  const all = getAllSteps(ctx);
  const currentIndex = all.findIndex((s) => s.id === currentId);
  if (currentIndex === -1 || currentIndex >= all.length - 1) return null;
  return all[currentIndex + 1] ?? null;
}

/**
 * Calculate completion percentage based on completedSteps array.
 */
export function calculateProgress(ctx: WizardContext, completedSteps: Set<string>): number {
  const all = getAllSteps(ctx);
  if (all.length === 0) return 0;
  const completed = all.filter((s) => completedSteps.has(s.id)).length;
  return Math.round((completed / all.length) * 100);
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
  completedSteps: Set<string>
): boolean {
  const all = getAllSteps(ctx);
  const categorySteps = all.filter((s) => s.category === category);
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
    const age = (Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age < 18;
  });

  return {
    maritalStatus: (opts.willData?.maritalStatus as MaritalStatus) ?? null,
    hasChildren: opts.children.length > 0,
    hasMinorChildren: minorChildren.length > 0,
    hasPets: Array.isArray(opts.willData?.pets) && (opts.willData!.pets as unknown[]).length > 0,
    hasAssets: opts.assetCount > 0,
    isSecondaryWill: opts.isSecondaryWill ?? false,
    isCouples: opts.isCouples ?? false,
  };
}
