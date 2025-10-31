# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records documenting key technical decisions made during platform development.

**Purpose**: ADRs capture individual architectural decisions with their context, rationale, alternatives considered, and consequences. These are short (0.5-1 page), focused documents that answer "why did we make this choice?"

**For Implementation Details**: See [Phase Documentation](../phases/) for comprehensive implementation reports.

---

## 📖 About ADRs

Architecture Decision Records (ADR) follow the [Michael Nygard ADR pattern](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). Each ADR documents:

- **Context**: What problem prompted this decision
- **Decision**: What we decided to do
- **Alternatives Considered**: What other options we evaluated (and why we rejected them)
- **Consequences**: Positive, negative, and neutral impacts

**ADR vs Phase Documentation**:
| Type | Purpose | Length | Example |
|------|---------|--------|---------|
| **ADR** | Record a single architectural decision | 0.5-1 page | "Use PostgreSQL RLS for tenant isolation" |
| **Phase Doc** | Report complete phase implementation | 10-20 pages | "Phase 3: Backend Infrastructure - 760 lines" |

---

## 🎯 Quick Navigation

- **[Phase Documentation](../phases/)** - Detailed implementation reports
- **[Operations](../operations/)** - Deployment guides and runbooks
- **[ADR Template](./template.md)** - Template for new ADRs

---

## 📚 Architecture Decision Records

### Foundation & Infrastructure (Phase 1-2)

#### [ADR-0001: Turborepo Monorepo with pnpm Workspaces](./0001-turborepo-monorepo.md) ✅
**Date**: 2024-12-XX | **Status**: Accepted

**Decision**: Adopt Turborepo as monorepo build system with pnpm for dependency management.

**Why**: 100x faster incremental builds, type-safe cross-package imports, atomic commits across packages.

**Alternatives Rejected**: Nx (too complex), Lerna (slower), Multiple repos (no code reuse).

**Related**: [Phase 1 Implementation](../phases/phase-1-project-scaffolding.md)

---

#### [ADR-0002: PostgreSQL RLS for Multi-Tenant Isolation](./0002-postgresql-rls-tenant-isolation.md) ✅
**Date**: 2025-01-06 | **Status**: Accepted | **Critical**

**Decision**: Use PostgreSQL Row-Level Security with FORCE enabled for tenant isolation.

**Why**: Database-enforced isolation prevents data leakage even if application code has bugs. Drizzle ORM has NO automatic tenant filtering.

**Alternatives Rejected**: Application-level filtering (catastrophic risk), Separate databases (expensive), Schema-based (complex).

**Related**: [Phase 2 Implementation](../phases/phase-2-security-database-auth.md)

---

#### [ADR-0003: Auth.js for Authentication](./0003-authjs-authentication.md) ✅
**Date**: 2025-01-06 | **Status**: Accepted

**Decision**: Use Auth.js (NextAuth.js) for authentication with database session storage.

**Why**: Industry standard (3.8M downloads/week), SOC 2 certified, OAuth PKCE support, Drizzle adapter.

**Alternatives Rejected**: Lucia (deprecated March 2025), Passport (no session management), Custom OAuth (security risk), Clerk (vendor lock-in).

**Related**: [Phase 2 Implementation](../phases/phase-2-security-database-auth.md)

---

### Backend API Stack (Phase 3)

#### [ADR-0004: Fastify + tRPC Stack](./0004-fastify-trpc-stack.md) ✅
**Date**: 2025-10-06 | **Status**: Accepted

**Decision**: Use Fastify 5.3.2+ as HTTP server with tRPC v11 for type-safe API layer.

**Why**: End-to-end TypeScript types without codegen, 3-4x faster than Express, <100ms response times.

**Alternatives Rejected**: Express + REST (no type safety), GraphQL (too complex), NestJS (too heavy).

**Related**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md)

---

#### [ADR-0005: Zod for Runtime Validation](./0005-zod-runtime-validation.md) ✅
**Date**: 2025-10-06 | **Status**: Accepted

**Decision**: Use Zod for runtime validation across all packages.

**Why**: TypeScript inference from schemas (no duplication), tRPC native support, <1ms validation overhead.

**Alternatives Rejected**: Joi (no TS inference), Yup (worse TS support), io-ts (too complex), ArkType (too new).

**Related**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md)

---

#### [ADR-0007: Request-Scoped RLS via SET LOCAL](./0007-request-scoped-rls.md) ✅
**Date**: 2025-10-06 | **Status**: Accepted | **Critical**

**Decision**: Use `SET LOCAL app.current_tenant_id` within transactions for RLS context.

**Why**: Transaction-scoped (safe for connection pooling), automatic cleanup, PgBouncer compatible, <0.1ms overhead.

**Alternatives Rejected**: SET SESSION (connection state leakage), Connection-per-tenant (resource waste), App-level passing (bypasses RLS).

**Related**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md), [ADR-0002](./0002-postgresql-rls-tenant-isolation.md)

---

## 🚧 Planned ADRs

These architectural decisions are documented in phase implementations but not yet extracted into formal ADRs:

### Phase 4 (Frontend)
- **ADR-0008**: React 18 + Vite 6 + Tailwind CSS v4 Stack
- **ADR-0009**: shadcn/ui Component Library

### Phase 5 (AI + LiveKit)
- **ADR-0010**: Cost-Optimized AI Routing (75-85% savings)
- **ADR-0011**: LiveKit Self-Hosted Deployment (95-97% savings)

### Phase 6 (Real-time)
- **ADR-0012**: Redis Streams for WebSocket Broadcasting

### Phase 7 (Widget)
- **ADR-0013**: Shadow DOM for Widget Isolation

### Phase 8 (Security)
- **ADR-0014**: Argon2id Password Hashing (OWASP 2025)
- **ADR-0015**: TOTP MFA with AES-256-GCM

### Phase 9 (Deployment)
- **ADR-0016**: Google Cloud Platform over AWS
- **ADR-0017**: Hybrid Docker Architecture (Cloud Run + GCE)

---

## 📊 ADR Summary

| ID | Decision | Phase | Status | Date |
|----|----------|-------|--------|------|
| [0001](./0001-turborepo-monorepo.md) | Turborepo Monorepo | Phase 1 | ✅ Accepted | 2024-12-XX |
| [0002](./0002-postgresql-rls-tenant-isolation.md) | PostgreSQL RLS | Phase 2 | ✅ Accepted | 2025-01-06 |
| [0003](./0003-authjs-authentication.md) | Auth.js Authentication | Phase 2 | ✅ Accepted | 2025-01-06 |
| [0004](./0004-fastify-trpc-stack.md) | Fastify + tRPC | Phase 3 | ✅ Accepted | 2025-10-06 |
| [0005](./0005-zod-runtime-validation.md) | Zod Validation | Phase 3 | ✅ Accepted | 2025-10-06 |
| [0007](./0007-request-scoped-rls.md) | Request-Scoped RLS | Phase 3 | ✅ Accepted | 2025-10-06 |

**6 ADRs documented** | **11+ planned** | **Total: 17+ architectural decisions**

---

## 🔍 Finding Decisions

### By Technology
- **Monorepo**: [ADR-0001](./0001-turborepo-monorepo.md)
- **Database**: [ADR-0002](./0002-postgresql-rls-tenant-isolation.md)
- **Authentication**: [ADR-0003](./0003-authjs-authentication.md)
- **API Framework**: [ADR-0004](./0004-fastify-trpc-stack.md)
- **Validation**: [ADR-0005](./0005-zod-runtime-validation.md)
- **Security**: [ADR-0002](./0002-postgresql-rls-tenant-isolation.md), [ADR-0007](./0007-request-scoped-rls.md)

### By Phase
- **Phase 1**: [ADR-0001](./0001-turborepo-monorepo.md)
- **Phase 2**: [ADR-0002](./0002-postgresql-rls-tenant-isolation.md), [ADR-0003](./0003-authjs-authentication.md)
- **Phase 3**: [ADR-0004](./0004-fastify-trpc-stack.md), [ADR-0005](./0005-zod-runtime-validation.md), [ADR-0007](./0007-request-scoped-rls.md)

### By Criticality
**Critical Security Decisions**:
- [ADR-0002: PostgreSQL RLS](./0002-postgresql-rls-tenant-isolation.md) - Prevents data leakage
- [ADR-0007: Request-Scoped RLS](./0007-request-scoped-rls.md) - Safe connection pooling

---

## 📚 Creating New ADRs

Use the [ADR Template](./template.md) for new architectural decisions:

```bash
# Copy template
cp docs/adr/template.md docs/adr/XXXX-decision-name.md

# Edit with decision details
# - Context: What problem?
# - Decision: What we chose
# - Alternatives: What else we considered
# - Consequences: Impact (positive/negative/neutral)
```

**When to Create an ADR**:
- Technology choice (framework, library, service)
- Architecture pattern (authentication, caching, deployment)
- Security decision (encryption, isolation, validation)
- Performance trade-off (optimization vs simplicity)

**ADR Numbering**: Use next sequential number (0001, 0002, 0003...). Leave gaps OK (e.g., skip 0006 for deleted ADR).

---

## 📖 External Documentation

- **Phase Documentation**: [../phases/](../phases/) - Implementation details
- **Operations**: [../operations/](../operations/) - Deployment guides
- **API Reference**: [../reference/api.md](../reference/api.md)
- **Database Schema**: [../reference/database.md](../reference/database.md)

---

## 📚 Further Reading

- [Michael Nygard's ADR Blog Post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Original ADR pattern
- [ADR Tools GitHub](https://github.com/npryce/adr-tools) - CLI for managing ADRs
- [Documenting Architecture Decisions](https://adr.github.io/) - Community resources

---

**Last Updated**: 2025-01-10
**Status**: 6 ADRs documented, 11+ planned from existing phase documentation
