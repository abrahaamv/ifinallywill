/**
 * Will wizard step configuration
 *
 * Replaces v6's pointer system with a declarative step list.
 * Each step maps to a willData section (or key_names/assets CRUD).
 */

export interface WizardStep {
  id: string;
  label: string;
  section?: string; // willData section name (for auto-save)
  icon: string;
  /** Step is shown only when this returns true. Evaluated against will data. */
  condition?: (ctx: WizardContext) => boolean;
}

export interface WizardContext {
  maritalStatus?: string | null;
  hasChildren?: boolean;
  hasMinorChildren?: boolean;
  hasPets?: boolean;
  hasAssets?: boolean;
}

export const WILL_STEPS: WizardStep[] = [
  {
    id: 'personal-info',
    label: 'Personal Info',
    section: 'personalInfo',
    icon: '👤',
  },
  {
    id: 'family-status',
    label: 'Family Status',
    section: 'maritalStatus',
    icon: '💍',
  },
  {
    id: 'spouse-info',
    label: 'Spouse Info',
    section: 'spouseInfo',
    icon: '💑',
    condition: (ctx) =>
      ctx.maritalStatus === 'married' || ctx.maritalStatus === 'common_law',
  },
  {
    id: 'children',
    label: 'Children',
    section: 'guardians', // children data stored in guardians section context
    icon: '👶',
  },
  {
    id: 'key-people',
    label: 'Key People',
    icon: '👥',
    // No section — uses key_names CRUD directly
  },
  {
    id: 'guardians',
    label: 'Guardians',
    section: 'guardians',
    icon: '🛡️',
    condition: (ctx) => ctx.hasMinorChildren === true,
  },
  {
    id: 'pet-guardians',
    label: 'Pet Guardians',
    section: 'pets',
    icon: '🐾',
    condition: (ctx) => ctx.hasPets === true,
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: '💎',
    // No section — uses estate_assets CRUD
  },
  {
    id: 'bequests',
    label: 'Bequests',
    icon: '🎁',
    condition: (ctx) => ctx.hasAssets === true,
  },
  {
    id: 'residue',
    label: 'Residue',
    section: 'residue',
    icon: '⚖️',
  },
  {
    id: 'inheritance',
    label: 'Inheritance',
    section: 'trusting',
    icon: '🏛️',
    condition: (ctx) => ctx.hasMinorChildren === true,
  },
  {
    id: 'executors',
    label: 'Executors',
    section: 'executors',
    icon: '📋',
  },
  {
    id: 'wipeout',
    label: 'Wipeout',
    section: 'wipeout',
    icon: '🔄',
  },
  {
    id: 'additional',
    label: 'Additional Wishes',
    section: 'additional',
    icon: '✨',
  },
  {
    id: 'final-details',
    label: 'Final Details',
    section: 'finalDetails',
    icon: '✍️',
  },
  {
    id: 'review',
    label: 'Review',
    icon: '✅',
  },
];

/**
 * Get the visible steps given the current wizard context
 */
export function getVisibleSteps(ctx: WizardContext): WizardStep[] {
  return WILL_STEPS.filter((step) => !step.condition || step.condition(ctx));
}
