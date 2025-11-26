/**
 * Phase 12 Week 5: CRM Integration Exports
 */

export {
  BaseCRMConnector,
  CRMConnectorFactory,
  CRMConnectorError,
  type CRMContact,
  type CRMCase,
  type CreateContactInput,
  type UpdateContactInput,
  type CreateCaseInput,
  type UpdateCaseInput,
  type CRMConnectorConfig,
} from './base-connector';

export { SalesforceConnector } from './salesforce-connector';
export { HubSpotConnector } from './hubspot-connector';
