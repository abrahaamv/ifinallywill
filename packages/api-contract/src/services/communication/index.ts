/**
 * Phase 12 Week 8: Communication Channel Connectors
 *
 * Export all communication channel connector implementations
 */

// Base connector and types
export {
  BaseCommunicationConnector,
  CommunicationConnectorFactory,
  CommunicationConnectorError,
  type Message,
  type Channel,
  type SendMessageInput,
  type CommunicationConnectorConfig,
} from './base-connector';

// Connector implementations
export { EmailConnector } from './email-connector';
export { WhatsAppConnector } from './whatsapp-connector';
export { SlackConnector } from './slack-connector';
