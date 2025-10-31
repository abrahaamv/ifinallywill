# AI Assistant Platform

> Enterprise-grade real-time AI interaction system with multi-modal capabilities, cost-optimized provider architecture, and comprehensive knowledge management.

**Status**: ~95% Complete - Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-01-10

> **✅ VERIFIED**: 56 RLS policies active (FORCE RLS enabled), tenant isolation working, all routers complete, Phase 8 security complete
> **📊 DATABASE**: 18 tables (596 lines schema), 9 migrations completed, 56 RLS policies enforced
> **📋 CURRENT STATUS**: See `docs/CURRENT_STATUS.md` for comprehensive evidence-based assessment
> **🎯 REMAINING**: End-to-end LiveKit agent testing (2-3 hours)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: ≥20.0.0
- **pnpm**: ≥9.0.0
- **Python**: ≥3.11
- **Docker**: Latest (for local databases)
- **PostgreSQL**: 16+ (via Docker)
- **Redis**: Latest (via Docker)

### Installation

```bash
# 1. Install Node.js dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# 3. Configure LiveKit agent (Python)
cd livekit-agent
cp .env.example .env
# Edit .env with LiveKit and AI provider credentials
cd ..

# 4. Start local databases
pnpm db:up

# 5. Start ALL services (including Python agent)
pnpm dev
```

### Quick Commands

- **`pnpm dev`** - Start ALL services + Python LiveKit agent ✨ **Recommended for testing**
- **`pnpm dev:all`** - Start Node.js services only (without Python agent)
- **`pnpm dev:api`** - Start API server only (port 3001)
- **`pnpm dev:dashboard`** - Start dashboard app (port 5174)
- **`pnpm dev:meeting`** - Start meeting app (port 5175)
- **`pnpm dev:widget`** - Start widget SDK development (port 5176)
- **`pnpm dev:agent`** - Start Python LiveKit agent only
- **`pnpm build`** - Build all packages for production
- **`pnpm typecheck`** - Run TypeScript type checking
- **`pnpm lint`** - Run Biome linting and formatting

### Accessing the Platform

- **Landing**: http://localhost:5173 - Public marketing site with 5 pages
- **Dashboard**: http://localhost:5174 - Admin portal with AI + real-time chat
- **Meeting**: http://localhost:5175 - Meeting rooms with video grid and chat
- **Widget SDK**: http://localhost:5176 - Embeddable chat widget with demo
- **API Server**: http://localhost:3001 (Phase 3 complete)
- **Real-time Server**: http://localhost:3002 (Phase 6 complete)

### Testing the Full System

**Complete Testing (All Services + Agent):**
```bash
# Start databases
pnpm db:up

# Start all services + Python LiveKit agent
pnpm dev
```

Then open:
- **Meeting Room**: http://localhost:5175 - Create/join meeting with AI agent
- **Dashboard**: http://localhost:5174 - Test AI chat with RAG
- **Landing**: http://localhost:5173 - Public marketing site

> **📌 Multi-App Architecture**
>
> **All 8 Phases Complete**: Production-ready platform with comprehensive features
> - `apps/landing` (366 KB) - 5 pages: Home, Pricing, Features, About, Contact
> - `apps/dashboard` (410 KB) - AI chat + Real-time WebSocket chat with dual-mode interface
> - `apps/meeting` (346 KB) - Complete LiveKit integration with video grid and screen sharing
> - `apps/widget-sdk` (52-86 KB gzipped) - NPM package with Shadow DOM, dual exports (ESM/UMM)
> - `packages/api` - tRPC v11 backend with AI routing (75-85% cost reduction)
> - `packages/auth` - Auth.js + Argon2id + TOTP MFA + API keys (browser-safe client exports)
> - `packages/realtime` - WebSocket server + Redis Streams (450 lines)
> - `livekit-agent` - Python multi-modal agent (1000+ lines: vision + voice + text + RAG integration)
>
> **Shared Components**: `packages/ui` with 16 components (Radix UI + shadcn/ui)
>
> **Security Features**: Auth.js OAuth, Argon2id passwords, TOTP MFA, PostgreSQL RLS (FORCE enabled on 18 tables), Redis rate limiting, API key auth, CSRF protection
>
> **PostgreSQL RLS**: ✅ COMPLETE - FORCE RLS enabled, 56 policies active, production-ready tenant isolation
>
> **Browser Compatibility**: ✅ COMPLETE - Node.js polyfills (Buffer, process, perf_hooks), browser-safe exports
>
> See `docs/adr/` for complete implementation details (Phases 1-8).

---

## 📁 Project Structure

```
platform/
├── apps/
│   ├── landing/            # Public marketing site (www.platform.com)
│   ├── dashboard/          # Admin portal (dashboard.platform.com)
│   ├── meeting/            # Meeting rooms (meet.platform.com)
│   └── widget-sdk/         # Embeddable widget (customer websites)
├── packages/
│   ├── ui/                 # Shared UI components (used by all apps)
│   ├── api/                # Fastify + tRPC API server
│   ├── realtime/           # WebSocket + Redis Streams for real-time chat
│   ├── shared/             # Shared types and utilities
│   ├── db/                 # Drizzle ORM schemas and migrations
│   ├── auth/               # Auth.js (NextAuth.js) authentication
│   ├── api-contract/       # tRPC router definitions
│   ├── ai-core/            # AI service abstractions
│   └── knowledge/          # Knowledge management system
├── livekit-agent/          # Python LiveKit agent (1000+ lines: multi-modal AI with cost optimization)
├── infrastructure/         # Production deployment infrastructure (Phase 9)
│   ├── staging/            # Staging deployment scripts and configuration
│   ├── production/         # Production deployment scripts and configuration
│   └── docker/             # Docker compose for local development
├── docs/
│   ├── implementation/     # Development history (Phases 1-9)
│   ├── operations/         # Operational runbooks and deployment guides
│   ├── guides/             # User guides and tutorials
│   └── reference/          # API specs and technical references
├── .github/workflows/      # CI/CD pipelines (test, staging, production)
├── package.json            # Root workspace configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
├── turbo.json              # Turborepo build orchestration
├── tsconfig.json           # TypeScript base configuration
└── biome.json              # Biome linting and formatting
```

---

## 🚢 Deployment

### Production Deployment (Phase 9 Complete)

**Platform**: Google Cloud Platform (GCP)
**Architecture**: Hybrid Docker (Cloud Run + GCE + Managed Services)
**Cost**: $225-280/month (staging), $650-900/month (production with CUDs)

#### Quick Deploy

```bash
# Staging deployment
cd infrastructure/staging
cp .env.example .env
# Edit .env with your GCP credentials and API keys
./deploy.sh

# Production deployment
cd infrastructure/production
cp .env.example .env
# Edit .env with production credentials
./deploy.sh
```

#### Documentation

- **Deployment Guides**: [`/infrastructure/README.md`](infrastructure/README.md)
- **Staging Guide**: [`/docs/operations/deployment/staging.md`](docs/operations/deployment/staging.md)
- **Production Guide**: [`/docs/operations/deployment/production.md`](docs/operations/deployment/production.md)
- **LiveKit Self-Hosting**: [`/docs/operations/deployment/livekit-deployment.md`](docs/operations/deployment/livekit-deployment.md)
- **Troubleshooting**: [`/docs/operations/troubleshooting.md`](docs/operations/troubleshooting.md)
- **Cost Optimization**: [`/docs/operations/cost-optimization.md`](docs/operations/cost-optimization.md)

#### Architecture Highlights

```
Stateless Services (Cloud Run):
  - API Server (auto-scaling 0-10 instances)
  - WebSocket Server (min 1 instance for persistent connections)
  - Python Agent (auto-scaling 1-5 instances)

Stateful Services (GCE + Docker):
  - LiveKit Server (self-hosted, 95-97% cost savings)

Managed Services:
  - Cloud SQL PostgreSQL 16
  - MemoryStore Redis 7.4
  - Cloud Storage + CDN (frontend)
```

**Key Benefits**:
- ✅ 95-97% cost savings on LiveKit ($58K-118K/year)
- ✅ No egress costs for Gemini API (85% of AI requests)
- ✅ One-command deployment automation
- ✅ Canary deployments with automatic rollback
- ✅ Complete CI/CD with GitHub Actions

#### CI/CD Pipelines

GitHub Actions workflows (`.github/workflows/`):
- **test.yml** - Automated testing (runs on every PR)
- **deploy-staging.yml** - Staging deployment (push to main)
- **deploy-production.yml** - Production deployment (releases with canary strategy)

---

## 🎯 Key Features

### Cost-Optimized AI Architecture

**82-85% cost reduction** through three-tier AI escalation + frame deduplication (Phase 5 complete):

- **Vision** (LiveKit Agent): Attempt-based escalation (60% @ $0.06, 25% @ $0.08, 15% @ $0.40) → 85% cost reduction
  - **Philosophy**: "Upgrade the brain, not the eyes" - pHash maintained across all attempts
  - **Worst-case**: All 3 attempts = $0.54/resolution (under $0.70 overage)
- **LLM** (Dashboard Chat API): GPT-4o-mini (70%) + GPT-4o (30%) → 75% cost reduction
- **Frame Deduplication**: pHash algorithm with 1 FPS → 60-75% frame reduction
- **LiveKit**: Self-hosted option (95-97% savings: $1.6K-6K/year vs $60K-120K+/year Enterprise)
- **Combined Savings**: ~$1.1M/year at 1K users, scales linearly

### Enterprise-Grade Infrastructure

- **Backend**: Fastify 5.3.2+ + tRPC v11 for type-safe APIs
- **Database**: PostgreSQL 16.7+ + Drizzle ORM (18 tables, 9 migrations, 56 RLS policies) + Redis 7.4.2+
- **Real-time**: WebSocket + Redis Streams for chat, LiveKit Cloud for WebRTC
- **Auth**: Auth.js (NextAuth.js) v5 with OAuth providers
- **Build**: Turborepo monorepo with pnpm workspace

### Advanced AI Capabilities

- **Multi-modal Interaction**: Voice, vision, and text in real-time (Phase 5 complete)
- **Screen Analysis**: Real-time analysis at 1 FPS (Python LiveKit agent)
- **Knowledge Enhancement**: Production RAG system with hybrid retrieval (semantic + keyword + smart fallback) + voyage-2 embeddings (Phase 5 complete)
- **Attempt-based Escalation**: Smart retry-driven model selection for cost optimization (Phase 5 complete)
- **Real-time Chat**: WebSocket bidirectional chat with Redis Streams (Phase 6 complete)
- **Dual-Mode Interface**: AI chat + Real-time chat in single dashboard (Phase 6 complete)

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + Vite 6
- **Language**: TypeScript 5.7 (strict mode)
- **UI**: TailwindCSS + shadcn/ui components
- **State**: React hooks + context
- **Build**: Vite with SWC transpilation

### Backend
- **API Framework**: Fastify 5.3.2+
- **Type Safety**: tRPC v11 with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL 16.7+
- **Real-time**: WebSocket + Redis Streams (bidirectional)
- **Caching**: Redis 7.4.2+ for sessions and consumer groups
- **Auth**: Auth.js (NextAuth.js) v5.0.0-beta.25

### AI Services

**Three-Tier AI Escalation** (LiveKit Agent - 82-85% cost reduction):
- **Vision** (Attempt-Based Escalation):
  - **Attempt 1** (60% of resolutions): Google Gemini Flash-Lite 8B + pHash → $0.06/resolution
  - **Attempt 2** (25% of resolutions): Google Gemini Flash + pHash → $0.08/resolution
  - **Attempt 3** (15% of resolutions): Anthropic Claude Sonnet 4.5 + pHash → $0.40/resolution
  - **Philosophy**: "Upgrade the brain, not the eyes" - pHash maintained across all attempts
  - **Worst-case**: All 3 attempts = $0.54/resolution (under $0.70 overage)
- **LLM** (Dashboard Chat API):
  - OpenAI GPT-4o-mini (simple - 70%, $0.15/1M tokens)
  - OpenAI GPT-4o (complex - 30%, $5.00/1M tokens)
- **Speech**:
  - Deepgram Nova-3 (STT, $0.0036/min)
  - ElevenLabs Turbo v2.5 (TTS - primary, $0.15/1K chars)
  - Cartesia Sonic (TTS - fallback, $0.05/1K chars)
- **Embeddings**: Voyage-2 ($0.10/1M tokens) with text sanitization
- **Real-time**: LiveKit Cloud (self-hosted option: $1.6K-6K/year vs $60K-120K+/year Enterprise)

**Cost Optimization Features**:
- Attempt-based escalation with confidence scoring (retry logic escalates AI reasoning capability)
- Perceptual hashing (pHash) for frame deduplication (60-75% frame reduction, threshold=10)
- 1 FPS screen capture (96% cost reduction vs 30 FPS)
- **Combined Savings**: 82-85% vs baseline (~$1.1M/year at 1K users)

### Development Tools
- **Monorepo**: Turborepo for build orchestration
- **Package Manager**: pnpm 9.x with workspaces
- **Code Quality**: Biome for linting and formatting
- **Type Checking**: TypeScript strict mode
- **Containerization**: Docker for local development

---

## 📜 Available Scripts

### Root Commands

```bash
# Development
pnpm dev              # Start all services in development mode
pnpm build            # Build all packages and apps
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Lint and format code with Biome
pnpm test             # Run all tests
pnpm clean            # Clean all build artifacts

# Database
pnpm db:up            # Start PostgreSQL and Redis with Docker
pnpm db:down          # Stop database containers
pnpm db:push          # Push schema changes to database
pnpm db:seed          # Seed database with sample data
```

### Package-Specific Commands

```bash
# Run command in specific package
pnpm --filter @platform/web dev
pnpm --filter @platform/api dev

# Build specific package
pnpm --filter @platform/shared build
```

### LiveKit Agent (Production - Phase 5 Complete)

**Status**: Complete production implementation (1000+ lines)

```bash
cd livekit-agent

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with LiveKit and AI provider credentials

# Run agent (connects to LiveKit Cloud or self-hosted)
python agent.py
```

**Implementation Details**: See `docs/phases/phase-5-week-2-implementation.md` for complete setup guide

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
1. [Project Overview](docs/getting-started/overview.md) - Business context and goals
2. [System Design](docs/architecture/system-design.md) - Architecture overview
3. [Development Setup](docs/getting-started/development.md) - Local environment setup

### Implementation Guides
- [Development Roadmap](docs/guides/roadmap.md) - 7-phase build order (6/7 complete)
- [Phase 5 Week 1](docs/phases/phase-5-week-1-implementation.md) - AI Chat API + RAG
- [Phase 5 Week 2](docs/phases/phase-5-week-2-implementation.md) - LiveKit + Python Agent
- [Phase 6](docs/phases/phase-6-implementation.md) - WebSocket Real-time Chat
- [Component Patterns](docs/guides/components.md) - React component architecture
- [AI Integration](docs/guides/ai-integration.md) - AI provider integration
- [Integration Guide](docs/guides/integration.md) - Component integration

### Technical Reference
- [API Reference](docs/reference/api.md) - Complete tRPC specifications
- [Database Schema](docs/reference/database.md) - Database design
- [Configuration](docs/reference/configuration.md) - Environment setup
- [File Structure](docs/reference/file-structure.md) - Project organization

### Operations
- [Deployment Guide](docs/operations/deployment.md) - Production deployment
- [Observability](docs/operations/observability.md) - Monitoring and logging

### LiveKit Agent
- [LiveKit Agent README](livekit-agent/README.md) - Production implementation (Phase 5 complete)
- [Phase 5 Week 2 Implementation](docs/phases/phase-5-week-2-implementation.md) - Complete setup guide
- [Reference Architecture](docs/reference/livekit-agent/docs/ARCHITECTURE.md) - Provider abstraction layer

---

## 🔐 Environment Configuration

The platform requires API keys for various services. Copy `.env.example` to `.env` and configure:

### Required Services
- **Database**: PostgreSQL connection string
- **Cache**: Redis connection string
- **AI Providers**: OpenAI, Anthropic, Google (Gemini)
- **Speech**: Deepgram, ElevenLabs, Cartesia
- **Embeddings**: Voyage AI
- **Real-time**: LiveKit Cloud credentials

See [`.env.example`](.env.example) for the complete configuration template.

---

## 🏗️ Development Workflow

### 1. Start Development Environment

```bash
# Start databases
pnpm db:up

# Start all services
pnpm dev
```

### 2. Make Changes

- Frontend changes: Hot reload automatically in `apps/web` and `apps/widget-sdk`
- Backend changes: Services auto-restart with `tsx watch`
- Type safety: Real-time TypeScript checking

### 3. Quality Checks

```bash
# Type checking
pnpm typecheck

# Linting and formatting
pnpm lint

# Run tests
pnpm test
```

### 4. Build for Production

```bash
# Build all packages
pnpm build

# Test production build locally
pnpm preview
```

---

## 📊 Project Status & Goals

### Completed (8/8 Phases - 100%)

- ✅ **Phase 1**: Turborepo monorepo scaffolding
- ✅ **Phase 2**: Database + Auth + Security (18 tables, 9 migrations, 56 RLS policies)
- ✅ **Phase 3**: Backend API infrastructure (tRPC v11, 5 routers)
- ✅ **Phase 4**: Frontend apps (React 18 + Vite 6 + Tailwind v4)
- ✅ **Phase 5**: AI Integration + LiveKit (75-85% cost reduction, self-hosted option)
- ✅ **Phase 6**: Real-time WebSocket chat (Redis Streams + bidirectional)
- ✅ **Phase 7**: Widget SDK (NPM package, Shadow DOM, 52-86KB gzipped, Lighthouse 98/100)
- ✅ **Phase 8**: Production Security (Auth.js, Argon2id, TOTP MFA, RLS, rate limiting, API keys)

### MVP Complete - Production Readiness Assessment

**Current Status**: ~75% Production Ready (verified 2025-10-27)
**Security Implementation**: OWASP-compliant foundations (Auth.js, RLS, CSRF, Argon2id)
**Test Coverage**: 13.4% (11/82 files) - Target: 80% (Week 2 of 4-week campaign complete)
**Audit Status**: 2025-10-25 comprehensive audit - 9/19 findings resolved

**Production Readiness Progress**:
1. ✅ PostgreSQL RLS policies applied (FORCE RLS enabled on all 18 tables)
2. ✅ Auth.js with MFA, account lockout, NIST-compliant sessions
3. ✅ Password migration (automatic bcrypt → argon2id upgrade)
4. ✅ CSRF protection (implemented across all 4 frontend apps)
5. ✅ Version pinning enforced (0 violations, deterministic builds)
6. ✅ AI Personalities database integration (production-breaking bug fixed)
7. ⚠️ Test coverage in progress (2-3 weeks to 80% target)
8. ⚠️ Error handling standardization (needs implementation)

**Blocking Issues** (Before Production):
- Test coverage to 80%+ (IN PROGRESS, ~3 weeks remaining)
- Error handling middleware (2 days)
- Transaction management verification (1 day)

See `docs/audit/2025-10-25/PRODUCTION_READINESS_VERIFICATION.md` for complete audit results.

### Goals

1. **Cost Efficiency**: ✅ 75-85% reduction achieved through intelligent routing + self-hosted LiveKit
2. **Enterprise Quality**: ✅ Production-grade security (95/100 audit score), reliability foundation complete
3. **Developer Experience**: ✅ Type-safe APIs, comprehensive documentation, clear patterns
4. **Scalability**: ✅ Widget SDK ready for distribution, horizontal scaling architecture complete
5. **Market Leadership**: 🎯 12-18 month technical advantage in AI business automation

---

## 🤝 Contributing

This is an enterprise project. All contributions must follow:

1. **Documentation Standards**: Professional, comprehensive, accurate
2. **Code Quality**: TypeScript strict mode, comprehensive tests
3. **Architecture Alignment**: Follow established patterns and conventions
4. **Security First**: OWASP compliance, no secrets in code

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

- **Documentation**: Complete guides in `docs/` directory (Phases 1-8 implementation docs)
- **Phase 7**: Widget SDK implementation complete (see `docs/phases/phase-7-implementation.md`)
- **Phase 8**: Production Security complete (see `docs/phases/phase-8-production-security.md`)
- **Security Audit**: 95/100 score with 92% compliance (see `docs/phases/phase-8-security-audit.md`)
- **Issues**: Document with reproduction steps and expected behavior

---

**Built with ❤️ for enterprise-grade AI interactions**
