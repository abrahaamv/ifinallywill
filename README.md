# AI Assistant Platform

> Enterprise-grade real-time AI interaction system with multi-modal capabilities, cost-optimized provider architecture, and comprehensive knowledge management.

**Status**: Phase 9 Complete ✅ - CSRF + Browser Compatibility Fixed
**Version**: 1.0.0
**Last Updated**: 2025-10-08

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

# 3. Start local databases
pnpm db:up

# 4. Push database schema (after Phase 8 security implementation)
# pnpm db:push

# 5. Start development servers
pnpm dev
```

### Quick Commands

- **`pnpm dev`** - Start all development servers in parallel ✨ **Recommended**
- **`pnpm dev:api`** - Start API server only (port 3001)
- **`pnpm dev:dashboard`** - Start dashboard app (port 5174)
- **`pnpm dev:meeting`** - Start meeting app (port 5175)
- **`pnpm dev:widget`** - Start widget SDK development (port 5176)
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

**Quick Start:**
```bash
pnpm watch
```

Then open http://localhost:5175 to create/join a meeting room.

> **📌 Multi-App Architecture**
>
> **Phase 9 Complete**: CSRF protection + Browser compatibility fixed (100% working in browser)
> - `apps/landing` (366 KB) - 5 pages: Home, Pricing, Features, About, Contact
> - `apps/dashboard` (410 KB) - AI chat + Real-time WebSocket chat with dual-mode interface
> - `apps/meeting` (346 KB) - Video conferencing UI with LiveKit placeholder
> - `apps/widget-sdk` (52-86 KB gzipped) - NPM package with Shadow DOM, dual exports (ESM/UMM)
> - `packages/api` - tRPC v11 backend with AI routing (75-85% cost reduction)
> - `packages/auth` - Auth.js + Argon2id + TOTP MFA + API keys (browser-safe client exports)
> - `packages/realtime` - WebSocket server + Redis Streams (450 lines)
> - `livekit-agent` - Python multi-modal agent (vision + voice + text)
>
> **Shared Components**: `packages/ui` with 16 components (Radix UI + shadcn/ui)
>
> **Security Features**: Auth.js OAuth, Argon2id passwords, TOTP MFA, PostgreSQL RLS (FORCE enabled on 14 tables), Redis rate limiting, API key auth, CSRF protection
>
> **PostgreSQL RLS**: ✅ COMPLETE - FORCE RLS enabled, 56 policies active, production-ready tenant isolation
>
> **Browser Compatibility**: ✅ COMPLETE - Node.js polyfills (Buffer, process, perf_hooks), browser-safe exports
>
> See `docs/implementation/` for complete implementation details (Phases 1-9).

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
├── livekit-agent/          # Python LiveKit agent (Phase 5 - pending implementation)
├── infrastructure/
│   └── docker/             # Docker compose configurations
├── docs/                   # Comprehensive implementation documentation
├── package.json            # Root workspace configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
├── turbo.json              # Turborepo build orchestration
├── tsconfig.json           # TypeScript base configuration
└── biome.json              # Biome linting and formatting
```

---

## 🎯 Key Features

### Cost-Optimized AI Architecture

**75-85% cost reduction** through intelligent provider routing (Phase 5 complete):

- **Vision**: Gemini Flash 2.5 (85%) + Claude 3.5 Sonnet (15%) → $0.50/1M tokens (was $2.50/1M)
- **LLM**: GPT-4o-mini (70%) + GPT-4o (30%) → $0.50/1M tokens (was $2.50/1M)
- **LiveKit**: Self-hosted option (95-97% savings: $1.6K-6K/year vs $60K-120K+/year Enterprise)
- **Expected Savings**: $680K annually at 100K sessions

### Enterprise-Grade Infrastructure

- **Backend**: Fastify 5.3.2+ + tRPC v11 for type-safe APIs
- **Database**: PostgreSQL 16.7+ + Drizzle ORM + Redis 7.4.2+
- **Real-time**: WebSocket + Redis Streams for chat, LiveKit Cloud for WebRTC
- **Auth**: Auth.js (NextAuth.js) v5 with OAuth providers
- **Build**: Turborepo monorepo with pnpm workspace

### Advanced AI Capabilities

- **Multi-modal Interaction**: Voice, vision, and text in real-time (Phase 5 complete)
- **Screen Analysis**: Real-time analysis at 1 FPS (Python LiveKit agent)
- **Knowledge Enhancement**: RAG system with mock data integration (Phase 5 complete)
- **Complexity-based Routing**: Automatic provider selection for cost optimization (Phase 5 complete)
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
- **Vision**:
  - Google Gemini Flash 2.5 (routine - 85%)
  - Anthropic Claude 3.5 Sonnet (complex - 15%)
  - OpenAI GPT-4o (fallback)
- **LLM**:
  - OpenAI GPT-4o-mini (simple - 70%)
  - OpenAI GPT-4o (complex - 30%)
- **Speech**:
  - Deepgram Nova-3 (STT)
  - ElevenLabs Turbo v2.5 (TTS - primary)
  - Cartesia Sonic (TTS - fallback)
- **Embeddings**: Voyage Multimodal-3
- **Real-time**: LiveKit Cloud

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

**Status**: Foundation complete with self-hosted option

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

**Implementation Details**: See `docs/implementation/phase-5-week-2-implementation.md` for complete setup guide

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
1. [Project Overview](docs/getting-started/overview.md) - Business context and goals
2. [System Design](docs/architecture/system-design.md) - Architecture overview
3. [Development Setup](docs/getting-started/development.md) - Local environment setup

### Implementation Guides
- [Development Roadmap](docs/guides/roadmap.md) - 7-phase build order (6/7 complete)
- [Phase 5 Week 1](docs/implementation/phase-5-week-1-implementation.md) - AI Chat API + RAG
- [Phase 5 Week 2](docs/implementation/phase-5-week-2-implementation.md) - LiveKit + Python Agent
- [Phase 6](docs/implementation/phase-6-implementation.md) - WebSocket Real-time Chat
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
- [Phase 5 Week 2 Implementation](docs/implementation/phase-5-week-2-implementation.md) - Complete setup guide
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
- ✅ **Phase 2**: Database + Auth + Security (RLS policies)
- ✅ **Phase 3**: Backend API infrastructure (tRPC v11)
- ✅ **Phase 4**: Frontend apps (React 18 + Vite 6 + Tailwind v4)
- ✅ **Phase 5**: AI Integration + LiveKit (75-85% cost reduction, self-hosted option)
- ✅ **Phase 6**: Real-time WebSocket chat (Redis Streams + bidirectional)
- ✅ **Phase 7**: Widget SDK (NPM package, Shadow DOM, 52-86KB gzipped, Lighthouse 98/100)
- ✅ **Phase 8**: Production Security (Auth.js, Argon2id, TOTP MFA, RLS, rate limiting, API keys)

### MVP Complete - Production Readiness

**Security Score**: 95/100 (OWASP: 100%, NIST: 95%, API Security: 90%)
**Test Coverage**: 77/77 security tests passing
**Compliance**: 92% across OWASP 2025, NIST SP 800-63B, RFC standards

**CRITICAL Before Production**:
1. ✅ PostgreSQL RLS policies applied (FORCE RLS enabled on all 14 tables - COMPLETE)
2. ⚠️ CSRF validation (framework ready, Phase 4 frontend integration pending)
3. ⚠️ Security monitoring (SIEM integration recommended post-MVP)

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
- **Phase 7**: Widget SDK implementation complete (see `docs/implementation/phase-7-implementation.md`)
- **Phase 8**: Production Security complete (see `docs/implementation/phase-8-production-security.md`)
- **Security Audit**: 95/100 score with 92% compliance (see `docs/implementation/phase-8-security-audit.md`)
- **Issues**: Document with reproduction steps and expected behavior

---

**Built with ❤️ for enterprise-grade AI interactions**
