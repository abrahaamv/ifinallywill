/**
 * Registration step configuration with conditional branching.
 *
 * The step list is computed dynamically based on the user's answers
 * (province, partner status, address, etc.).  The hook calls
 * getRegistrationSteps(data) on every render so navigation always
 * reflects the current state.
 */

import type { RegistrationData } from '../hooks/useRegistrationWizard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistrationStep {
  /** Unique identifier used to render the correct component. */
  id: string;
  /** Whether the progress bar should be visible on this step. */
  showProgress: boolean;
}

// ---------------------------------------------------------------------------
// Provinces that support secondary wills
// ---------------------------------------------------------------------------

const SECONDARY_WILL_PROVINCES = ['Ontario', 'British Columbia'];

// ---------------------------------------------------------------------------
// Step builder
// ---------------------------------------------------------------------------

export function getRegistrationSteps(data: RegistrationData): RegistrationStep[] {
  const steps: RegistrationStep[] = [
    { id: 'welcome', showProgress: false },
    { id: 'location', showProgress: true },
    { id: 'name', showProgress: true },
    { id: 'account', showProgress: true },
  ];

  // Secondary will step: only Ontario and British Columbia
  if (data.province && SECONDARY_WILL_PROVINCES.includes(data.province)) {
    steps.push({ id: 'secondaryWill', showProgress: true });
  }

  // POA step
  steps.push({ id: 'poa', showProgress: true });

  // Partner step (always shown — user answers yes/no)
  steps.push({ id: 'partner', showProgress: true });

  // Conditional partner detail steps
  if (data.has_partner === 'yes') {
    steps.push({ id: 'partnerName', showProgress: true });

    // Partner location only if they live at a different address
    if (!data.partner_same_address) {
      steps.push({ id: 'partnerLocation', showProgress: true });
    }

    // Planning together — skip when arriving from the couples plan selection flow
    if (!data.from_couples_plan_selection) {
      steps.push({ id: 'planningTogether', showProgress: true });
    }
  }

  // Package selection
  steps.push({ id: 'packageSelection', showProgress: true });

  // Checkout
  steps.push({ id: 'checkout', showProgress: true });

  return steps;
}
