/**
 * Phase 12 Week 7: Knowledge Base Connectors
 *
 * Export all knowledge base connector implementations
 */

// Base connector and types
export {
  BaseKnowledgeConnector,
  KnowledgeConnectorFactory,
  KnowledgeConnectorError,
  type Document,
  type Space,
  type SyncStatus,
  type KnowledgeConnectorConfig,
} from './base-connector';

// Connector implementations
export { ConfluenceConnector } from './confluence-connector';
export { NotionConnector } from './notion-connector';
export { GoogleDriveConnector } from './google-drive-connector';
