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

// Export tRPC helpers (for backend use)
export {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  ownerProcedure,
} from './trpc';

// Export routers (for testing and direct use)
export { healthRouter } from './routers/health';
export { usersRouter } from './routers/users';
export { widgetsRouter } from './routers/widgets';
export { knowledgeRouter } from './routers/knowledge';
export { sessionsRouter } from './routers/sessions';

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
