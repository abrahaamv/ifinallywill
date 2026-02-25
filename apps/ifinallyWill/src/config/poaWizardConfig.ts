/**
 * POA wizard step configuration
 *
 * Separate step configs for POA Property and POA Health.
 * POA Health extends Property with additional health-specific steps.
 */

import type { SimpleStep } from '../lib/wizard';

export const POA_PROPERTY_STEPS: SimpleStep[] = [
  {
    id: 'poa-personal-info',
    label: 'Personal Info',
    section: 'personalInfo',
  },
  {
    id: 'poa-agent-selection',
    label: 'Primary Agent',
    section: 'agents',
  },
  {
    id: 'poa-joint-agent',
    label: 'Joint Agent',
    section: 'agents',
  },
  {
    id: 'poa-backup-agents',
    label: 'Backup Agents',
    section: 'agents',
  },
  {
    id: 'poa-restrictions',
    label: 'Restrictions',
    section: 'restrictions',
  },
  {
    id: 'poa-activation',
    label: 'Activation',
    section: 'activationType',
  },
  {
    id: 'poa-review',
    label: 'Review',
  },
];

export const POA_HEALTH_STEPS: SimpleStep[] = [
  ...POA_PROPERTY_STEPS.slice(0, -1), // All property steps except review
  {
    id: 'poa-health-directives',
    label: 'Health Directives',
    section: 'healthDetails',
  },
  {
    id: 'poa-organ-donation',
    label: 'Organ Donation',
    section: 'healthDetails',
  },
  {
    id: 'poa-review',
    label: 'Review',
  },
];

/**
 * Get POA steps based on document type
 */
export function getPoaSteps(documentType: 'poa_property' | 'poa_health'): SimpleStep[] {
  return documentType === 'poa_health' ? POA_HEALTH_STEPS : POA_PROPERTY_STEPS;
}
