/**
 * tRPC App Router (Phase 3)
 *
 * Main router that combines all feature routers.
 */

import { apiKeysRouter } from './routers/api-keys';
import { authRouter } from './routers/auth';
import { chatRouter } from './routers/chat';
import { healthRouter } from './routers/health';
import { knowledgeRouter } from './routers/knowledge';
import { livekitRouter } from './routers/livekit';
import { mfaRouter } from './routers/mfa';
import { sessionsRouter } from './routers/sessions';
import { usersRouter } from './routers/users';
import { widgetsRouter } from './routers/widgets';
import { router } from './trpc';

/**
 * App router with all feature routers
 */
export const appRouter = router({
  health: healthRouter,
  auth: authRouter, // Public auth endpoints (register, verify, reset)
  users: usersRouter,
  widgets: widgetsRouter,
  knowledge: knowledgeRouter,
  sessions: sessionsRouter,
  chat: chatRouter,
  livekit: livekitRouter,
  mfa: mfaRouter, // Phase 8 Day 6-7
  apiKeys: apiKeysRouter, // Phase 8 Day 8-10
});

/**
 * Export type for use in frontend
 */
export type AppRouter = typeof appRouter;
