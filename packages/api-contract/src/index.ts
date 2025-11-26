/**
 * @platform/api-contract - tRPC API Type Definitions
 *
 * Shared type-safe API contract between frontend and backend.
 */

// Export app router and types
export { appRouter, type AppRouter } from './router';

// Export context
export { createContext } from './context';
export type { Context, TRPCContext } from './context';

// Export storage service (Phase 11 Week 5)
export { createStorageService } from './services/storage';
export type { StorageService } from './services/storage';

// Export A/B testing service (Phase 12 Week 4)
export { ABTestingService, abTestingService } from './services/ab-testing';
export type {
  VariantId,
  ABTestConfig,
  ABTestVariant,
  ABTestAssignment,
  VariantMetrics,
  ABTestResults,
} from './services/ab-testing';

// Phase 12 Enterprise Services (Re-enabled 2025-11-25)

// Export CRM connectors (Phase 12 Week 5)
export {
  CRMConnectorFactory,
  SalesforceConnector,
  HubSpotConnector,
  type CRMContact,
  type CRMConnectorConfig,
} from './services/crm';

// Export Ticketing connectors (Phase 12 Week 6)
export {
  TicketingConnectorFactory,
  ZendeskConnector,
  FreshdeskConnector,
  type TicketingConnectorConfig,
} from './services/ticketing';

// Export Knowledge Base connectors (Phase 12 Week 7)
export {
  BaseKnowledgeConnector,
  KnowledgeConnectorFactory,
  KnowledgeConnectorError,
  ConfluenceConnector,
  NotionConnector,
  GoogleDriveConnector,
  type Document,
  type Space,
  type SyncStatus,
  type KnowledgeConnectorConfig,
} from '@platform/knowledge';

// Export Communication connectors (Phase 12 Week 8)
export {
  CommunicationConnectorFactory,
  EmailConnector,
  SlackConnector,
  WhatsAppConnector,
  type CommunicationConnectorConfig,
} from './services/communication';

// Export Quality Assurance service (Phase 12 Week 9)
export {
  QualityAssuranceService,
  qualityAssuranceService,
  type HallucinationDetectionConfig,
  type HallucinationDetectionResult,
  type QualityReview,
  type QualityMetrics,
  type QualityIssueType,
  type ReviewStatus,
} from './services/quality-assurance';

// Export Enterprise Security services (Phase 12 Week 10)
export {
  SSOService,
  SSOServiceFactory,
  RBACService,
  PERMISSIONS,
  SYSTEM_ROLES,
  type SSOConfig,
  type Permission,
} from './services/enterprise-security';

// Export CRAG services (Phase 12 Week 11)
export {
  CRAGService,
  cragService,
  DEFAULT_CRAG_CONFIG,
  type CRAGConfig,
  type CRAGEvaluation,
  type QueryRefinement,
  type MultiHopResult,
  type CRAGResponse,
} from './services/crag';

// Export tRPC helpers (for backend use)
export {
  router,
  publicProcedure,
  protectedProcedure,
  protectedMutation,
  adminProcedure,
  ownerProcedure,
} from './trpc';

// Export routers (for testing and direct use)
export { healthRouter } from './routers/health';
export { usersRouter } from './routers/users';
export { widgetsRouter } from './routers/widgets';
export { knowledgeRouter } from './routers/knowledge';
export { sessionsRouter } from './routers/sessions';
// Phase 12 Enterprise Routers (Re-enabled 2025-11-25)
export { crmRouter } from './routers/crm';
export { ticketingRouter } from './routers/ticketing';
export { knowledgeSyncRouter } from './routers/knowledge-sync';
export { communicationRouter } from './routers/communication';
export { qualityAssuranceRouter } from './routers/quality-assurance';
export { enterpriseSecurityRouter } from './routers/enterprise-security';
export { cragRouter } from './routers/crag';

// Export error handling utilities (Production Readiness - 2025-10-27)
export {
  createError,
  sanitizeErrorMessage,
  logError,
  handleDatabaseError,
  withErrorHandling,
  ERROR_CODES,
  APP_ERROR_TYPES,
} from './errors';
export type { ErrorDetails } from './errors';
