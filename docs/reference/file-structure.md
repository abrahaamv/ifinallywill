# File Structure Reference

**Last Updated**: January 2025
**Current Phase**: Phase 1 Complete - Foundation Ready
**Status**: Accurate as of initial GitHub upload

---

## 🎯 Purpose

This document describes the **actual current file structure** of the AI Assistant Platform monorepo. This reflects what exists NOW (Phase 1), not future implementation phases.

> **📌 Multi-App Architecture (Current)**
>
> **Phase 1 (Current)** - 4-app foundation with placeholders (~60 files):
> - `apps/landing` - Public marketing site → **www.platform.com**
> - `apps/dashboard` - Admin portal → **dashboard.platform.com** (Knowledge/RAG management)
> - `apps/meeting` - Meeting rooms → **meet.platform.com** (LiveKit integration, multi-modal AI)
> - `apps/widget-sdk` - Embeddable widget → Customer websites
> - `packages/ui` - Shared component library
> - All `packages/*` contain TypeScript scaffolding only
>
> Each app has independent deployment capability and dedicated subdomain. Implementation follows `docs/guides/roadmap.md`.

---

## 📁 Current Project Structure

```
platform/
├── .git/                              # Git repository
├── .github/                           # GitHub configuration (if added)
├── .claude/                           # Claude Code configuration (gitignored)
│
├── apps/                              # Application packages (4 apps)
│   ├── landing/                       # Public marketing site (www.platform.com)
│   │   ├── src/
│   │   │   ├── App.tsx               # Root component
│   │   │   ├── main.tsx              # React entry point
│   │   │   └── vite-env.d.ts         # Vite type declarations
│   │   ├── public/                   # Static assets
│   │   ├── index.html                # HTML template
│   │   ├── package.json              # Dependencies and scripts
│   │   ├── tsconfig.json             # TypeScript project references
│   │   ├── tsconfig.app.json         # App-specific TS config
│   │   ├── tsconfig.node.json        # Node-specific TS config
│   │   ├── vite.config.ts            # Vite configuration (port 5173)
│   │   └── README.md                 # App documentation
│   │
│   ├── dashboard/                     # Admin portal (dashboard.platform.com)
│   │   ├── src/
│   │   │   ├── App.tsx               # Root component
│   │   │   ├── main.tsx              # React entry point
│   │   │   └── vite-env.d.ts         # Vite type declarations
│   │   ├── public/                   # Static assets
│   │   ├── index.html                # HTML template
│   │   ├── package.json              # Dependencies and scripts
│   │   ├── tsconfig.json             # TypeScript project references
│   │   ├── tsconfig.app.json         # App-specific TS config
│   │   ├── tsconfig.node.json        # Node-specific TS config
│   │   ├── vite.config.ts            # Vite configuration (port 5174)
│   │   └── README.md                 # App documentation
│   │
│   ├── meeting/                       # Meeting rooms (meet.platform.com)
│   │   ├── src/
│   │   │   ├── App.tsx               # Root component
│   │   │   ├── main.tsx              # React entry point
│   │   │   └── vite-env.d.ts         # Vite type declarations
│   │   ├── public/                   # Static assets
│   │   ├── index.html                # HTML template
│   │   ├── package.json              # Dependencies and scripts
│   │   ├── tsconfig.json             # TypeScript project references
│   │   ├── tsconfig.app.json         # App-specific TS config
│   │   ├── tsconfig.node.json        # Node-specific TS config
│   │   ├── vite.config.ts            # Vite configuration (port 5175)
│   │   └── README.md                 # App documentation
│   │
│   └── widget-sdk/                   # Embeddable widget SDK (customer websites)
│       ├── src/
│       │   ├── App.tsx               # Root component
│       │   ├── main.tsx              # Widget entry point
│       │   └── vite-env.d.ts         # Vite type declarations
│       ├── public/                   # Static assets
│       ├── index.html                # HTML template
│       ├── package.json              # Dependencies and scripts
│       ├── tsconfig.json             # TypeScript project references
│       ├── tsconfig.app.json         # App-specific TS config
│       ├── tsconfig.node.json        # Node-specific TS config
│       ├── vite.config.ts            # Vite configuration (port 5176)
│       └── README.md                 # Widget documentation
│
├── packages/                         # Shared packages
│   ├── api/                          # Fastify + tRPC API server
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── realtime/                     # WebSocket + Redis Streams server
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── shared/                       # Shared utilities and types
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── db/                           # Drizzle ORM schemas
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── auth/                         # Auth.js (NextAuth.js) authentication
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── api-contract/                 # tRPC router definitions
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── ai-core/                      # AI service abstractions
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── knowledge/                    # Knowledge management (RAG)
│   │   ├── src/
│   │   │   └── index.ts              # Package entry (placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── ui/                           # Shared UI component library
│       ├── src/
│       │   ├── components/           # Shared components (Button, Input, etc.)
│       │   └── index.ts              # Package entry
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── infrastructure/                   # Infrastructure configuration
│   └── docker/
│       ├── docker-compose.yml        # PostgreSQL + Redis development setup
│       └── .env.example              # Docker environment template
│
├── livekit-agent/                    # Python LiveKit agent (Phase 5 - COMPLETE)
│   ├── .gitkeep                      # Placeholder to preserve directory
│   └── README.md                     # Implementation guide reference
│
├── marketing/                        # Marketing materials (gitignored)
│   ├── .gitkeep                      # Documentation
│   └── strategy.md                   # Pending review (not in git)
│
├── docs/                             # Project documentation
│   ├── README.md                     # Documentation index
│   ├── PRE_DEPLOYMENT_CHECKLIST.md  # Pre-upload validation
│   ├── DOCUMENTATION_CONSISTENCY_REPORT.md  # Consistency analysis
│   ├── FINAL_VALIDATION_SUMMARY.md  # Final validation results
│   │
│   ├── getting-started/              # Onboarding and setup
│   │   ├── overview.md               # Project vision and goals
│   │   ├── development.md            # Development environment setup
│   │   └── quick-start.md            # Quick start guide
│   │
│   ├── architecture/                 # System design
│   │   ├── system-design.md          # High-level architecture
│   │   ├── tech-stack.md             # Technology choices
│   │   └── decisions.md              # Architecture decision records
│   │
│   ├── guides/                       # Implementation guides
│   │   ├── roadmap.md                # 7-phase development roadmap
│   │   ├── components.md             # React component patterns
│   │   ├── ai-integration.md         # AI provider integration
│   │   ├── integration.md            # Component integration guide
│   │   ├── testing.md                # Testing strategy
│   │   └── security.md               # Security best practices
│   │
│   ├── reference/                    # Technical specifications
│   │   ├── api.md                    # tRPC API specifications
│   │   ├── database.md               # Database schema
│   │   ├── configuration.md          # Environment configuration
│   │   ├── file-structure.md         # This document
│   │   ├── livekit-agent-implementation.md  # Production implementation plan
│   │   └── livekit-agent/            # Reference implementation
│   │       ├── README.md             # Reference code overview
│   │       └── docs/                 # Reference documentation
│   │           ├── ARCHITECTURE.md   # Provider architecture
│   │           ├── INTEGRATION_GUIDE.md  # Backend integration
│   │           └── SETUP.md          # Setup instructions
│   │
│   └── operations/                   # Deployment and monitoring
│       ├── deployment.md             # Deployment procedures
│       └── observability.md          # Logging and monitoring
│
├── .gitignore                        # Git exclusions
├── .gitattributes                    # Git line ending configuration
├── .env.example                      # Environment variable template
├── package.json                      # Root workspace configuration
├── pnpm-workspace.yaml               # pnpm workspace definition
├── turbo.json                        # Turborepo configuration
├── tsconfig.json                     # Base TypeScript configuration
├── biome.json                        # Biome linting/formatting
├── CHANGELOG.md                      # Version history
├── LICENSE                           # Proprietary license
├── README.md                         # Project README
└── CLAUDE.md                         # Claude Code integration guide
```

---

## 📊 Current File Counts

| Category | Count | Description |
|----------|-------|-------------|
| **Apps** | 4 | landing, dashboard, meeting, widget-sdk |
| **Packages** | 10 | api, realtime, shared, db, auth, api-contract, ai-core, knowledge, ui |
| **Documentation** | 25+ | Complete guide set |
| **Configuration** | 10 | Root config files |
| **Infrastructure** | 2 | Docker setup |
| **Total Files** | ~60 | Phase 1 foundation |

---

## 🎯 Key Differences from Future State

**Current (Phase 1)** - What Exists NOW:
- ✅ Monorepo structure with Turborepo
- ✅ All package directories created
- ✅ Basic package.json files
- ✅ Placeholder index.ts files
- ✅ TypeScript configuration
- ✅ Biome linting setup
- ✅ Docker Compose for databases
- ✅ Complete documentation (25+ files)

**Future (Phases 2-7)** - What Will Be Added:
- ⏳ Database schemas and migrations
- ⏳ Auth.js (NextAuth.js) OAuth authentication
- ⏳ tRPC router implementations
- ⏳ Fastify server setup
- ⏳ React components and pages
- ⏳ AI provider integrations
- ⏳ LiveKit agent (Python)
- ⏳ Widget SDK implementation
- ⏳ Test suites

---

## 📝 Package Purposes

### Applications (apps/)

#### apps/landing
- **Purpose**: Public marketing site (www.platform.com)
- **Port**: 5173 (development)
- **Framework**: Vite 6 + React 18
- **Status**: Foundation only (Phase 1)

#### apps/dashboard
- **Purpose**: Admin portal for knowledge/RAG management (dashboard.platform.com)
- **Port**: 5174 (development)
- **Framework**: Vite 6 + React 18
- **Status**: Foundation only (Phase 1)

#### apps/meeting
- **Purpose**: Real-time meeting rooms (meet.platform.com)
- **Port**: 5175 (development)
- **Framework**: Vite 6 + React 18
- **Status**: Foundation only (Phase 1)

#### apps/widget-sdk
- **Purpose**: Embeddable widget for customer websites
- **Port**: 5176 (development)
- **Framework**: Vite 6 + React 18
- **Status**: Foundation only (Phase 1)

### Packages (packages/)

#### packages/api
- **Purpose**: Fastify HTTP server with tRPC adapter
- **Port**: 3001 (development)
- **Dependencies**: fastify, @trpc/server, @fastify/cors
- **Status**: Package structure only (implementation in Phase 3)

#### packages/realtime
- **Purpose**: WebSocket + Redis Streams for real-time chat
- **Port**: 3002 (development)
- **Dependencies**: ioredis, fastify, ws
- **Status**: Package structure only (implementation in Phase 6)

#### packages/shared
- **Purpose**: Common utilities, types, and services
- **Dependencies**: None (base package)
- **Status**: Package structure only

#### packages/db
- **Purpose**: Drizzle ORM schemas and database access
- **Dependencies**: drizzle-orm, postgres
- **Status**: Package structure only (implementation in Phase 2)

#### packages/auth
- **Purpose**: Auth.js (NextAuth.js) v5 authentication utilities
- **Dependencies**: next-auth, @auth/drizzle-adapter
- **Status**: Package structure only (implementation in Phase 2)

#### packages/api-contract
- **Purpose**: tRPC router type definitions
- **Dependencies**: @trpc/server, zod
- **Status**: Package structure only (implementation in Phase 3)

#### packages/ai-core
- **Purpose**: AI provider abstractions (OpenAI, Anthropic, Google)
- **Dependencies**: Provider SDKs
- **Status**: Package structure only (implementation in Phase 5)

#### packages/knowledge
- **Purpose**: RAG system with Voyage embeddings
- **Dependencies**: voyageai, document parsers
- **Status**: Package structure only (implementation in Phase 5)

#### packages/ui
- **Purpose**: Shared UI component library (Button, Input, Modal, Card, Typography, Icons)
- **Dependencies**: react, react-dom
- **Status**: Foundation with Button component (Phase 1)

---

## 🔗 Workspace Dependencies

**Current Structure**:
```
Apps depend on packages (via @platform/* aliases)
Packages are independent (no cross-package dependencies yet)
```

**Future Dependencies** (will be implemented):
```
api-contract → db, auth, shared
api → api-contract, shared
realtime → db, shared
ai-core → shared
knowledge → db, ai-core, shared
landing → api-contract, ui (for tRPC client + shared components)
dashboard → api-contract, ui (for tRPC client + shared components)
meeting → api-contract, ui (for tRPC client + shared components)
widget-sdk → api-contract, ui (for tRPC client + shared components)
```

---

## 📦 Package Manager

**pnpm Workspace**: All packages managed through pnpm workspaces
- **Root**: `pnpm-workspace.yaml` defines `apps/*` and `packages/*`
- **Install**: `pnpm install` installs all dependencies
- **Scripts**: `pnpm dev`, `pnpm build`, `pnpm typecheck`, etc.
- **Filters**: Use `pnpm --filter @platform/web dev` for specific packages

---

## 🏗️ Build System

**Turborepo**:
- **Config**: `turbo.json` defines task dependencies
- **Caching**: Intelligent caching of build outputs
- **Parallelization**: Runs tasks in parallel where possible
- **Tasks**: `build`, `dev`, `typecheck`, `lint`, `test`, `clean`

---

## 📄 Configuration Files

### Root Level

#### package.json
- **Purpose**: Workspace scripts and dev dependencies
- **Location**: `/package.json`
- **Key Scripts**:
  - `dev` - Start all services in parallel
  - `build` - Build all packages
  - `typecheck` - Type check all packages
  - `lint` - Lint all packages
  - `db:up` - Start Docker databases
  - `db:down` - Stop Docker databases
  - `db:push` - Push database schema changes
  - `db:seed` - Seed database with test data

#### pnpm-workspace.yaml
- **Purpose**: Define workspace packages
- **Content**: Lists `apps/*` and `packages/*`

#### turbo.json
- **Purpose**: Turborepo task configuration
- **Tasks**: build, dev, typecheck, lint, test, clean
- **Dependencies**: Defines task dependencies (e.g., typecheck depends on build)

#### tsconfig.json
- **Purpose**: Base TypeScript configuration
- **Extended By**: All package tsconfig.json files
- **Settings**: Strict mode, ES2022 target, ESNext modules

#### biome.json
- **Purpose**: Linting and formatting configuration
- **Features**: Organizes imports, lints code, formats code
- **Rules**: Recommended rules + custom overrides

#### .gitignore
- **Purpose**: Specify files to exclude from git
- **Excludes**: node_modules, dist, .env, build artifacts

#### .env.example
- **Purpose**: Environment variable template
- **Categories**: Database, API, AI providers, LiveKit, Frontend

---

## 🗄️ Infrastructure

### Docker Compose (infrastructure/docker/)

#### docker-compose.yml
- **Purpose**: Local development database services
- **Services**:
  - **postgres**: pgvector/pgvector:pg16 (PostgreSQL with vector support)
  - **redis**: redis:7-alpine
  - **pgadmin**: dpage/pgadmin4 (optional, use with --profile tools)
- **Ports**:
  - PostgreSQL: 5432
  - Redis: 6379
  - pgAdmin: 5050

#### .env.example
- **Purpose**: Docker environment variables
- **Variables**: Database credentials, ports

---

## 📚 Documentation Structure

### Organization

**Getting Started**: Onboarding and setup guides
**Architecture**: System design and technical decisions
**Guides**: Step-by-step implementation guides
**Reference**: Technical specifications and API docs
**Operations**: Deployment and monitoring guides

### Navigation

All documentation is cross-referenced with relative links. Start with `docs/README.md` for the full documentation index.

---

## 🔮 Future Additions (Phases 2-7)

**Phase 2** (Database + Auth):
- Database schemas in `packages/db/src/schema/`
- Auth.js configuration in `packages/auth/src/`
- Drizzle migrations with RLS policies

**Phase 3** (Backend APIs):
- tRPC routers in `packages/api-contract/src/routers/`
- Fastify server in `packages/api/src/server.ts`
- API route handlers

**Phase 4** (Frontend):
- Landing components in `apps/landing/src/components/`
- Dashboard components in `apps/dashboard/src/components/`
- Meeting components in `apps/meeting/src/components/`
- Shared UI components in `packages/ui/src/components/`
- Pages and layouts for each app

**Phase 5** (AI Integration):
- AI providers in `packages/ai-core/src/providers/`
- Python LiveKit agent in `livekit-agent/`
- Knowledge system in `packages/knowledge/`

**Phase 6** (Real-time Features):
- WebSocket server in `packages/realtime/src/`
- Redis Streams consumer groups
- Sticky session configuration

**Phase 7** (Widget SDK):
- Widget components in `apps/widget-sdk/src/`
- CDN build configuration
- Embedding examples

---

## ✅ Validation

**To verify current structure**:
```bash
# Check workspace structure
ls apps/ packages/

# Verify all packages
find apps packages -name "package.json"

# Check documentation
find docs -name "*.md" | wc -l  # Should be 25+

# Verify configuration
ls -la *.json *.yaml *.md | grep -E "package|turbo|tsconfig|biome|pnpm|README|CHANGELOG|LICENSE|CLAUDE"
```

---

## 🎯 Summary

**Current State**: Complete Phase 1 foundation with:
- ✅ Monorepo structure
- ✅ All package scaffolds
- ✅ TypeScript configuration
- ✅ Development tooling
- ✅ Docker database setup
- ✅ Comprehensive documentation

**Ready For**: Phase 2 implementation (Database + Auth)

---

**Last Updated**: January 2025
**Version**: 1.0.0 (Phase 1 Complete)
