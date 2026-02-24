/**
 * POA wizard step configuration
 *
 * Separate step configs for POA Property and POA Health.
 * POA Health extends Property with additional health-specific steps.
 */

import type { WizardStep } from './wizardConfig';

export const POA_PROPERTY_STEPS: WizardStep[] = [
  {
    id: 'poa-personal-info',
    label: 'Personal Info',
    section: 'personalInfo',
    icon: '👤',
  },
  {
    id: 'poa-agent-selection',
    label: 'Primary Agent',
    section: 'agents',
    icon: '🤝',
  },
  {
    id: 'poa-joint-agent',
    label: 'Joint Agent',
    section: 'agents',
    icon: '👥',
  },
  {
    id: 'poa-backup-agents',
    label: 'Backup Agents',
    section: 'agents',
    icon: '🛡️',
  },
  {
    id: 'poa-restrictions',
    label: 'Restrictions',
    section: 'restrictions',
    icon: '🔒',
  },
  {
    id: 'poa-activation',
    label: 'Activation',
    section: 'activationType',
    icon: '⚡',
  },
  {
    id: 'poa-review',
    label: 'Review',
    icon: '✅',
  },
];

export const POA_HEALTH_STEPS: WizardStep[] = [
  ...POA_PROPERTY_STEPS.slice(0, -1), // All property steps except review
  {
    id: 'poa-health-directives',
    label: 'Health Directives',
    section: 'healthDetails',
    icon: '🏥',
  },
  {
    id: 'poa-organ-donation',
    label: 'Organ Donation',
    section: 'healthDetails',
    icon: '❤️',
  },
  {
    id: 'poa-review',
    label: 'Review',
    icon: '✅',
  },
];

/**
 * Get POA steps based on document type
 */
export function getPoaSteps(documentType: 'poa_property' | 'poa_health'): WizardStep[] {
  return documentType === 'poa_health' ? POA_HEALTH_STEPS : POA_PROPERTY_STEPS;
}
