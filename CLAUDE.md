# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Enterprise AI Assistant Platform** - Multi-modal real-time AI interaction system with cost-optimized provider architecture (75-85% cost reduction validated). Built as a Turborepo monorepo with pnpm workspaces, focusing on type safety and enterprise-grade quality.

**Current Status**: All 8 Phases Complete - Production Ready (95/100 security score)

**Tech Stack**: React 18 + Vite 6 + Tailwind CSS v4 + shadcn/ui (frontend), Fastify 5.3.2+ + tRPC v11 (backend), Drizzle ORM + PostgreSQL 16+, Redis Streams, LiveKit (WebRTC), Python LiveKit agent

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
> **💰 LiveKit DEPLOYMENT OPTIONS**:
>
> **Option 1: Self-Hosted (RECOMMENDED - 95-97% cost savings)**
> - Docker Compose setup with livekit-server + Redis
> - Cloud deployment: AWS EC2, Kubernetes (EKS/GKE/AKS), DigitalOcean, Hetzner
> - Cost: $130-500/month (~$1.6K-6K/year) vs Enterprise $60K-120K+/year
> - Full feature parity with Enterprise
> - See Phase 5 Week 2 implementation doc for setup guide
>
> **Option 2: LiveKit Enterprise (Premium)**
> - Managed service with guaranteed uptime and support
> - $5K-10K+/month minimum ($60K-120K+/year)
> - Required for 40-100 worker pool (4 cores + 8GB RAM each)
> - Turnkey solution with no infrastructure management
>
> **Decision**: Self-hosted option implemented in Phase 5 Week 2

> **📌 IMPORTANT: Multi-App Architecture**
>
> **Phase 1 (Current State)** - 4 app placeholders:
> - `apps/landing` - Public marketing (port 5173) → **www.platform.com**
> - `apps/dashboard` - Admin portal (port 5174) → **dashboard.platform.com**
> - `apps/meeting` - Meeting rooms (port 5175) → **meet.platform.com**
> - `apps/widget-sdk` - Embeddable widget (port 5176) → Customer websites
> - `packages/ui` - Shared components across all apps
> - All apps/packages contain placeholder implementations only
>
> **Implementation Strategy** (Phases 2-7):
> - **Landing**: Public marketing, signup, pricing (Next.js or Astro - TBD)
> - **Dashboard**: Knowledge uploads, RAG config, team management, analytics
> - **Meeting**: LiveKit integration, real-time chat, AI assistant interface
> - **Widget**: NPM package + CDN, minimal bundle, Shadow DOM isolation
>
> Follow `docs/guides/roadmap.md` for phased implementation. Each app is independently deployable.

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

### Python LiveKit Agent (Phase 5 - COMPLETE)

**Status**: ✅ Production implementation complete (1000+ lines)

**Three-Tier AI Routing**:
- Gemini Flash-Lite 8B (60%) + Gemini Flash (25%) + Claude Sonnet 4.5 (15%)
- Complexity scoring: 0-18 points (length, keywords, questions, code, data)
- 85% cost reduction vs baseline

**Frame Deduplication**:
- Perceptual hashing (pHash) with threshold=10
- Adaptive FPS: 30 FPS active → 5 FPS idle
- 60-75% frame reduction

**VisionAwareAgent Pattern**:
- Extends LiveKit voice.Agent
- Overrides llm_node() and tts_node() for vision context injection
- Adds vision items to existing chat_ctx (critical pattern)

```bash
cd livekit-agent

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with LiveKit and AI provider credentials

# Run agent
python agent.py
```

**Implementation Guide**: See `livekit-agent/README.md` (2365 lines) for complete production documentation

## Architecture Highlights

### Monorepo Structure

**Turborepo orchestration** with dependency-aware builds and task caching. TypeScript strict mode throughout.

```
platform/
├── apps/
│   ├── landing/          # @platform/landing - Public marketing (www)
│   ├── dashboard/        # @platform/dashboard - Admin portal
│   ├── meeting/          # @platform/meeting - Meeting rooms
│   └── widget-sdk/       # @platform/widget-sdk - Embeddable widget
├── packages/
│   ├── api/              # @platform/api - Fastify + tRPC server
│   ├── realtime/         # @platform/realtime - WebSocket + Redis Streams
│   ├── db/               # @platform/db - Drizzle ORM schemas
│   ├── auth/             # @platform/auth - Auth.js (NextAuth.js) authentication
│   ├── api-contract/     # @platform/api-contract - tRPC router definitions
│   ├── ai-core/          # @platform/ai-core - AI provider abstractions
│   ├── knowledge/        # @platform/knowledge - RAG system
│   └── shared/           # @platform/shared - Common utilities
└── livekit-agent/        # Python LiveKit agent (Phase 5 - pending implementation)
```

### Key Architectural Patterns

**1. Type-Safe APIs with tRPC v11**
- Contract-first API design in `packages/api-contract`
- Shared type definitions between frontend and backend
- Zod schemas for runtime validation
- Context includes auth + tenant isolation

**2. Multi-Tenant Architecture**
- Tenant context derived from authenticated sessions
- Database row-level tenant isolation via `tenant_id`
- **⚠️ CRITICAL**: Drizzle ORM has NO automatic tenant filtering - catastrophic data leakage risk
- PostgreSQL Row-Level Security (RLS) with `FORCE ROW LEVEL SECURITY` required
- Tenant wrapper or Nile integration mandatory for all queries
- LiveKit room names encode tenant information

**3. Cost-Optimized AI Routing (82-85% Combined Reduction)**

**LiveKit Agent Three-Tier Routing**:
- **Gemini Flash-Lite 8B**: Simple queries (60%, $0.075/1M tokens)
- **Gemini Flash**: Moderate complexity (25%, $0.20/1M tokens)
- **Claude Sonnet 4.5**: Complex reasoning (15%, $3.00/1M tokens)
- **Complexity Scoring**: 0-18 point algorithm (length, keywords, questions, code, data)
- **Result**: 85% cost reduction for vision

**Dashboard Chat API Two-Tier Routing**:
- **GPT-4o-mini**: Simple queries (70%, $0.15/1M tokens)
- **GPT-4o**: Complex queries (30%, $5.00/1M tokens)
- **Result**: 75% cost reduction for text

**Frame Deduplication**:
- **pHash Algorithm**: Perceptual hashing with Hamming distance threshold=10
- **Adaptive FPS**: 30 FPS active → 5 FPS idle
- **Result**: 60-75% frame reduction

**Combined Savings**: ~$1.1M/year at 1K users (82-85% total reduction)

**4. Real-time Communication Stack**
- **WebSocket**: Bidirectional chat messages via `packages/realtime`
- **Redis Streams**: Multi-instance message broadcasting with consumer groups
- **Sticky Sessions**: Load balancer configuration for WebSocket persistence
- **LiveKit**: WebRTC video/audio/screen sharing
- **Python Agent**: Multi-modal AI processing (voice, vision, text)

**5. Knowledge Enhancement (RAG)**
- Voyage Multimodal-3 embeddings
- Hybrid retrieval (semantic + keyword + rerank)
- Document processing in `packages/knowledge`
- Backend integration via tRPC APIs

### Database Architecture (Drizzle ORM)

**PostgreSQL 16+** (minimum 17.3/16.7/15.11) with Drizzle ORM.

**Status**: ✅ Phase 2 COMPLETE - All 15 tables implemented with RLS policies (596 lines)

**Implemented Schema** (`packages/db/src/schema/index.ts` - 596 lines):
- **Core Tables** (6): `tenants`, `users`, `widgets`, `meetings`, `sessions`, `messages`
- **Auth.js Tables** (3): `accounts`, `auth_sessions`, `verification_tokens` (Migration 007)
- **Knowledge Base** (2): `knowledge_documents`, `knowledge_chunks` (pgvector 1024-dim embeddings)
- **Cost Tracking** (3): `cost_events`, `cost_summaries`, `budget_alerts`
- **AI Config** (1): `ai_personalities`
- **Phase 8 Security** (3): `api_keys`, `audit_logs`, `data_requests` (GDPR compliance)

**Security**: 56 RLS policies enforced with FORCE RLS (Migration 008), helper function `get_current_tenant_id()`

**Migrations**: 8 completed migrations including RLS policies, Auth.js alignment, performance indexes

**Connection Pooling**: PgBouncer configured for 50-100 connections with multi-tenant session management

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

**Timeline**: All 8 phases complete (including Phase 8 security audit)

1. ✅ **Phase 1**: Project scaffolding (Turborepo + pnpm workspaces)
2. ✅ **Phase 2**: Database + Auth + Security (596-line schema, 8 migrations, 56 RLS policies, Auth.js)
3. ✅ **Phase 3**: Backend APIs (5 tRPC routers, Fastify + tRPC v11, rate limiting, CORS)
4. ✅ **Phase 4**: Frontend Apps (4 apps: landing, dashboard, meeting, widget-sdk)
5. ✅ **Phase 5**: AI Integration + LiveKit (75-85% cost reduction, Python agent 1000+ lines, RAG)
6. ✅ **Phase 6**: Real-time Features (WebSocket + Redis Streams bidirectional chat)
7. ✅ **Phase 7**: Widget SDK (NPM package, Shadow DOM, 52-86KB gzipped, Lighthouse 98/100)
8. ✅ **Phase 8**: Production Security (Argon2id, TOTP MFA, API keys, audit logs, GDPR, 95/100 score)

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

1. **Create Phase Implementation Doc**: `docs/implementation/phase-N-implementation.md`
   - Comprehensive documentation (10-25KB)
   - All achievements, testing results, known issues
   - Validation results and lessons learned

2. **Create Phase Readiness Doc**: `docs/implementation/PHASE_(N+1)_READINESS.md`
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
   - `docs/implementation/README.md`: Navigation
   - `docs/README.md`: Documentation index

4. **Commit Strategy**:
   - Commit: phase-N-implementation.md, README updates, all package changes
   - **DO NOT COMMIT**: PHASE_N_READINESS.md (working document)
   - Rationale: Readiness doc is replaced with phase-N+1-implementation.md when phase completes

**Full Workflow Details**: See `docs/implementation/WORKFLOW.md`

## Important Development Notes

### Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database connection strings (PostgreSQL, Redis)
- AI provider API keys (OpenAI, Anthropic, Google, Deepgram, ElevenLabs, Voyage)
- LiveKit Cloud credentials
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

### LiveKit Agent Integration (Phase 5 - Pending)

**Implementation Status**: Not yet implemented (planned for Weeks 11-13)

**💰 BUDGET REQUIREMENT**: LiveKit Enterprise plan mandatory
- **Minimum Cost**: $5K-10K+/month ($60K-120K+/year)
- **Infrastructure**: 40-100 worker pool (4 cores + 8GB RAM each)
- **Why Required**: Build/Scale plans have cold starts, limited agents (production insufficient)
- **Budget Approval**: Required BEFORE Phase 5 implementation

**Implementation Guide**: See `docs/reference/livekit-agent-implementation.md` for production implementation plan

**Reference Implementation**: See `docs/reference/livekit-agent/` for playground/experimental code that serves as reference

The production Python agent will integrate with the TypeScript backend:

1. **Backend Integration**:
   - Fetch tenant context from tRPC API
   - Track usage to `costEvents` table
   - Query knowledge base via RAG endpoints

2. **LiveKit Agent Features**:
   - 1 FPS screen capture (96% cost reduction vs 30 FPS)
   - Multi-modal AI (voice, vision, text)
   - Temporal frame context for vision analysis

3. **Requirements** (when implemented):
   - Python 3.11+ virtual environment
   - Backend API running
   - LiveKit Cloud Enterprise credentials
   - Budget approval confirmation

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
- `docs/reference/api.md` - tRPC API specifications
- `docs/reference/database.md` - Database schema
- `docs/reference/livekit-agent-implementation.md` - LiveKit agent implementation guide
- `docs/reference/livekit-agent/` - Reference implementation code
