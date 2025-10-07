/**
 * tRPC App Router (Phase 3)
 *
 * Main router that combines all feature routers.
 */

import { chatRouter } from './routers/chat';
import { healthRouter } from './routers/health';
import { knowledgeRouter } from './routers/knowledge';
import { sessionsRouter } from './routers/sessions';
import { usersRouter } from './routers/users';
import { widgetsRouter } from './routers/widgets';
import { router } from './trpc';

/**
 * App router with all feature routers
 */
export const appRouter = router({
  health: healthRouter,
  users: usersRouter,
  widgets: widgetsRouter,
  knowledge: knowledgeRouter,
  sessions: sessionsRouter,
  chat: chatRouter,
});

/**
 * Export type for use in frontend
 */
export type AppRouter = typeof appRouter;
