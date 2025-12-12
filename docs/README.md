# Platform Documentation

Welcome to the AI Assistant Platform documentation. This directory contains comprehensive guides for development, deployment, and operations.

**Status**: Production Ready | **Security Score**: 99/100 | **Last Updated**: 2025-12-12

---

## Quick Navigation

### By Role

| Role | Start Here | Key Docs |
|------|------------|----------|
| **Developer** | [Development Setup](getting-started/development.md) | [API Reference](reference/api.md), [Database Schema](reference/database.md) |
| **DevOps/SRE** | [Deployment Guide](operations/deployment.md) | [Monitoring](operations/observability.md), [Backups](operations/backup-restore-procedures.md) |
| **Architect** | [System Design](architecture/system-design.md) | [ADR Index](adr/README.md), [Roadmap](guides/roadmap.md) |

---

## Documentation Structure

### Getting Started
- [Project Overview](getting-started/overview.md) - Business context and goals
- [Quick Start](getting-started/quick-start.md) - Get running in minutes
- [Development Setup](getting-started/development.md) - Local environment

### Architecture
- [System Design](architecture/system-design.md) - Architecture overview
- [Tech Stack](architecture/tech-stack.md) - Technology decisions
- [Decisions](architecture/decisions.md) - Key architectural choices

### Architecture Decision Records (ADR)
- [ADR Index](adr/README.md) - All architectural decisions
- [ADR-0001: Turborepo](adr/0001-turborepo-monorepo.md)
- [ADR-0002: PostgreSQL RLS](adr/0002-postgresql-rls-tenant-isolation.md)
- [ADR-0003: Auth.js](adr/0003-authjs-authentication.md)
- [ADR-0004: Fastify + tRPC](adr/0004-fastify-trpc-stack.md)
- [ADR-0005: Zod Validation](adr/0005-zod-runtime-validation.md)
- [ADR-0007: Request-Scoped RLS](adr/0007-request-scoped-rls.md)

### Guides
- [Development Roadmap](guides/roadmap.md) - 12-phase implementation plan
- [Development Guide](guides/development.md) - Best practices
- [Security Guide](guides/security.md) - Security implementation
- [Testing Guide](guides/testing.md) - Testing strategy
- [Integration Guide](guides/integration.md) - Third-party integrations

### Reference
- [API Reference](reference/api.md) - tRPC API specifications
- [Database Schema](reference/database.md) - 28 tables, 76+ RLS policies
- [Configuration](reference/configuration.md) - Environment variables
- [File Structure](reference/file-structure.md) - Project organization
- [Widget SDK](reference/widget-sdk.md) - Embeddable widget

### Operations
- [Deployment Guide](operations/deployment.md) - Production deployment
- [Staging Deployment](operations/deployment/staging.md)
- [Production Deployment](operations/deployment/production.md)
- [Observability](operations/observability.md) - Monitoring and logging
- [Alerting](operations/alerting.md) - Alert configuration
- [Backup Configuration](operations/backup-configuration.md)
- [Backup Procedures](operations/backup-restore-procedures.md)
- [Troubleshooting](operations/troubleshooting.md)

### Phase Documentation

**Completed Phases (11/12)**:

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 1](phases/phase-1-project-scaffolding.md) | Project Scaffolding | Complete |
| [Phase 2](phases/phase-2-security-database-auth.md) | Security + Database + Auth | Complete |
| [Phase 3](phases/phase-3-backend-api-infrastructure.md) | Backend APIs | Complete |
| [Phase 4](phases/phase-4-frontend-development.md) | Frontend Apps | Complete |
| [Phase 5](phases/phase-5-ai-rag-chat.md) | AI Integration (RAG) | Complete |
| [Phase 5](phases/phase-5-livekit-integration.md) | LiveKit Integration | Complete |
| [Phase 6](phases/phase-6-realtime-websocket-chat.md) | Real-time Features | Complete |
| [Phase 7](phases/phase-7-widget-sdk.md) | Widget SDK | Complete |
| [Phase 8](phases/phase-8-production-security.md) | Production Security | Complete |
| [Phase 8](phases/phase-8-security-audit.md) | Security Audit | Complete |
| [Phase 9](phases/phase-9-staging-deployment.md) | Staging Deployment | Complete |
| [Phase 10](phases/phase-10-implementation.md) | AI Optimization | Complete |
| [Phase 11](phases/phase-11-end-user-engagement-implementation.md) | End-User Engagement | Complete |
| [Phase 12](phases/phase-12-implementation.md) | Enterprise AI | 50% (Paused) |

### Audit Reports
- [2025-11-01 Audit](audit/2025-11-01/) - Comprehensive security audit
- [2025-10-25 Audit](audit/2025-10-25/) - Initial audit + remediation

### Design
- [Design System](design/design-system.md)
- [Quick Start](design/quick-start.md)

---

## Project Status

**Complete**:
- 11/12 phases implemented (92%)
- 28 database tables with 76+ RLS policies
- 9 tRPC routers with type-safe APIs
- 4 frontend apps (React 18 + Vite 6)
- Security hardening (Auth.js, Argon2id, CSRF, MFA)
- Real-time features (WebSocket, LiveKit)
- AI optimization (75-85% cost reduction)
- Security score: 99/100

**Next Steps**:
- Widget SDK CDN delivery
- Phase 12 completion

---

## Contributing to Documentation

When adding/updating documentation:

1. Use clear, concise language
2. Include code examples where relevant
3. Add cross-references to related docs
4. Update this index when adding new docs
5. Follow existing formatting conventions
6. Include "Last Updated" date

---

**Last Updated**: 2025-12-12
