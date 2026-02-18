# API Reference - tRPC Router Specification

## Overview

**Framework**: tRPC v11 + Fastify 5.3.2+
**Routers**: 24 active routers in `packages/api-contract/src/router.ts`
**Validation**: Zod schemas for all inputs
**Auth**: Auth.js sessions + API key authentication
**Multi-tenancy**: Tenant context via RLS (Row-Level Security)

**Source**: `packages/api-contract/src/routers/`

---

## Router Map

All 24 routers registered in `packages/api-contract/src/router.ts`:

```typescript
export const appRouter = router({
  health, auth, users, widgets, knowledge, sessions, chat,
  mfa, apiKeys, aiPersonalities, analytics,
  endUsers, verification, surveys, escalations, problems, chatwoot,
  crm, ticketing, knowledgeSync, communication,
  qualityAssurance, enterpriseSecurity, crag,
});
```

---

## Routers by Domain

### Core (9 routers)

| Router | File | Auth | Description |
|--------|------|------|-------------|
| `health` | `health.ts` | Public | Health check, readiness probes |
| `auth` | `auth.ts` | Public/Protected | Register, login, verify email, reset password, session management |
| `users` | `users.ts` | Protected | User profile CRUD, role management |
| `sessions` | `sessions.ts` | Tenant | Chat/meeting session lifecycle (create, list, end) |
| `widgets` | `widgets.ts` | Tenant | Widget CRUD, domain whitelist, settings |
| `chat` | `chat.ts` | Tenant | Send messages, get history, AI response pipeline (RAG + CRAG + QA) |
| `knowledge` | `knowledge.ts` | Tenant | Document upload, hybrid search (vector + BM25 + rerank), chunking |
| `aiPersonalities` | `ai-personalities.ts` | Tenant | AI persona CRUD (system prompts, temperature, model preferences) |
| `analytics` | `analytics.ts` | Tenant | Session metrics, cost breakdown, usage analytics |

### Security (2 routers)

| Router | File | Auth | Description |
|--------|------|------|-------------|
| `mfa` | `mfa.ts` | Protected | TOTP setup, verify, backup codes, disable MFA |
| `apiKeys` | `api-keys.ts` | Protected | API key generation, rotation, revocation, permission scopes |

### End-User Engagement (5 routers)

| Router | File | Auth | Description |
|--------|------|------|-------------|
| `endUsers` | `end-users.ts` | Tenant | End-user identity management, metadata, activity tracking |
| `verification` | `verification.ts` | Tenant | SMS/email verification flows for end users |
| `surveys` | `surveys.ts` | Tenant | In-widget surveys (CSAT, NPS, custom), response collection |
| `escalations` | `escalations.ts` | Tenant | Human agent handoff, priority routing, status tracking |
| `problems` | `problems.ts` | Tenant | Unresolved problem tracking, semantic deduplication, clustering |

### Enterprise (7 routers) - Phase 12

| Router | File | Auth | Description |
|--------|------|------|-------------|
| `crm` | `crm.ts` | Tenant | CRM connections (Salesforce, HubSpot, Zendesk), field mappings, sync |
| `ticketing` | `ticketing.ts` | Tenant | Ticket creation (Jira, Linear, GitHub Issues), status sync |
| `knowledgeSync` | `knowledge-sync.ts` | Tenant | Knowledge connectors (Notion, Confluence, SharePoint), auto-sync |
| `communication` | `communication.ts` | Tenant | Multi-channel messaging (Slack, Teams, Discord, SMS, Email) |
| `qualityAssurance` | `quality-assurance.ts` | Tenant | QA reviews, hallucination detection, quality metrics |
| `enterpriseSecurity` | `enterprise-security.ts` | Tenant | SSO config, custom roles, trusted devices, security events |
| `crag` | `crag.ts` | Tenant | Corrective RAG evaluations, query refinement, confidence scoring |

### Integration (1 router)

| Router | File | Auth | Description |
|--------|------|------|-------------|
| `chatwoot` | `chatwoot.ts` | Protected | Chatwoot SSO integration, agent sync |

---

## Procedure Types

```typescript
// packages/api-contract/src/trpc.ts

// No auth required
export const publicProcedure = t.procedure;

// Requires authenticated user session
export const protectedProcedure = t.procedure.use(authMiddleware);

// Requires tenant context (session or API key)
export const tenantProcedure = t.procedure.use(tenantMiddleware);
```

---

## Key Patterns

### Context

```typescript
interface Context {
  session: Session | null;
  tenantId: string | null;
  db: typeof db;
  req: Request;
  userAgent: string | null;
  ip: string | null;
}
```

### Error Handling

Standard tRPC error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`

### Rate Limiting

Redis-based sliding window with tier-based limits:
- **Public endpoints**: 20 req/min
- **Authenticated**: 100 req/min
- **Tenant operations**: 200 req/min
- **Chat messages**: 60 req/min
- **Knowledge uploads**: 30 req/hour
- **AI operations**: 100 req/min

### SSE Streaming

Chat responses use Server-Sent Events (outside tRPC):
- Endpoint: `/api/chat/:sessionId/stream`
- Redis pub/sub for message broadcasting
- 30s heartbeat interval
- Exponential backoff reconnection

---

## Performance Targets

```yaml
API Endpoints:
  p50 Latency: < 50ms
  p95 Latency: < 200ms
  p99 Latency: < 500ms
  Error Rate: < 0.1%

Chat Pipeline:
  RAG retrieval: < 200ms
  AI response: < 2000ms
  CRAG refinement: < 500ms
  QA check: < 300ms
```

---

## Security

- **Input validation**: Zod schemas on all inputs
- **SQL injection**: Prevented via Drizzle ORM parameterized queries
- **CORS**: Configured per-origin with tenant domain whitelist
- **CSRF**: 264-line middleware with token validation
- **Helmet.js**: 11 security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Session**: 8hr lifetime, crypto.randomUUID tokens, rotation

---

## Enterprise Router Status

The 7 enterprise routers (Phase 12) are **code-complete and active** in the router registry. They are functional but have not been validated with integration tests. Core routers (health, auth, users, widgets, knowledge, sessions, chat) are production-tested.

---

## Related Documentation

- **Database Schema**: `database.md` (50 tables)
- **Infrastructure**: `../operations/INFRASTRUCTURE.md`
- **Roadmap**: `../guides/roadmap.md`
