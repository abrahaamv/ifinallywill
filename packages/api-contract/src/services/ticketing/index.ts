/**
 * Phase 12 Week 6: Ticketing Integration Exports
 */

export {
  BaseTicketingConnector,
  TicketingConnectorFactory,
  TicketingConnectorError,
  type Ticket,
  type TicketUser,
  type TicketComment,
  type CreateTicketInput,
  type UpdateTicketInput,
  type CreateUserInput,
  type TicketingConnectorConfig,
} from './base-connector';

export { ZendeskConnector } from './zendesk-connector';
export { FreshdeskConnector } from './freshdesk-connector';
