/**
 * tRPC App Router (Phase 3)
 *
 * Main router that combines all feature routers.
 */

import { aiPersonalitiesRouter } from './routers/ai-personalities';
import { analyticsRouter } from './routers/analytics'; // Phase 12 Week 1 Day 6-7
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
import { endUsersRouter } from './routers/end-users';
import { verificationRouter } from './routers/verification';
import { surveysRouter } from './routers/surveys';
import { escalationsRouter } from './routers/escalations';
import { problemsRouter } from './routers/problems';
// Phase 12 Enterprise Routers (Re-enabled 2025-11-25 after schema alignment)
import { crmRouter } from './routers/crm'; // Phase 12 Week 5
import { ticketingRouter } from './routers/ticketing'; // Phase 12 Week 6
import { knowledgeSyncRouter } from './routers/knowledge-sync'; // Phase 12 Week 7
import { communicationRouter } from './routers/communication'; // Phase 12 Week 8
import { qualityAssuranceRouter } from './routers/quality-assurance'; // Phase 12 Week 9
import { enterpriseSecurityRouter } from './routers/enterprise-security'; // Phase 12 Week 10
import { cragRouter } from './routers/crag'; // Phase 12 Week 11
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
  aiPersonalities: aiPersonalitiesRouter, // Phase 4 Enhancement
  analytics: analyticsRouter, // Phase 12 Week 1 Day 6-7 (Production Monitoring)
  endUsers: endUsersRouter, // Phase 11 Day 1-4
  verification: verificationRouter, // Phase 11 Day 3-6 (SMS/Email)
  surveys: surveysRouter, // Phase 11 Week 2 (In-widget feedback)
  escalations: escalationsRouter, // Phase 11 Week 4 (Human agent handoff)
  problems: problemsRouter, // Phase 11 Week 4 (Semantic deduplication)
  // Phase 12 Enterprise Routers (Re-enabled 2025-11-25)
  crm: crmRouter, // Phase 12 Week 5
  ticketing: ticketingRouter, // Phase 12 Week 6
  knowledgeSync: knowledgeSyncRouter, // Phase 12 Week 7
  communication: communicationRouter, // Phase 12 Week 8
  qualityAssurance: qualityAssuranceRouter, // Phase 12 Week 9
  enterpriseSecurity: enterpriseSecurityRouter, // Phase 12 Week 10
  crag: cragRouter, // Phase 12 Week 11
});

/**
 * Export type for use in frontend
 */
export type AppRouter = typeof appRouter;
