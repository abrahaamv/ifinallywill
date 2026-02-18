# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Enterprise AI Assistant Platform** - Multi-modal real-time AI interaction system with cost-optimized provider architecture (75-85% cost reduction validated). Built as a Turborepo monorepo with pnpm workspaces, focusing on type safety and enterprise-grade quality.

**Current Status**: 12/12 Phases Complete - Build & Typecheck Passing ✅ (99/100 security score)
**Phase Status**: All phases complete. Phase 12 enterprise features code-complete but unvalidated.
**Build Status**: TypeScript 21/21 packages passing, Full build 13/13 tasks successful
**Current Focus**: Documentation rebuild from ground truth, production hardening, enterprise feature validation

**Tech Stack**: React 18 + Vite 6 + Tailwind CSS v4 + shadcn/ui (frontend), Fastify 5.3.2+ + tRPC v11 (backend), Drizzle ORM + PostgreSQL 16+, Redis Streams, Janus Gateway (WebRTC), Python VK-Agent (Gemini Live API)

> **🌐 PRODUCTION DEPLOYMENT** (2025-12-14):
> - **Server**: Hetzner VPS `178.156.151.139`
> - **Landing**: https://visualkit.live (Cloudflare Pages)
> - **Dashboard**: https://app.visualkit.live (Cloudflare Pages)
> - **Meeting**: https://meet.visualkit.live (Cloudflare Pages)
> - **API**: https://api.visualkit.live (Hetzner + Caddy)
> - **Agent**: https://agent.visualkit.live (VK-Agent API)
> - **Janus**: wss://janus.visualkit.live (WebRTC signaling)
> - **Support**: https://support.visualkit.live (Chatwoot)
> - **CDN**: https://cdn.visualkit.live (Widget SDK)
> - See `docs/operations/INFRASTRUCTURE.md` for complete details

> **🎨 UI/CSS DECISION**: Phase 4 Frontend Stack
> - **UI Library**: shadcn/ui (copy-paste component library, full customization)
> - **CSS Framework**: Tailwind CSS v4.1.14 (CSS-first configuration, 3.5x faster builds)
> - **Hybrid Installation**: `@tailwindcss/cli` (UI package) + `@tailwindcss/vite` (apps)
> - **Configuration**: CSS-only via `@theme` directive (no `tailwind.config.js`)
> - **Cross-Package Scanning**: `@source` directive for monorepo components
> - **Performance**: 100x faster incremental builds, <100ms hot reload
> - **Reference**: See `docs/reference/tailwind-v4-setup.md` for complete setup guide

> **🚨 SECURITY CRITICAL**: Before starting development, security patches required:
> - **Redis**: Upgrade to 7.4.2+ (or 7.2.7+) - 4 RCE vulnerabilities (CVSS 7.0-8.8)
> - **PostgreSQL**: Upgrade to 17.3/16.7/15.11/14.16/13.19 - SQL injection actively exploited
> - **Fastify**: Ensure 5.3.2+ - Content-type parsing bypass
> - **Timeline**: 7-day patch window from project start
>
> **🎙️ VOICE AI ARCHITECTURE** (Janus + Gemini):
>
> **WebRTC Stack**: Janus Gateway (self-hosted, free)
> - AudioBridge plugin for room-based audio mixing
> - Plain RTP participant mode for AI agent
> - WebSocket signaling at `wss://janus.visualkit.live`
>
> **AI Agent**: VK-Agent (Python, Gemini Live API)
> - Real-time bidirectional audio via RTP
> - Native Puck voice synthesis (sub-500ms latency)
> - Visual AI via screen frame upload (`/screen` endpoint)
> - API at `https://agent.visualkit.live`
>
> **Cost**: ~$0.40/1M tokens (vs $60K+/year for LiveKit Enterprise)
> - Gemini Live API: $0.075/1M input, $0.30/1M output
> - Self-hosted Janus: Free (open source)

> **📌 IMPORTANT: Multi-App Architecture** (DEPLOYED)
>
> **Production Apps** (Cloudflare Pages):
> - `apps/landing` → **https://visualkit.live** (Marketing, pricing)
> - `apps/dashboard` → **https://app.visualkit.live** (Tenant admin portal)
> - `apps/meeting` → **https://meet.visualkit.live** (Video meetings with AI)
> - `apps/widget-sdk` → **https://cdn.visualkit.live** (Embeddable widget)
>
> **Backend Services** (Hetzner VPS):
> - Platform API → **https://api.visualkit.live** (tRPC backend)
> - VK-Agent → **https://agent.visualkit.live** (Voice AI)
> - Janus Gateway → **wss://janus.visualkit.live** (WebRTC)
> - Chatwoot → **https://support.visualkit.live** (Support chat)
>
> See `docs/operations/INFRASTRUCTURE.md` for complete deployment details.

## Essential Commands

### Development Workflow

```bash
# Install dependencies (first time)
pnpm install

# Start all services (parallel)
pnpm dev

# Start individual apps/services
pnpm dev:landing      # Landing page (port 5173)
pnpm dev:dashboard    # Dashboard (port 5174)
pnpm dev:meeting      # Meeting rooms (port 5175)
pnpm dev:widget       # Widget SDK (port 5176)
pnpm dev:api          # API server (port 3001)
pnpm dev:realtime     # Realtime server (port 3002)

# Database management
pnpm db:up                             # Start PostgreSQL + Redis (Docker)
pnpm db:down                           # Stop databases
pnpm db:push                           # Push schema changes (Drizzle)
pnpm db:seed                           # Seed test data

# Code quality
pnpm typecheck                         # TypeScript validation (all packages)
pnpm lint                              # Biome linting/formatting
pnpm test                              # Run all tests
pnpm build                             # Build all packages
pnpm clean                             # Clean build artifacts
```

### VK-Agent (Voice AI - Janus + Gemini)

**Status**: ✅ Production deployed at `https://agent.visualkit.live`

**Architecture**: Janus Gateway + Gemini Live API
- **WebRTC**: Janus AudioBridge plugin for room-based audio
- **AI**: Gemini Live API (`gemini-2.0-flash-exp`) with native Puck voice
- **Audio**: Bidirectional RTP streaming (Opus codec, 48kHz)
- **Visual**: Screen frame upload via `/screen` API endpoint
- **Latency**: Sub-500ms voice response

**Cost**:
- **Gemini**: $0.075/1M input, $0.30/1M output tokens
- **Janus**: Free (self-hosted, open source)
- **Total**: ~$0.40/1M tokens vs $60K+/year for enterprise alternatives

**API Endpoints** (`https://agent.visualkit.live`):
- `GET /health` - Health check
- `GET /status` - Detailed bridge status
- `POST /text` - Send text prompt to Gemini
- `POST /screen` - Send screen frame (base64 JPEG) for visual AI
- `POST /mute` - Mute/unmute agent audio

**Local Development**:
```bash
cd services/vk-agent

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with GEMINI_API_KEY

# Run agent
python -m src.main
```

**Production Deployment**: Docker container on Hetzner VPS, connects to Janus via internal network.

## Architecture Highlights

### Monorepo Structure

**Turborepo orchestration** with dependency-aware builds and task caching. TypeScript strict mode throughout.

```
platform/
├── apps/
│   ├── landing/          # @platform/landing → visualkit.live
│   ├── dashboard/        # @platform/dashboard → app.visualkit.live
│   ├── meeting/          # @platform/meeting → meet.visualkit.live
│   └── widget-sdk/       # @platform/widget-sdk → cdn.visualkit.live
├── packages/
│   ├── api/              # @platform/api - Fastify + tRPC server
│   ├── realtime/         # @platform/realtime - WebSocket + Redis Streams
│   ├── db/               # @platform/db - Drizzle ORM schemas
│   ├── auth/             # @platform/auth - Auth.js authentication
│   ├── api-contract/     # @platform/api-contract - tRPC router definitions
│   ├── ai-core/          # @platform/ai-core - AI provider abstractions
│   ├── knowledge/        # @platform/knowledge - RAG system
│   └── shared/           # @platform/shared - Common utilities
└── services/
    ├── vk-agent/         # Python Voice AI (Janus + Gemini) → agent.visualkit.live
    └── vk-ice/           # ICE server utilities
```

### Key Architectural Patterns

**1. Type-Safe APIs with tRPC v11** (24 routers)
- Contract-first API design in `packages/api-contract`
- **Core**: health, auth, users, sessions, widgets, chat, knowledge, aiPersonalities, analytics
- **Security**: mfa, apiKeys
- **Engagement**: endUsers, verification, surveys, escalations, problems
- **Enterprise**: crm, ticketing, knowledgeSync, communication, qualityAssurance, enterpriseSecurity, crag
- **Integration**: chatwoot
- Zod schemas for runtime validation, context includes auth + tenant isolation

**2. Multi-Tenant Architecture**
- Tenant context derived from authenticated sessions
- Database row-level tenant isolation via `tenant_id`
- **⚠️ CRITICAL**: Drizzle ORM has NO automatic tenant filtering - catastrophic data leakage risk
- PostgreSQL Row-Level Security (RLS) with `FORCE ROW LEVEL SECURITY` required
- Tenant wrapper or Nile integration mandatory for all queries
- Janus room names encode tenant information

**3. Cost-Optimized AI Architecture**

**Voice AI - Gemini Live API** (via VK-Agent + Janus Gateway):
- **Model**: `gemini-2.0-flash-live-001` with native voice
- **Input**: $0.075/1M tokens
- **Output**: $0.30/1M tokens
- **Video**: ~$0.50/hour for screen sharing (1 FPS)
- **Audio**: Native streaming (no separate STT/TTS costs)
- **Latency**: Sub-500ms (vs 2-5s with manual pipeline)

**Dashboard Chat API Two-Tier Routing**:
- **GPT-4o-mini**: Simple queries (70%, $0.15/1M tokens)
- **GPT-4o**: Complex queries (30%, $5.00/1M tokens)
- **Result**: 75% cost reduction for text

**4. Real-time Communication Stack**
- **WebSocket**: Bidirectional chat messages via `packages/realtime`
- **Redis Streams**: Multi-instance message broadcasting with consumer groups
- **Janus Gateway**: WebRTC video/audio via AudioBridge plugin
- **VK-Agent**: Python bridge between Janus (RTP) and Gemini Live API
- **Visual AI**: Screen frames sent to Gemini via `/screen` endpoint

**5. Knowledge Enhancement (RAG)**
- Voyage Multimodal-3 embeddings
- Hybrid retrieval (semantic + keyword + rerank)
- Document processing in `packages/knowledge`
- Backend integration via tRPC APIs

### Database Architecture (Drizzle ORM)

**PostgreSQL 16+** (minimum 17.3/16.7/15.11) with Drizzle ORM.

**Status**: ✅ All 12 Phases COMPLETE - 50 tables across 8 schema files with 76+ RLS policies

**Schema Files** (`packages/db/src/schema/`):

| File | Tables | Domain |
|------|--------|--------|
| `index.ts` | 19 | Core platform (tenants, users, auth, widgets, meetings, sessions, messages, chatFiles, knowledge, costs, AI config, API keys, audit, GDPR) |
| `phase10.ts` | 3 | AI optimization (rerankingEvents, knowledgeGaps, conversationMemory) |
| `end-user-engagement.ts` | 5 | Engagement (endUsers, surveyResponses, unresolvedProblems, unresolvedProblemUsers, escalations) |
| `rag-evaluation.ts` | 4 | RAG quality (ragEvaluationRuns, ragEvaluations, ragTestSets, ragQualityThresholds) |
| `crm-integrations.ts` | 5 | CRM (crmConnections, crmFieldMappings, crmSyncState, crmSyncLogs, crmWebhooks) |
| `quality-assurance.ts` | 3 | QA (qaReviews, qaMetrics, hallucinationDetections) |
| `enterprise-security.ts` | 6 | Security (ssoConfigurations, customRoles, userRoleAssignments, securityEvents, activeSessions, trustedDevices) |
| `crag.ts` | 5 | CRAG (cragEvaluations, queryRefinements, reasoningSteps, cragResponses, cragMetrics) |

**Security**: 76+ RLS policies enforced with FORCE RLS (Migration 008), helper function `get_current_tenant_id()`

**Migrations**: 13 completed migrations including RLS policies, Auth.js alignment, performance indexes (Migration 010)

**Connection Pooling**: Optimized for production load - 50 max connections, PgBouncer compatible, 3600s lifecycle

**Security Enhancements** (Post-Phase 11):
- ✅ SQL injection eliminated (parameterized queries)
- ✅ CSRF protection (264-line middleware, token validation)
- ✅ Session fixation fix (8hr lifetime, crypto.randomUUID tokens, rotation utilities)
- ✅ Environment validation (212-line Zod schema, fail-fast)
- ✅ 30+ critical indexes (80-95% query time reduction)
- ✅ Redis session caching (85% latency reduction)
- ✅ Brotli/gzip compression (60-70% size reduction)
- ✅ Helmet.js security headers (11 headers: CSP, HSTS, X-Frame-Options, etc.)
- ✅ tRPC rate limiting (175-line middleware, tier-based limits)

### Authentication (Auth.js)

**Auth.js (NextAuth.js)** - Industry standard, SOC 2 certified, 3.8M weekly downloads

- Session-based auth with secure cookies
- OAuth providers: Google, Microsoft (minimum)
- Drizzle adapter for session storage (`auth-sessions` table)
- PKCE flow for security hardening
- Integration in `packages/auth`

**Why Auth.js**: Lucia v4 deprecated March 2025, converted to "learning resource only" with no npm package

## Implementation Roadmap

**Follow `docs/guides/roadmap.md` for sequential implementation phases:**

**Timeline**: 12/12 phases complete. Phase 12 enterprise features code-complete, pending validation.

**MVP Foundation** (Phases 1-8):
1. ✅ **Phase 1**: Project scaffolding (Turborepo + pnpm workspaces)
2. ✅ **Phase 2**: Database + Auth + Security (596-line schema, 13 migrations, 76+ RLS policies, Auth.js)
3. ✅ **Phase 3**: Backend APIs (24 tRPC routers, Fastify + tRPC v11, rate limiting, CORS)
4. ✅ **Phase 4**: Frontend Apps (4 apps: landing, dashboard, meeting, widget-sdk)
5. ✅ **Phase 5**: AI Integration (75-85% cost reduction, VK-Agent + Gemini, RAG)
6. ✅ **Phase 6**: Real-time Features (WebSocket + Redis Streams bidirectional chat)
7. ✅ **Phase 7**: Widget SDK (NPM package, Shadow DOM, 52-86KB gzipped, Lighthouse 98/100)
8. ✅ **Phase 8**: Production Security (Argon2id, TOTP MFA, API keys, audit logs, GDPR)

**Security Audit Remediation** (Post-Phase 11):
- ✅ **Week 1**: Critical Remediation (10/10 fixes)
  - SQL injection fix (CVSS 9.8), CSRF protection, session fixation fix, environment validation
  - Performance: connection pooling, 30+ indexes, compression, Redis caching
- ✅ **Week 2**: Security Enhancements (2/2 fixes)
  - Helmet.js (11 security headers), tRPC rate limiting
- ✅ **Security Score**: 95/100 → 99/100 (+4 points)
- ✅ **Vulnerabilities**: Critical 1→0, High 7→0

**Enterprise Features** (Phases 10-12):
10. ✅ **Phase 10**: AI Optimization (Cohere reranking 20-40% improvement, Anthropic caching 87% savings, DBSCAN clustering, LlamaIndex memory, RAGAS evaluation - 1,096 LOC)
11. ✅ **Phase 11**: End-User Engagement (5 tables, 6 routers, 1,173 LOC: identity management, multi-tier surveys, semantic problem deduplication, human escalations, abuse prevention, GDPR compliance)
12. ✅ **Phase 12**: Hybrid RAG + Enterprise AI (code-complete: RRF, BM25, small2big, RAGAS evaluation, CRM integrations, ticketing, knowledge sync, communication, quality assurance, enterprise security, CRAG - 24 routers active, 50 tables. Enterprise features unvalidated.)

**Current Focus**: Documentation accuracy rebuild, production hardening, enterprise feature validation

**Validation after each phase**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## 🚨 CRITICAL: Static Version Pinning

**MANDATORY RULE**: All dependencies MUST use exact versions (no `^` or `~` ranges).

### Why Static Versions?

1. **Deterministic Builds**: Same code produces identical builds across all environments
2. **No Surprise Breaking Changes**: Prevent unexpected issues from automatic minor/patch updates
3. **Reproducible Deployments**: CI/CD produces consistent results
4. **Easier Debugging**: Know exactly which dependency versions are in use
5. **Security Control**: Explicit control over when security patches are applied

### Examples

```json
// ✅ CORRECT - Static versions
{
  "dependencies": {
    "react": "18.3.1",
    "typescript": "5.7.2",
    "@trpc/server": "11.0.0"
  }
}

// ❌ WRONG - Version ranges
{
  "dependencies": {
    "react": "^18.3.1",           // NO! Allows 18.x.x updates
    "typescript": "~5.7.2",       // NO! Allows 5.7.x updates
    "@trpc/server": "^11.0.0"     // NO! Allows 11.x.x updates
  }
}
```

### Updating Dependencies

When updating dependencies:

1. **Research**: Check changelog and breaking changes
2. **Update Explicitly**: Change version number directly in package.json
3. **Test Thoroughly**: Run `pnpm typecheck && pnpm lint && pnpm build && pnpm test`
4. **Document**: Note version changes in commit message

```bash
# Update a specific dependency
# 1. Edit package.json manually to new version
# 2. Install
pnpm install

# 3. Validate
pnpm typecheck && pnpm build

# 4. Commit with context
git commit -m "chore(deps): update react 18.3.1 -> 18.3.2

- Fixes XYZ issue
- See changelog: https://..."
```

### Validation

Before any commit:
```bash
# Ensure no version ranges exist
grep -r "[\^~]" package.json apps/*/package.json packages/*/package.json
# Should return no results
```

---

## 🚨 Git Commit Rules

**CRITICAL**: Never include Claude Code attribution in commit messages.

- ❌ DO NOT add: "🤖 Generated with [Claude Code]..."
- ❌ DO NOT add: "Co-Authored-By: Claude <noreply@anthropic.com>"
- ✅ Use clean, professional commit messages only
- ✅ Focus on what changed and why

---

## Phase Transition Workflow

**CRITICAL WORKFLOW**: When user requests "update all docs and get ready for next phase":

### Automated Phase Completion Process

1. **Create Phase Implementation Doc**: `docs/phases/phase-N-implementation.md`
   - Comprehensive documentation (10-25KB)
   - All achievements, testing results, known issues
   - Validation results and lessons learned

2. **Create Phase Readiness Doc**: `docs/adr/PHASE_(N+1)_READINESS.md`
   - **SUPER COMPLETE** implementation guide (15-30KB)
   - Week-by-week detailed objectives with checkboxes
   - Complete code templates and examples
   - Pre-phase setup instructions
   - Success criteria for each week
   - Critical path dependencies
   - Blocker workarounds and troubleshooting

3. **Update Project Documentation**:
   - `README.md`: Status, dates, quick start
   - `docs/guides/roadmap.md`: Phase achievements
   - `docs/adr/README.md`: Navigation
   - `docs/README.md`: Documentation index

4. **Commit Strategy**:
   - Commit: phase-N-implementation.md, README updates, all package changes
   - **DO NOT COMMIT**: PHASE_N_READINESS.md (working document)
   - Rationale: Readiness doc is replaced with phase-N+1-implementation.md when phase completes

**Full Workflow Details**: See `docs/phases/WORKFLOW.md`

## Important Development Notes

### Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database connection strings (PostgreSQL, Redis)
- AI provider API keys (OpenAI, Anthropic, Google, Deepgram, ElevenLabs, Voyage)
- Session secrets (32+ characters)

**Never commit `.env` or hardcode secrets.**

### Package Dependencies

Each package defines dependencies in its own `package.json`:
- Use `@platform/*` for internal packages
- Shared dependencies in root `package.json` (TypeScript, Biome, Turbo)
- Frontend apps use Vite 6 + React 18
- Backend uses Fastify 5.3.2+ + tRPC v11

**Minimum Versions** (security patches):
- **Redis**: 7.4.2+ (or 7.2.7+ for older major version)
- **PostgreSQL**: 17.3 / 16.7 / 15.11 / 14.16 / 13.19
- **Fastify**: 5.3.2+
- **Auth.js**: Latest stable version

### Build Order

Turborepo handles build dependencies automatically. Key patterns:
- `turbo.json` defines task dependencies
- `dependsOn: ["^build"]` ensures dependencies build first
- Incremental builds with smart caching
- `pnpm build` builds everything in correct order

### Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit any
- **Biome**: Single tool for linting + formatting
- **Module Resolution**: ESNext with `bundler` mode
- **Imports**: Use package aliases (`@platform/*`)
- **File Size**: Keep modules under 500 lines

### Voice AI Integration (VK-Agent - DEPLOYED)

**Implementation Status**: ✅ Production deployed at `https://agent.visualkit.live`

**Architecture**: Janus Gateway + Gemini Live API (NO LiveKit required)
- **Cost**: ~$0.40/1M tokens (vs $60K+/year for LiveKit Enterprise)
- **WebRTC**: Self-hosted Janus Gateway (free, open source)
- **AI**: Google Gemini Live API with native voice synthesis

**Components**:
1. **Janus Gateway** (`janus.visualkit.live`):
   - AudioBridge plugin for room-based audio
   - WebSocket signaling for browsers
   - RTP audio transport to VK-Agent

2. **VK-Agent** (`agent.visualkit.live`):
   - Python async bridge (Janus ↔ Gemini)
   - Opus codec encoding/decoding
   - PCM resampling (48kHz ↔ 16kHz/24kHz)
   - Visual AI via `/screen` endpoint

3. **Frontend Integration**:
   - Janus.js library for WebRTC
   - Screen capture → base64 JPEG → `/screen` API
   - Chat UI for text interaction

**Source Code**: `services/vk-agent/`
**Infrastructure Docs**: `docs/operations/INFRASTRUCTURE.md`

## Common Workflows

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/my-package/src

# Create package.json
cat > packages/my-package/package.json << 'EOF'
{
  "name": "@platform/my-package",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "biome check --write .",
    "clean": "rm -rf dist node_modules .turbo"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.7.2"
  }
}
EOF

# Create tsconfig.json extending base
cat > packages/my-package/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
EOF

# Create entry point
echo "export {}" > packages/my-package/src/index.ts

# Install and verify
pnpm install
pnpm typecheck
```

### Adding a tRPC Router

1. Define router in `packages/api-contract/src/routers/my-router.ts`
2. Export from `packages/api-contract/src/router.ts`
3. Use in API server `packages/api/src/server.ts`
4. Import types in frontend `apps/web/src/utils/trpc.ts`

### Database Schema Changes

```bash
# 1. Edit schema files in packages/db/src/schema/
# 2. Push changes to database
pnpm db:push

# 3. Verify migration
psql $DATABASE_URL -c "\d table_name"

# 4. Update seed data if needed
# Edit packages/db/src/seed.ts
pnpm db:seed
```

## Documentation

Comprehensive guides in `docs/`:
- `getting-started/` - Overview, setup instructions
- `architecture/` - System design documents
- `guides/` - Implementation roadmap, patterns
- `reference/` - API specs, database schema
- `operations/` - Deployment, observability

**Key Documents**:
- `docs/guides/roadmap.md` - Implementation phases
- `docs/reference/api.md` - tRPC API specifications (24 routers)
- `docs/reference/database.md` - Database schema (50 tables)
- `docs/operations/INFRASTRUCTURE.md` - Production deployment (Hetzner + Cloudflare)
- `docs/operations/PRODUCTION_READINESS.md` - Production readiness checklist
