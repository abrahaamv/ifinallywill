# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Enterprise AI Assistant Platform** - Multi-modal real-time AI interaction system with cost-optimized provider architecture (80% cost reduction). Built as a Turborepo monorepo with pnpm workspaces, focusing on type safety and enterprise-grade quality.

**Current Status**: Foundation ready (Phase 1 complete). Database, auth, and implementation phases pending.

**Tech Stack**: React 18 + Vite 6 (frontend), Fastify 5 + tRPC v11 (backend), Drizzle ORM + PostgreSQL, Redis pub/sub, LiveKit (WebRTC), Python LiveKit agent

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

### Python LiveKit Agent (Phase 5 - Pending Implementation)

**Status**: Not yet implemented. Implementation planned for Phase 5 (Weeks 7-8).

```bash
cd livekit-agent
# Currently empty - see docs/reference/livekit-agent-implementation.md for implementation plan
# Reference code available at docs/reference/livekit-agent/
```

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
│   ├── realtime/         # @platform/realtime - SSE + Redis pub/sub
│   ├── db/               # @platform/db - Drizzle ORM schemas
│   ├── auth/             # @platform/auth - Lucia v4 authentication
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
- Separate tenant contexts in Drizzle queries
- LiveKit room names encode tenant information

**3. Cost-Optimized AI Routing**
- **Vision**: Gemini Flash 2.5 (85% routine) + Claude 3.5 Sonnet (15% complex) = $0.50/1M tokens
- **LLM**: GPT-4o-mini (70% simple) + GPT-4o (30% complex) = $0.50/1M tokens
- **1 FPS screen capture** in LiveKit agent (95% cost reduction vs 30 FPS)
- Provider abstraction layer in `packages/ai-core`

**4. Real-time Communication Stack**
- **SSE (Server-Sent Events)**: Chat messages via `packages/realtime`
- **Redis Pub/Sub**: Multi-instance message broadcasting
- **LiveKit**: WebRTC video/audio/screen sharing
- **Python Agent**: Multi-modal AI processing (voice, vision, text)

**5. Knowledge Enhancement (RAG)**
- Voyage Multimodal-3 embeddings
- Hybrid retrieval (semantic + keyword + rerank)
- Document processing in `packages/knowledge`
- Backend integration via tRPC APIs

### Database Architecture (Drizzle ORM)

**PostgreSQL 16** with Drizzle ORM.

**Status**: Phase 1 complete - Database schema implementation pending (Phase 2).

**Planned Schema** (to be implemented in `packages/db/src/schema/`):
- `tenants.ts` - Multi-tenant isolation
- `users.ts` - User accounts
- `lucia-sessions.ts` - Lucia auth sessions
- `widgets.ts` - Widget configurations
- `meetings.ts` - LiveKit meeting rooms
- `sessions.ts` - AI conversation sessions
- `messages.ts` - Chat history
- `knowledge-documents.ts` - Document storage
- `knowledge-chunks.ts` - Vector embeddings
- `cost-events.ts` - Usage tracking for billing

**Migrations**: `pnpm db:push` (Drizzle Kit push mode) - Available after Phase 2 schema implementation

### Authentication (Lucia v4)

- Session-based auth with secure cookies
- Argon2id password hashing
- Drizzle adapter for session storage
- Integration in `packages/auth`

## Implementation Roadmap

**Follow `docs/guides/roadmap.md` for sequential implementation phases:**

1. ✅ **Phase 1**: Project scaffolding (COMPLETE)
2. **Phase 2**: Database + Auth (Weeks 2) - NEXT
3. **Phase 3**: Backend APIs (Weeks 3-4)
4. **Phase 4**: Frontend App (Weeks 5-6)
5. **Phase 5**: AI Integration (Weeks 7-8)
6. **Phase 6**: Real-time Features (Weeks 9-10)
7. **Phase 7**: Widget SDK (Weeks 11-12)

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
- Backend uses Fastify 5 + tRPC v11

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

**Implementation Status**: Not yet implemented (planned for Phase 5)

**Implementation Guide**: See `docs/reference/livekit-agent-implementation.md` for production implementation plan

**Reference Implementation**: See `docs/reference/livekit-agent/` for playground/experimental code that serves as reference

The production Python agent will integrate with the TypeScript backend:

1. **Backend Integration**:
   - Fetch tenant context from tRPC API
   - Track usage to `costEvents` table
   - Query knowledge base via RAG endpoints

2. **LiveKit Agent Features**:
   - 1 FPS screen capture (95% cost optimization)
   - Multi-modal AI (voice, vision, text)
   - Temporal frame context for vision analysis

3. **Requirements** (when implemented):
   - Python 3.11+ virtual environment
   - Backend API running
   - LiveKit Cloud credentials

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
