# Phase 2: Database & Authentication

**Status**: ⏳ Pending
**Timeline**: Week 2
**Dependencies**: Phase 1 complete

---

## Overview

Establish foundational data layer with PostgreSQL schemas, Drizzle ORM integration, and Lucia v4 authentication. This phase creates the multi-tenant database architecture and secure session management.

## Goals

- Complete PostgreSQL database schema with pgvector extension
- Implement Drizzle ORM with type-safe queries
- Set up Lucia v4 authentication with Argon2id hashing
- Enable multi-tenant data isolation
- Establish migration workflow

## Scope

### In Scope
- Database schema (tenants, users, sessions, widgets, meetings, knowledge)
- pgvector extension for embeddings (1024 dimensions)
- Drizzle ORM configuration and helpers
- Lucia v4 auth with session management
- Database seeding scripts
- Migration workflow

### Out of Scope
- Frontend authentication UI (Phase 4)
- LiveKit integration (Phase 6)
- RAG implementation (Phase 5)

## Technical Requirements

### Architecture
Reference: `docs/architecture/system-design.md`
- Multi-tenant PostgreSQL with row-level tenant isolation
- pgvector extension for knowledge embeddings
- Drizzle ORM for type-safe database access
- Lucia v4 for session-based authentication

### Database

**Tables Required**:
```sql
-- Core multi-tenancy
tenants (id, name, api_key, settings, created_at, updated_at)
users (id, tenant_id, email, hashed_password, name, role, created_at)

-- Authentication (Lucia v4)
sessions (id, user_id, expires_at, created_at)

-- Widget configuration
widgets (id, tenant_id, name, config, created_at, updated_at)

-- Meeting rooms
meetings (id, tenant_id, room_name, status, started_at, ended_at)

-- AI conversation tracking
conversation_sessions (id, tenant_id, meeting_id, widget_id, started_at, ended_at)
messages (id, session_id, role, content, created_at)

-- Knowledge base (RAG)
knowledge_documents (id, tenant_id, title, content, embedding vector(1024), metadata, created_at)
knowledge_chunks (id, document_id, content, embedding vector(1024), position, created_at)

-- Usage tracking
cost_events (id, tenant_id, session_id, provider, model, tokens, cost, created_at)
```

**Indexes Required**:
```sql
-- Vector search (pgvector HNSW)
CREATE INDEX knowledge_documents_embedding_idx
ON knowledge_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX knowledge_chunks_embedding_idx
ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Keyword search (pg_trgm)
CREATE INDEX knowledge_documents_content_trgm_idx
ON knowledge_documents USING gin (content gin_trgm_ops);

-- Tenant isolation
CREATE INDEX users_tenant_id_idx ON users(tenant_id);
CREATE INDEX widgets_tenant_id_idx ON widgets(tenant_id);
CREATE INDEX meetings_tenant_id_idx ON meetings(tenant_id);
```

### APIs
- Database connection helpers in `packages/db`
- Drizzle schema definitions exported for type safety
- Seed data script: `pnpm db:seed`
- Migration script: `pnpm db:push`

## Acceptance Criteria

- [ ] PostgreSQL 16 running with pgvector extension enabled
- [ ] All Drizzle schemas defined in `packages/db/src/schema/`
- [ ] Database migrations work: `pnpm db:push`
- [ ] Seed script creates test data: `pnpm db:seed`
- [ ] Lucia v4 adapter configured with Drizzle
- [ ] Session helpers work (create, validate, delete)
- [ ] Multi-tenant queries enforce tenant_id isolation
- [ ] Vector indexes created for embeddings
- [ ] All tests pass with ≥80% coverage
- [ ] Type checking passes: `pnpm typecheck`

## Tasks Breakdown

- Task 2.1: Database schema definition (Drizzle) - ⏳ Pending
- Task 2.2: Lucia v4 authentication setup - ⏳ Pending
- Task 2.3: Database helpers and utilities - ⏳ Pending
- Task 2.4: Seed data and test fixtures - ⏳ Pending

## Success Metrics

- All database operations are type-safe (TypeScript)
- Zero SQL injection vulnerabilities
- Session management works correctly
- Multi-tenant data isolation verified
- Database queries optimized with proper indexes

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| pgvector compatibility issues | High | Low | Use PostgreSQL 16+ Docker image with pgvector pre-installed |
| Migration conflicts | Medium | Medium | Use Drizzle push mode for development, plan migration strategy for production |
| Performance with vector indexes | Medium | Low | Use HNSW indexes, test with realistic data volumes |

## References

- `docs/guides/roadmap.md` - Phase 2 overview
- `docs/architecture/system-design.md` - Database architecture
- `docs/architecture/tech-stack.md` - PostgreSQL + pgvector + Drizzle
- `docs/reference/database.md` - Complete schema reference
