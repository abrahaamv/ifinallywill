# Changelog

All notable changes to the AI Assistant Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Phase 2 (In Progress)

### 🚨 Critical Security Updates (7-Day Patch Window)

**MANDATORY before any development**:
- **Redis**: 7.4.2+ or 7.2.7+ (4 RCE vulnerabilities, CVSS 7.0-8.8)
- **PostgreSQL**: 17.3/16.7/15.11/14.16/13.19 (SQL injection CVE-2025-1094, actively exploited)
- **Fastify**: 5.3.2+ (Content-type parsing bypass CVE-2025-32442)

### 🔄 Major Architectural Changes

#### Authentication System Migration
- **Replaced**: Lucia v4 (deprecated March 2025)
- **New**: Auth.js (NextAuth.js) v5.0.0-beta.25
- **Rationale**: SOC 2 certified, OAuth-first, enterprise-ready
- **Breaking**: All Lucia code must be replaced with Auth.js OAuth flows

#### Real-Time Communication Overhaul
- **Replaced**: Server-Sent Events (SSE) - unidirectional only
- **New**: WebSocket - bidirectional communication
- **Benefits**: Lower latency, interactive features, mobile support

#### Message Broadcasting Architecture
- **Replaced**: Redis Pub/Sub - no persistence
- **New**: Redis Streams - consumer groups for horizontal scaling
- **Benefits**: Message persistence, delivery acknowledgment, load distribution

#### Multi-Tenant Security Enhancement
- **Added**: PostgreSQL RLS policies (MANDATORY)
- **Critical**: Drizzle ORM has NO automatic tenant filtering
- **Implementation**: FORCE ROW LEVEL SECURITY on all tenant-scoped tables

### 📅 Timeline Adjustments

- **Original**: 12 weeks total
- **Updated**: 15-17 weeks total (+2-3 weeks for Auth.js OAuth integration)
- **Phase 5 (LiveKit)**: Moved from Weeks 7-8 → Weeks 11-13

### 💰 LiveKit Requirements Clarification

- **Budget Alert**: LiveKit Enterprise plan REQUIRED ($5K-$10K+/month)
- **Build/Scale Plans Insufficient**: Cold starts, limited agent pool, no SLA
- **Pre-Implementation**: Budget approval required

### 🛠️ Technology Version Updates

- **Redis**: 7.4.2+ (was 7.x)
- **PostgreSQL**: 16.7+ (was 16.x)
- **Fastify**: 5.3.2+ (was 5.x)
- **Auth.js**: 5.0.0-beta.25 (new)

### 📊 Database Schema Changes

**New Auth.js Tables**:
- `accounts` - OAuth accounts (Google, Microsoft)
- `auth_sessions` - Session management
- `verification_tokens` - Email verification

**Removed**:
- `lucia_sessions` table

**Added**:
- Row-Level Security policies on all tenant-scoped tables
- `FORCE ROW LEVEL SECURITY` to prevent superuser bypass

### 🔧 Configuration Changes

**New Environment Variables**:
```bash
NEXTAUTH_URL, NEXTAUTH_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
WEBSOCKET_PORT, WEBSOCKET_PATH
LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
```

**Removed**:
```bash
JWT_SECRET, SESSION_SECRET (Lucia v4)
```

### 🏗️ Updated Implementation Phases

**Phase 1: Foundation (Week 1)** ✅ COMPLETE
- Monorepo scaffolding, documentation, security baseline

**Phase 2: Security + Database + Auth (Weeks 2-4)** 🔄 IN PROGRESS
- Security patches, database schema with RLS, Auth.js OAuth

**Phase 3: Backend APIs (Weeks 5-6)**
- tRPC routers, WebSocket server, Redis Streams

**Phase 4: Frontend Apps (Weeks 7-10)**
- Landing, dashboard, meeting interface, widget SDK

**Phase 5: AI Integration (Weeks 11-13)**
- LiveKit Enterprise, Python agent, multi-modal AI

**Phase 6: Production (Weeks 14-15)**
- Multi-tenant testing, security audit, optimization

**Phase 7: Scale (Weeks 16-17+)**
- Enterprise features, SOC 2, go-to-market

### 📝 Documentation Updates

**15 Files Updated**:
- CLAUDE.md, docs/README.md
- docs/architecture/* (system-design, tech-stack)
- docs/getting-started/* (overview, quick-start, development)
- docs/guides/* (roadmap, security, integration)
- docs/reference/* (api, database, configuration, livekit-agent)
- CHANGELOG.md (this file)

### 🎯 Breaking Changes

⚠️ **Authentication**: Lucia → Auth.js (OAuth-only)
⚠️ **Real-Time**: SSE EventSource → WebSocket
⚠️ **Broadcasting**: Redis Pub/Sub → Redis Streams
⚠️ **Multi-Tenancy**: RLS policies MANDATORY
⚠️ **LiveKit**: Enterprise plan required ($5K-$10K+/month)

### 🔍 Validation Checklist

- [ ] Redis 7.4.2+, PostgreSQL 16.7+, Fastify 5.3.2+ verified
- [ ] Auth.js OAuth configured with Google
- [ ] RLS policies on ALL tenant-scoped tables
- [ ] Tenant context middleware in tRPC
- [ ] WebSocket with sticky sessions
- [ ] Redis Streams consumer groups
- [ ] LiveKit Enterprise approved
- [ ] Multi-tenant isolation tested

---

## [1.0.0] - 2025-01-XX (Phase 1 Complete)

### Added
- Initial project scaffolding with Turborepo + pnpm
- Complete enterprise-grade documentation (26 files)
- Multi-app architecture (4 apps: landing, dashboard, meeting, widget-sdk)
- Package structure (10 packages)
- Development environment with Docker Compose
- Security baseline and vulnerability assessment

### Documentation
- Project overview and business model
- Complete technical architecture
- Implementation roadmap (7 phases, 15-17 weeks)
- Security guide with patching procedures
- Database schema design with RLS
- API specifications with Auth.js
- Component patterns
- Testing strategy
- Deployment procedures
- Observability setup

---

**Timeline**: Phase 1 complete (Week 1). Phase 2 in progress (Weeks 2-4). Production launch: Week 15-17.
