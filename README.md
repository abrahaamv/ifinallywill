# AI Assistant Platform

> Enterprise-grade real-time AI interaction system with multi-modal capabilities, cost-optimized provider architecture, and comprehensive knowledge management.

**Status**: Phase 2 Complete - Database & Auth Ready, Phase 3 Starting
**Version**: 1.0.0
**Last Updated**: January 6, 2025

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

# 4. Start development servers (frontend apps only - Phase 1)
pnpm dev

# 5. Push database schema (Phase 2 complete)
pnpm db:push

# 6. Seed demo data (optional)
pnpm db:seed

# Note: LiveKit agent setup pending Phase 5 implementation
```

### Accessing the Platform

- **Landing**: http://localhost:5173 - Public marketing site (Phase 1 placeholder)
- **Dashboard**: http://localhost:5174 - Admin portal (Phase 1 placeholder)
- **Meeting**: http://localhost:5175 - Meeting rooms (Phase 1 placeholder)
- **Widget SDK**: http://localhost:5176 - Embeddable widget (Phase 1 placeholder)
- **API Server**: http://localhost:3001
- **Real-time Server**: http://localhost:3002

> **📌 Multi-App Architecture**
>
> **Phase 1 (Current)**: Foundation with 4 app placeholders
> - `apps/landing` - Public marketing site → **www.platform.com**
> - `apps/dashboard` - Admin portal → **dashboard.platform.com**
> - `apps/meeting` - Meeting rooms → **meet.platform.com**
> - `apps/widget-sdk` - Embeddable widget → Customer websites
>
> **Shared Components**: `packages/ui` for consistent design across all apps
>
> See `docs/guides/roadmap.md` for implementation phases.

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

**80% cost reduction** through intelligent provider routing:

- **Vision**: Gemini Flash 2.5 (85%) + Claude 3.5 Sonnet (15%) → $0.50/1M tokens (was $2.50/1M)
- **LLM**: GPT-4o-mini (70%) + GPT-4o (30%) → $0.50/1M tokens (was $2.50/1M)
- **Expected Savings**: $680K annually at 100K sessions

### Enterprise-Grade Infrastructure

- **Backend**: Fastify 5.3.2+ + tRPC v11 for type-safe APIs
- **Database**: PostgreSQL 16.7+ + Drizzle ORM + Redis 7.4.2+
- **Real-time**: WebSocket + Redis Streams for chat, LiveKit Cloud for WebRTC
- **Auth**: Auth.js (NextAuth.js) v5 with OAuth providers
- **Build**: Turborepo monorepo with pnpm workspace

### Advanced AI Capabilities

- **Multi-modal Interaction**: Voice, vision, and text in real-time
- **Screen Analysis**: Real-time analysis at 1 FPS
- **Knowledge Enhancement**: RAG system with semantic search
- **Complexity-based Routing**: Automatic provider selection for cost optimization

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

### LiveKit Agent (Production - Phase 5)

**Status**: Pending implementation

```bash
cd livekit-agent
# Implementation guide: docs/reference/livekit-agent-implementation.md
# Reference code: docs/reference/livekit-agent/
```

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
1. [Project Overview](docs/getting-started/overview.md) - Business context and goals
2. [System Design](docs/architecture/system-design.md) - Architecture overview
3. [Development Setup](docs/getting-started/development.md) - Local environment setup

### Implementation Guides
- [Development Roadmap](docs/guides/roadmap.md) - 7-phase build order
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
- [LiveKit Agent README](livekit-agent/README.md) - Production implementation (pending)
- [Implementation Guide](docs/reference/livekit-agent-implementation.md) - Production implementation plan
- [Reference Code](docs/reference/livekit-agent/README.md) - Playground/experimental implementation
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

## 📊 Project Goals

1. **Cost Efficiency**: 70-80% reduction in AI service costs through intelligent routing
2. **Enterprise Quality**: Production-grade reliability, security, and observability
3. **Developer Experience**: Type-safe APIs, comprehensive documentation, clear patterns
4. **Scalability**: Horizontal scaling to 1000+ concurrent sessions
5. **Market Leadership**: 12-18 month technical advantage in AI business automation

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

- **Documentation**: Complete guides in `docs/` directory
- **LiveKit Agent**: Production implementation pending (see `docs/reference/livekit-agent-implementation.md`)
- **Issues**: Document with reproduction steps and expected behavior

---

**Built with ❤️ for enterprise-grade AI interactions**
