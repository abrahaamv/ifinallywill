# Database Schema Reference

## Overview

**Database**: PostgreSQL 16+ (minimum 17.3/16.7/15.11 for security patches)
**ORM**: Drizzle ORM with postgres driver
**Extensions**: `pgvector` for vector embeddings (1024 dimensions)
**Connection Pooling**: 50 max connections, PgBouncer compatible, 3600s lifecycle
**Migration Strategy**: SQL files for RLS policies + Drizzle Kit push for schema

**Status**: ✅ All 12 Phases Complete - 50 tables across 8 schema files, 76+ RLS policies

---

## Schema Files Summary

All schemas located in `packages/db/src/schema/`:

| File | Tables | Domain |
|------|--------|--------|
| `index.ts` | 19 | Core platform |
| `phase10.ts` | 3 | AI optimization |
| `end-user-engagement.ts` | 5 | End-user engagement |
| `rag-evaluation.ts` | 4 | RAG quality evaluation |
| `crm-integrations.ts` | 5 | CRM integrations |
| `quality-assurance.ts` | 3 | Quality assurance |
| `enterprise-security.ts` | 6 | Enterprise security |
| `crag.ts` | 5 | Corrective RAG |
| **Total** | **50** | |

---

## Tables by Domain

### Core Platform (`index.ts` - 19 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `tenants` | Multi-tenant organizations | id, name, apiKey, plan, settings, metadata, stripeCustomerId |
| `users` | Platform users | id, tenantId, email, passwordHash, passwordAlgorithm, role, mfaEnabled, mfaSecret |
| `accounts` | Auth.js OAuth accounts | id, userId, type, provider, providerAccountId, accessToken, refreshToken |
| `authSessions` | Auth.js sessions | sessionToken (PK), userId, expires, ipAddress, userAgent |
| `verificationTokens` | Auth.js verification | identifier+token (composite PK), expires |
| `widgets` | Embeddable chat widgets | id, tenantId, name, domainWhitelist, settings, aiPersonalityId, isActive |
| `meetings` | Video meeting rooms | id, tenantId, roomName, livekitRoomId, createdBy, metadata |
| `sessions` | Chat/meeting sessions | id, tenantId, widgetId, meetingId, endUserId, mode, aiPersonalityId, costUsd |
| `messages` | Chat messages | id, sessionId, role, content, attachments, metadata (complexity, CRAG, QA, RAG) |
| `chatFiles` | Secure file storage | id, tenantId, userId, sessionId, fileName, filePath, fileType, fileSize |
| `knowledgeDocuments` | Knowledge base docs | id, tenantId, title, content, embedding (1024-dim), contentType, url, tags |
| `knowledgeChunks` | Document chunks | id, documentId, tenantId, content, embedding, position, tokenCount, parentChunkId |
| `costEvents` | Per-event cost tracking | id, tenantId, sessionId, service, provider, costUsd, cacheHitRate, rerankingCost |
| `costSummaries` | Aggregated cost reports | id, tenantId, periodStart, periodEnd, totalCostUsd, breakdown |
| `budgetAlerts` | Budget threshold alerts | id, tenantId, threshold, currentSpend, period, severity, resolved |
| `aiPersonalities` | AI chatbot personas | id, tenantId, name, systemPrompt, temperature, maxTokens, preferredModel |
| `apiKeys` | API key management | id, tenantId, name, keyType, keyHash, prefix, permissions, expiresAt |
| `auditLogs` | Security audit trail | id, tenantId, userId, action, resource, status, ipAddress, changes |
| `dataRequests` | GDPR data requests | id, tenantId, userId, requestType (export/deletion), status, exportUrl |

### AI Optimization (`phase10.ts` - 3 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `rerankingEvents` | Cohere reranking tracking | id, tenantId, query, documentCount, model, relevanceScores, processingTimeMs, cost |
| `knowledgeGaps` | DBSCAN cluster gaps | id, tenantId, clusterId, representativeQueries, importance, suggestedTopics, status |
| `conversationMemory` | LlamaIndex memory | id, tenantId, sessionId (unique), messages, summary, tokenCount |

### End-User Engagement (`end-user-engagement.ts` - 5 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `endUsers` | Widget end-user identity | id, tenantId, externalId, email, name, metadata, firstSeenAt, lastSeenAt |
| `surveyResponses` | In-widget survey data | id, tenantId, sessionId, endUserId, rating, feedback, surveyType |
| `unresolvedProblems` | Semantic problem dedup | id, tenantId, description, embedding, clusterLabel, frequency, status |
| `unresolvedProblemUsers` | Problem-user junction | problemId, endUserId, sessionId, reportedAt |
| `escalations` | Human agent handoff | id, tenantId, sessionId, endUserId, reason, priority, status, assignedTo |

### RAG Evaluation (`rag-evaluation.ts` - 4 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `ragEvaluationRuns` | RAGAS evaluation runs | id, tenantId, name, status, metrics (faithfulness, relevancy, precision, recall) |
| `ragEvaluations` | Individual eval results | id, runId, query, contexts, answer, scores, groundTruth |
| `ragTestSets` | Curated test datasets | id, tenantId, name, testCases, description |
| `ragQualityThresholds` | Quality gate config | id, tenantId, metric, threshold, action, isActive |

### CRM Integrations (`crm-integrations.ts` - 5 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `crmConnections` | CRM provider config | id, tenantId, provider (salesforce/hubspot/zendesk), status, credentials |
| `crmFieldMappings` | Field mapping rules | id, connectionId, sourceField, targetField, transformRule |
| `crmSyncState` | Sync cursor tracking | id, connectionId, entity, lastSyncAt, cursor, status |
| `crmSyncLogs` | Sync operation logs | id, connectionId, direction, entity, recordCount, status, errors |
| `crmWebhooks` | Webhook configurations | id, connectionId, eventType, url, secret, isActive |

### Quality Assurance (`quality-assurance.ts` - 3 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `qaReviews` | Response quality reviews | id, tenantId, messageId, reviewType, score, feedback, reviewer |
| `qaMetrics` | Aggregated QA metrics | id, tenantId, period, totalReviews, avgScore, hallucinationRate |
| `hallucinationDetections` | Hallucination flagging | id, tenantId, messageId, confidence, evidence, status |

### Enterprise Security (`enterprise-security.ts` - 6 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `ssoConfigurations` | SSO/SAML/OIDC config | id, tenantId, provider, protocol, metadata, isActive |
| `customRoles` | Custom RBAC roles | id, tenantId, name, permissions, description |
| `userRoleAssignments` | User-role mapping | id, userId, roleId, tenantId, assignedBy, assignedAt |
| `securityEvents` | Security event log | id, tenantId, eventType, severity, source, details, ipAddress |
| `activeSessions` | Live session tracking | id, tenantId, userId, token, deviceInfo, ipAddress, lastActivityAt |
| `trustedDevices` | Device trust registry | id, tenantId, userId, deviceFingerprint, deviceName, trustedAt |

### Corrective RAG (`crag.ts` - 5 tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `cragEvaluations` | CRAG confidence eval | id, tenantId, query, confidence, needsRefinement, reasoning |
| `queryRefinements` | Query rewrite tracking | id, evaluationId, originalQuery, refinedQuery, reasoning, improvement |
| `reasoningSteps` | Chain-of-thought log | id, evaluationId, stepNumber, reasoning, action, result |
| `cragResponses` | Final CRAG responses | id, evaluationId, response, sources, confidence, latencyMs |
| `cragMetrics` | Aggregated CRAG stats | id, tenantId, period, totalQueries, refinementRate, avgConfidence |

---

## Multi-Tenancy & RLS

**Status**: 76+ RLS policies enforced with FORCE RLS

- **Tables Protected**: All tenant-scoped tables
- **Policy Pattern**: 4 per table (SELECT, INSERT, UPDATE, DELETE)
- **RLS Mode**: FORCE (even superusers must comply)
- **Helper Function**: `get_current_tenant_id()` handles empty string edge cases
- **Session Variable**: `app.current_tenant_id` MUST be set before ANY database query

```sql
-- Helper function
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Migrations

**13 completed migrations** in `packages/db/migrations/`:

1. `001_enable_rls.sql` - Initial RLS setup
2. `002_fix_rls_policies.sql` - Separate INSERT/UPDATE/DELETE policies
3. `003_fix_rls_empty_string.sql` - Production-ready RLS with helper function
4. `004_seed_helper.sql` - Temporarily disable FORCE RLS for seeding
5. `005_restore_force_rls.sql` - Restore FORCE RLS after seeding
6. `006_add_performance_indexes.sql` - 55+ performance indexes including pgvector HNSW
7. `007_auth_schema_alignment.sql` - Auth.js schema compatibility
8. `008_enable_rls.sql` - FORCE RLS on all tenant-scoped tables
9. `009` through `013` - Phase 10-12 schema additions

### Execution

```bash
# Push schema changes
pnpm db:push

# Apply SQL migrations
psql -U platform -d platform -f packages/db/migrations/NNN_*.sql
```

---

## Performance

### Key Indexes

- **pgvector HNSW**: `knowledge_documents.embedding`, `knowledge_chunks.embedding` (m=16, ef_construction=64)
- **Tenant lookups**: All `tenant_id` columns indexed
- **Session queries**: `sessions(tenant_id, created_at)`, `sessions(widget_id)`
- **Message queries**: `messages(session_id, timestamp)`
- **Cost tracking**: `cost_events(tenant_id, timestamp)`
- **Phase 10**: `reranking_events(tenant_id, created_at)`, `knowledge_gaps(tenant_id, status, importance)`
- **Full-text search**: GIN indexes on `knowledge_chunks.content` for BM25

### Connection Pooling

```typescript
const client = postgres(process.env.DATABASE_URL!, {
  max: 50,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 3600,
  prepare: true,
});
```

---

## Related Documentation

- **RLS Policies**: `rls-policies.md`
- **Migration History**: `migrations.md`
- **API Reference**: `api.md` (24 tRPC routers)
- **Infrastructure**: `../operations/INFRASTRUCTURE.md`
