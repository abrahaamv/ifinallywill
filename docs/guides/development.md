# Enterprise AI Assistant Platform - Developer Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Target Audience**: Developers, Engineers, Product Managers

> **⚠️ IMPORTANT**: This guide reflects the **actual** implementation status based on comprehensive audit (phase 9 started, phase 10, 11 and 12 pending to start). Current production readiness is **~60%**, not the 95% claimed in other docs. See `docs/claude-audit-report.md` for detailed findings.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Technologies](#core-technologies)
4. [Database Architecture](#database-architecture)
5. [Authentication & Security](#authentication--security)
6. [API Design](#api-design)
7. [Real-time Communication](#real-time-communication)
8. [AI Integration](#ai-integration)
9. [Frontend Applications](#frontend-applications)
10. [Deployment & Operations](#deployment--operations)
11. [Development Workflow](#development-workflow)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is This Platform?

The Enterprise AI Assistant Platform is a **multi-modal, real-time AI interaction system** designed for enterprise use. It enables organizations to deploy AI-powered assistants across multiple channels (web, widget, meetings) with advanced features like:

- **Real-time video/audio/screen sharing** via WebRTC
- **Multi-tenant architecture** for isolated customer data
- **Cost-optimized AI routing** (75-85% reduction)
- **Knowledge enhancement** through RAG (Retrieval-Augmented Generation)
- **Embeddable widgets** for customer websites
- **Enterprise-grade security** with RBAC, MFA, and audit logging

### Why This Architecture?

**Key Design Decisions**:

1. **Monorepo with Turborepo**: Enables code sharing, dependency management, and coordinated builds across multiple applications and packages.

2. **Type-Safe APIs with tRPC**: Eliminates API contract drift between frontend and backend through shared TypeScript types.

3. **Multi-Tenant from Day One**: All database tables include `tenant_id` with Row-Level Security (RLS) to prevent data leakage.

4. **Cost Optimization**: Three-tier AI routing reduces costs by 75-85% while maintaining quality.

5. **Self-Hosted LiveKit**: Achieves 95-97% cost savings vs. managed services (~$1.6K-6K/year vs $60K-120K+/year).

### Current Status

**Production Readiness**: ~60% (per comprehensive audit in `docs/claude-audit-report.md`)

**Completed Phases (1-8)**:
- ✅ Project scaffolding (Turborepo + pnpm)
- ✅ Database schema (18 tables, 56 RLS policies)
- ✅ Backend APIs (5 tRPC routers, **1 using mock data - CRITICAL**)
- ✅ Frontend apps (4 applications)
- ✅ AI integration + LiveKit agent (1000+ lines production code)
- ✅ Real-time features (WebSocket + Redis Streams)
- ✅ Widget SDK (NPM package, 52-86KB gzipped)
- ✅ Security hardening (Argon2id, TOTP MFA, GDPR)

**Critical Issues** (per audit):
- **6 CRITICAL findings** requiring immediate fixes
- **Test coverage: 3.2%** (needs 80%+ for production)
- **AI Personalities router using mock data** (production-blocking)
- **Version ranges** (^) violating pinning policy in 7+ package.json files
- **Security score: 60/100** (target 95/100 for production)
- **CSRF protection** framework ready but frontend integration pending

**In Progress/Planned**:
- 🔄 Phase 9: Staging deployment (documentation only, not deployed)
- 📋 Phase 10-12: Production deployment, monitoring, optimization

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────┬─────────────┬─────────────┬──────────────────────┤
│  Landing    │  Dashboard  │   Meeting   │   Embeddable Widget  │
│  (Port 5173)│ (Port 5174) │ (Port 5175) │     (Port 5176)      │
│  Marketing  │   Admin     │  LiveKit    │   Customer Sites     │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────┬───────────┘
       │             │             │                 │
       │             └─────────────┼─────────────────┘
       │                           │
       │                    ┌──────▼──────┐
       │                    │   tRPC API  │
       │                    │ (Port 3001) │
       │                    └──────┬──────┘
       │                           │
       ├───────────────────────────┼───────────────────────────┐
       │                           │                           │
┌──────▼──────┐           ┌────────▼────────┐       ┌─────────▼────────┐
│  WebSocket  │           │   PostgreSQL    │       │   Redis 7.4.2+   │
│  + Redis    │           │   16.7+ with    │       │   + Streams      │
│  Streams    │           │    pgvector     │       │   + Sessions     │
│ (Port 3002) │           └─────────────────┘       └──────────────────┘
└─────────────┘
       │
       │
┌──────▼──────────────────────────────────────────┐
│              LiveKit Infrastructure              │
├──────────────────────────────────────────────────┤
│  • LiveKit Server (WebRTC SFU)                   │
│  • Python LiveKit Agent (Vision + Voice + Text)  │
│  • Screen Sharing (1 FPS + pHash deduplication)  │
└──────────────────────────────────────────────────┘
```

### Monorepo Structure

The project uses **Turborepo** to orchestrate a monorepo with the following structure:

```
platform/
├── apps/                          # Deployable applications
│   ├── landing/                   # Public marketing site (@platform/landing)
│   ├── dashboard/                 # Admin portal (@platform/dashboard)
│   ├── meeting/                   # Meeting rooms (@platform/meeting)
│   └── widget-sdk/                # Embeddable widget (@platform/widget-sdk)
│
├── packages/                      # Shared packages
│   ├── api/                       # Fastify + tRPC server (@platform/api)
│   ├── api-contract/              # tRPC router definitions (@platform/api-contract)
│   ├── realtime/                  # WebSocket + Redis Streams (@platform/realtime)
│   ├── db/                        # Drizzle ORM schemas (@platform/db)
│   ├── auth/                      # Auth.js authentication (@platform/auth)
│   ├── ai-core/                   # AI provider abstractions (@platform/ai-core)
│   ├── knowledge/                 # RAG system (@platform/knowledge)
│   ├── shared/                    # Common utilities (@platform/shared)
│   └── ui/                        # Shared UI components (@platform/ui)
│
├── livekit-agent/                 # Python LiveKit agent (standalone)
│
├── infrastructure/                # Infrastructure as code
│   ├── docker/                    # Docker Compose for local dev
│   └── kubernetes/                # K8s manifests (Phase 9+)
│
└── docs/                          # Documentation
    ├── architecture/              # System design docs
    ├── guides/                    # Implementation guides
    ├── reference/                 # API specs, schemas
    └── implementation/            # Phase-by-phase docs
```

**Why Monorepo?**

1. **Code Sharing**: Common types, utilities, and components shared across apps
2. **Coordinated Builds**: Turborepo builds dependencies in correct order
3. **Type Safety**: Changes to shared packages immediately reflect in dependent apps
4. **Single Source of Truth**: All code in one repository, easier versioning

**Package Naming Convention**: `@platform/package-name` for internal packages.

### Technology Stack

**Frontend**:
- React 18.3.1 (UI library)
- Vite 6.0.5 (build tool, 100x faster than Webpack)
- TailwindCSS v4.1.14 (utility-first CSS, 3.5x faster builds)
- shadcn/ui (copy-paste component library)
- TypeScript 5.7.2 (type safety)

**Backend**:
- Fastify 5.3.2+ (high-performance HTTP server, 3x faster than Express)
- tRPC v11 (type-safe APIs without code generation)
- Drizzle ORM (TypeScript ORM for PostgreSQL)
- Auth.js v5 (authentication framework, SOC 2 certified)

**Database**:
- PostgreSQL 16.7+ (primary database)
- pgvector extension (1024-dim vector embeddings for RAG)
- Redis 7.4.2+ (caching, sessions, message queue)
- PgBouncer (connection pooling)

**Real-time**:
- WebSocket (bidirectional communication)
- Redis Streams (message broadcasting)
- LiveKit (WebRTC for video/audio/screen sharing)

**AI Providers**:
- OpenAI (GPT-4o, GPT-4o-mini for text)
- Anthropic (Claude Sonnet 4.5 for complex queries)
- Google (Gemini Flash, Gemini Flash-Lite 8B for vision)
- Deepgram (speech-to-text)
- ElevenLabs (text-to-speech)
- Voyage AI (multimodal embeddings for RAG)

**Tooling**:
- Turborepo (monorepo orchestration)
- pnpm (fast, disk-efficient package manager)
- Biome (linting + formatting in single tool)
- TypeScript strict mode (no implicit any)
- Docker Compose (local development)
- Kubernetes (production deployment, Phase 9+)

---

## Core Technologies

### Turborepo: Monorepo Orchestration

**What is Turborepo?**

Turborepo is a **high-performance build system** for JavaScript/TypeScript monorepos. It intelligently caches build outputs and parallelizes tasks across packages.

**Key Features**:
- **Dependency-aware builds**: Builds packages in correct order
- **Smart caching**: Skips rebuilding unchanged packages
- **Parallel execution**: Runs independent tasks simultaneously
- **Remote caching**: Share build artifacts across team (not configured yet)

**Configuration** (`turbo.json`):
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],          // Build dependencies first
      "outputs": ["dist/**", ".next/**"]
    },
    "typecheck": {
      "cache": false                     // Always run type checks
    },
    "lint": {},
    "dev": {
      "cache": false,                    // No caching for dev servers
      "persistent": true                 // Keep dev servers running
    }
  }
}
```

**Common Commands**:
```bash
pnpm build              # Build all packages in dependency order
pnpm dev                # Start all dev servers (parallel)
pnpm typecheck          # Type-check all packages
pnpm lint               # Lint all packages
```

**How It Works**:

1. Parse `turbo.json` to understand task dependencies
2. Build dependency graph of packages
3. Execute tasks in parallel where possible
4. Cache successful outputs
5. Skip rebuilding if inputs unchanged

### pnpm: Fast Package Manager

**What is pnpm?**

pnpm is a **fast, disk-efficient package manager** that uses a content-addressable store. Unlike npm/yarn, it creates hard links instead of copying packages.

**Why pnpm?**

1. **Disk Efficiency**: Packages stored once in global store (~70% space savings)
2. **Speed**: 2-3x faster installs than npm
3. **Strict**: Prevents access to unlisted dependencies (no phantom dependencies)
4. **Monorepo Native**: Workspace support built-in

**Workspace Configuration** (`pnpm-workspace.yaml`):
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Key Commands**:
```bash
pnpm install                 # Install all dependencies
pnpm add lodash              # Add to root workspace
pnpm add lodash --filter @platform/api  # Add to specific package
pnpm -r exec <command>       # Run command in all packages
```

**Version Pinning Policy** (CRITICAL):

**MANDATORY**: All dependencies must use **exact versions** (no `^` or `~` ranges).

```json
// ✅ CORRECT
{
  "dependencies": {
    "react": "18.3.1",
    "typescript": "5.7.2"
  }
}

// ❌ WRONG - Violates pinning policy
{
  "dependencies": {
    "react": "^18.3.1",      // Allows 18.x.x updates
    "typescript": "~5.7.2"   // Allows 5.7.x updates
  }
}
```

**Why Exact Versions?**
- **Deterministic Builds**: Same code → identical builds
- **No Surprise Breakages**: Prevent automatic breaking changes
- **Reproducible Deployments**: CI/CD produces consistent results
- **Security Control**: Explicit approval for updates

**Current Issue**: Audit found version ranges (`^`) in 7+ package.json files (**CRITICAL** violation).

### TypeScript: Type Safety

**What is TypeScript?**

TypeScript is a **statically-typed superset of JavaScript** that compiles to plain JavaScript. It adds optional static types, classes, and interfaces.

**Why TypeScript?**

1. **Catch Errors Early**: Type errors caught at compile-time, not runtime
2. **Better IDE Support**: Autocomplete, refactoring, go-to-definition
3. **Self-Documenting**: Types serve as inline documentation
4. **Safer Refactoring**: Compiler catches breaking changes

**Configuration** (`tsconfig.json` base):
```json
{
  "compilerOptions": {
    "strict": true,                    // Enable all strict checks
    "target": "ES2022",                // Modern JavaScript
    "module": "ESNext",                // ES modules
    "moduleResolution": "bundler",     // Vite-compatible resolution
    "esModuleInterop": true,           // CommonJS compatibility
    "skipLibCheck": true,              // Skip type-checking .d.ts files
    "resolveJsonModule": true,         // Import JSON files
    "isolatedModules": true,           // Each file is separate module
    "noUncheckedIndexedAccess": true,  // arr[0] is T | undefined
    "noUnusedLocals": true,            // Error on unused variables
    "noUnusedParameters": true,        // Error on unused function params
    "noFallthroughCasesInSwitch": true // Error on missing switch breaks
  }
}
```

### tRPC: Type-Safe APIs

**What is tRPC?**

tRPC is a **type-safe RPC (Remote Procedure Call) framework** for TypeScript. It enables sharing types between client and server without code generation.

**Why tRPC?**

1. **End-to-End Type Safety**: Frontend knows exact API shape
2. **No Code Generation**: Types shared directly via TypeScript
3. **Autocomplete Everywhere**: IDE autocomplete for API calls
4. **Compile-Time Errors**: API contract drift caught immediately
5. **Developer Experience**: Feels like calling local functions

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                   @platform/api-contract                    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  export const appRouter = router({                 │   │
│  │    auth: authRouter,                               │   │
│  │    users: usersRouter,                             │   │
│  │    widgets: widgetsRouter,                         │   │
│  │    // ... other routers                            │   │
│  │  });                                               │   │
│  │                                                     │   │
│  │  export type AppRouter = typeof appRouter;        │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
           ┌────────────────┴────────────────┐
           │                                 │
           ▼                                 ▼
┌────────────────────┐           ┌────────────────────┐
│   @platform/api    │           │  Frontend Apps     │
│   (Server)         │           │  (Client)          │
│                    │           │                    │
│  fastifyTRPCPlugin │           │  trpc.useQuery()   │
│  .withContext()    │           │  trpc.useMutation()│
└────────────────────┘           └────────────────────┘
```

**Example Router**:
```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { users } from '@platform/db/schema';
import { eq } from 'drizzle-orm';

export const usersRouter = router({
  // List users (tenant-scoped)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.query.users.findMany({
        where: eq(users.tenantId, ctx.tenantId),
      });
    }),

  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return user;
    }),
});
```

**Client Usage** (Frontend):
```typescript
import { trpc } from '@/utils/trpc';

function UserList() {
  // ✅ Fully typed, autocomplete works
  const { data: users, isLoading } = trpc.users.list.useQuery();

  const getUserMutation = trpc.users.getById.useMutation();

  const handleGetUser = async (id: string) => {
    const user = await getUserMutation.mutateAsync({ id });
    // user is typed as User
  };

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  );
}
```

---

## Database Architecture

### PostgreSQL with pgvector

**What is PostgreSQL?**

PostgreSQL is an **open-source relational database** known for reliability, feature robustness, and performance. It's ACID-compliant with advanced features like JSON support, full-text search, and extensions.

**Why PostgreSQL?**

1. **ACID Compliance**: Transactions guarantee data integrity
2. **Advanced Features**: CTEs, window functions, JSON operators
3. **Extensions**: pgvector for vector embeddings, PostGIS for geospatial
4. **Row-Level Security**: Built-in tenant isolation
5. **Mature Ecosystem**: 30+ years of development

**What is pgvector?**

pgvector is a PostgreSQL extension for **vector embeddings** used in AI/ML applications. It enables:
- **Similarity Search**: Find similar documents/images via cosine distance
- **RAG (Retrieval-Augmented Generation)**: Retrieve relevant context for LLMs
- **Semantic Search**: Search by meaning, not just keywords

### Database Schema (18 Tables)

**Schema Location**: `packages/db/src/schema/index.ts` (597 lines)

**Table Categories**:

#### Core Tables (6)
1. **`tenants`**: Customer organizations (multi-tenancy root)
2. **`users`**: User accounts with Argon2id password hashing
3. **`widgets`**: Embeddable widget configurations
4. **`meetings`**: LiveKit meeting rooms
5. **`sessions`**: Active sessions (non-Auth.js)
6. **`messages`**: Chat messages (real-time + history)

#### Auth.js Tables (3)
7. **`accounts`**: OAuth provider accounts (Google, Microsoft)
8. **`auth_sessions`**: Auth.js session storage
9. **`verification_tokens`**: Email verification, password reset

#### Knowledge Base (2)
10. **`knowledge_documents`**: Uploaded documents for RAG
11. **`knowledge_chunks`**: Chunked text with 1024-dim embeddings

#### Cost Tracking (3)
12. **`cost_events`**: Per-request AI cost tracking
13. **`cost_summaries`**: Aggregated cost reports
14. **`budget_alerts`**: Threshold-based cost alerts

#### AI Configuration (1)
15. **`ai_personalities`**: Custom AI assistant personalities

#### Security Tables (3)
16. **`api_keys`**: Service account API keys
17. **`audit_logs`**: Comprehensive audit trail
18. **`data_requests`**: GDPR data export/deletion requests

**Example Schema** (`users` table):
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordAlgorithm: text('password_algorithm', {
    enum: ['bcrypt', 'argon2id']
  }).notNull().default('bcrypt'),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  name: text('name'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Drizzle ORM

**What is Drizzle ORM?**

Drizzle is a **TypeScript-first ORM** that provides type-safe database queries with minimal overhead. It's designed to feel like writing SQL while maintaining full type safety.

**Why Drizzle?**

1. **Type Safety**: Queries are fully typed, errors caught at compile-time
2. **SQL-Like**: Familiar syntax for SQL developers
3. **Lightweight**: No runtime overhead, compiles to SQL
4. **Migrations**: Schema changes tracked in code
5. **Relational Queries**: Joins, relations, eager loading

**Common Query Patterns**:

```typescript
import { db } from '@platform/db';
import { users, tenants } from '@platform/db/schema';
import { eq, and, like } from 'drizzle-orm';

// Simple query
const allUsers = await db.query.users.findMany();

// Filter by tenant (CRITICAL for multi-tenancy)
const tenantUsers = await db.query.users.findMany({
  where: eq(users.tenantId, currentTenantId),
});

// Complex query with joins
const usersWithTenants = await db
  .select()
  .from(users)
  .leftJoin(tenants, eq(users.tenantId, tenants.id))
  .where(eq(users.tenantId, currentTenantId));

// Insert
const newUser = await db
  .insert(users)
  .values({
    tenantId: currentTenantId,
    email: 'user@example.com',
    passwordHash: hashedPassword,
  })
  .returning();

// Update
await db
  .update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, userId));

// Delete
await db
  .delete(users)
  .where(eq(users.id, userId));
```

**Migrations**:
```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema changes (dev only, no migration files)
pnpm db:push
```

**⚠️ CRITICAL**: Drizzle has **NO automatic tenant filtering**. Every query MUST manually include `tenant_id` filter to prevent data leakage. This is a catastrophic security risk if developers forget.

### Row-Level Security (RLS)

**What is Row-Level Security?**

RLS is a PostgreSQL feature that **automatically filters rows** based on policies. Users can only see/modify rows they're authorized to access.

**Why RLS?**

1. **Defense in Depth**: Security at database level, not just application
2. **Prevents Data Leakage**: Impossible to query other tenants' data
3. **Compliance**: GDPR, SOC 2 require strong data isolation
4. **Developer Safety**: Can't forget to filter by tenant_id

**Implementation** (`packages/db/migrations/008_rls_policies.sql`):

```sql
-- Enable RLS on users table (FORCE mode)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;  -- Applies to table owner too

-- Helper function to get current tenant from session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- SELECT policy: Only see your tenant's rows
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- INSERT policy: Can only insert into your tenant
CREATE POLICY users_insert_policy ON users
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- UPDATE policy: Can only update your tenant's rows
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- DELETE policy: Can only delete your tenant's rows
CREATE POLICY users_delete_policy ON users
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());
```

**Usage in Application**:

```typescript
// Set tenant context at request start
await db.execute(sql`
  SET LOCAL app.current_tenant_id = ${tenantId};
`);

// Now all queries are automatically filtered
const users = await db.query.users.findMany();
// Returns ONLY current tenant's users, even without WHERE clause
```

**Status**: 56 RLS policies implemented across all 18 tables (Migration 008).

**Critical**: FORCE RLS is enabled, meaning policies apply even to table owner (prevents superuser bypass).

### Connection Pooling with PgBouncer

**What is Connection Pooling?**

Connection pooling **reuses database connections** instead of creating new ones for each request. This dramatically reduces overhead.

**Why PgBouncer?**

1. **Lightweight**: Only ~10MB memory overhead
2. **Fast**: Written in C, minimal latency
3. **Transparent**: Applications connect to PgBouncer like PostgreSQL
4. **Session Pooling**: Maintains session-level settings (needed for RLS)

**Configuration** (`pgbouncer.ini`):
```ini
[databases]
platform = host=postgres port=5432 dbname=platform

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = session             # Required for RLS (SET LOCAL)
max_client_conn = 1000          # Max client connections
default_pool_size = 50          # Connections per database
min_pool_size = 10              # Keep 10 connections warm
reserve_pool_size = 20          # Extra for spikes
```

**Application Configuration**:
```bash
# Connect through PgBouncer (port 6432) instead of PostgreSQL (port 5432)
DATABASE_URL="postgresql://platform:password@localhost:6432/platform"
```

**Multi-Tenant Session Management**:
- **Session Mode**: Each client gets dedicated connection while active
- **SET LOCAL**: Tenant context (app.current_tenant_id) preserved per connection
- **Connection Reuse**: After client disconnects, connection returned to pool
- **Scaling**: 50-100 pooled connections handle 1000+ concurrent clients

---

## Authentication & Security

### Auth.js (NextAuth.js)

**What is Auth.js?**

Auth.js (formerly NextAuth.js) is an **open-source authentication framework** for web applications. It's SOC 2 certified with 3.8M weekly npm downloads.

**Why Auth.js?**

1. **Industry Standard**: Used by thousands of production apps
2. **SOC 2 Certified**: Meets enterprise compliance requirements
3. **Provider Support**: OAuth (Google, Microsoft, GitHub), email, credentials
4. **Security First**: Built-in CSRF protection, secure session handling
5. **Database Adapters**: Drizzle, Prisma, TypeORM support

**Why Not Lucia?**

Lucia v4 was deprecated March 2025, converted to "learning resource only" with no npm package. Auth.js is the recommended migration path.

**Configuration** (`packages/auth/src/auth.config.ts`):
```typescript
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@platform/db';
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Microsoft, GitHub, etc.
  ],
  session: {
    strategy: 'database',  // Store sessions in PostgreSQL
    maxAge: 30 * 24 * 60 * 60,  // 30 days
  },
  callbacks: {
    async session({ session, user }) {
      // Add tenant info to session
      session.user.tenantId = user.tenantId;
      session.user.role = user.role;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
```

**Database Schema** (Auth.js tables):
- **`accounts`**: OAuth provider linkage (Google, Microsoft)
- **`auth_sessions`**: Active sessions with expiry
- **`verification_tokens`**: Email verification, password reset

**Session Flow**:

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. Google returns authorization code
4. Auth.js exchanges code for tokens
5. Creates/updates user in `users` table
6. Creates session in `auth_sessions` table
7. Sets secure HTTP-only session cookie
8. Future requests include cookie, session loaded automatically

**Security Features**:
- **CSRF Protection**: State parameter in OAuth flow (PKCE)
- **Secure Cookies**: HTTP-only, Secure, SameSite=Lax
- **Session Rotation**: Session ID changes on privilege escalation
- **Token Encryption**: JWE encryption for JWT sessions (not used)

### Password Security (Argon2id)

**What is Argon2id?**

Argon2id is a **password hashing algorithm** that won the Password Hashing Competition in 2015. It's designed to be resistant to GPU/ASIC attacks.

**Why Argon2id over bcrypt?**

1. **Memory-Hard**: Requires significant RAM (prevents GPU brute-force)
2. **Modern Design**: Incorporates lessons from 20+ years of cryptography
3. **Configurable**: Memory cost, time cost, parallelism tunable
4. **Side-Channel Resistant**: Protects against timing attacks

**Implementation** (`packages/auth/src/password.ts`):
```typescript
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 65536,      // 64 MB memory
    timeCost: 3,            // 3 iterations
    outputLen: 32,          // 32-byte hash
    parallelism: 4,         // 4 parallel threads
    algorithm: 'Argon2id',  // Hybrid (Argon2i + Argon2d)
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}
```

**Migration from bcrypt**:
- Existing users have `password_algorithm = 'bcrypt'`
- On next login, rehash password with Argon2id
- Update `password_algorithm = 'argon2id'`

**Password Policy**:
- Minimum 12 characters (configurable)
- No complexity requirements (passphrases preferred)
- Check against leaked password databases (haveibeenpwned)
- Rate limiting: 5 attempts per 15 minutes

### Multi-Factor Authentication (TOTP)

**What is TOTP?**

TOTP (Time-based One-Time Password) is a **2FA method** that generates 6-digit codes valid for 30 seconds. Used by Google Authenticator, Authy, 1Password.

**Why TOTP?**

1. **Industry Standard**: Supported by all major 2FA apps
2. **Offline**: No internet required (unlike SMS)
3. **No Phone Dependency**: Works on any device
4. **Proven Security**: 10+ years of widespread use

**Implementation** (`packages/auth/src/mfa.ts`):
```typescript
import * as OTPAuth from 'otpauth';
import * as crypto from 'node:crypto';

// Generate TOTP secret for new user
export function generateMFASecret(): { secret: string; qrCode: string } {
  const secret = new OTPAuth.Secret({ size: 20 });  // 160-bit secret

  const totp = new OTPAuth.TOTP({
    issuer: 'Enterprise AI Platform',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    qrCode: totp.toString(),  // otpauth://totp/...
  };
}

// Verify TOTP code
export function verifyMFACode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  // Allow 1 period before/after (90-second window)
  const delta = totp.validate({
    token: code,
    window: 1,
  });

  return delta !== null;
}
```

**Enrollment Flow**:
1. User enables MFA in settings
2. Generate TOTP secret, store in `users.mfa_secret`
3. Display QR code (otpauth:// URI)
4. User scans with authenticator app
5. User enters code to confirm
6. Set `users.mfa_enabled = true`

**Login Flow with MFA**:
1. User enters email + password (verified with Argon2id)
2. If `mfa_enabled = true`, prompt for TOTP code
3. Verify code against stored secret
4. Create session only if valid

**Recovery Codes**:
- Generate 10 single-use backup codes on MFA enrollment
- Store hashed (SHA-256) in separate table
- Allow login if TOTP device lost

### CSRF Protection

**What is CSRF?**

CSRF (Cross-Site Request Forgery) is an attack where a **malicious site tricks the browser** into making unauthorized requests to your site using the user's session.

**Example Attack**:
```html
<!-- Evil site: evil.com -->
<img src="https://platform.com/api/delete-account" />
```

If user is logged into `platform.com`, the browser automatically sends session cookie with the request, deleting their account.

**Prevention Strategy**:

1. **SameSite Cookies**: `SameSite=Lax` prevents cookies on cross-origin POST requests
2. **CSRF Tokens**: Random token in form/header, validated on server
3. **Origin Header Check**: Verify request came from allowed origin

**Implementation** (`packages/api/src/middleware/csrf.ts`):
```typescript
import fastifyCsrf from '@fastify/csrf-protection';

// CSRF token generation
await fastify.register(fastifyCsrf, {
  sessionPlugin: '@fastify/session',
  cookieOpts: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
});

// Usage in frontend forms
<form method="POST" action="/api/update-profile">
  <input type="hidden" name="_csrf" value={csrfToken} />
  <!-- form fields -->
</form>
```

**tRPC Integration**:
- tRPC mutations include CSRF token in headers
- Fastify middleware validates token before tRPC handler
- Invalid token = 403 Forbidden

**Current Status**: Framework ready, frontend integration pending (**CRITICAL** for production).

---

## API Design

### Fastify: High-Performance HTTP Server

**What is Fastify?**

Fastify is a **high-performance Node.js web framework** focused on speed and developer experience. It's 3x faster than Express.

**Why Fastify?**

1. **Performance**: 3x faster than Express (76K req/sec vs 25K)
2. **Schema Validation**: Built-in JSON Schema validation
3. **TypeScript**: First-class TypeScript support
4. **Plugin System**: Encapsulation and composability
5. **Low Overhead**: Minimal abstraction, close to raw Node.js

**Configuration** (`packages/api/src/server.ts`):
```typescript
import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',  // Pretty logs in dev
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  requestIdLogLabel: 'reqId',  // Track requests
  disableRequestLogging: false,
});

// CORS
await fastify.register(import('@fastify/cors'), {
  origin: [
    'http://localhost:5173',  // Landing
    'http://localhost:5174',  // Dashboard
    'http://localhost:5175',  // Meeting
    'http://localhost:5176',  // Widget
  ],
  credentials: true,  // Allow cookies
});

// Rate limiting
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,  // 100 requests
  timeWindow: '1 minute',
  cache: 10000,  // Cache 10K IPs
});

// tRPC
await fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

// Start server
await fastify.listen({ port: 3001, host: '0.0.0.0' });
```

### Error Handling

**tRPC Error Codes**:
```typescript
import { TRPCError } from '@trpc/server';

// Standard error codes
throw new TRPCError({ code: 'UNAUTHORIZED' });     // 401
throw new TRPCError({ code: 'FORBIDDEN' });        // 403
throw new TRPCError({ code: 'NOT_FOUND' });        // 404
throw new TRPCError({ code: 'CONFLICT' });         // 409
throw new TRPCError({ code: 'BAD_REQUEST' });      // 400
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' }); // 500

// With custom message
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Email already exists',
  cause: originalError,  // For logging
});
```

---

## Real-time Communication

### WebSocket Architecture

**What is WebSocket?**

WebSocket is a **full-duplex communication protocol** over TCP. Unlike HTTP, it maintains a persistent connection for bidirectional data flow.

**Why WebSocket?**

1. **Low Latency**: No HTTP overhead for each message
2. **Bidirectional**: Server can push updates to client
3. **Efficient**: Single connection vs. polling (HTTP requests every N seconds)
4. **Real-time**: Instant message delivery for chat, notifications

**HTTP vs WebSocket**:
```
HTTP (Request-Response):
Client → [Request] → Server
Client ← [Response] ← Server
(New connection for each request)

WebSocket (Persistent Connection):
Client ↔ [Bidirectional Stream] ↔ Server
(Messages flow in both directions)
```

### Redis Streams for Multi-Instance

**Problem**: Multiple API servers running behind load balancer. WebSocket connections distributed across instances. How to broadcast messages to all clients?

**Solution**: Redis Streams act as a **message queue** that all instances consume.

**What are Redis Streams?**

Redis Streams is a **durable message queue** with consumer groups. It's similar to Kafka but simpler.

**Key Concepts**:

1. **Stream**: Append-only log of messages (like Kafka topic)
2. **Consumer Group**: Set of consumers that share message processing
3. **Consumer**: Individual server instance reading from stream
4. **Message ID**: Auto-generated timestamp-based ID (e.g., `1234567890-0`)

---

## AI Integration

### Cost-Optimized AI Routing

**Goal**: Reduce AI costs by 75-85% while maintaining quality.

**Strategy**: Three-tier routing based on query complexity.

**Tier 1: GPT-4o-mini (70% of queries)**
- **Use Cases**: Simple FAQs, greetings, basic information retrieval
- **Cost**: $0.15/1M input tokens, $0.60/1M output tokens
- **Latency**: <500ms

**Tier 2: GPT-4o (25% of queries)**
- **Use Cases**: Complex questions, multi-step reasoning, domain-specific queries
- **Cost**: $5.00/1M input tokens, $15.00/1M output tokens
- **Latency**: <2s

**Tier 3: Claude Sonnet 4.5 (5% of queries)**
- **Use Cases**: Critical decisions, legal/medical advice, advanced coding
- **Cost**: $3.00/1M input tokens, $15.00/1M output tokens
- **Latency**: <3s

**Cost Savings Calculation**:

**Before (GPT-4o only)**:
- 1M queries/month × 500 tokens avg = 500M tokens
- Input: 500M × $5.00/1M = $2,500
- Output: 500M × $15.00/1M = $7,500
- **Total**: $10,000/month

**After (Three-tier routing)**:
- 70% on GPT-4o-mini: 350M × ($0.15 + $0.60)/1M = $262.50
- 25% on GPT-4o: 125M × ($5.00 + $15.00)/1M = $2,500
- 5% on Claude Sonnet: 25M × ($3.00 + $15.00)/1M = $450
- **Total**: $3,212.50/month
- **Savings**: 67.9%

### LiveKit Python Agent (Three-Tier Vision Escalation)

**What is LiveKit?**

LiveKit is an **open-source WebRTC platform** for video/audio/screen sharing. It provides a Selective Forwarding Unit (SFU) that routes media streams efficiently.

**Three-Tier Vision Escalation** (Attempt-Based):

**Problem**: Screen capture at 30 FPS with GPT-4o Vision costs ~$50/hour per user.

**Solution**:
1. **Reduce FPS**: 1 FPS screen capture (96% cost reduction)
2. **Frame Deduplication**: Perceptual hashing (pHash) with threshold=10 (60-75% additional reduction)
3. **Smart Escalation**: Start with cheap model, escalate only if needed

**Attempt 1** (60% of resolutions):
- **Model**: Gemini Flash-Lite 8B ($0.075/1M input tokens)
- **Vision**: pHash algorithm (no re-processing)
- **Cost**: ~$0.06/resolution

**Attempt 2** (25% of resolutions):
- **Model**: Gemini Flash ($0.15/1M input tokens)
- **Vision**: pHash algorithm (no re-processing)
- **Cost**: ~$0.08/resolution

**Attempt 3** (15% of resolutions):
- **Model**: Claude Sonnet 4.5 ($3.00/1M input tokens)
- **Vision**: pHash algorithm (no re-processing)
- **Cost**: ~$0.40/resolution

**Philosophy**: "Upgrade the brain, not the eyes" - pHash maintained across all attempts.

**Worst-case**: All 3 attempts = $0.54/resolution (under $0.70 overage)

**Result**: 85% cost reduction through smart escalation + frame deduplication

**Status**: ✅ Production implementation complete (1000+ lines)

**Documentation**: See `livekit-agent/README.md` (2365 lines)

### Knowledge Enhancement (RAG)

**What is RAG?**

RAG (Retrieval-Augmented Generation) is a technique where an LLM is given **relevant context** from a knowledge base before answering. This improves accuracy and reduces hallucinations.

**Why RAG?**

1. **Domain Knowledge**: Include company-specific information not in training data
2. **Accuracy**: Grounded responses based on actual documents
3. **Citations**: Reference source documents for transparency
4. **Cost-Effective**: Cheaper than fine-tuning models

**RAG Pipeline**:
```
1. Ingestion:
   Document → Chunk (1000 chars) → Embed (Voyage) → Store (pgvector)

2. Retrieval:
   Query → Embed → Search (cosine similarity) → Top 5 chunks

3. Generation:
   Prompt = System + Query + Chunks → LLM → Answer
```

---

## Frontend Applications

### React 18 + Vite 6

**What is React?**

React is a **declarative UI library** for building component-based user interfaces. It uses a virtual DOM for efficient updates.

**Why React?**

1. **Component-Based**: Reusable, composable UI building blocks
2. **Declarative**: Describe UI state, React handles DOM updates
3. **Ecosystem**: Massive library ecosystem, tooling, community
4. **Performance**: Virtual DOM minimizes expensive DOM operations

**What is Vite?**

Vite is a **next-generation build tool** that leverages native ES modules for instant dev server startup (100x faster than Webpack).

**Why Vite?**

1. **Speed**: <100ms hot module reload (HMR)
2. **ESM Native**: Uses browser-native ES modules
3. **Optimized**: Pre-bundles dependencies with esbuild
4. **Plugin Ecosystem**: Compatible with Rollup plugins

### TailwindCSS v4

**What is TailwindCSS?**

TailwindCSS is a **utility-first CSS framework** where you style elements by composing utility classes.

**Traditional CSS**:
```css
.button {
  background-color: blue;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}
```

**Tailwind CSS**:
```html
<button class="bg-blue-500 text-white px-4 py-2 rounded">
  Click me
</button>
```

**Why Tailwind v4?**

1. **100x Faster Builds**: CSS-first configuration (no tailwind.config.js)
2. **3.5x Faster Incremental Builds**: Optimized change detection
3. **<100ms HMR**: Near-instant hot reload
4. **Simpler**: CSS-only config via @theme directive

---

## Deployment & Operations

### Docker Compose (Local Development)

**Configuration** (`infrastructure/docker/docker-compose.yml`):
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16.7
    container_name: platform-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-platform}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-platform_dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-platform}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U platform"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4.2-alpine
    container_name: platform-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-platform_redis_password}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

**Commands**:
```bash
# Start databases
pnpm db:up

# Stop databases
pnpm db:down

# View logs
docker compose -f infrastructure/docker/docker-compose.yml logs -f

# Reset databases (DANGER: deletes all data)
pnpm db:reset
```

---

## Development Workflow

### Getting Started

```bash
# 1. Clone repository
git clone https://github.com/your-org/platform.git
cd platform

# 2. Install dependencies
pnpm install

# 3. Start databases
pnpm db:up

# 4. Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# 5. Push database schema
pnpm db:push

# 6. Seed test data
pnpm db:seed

# 7. Start development servers
pnpm dev
```

**Access Points**:
- Landing: http://localhost:5173
- Dashboard: http://localhost:5174
- Meeting: http://localhost:5175
- Widget: http://localhost:5176
- API: http://localhost:3001
- Realtime: ws://localhost:3002

### Making Changes

**Workflow**:
1. **Create branch**: `git checkout -b feature/my-feature`
2. **Make changes**: Edit code in appropriate package
3. **Type-check**: `pnpm typecheck` (must pass)
4. **Lint**: `pnpm lint` (must pass)
5. **Test**: `pnpm test` (must pass)
6. **Build**: `pnpm build` (must succeed)
7. **Commit**: `git commit -m "feat: add my feature"`
8. **Push**: `git push origin feature/my-feature`
9. **Pull Request**: Create PR on GitHub

---

## Best Practices

### Security Best Practices

1. **Input Validation**: Always validate with Zod schemas
2. **Tenant Isolation**: Include `tenant_id` filter in all queries
3. **Authentication**: Use Auth.js, never roll your own
4. **Password Hashing**: Argon2id with proper parameters
5. **HTTPS Only**: Force HTTPS in production (HSTS header)
6. **CSRF Protection**: Validate CSRF tokens on mutations
7. **Rate Limiting**: Prevent abuse and DDoS attacks
8. **Audit Logging**: Log all security-relevant events
9. **Secrets Management**: Never commit secrets, use env vars
10. **Dependency Updates**: Regular security patches

### Performance Best Practices

1. **Database Indexes**: Create indexes for all WHERE/JOIN columns
2. **Connection Pooling**: Use PgBouncer for PostgreSQL
3. **Caching**: Cache expensive queries in Redis
4. **Pagination**: Never load all rows, use LIMIT/OFFSET
5. **N+1 Query Prevention**: Use Drizzle relations, not loops
6. **Bundle Splitting**: Code-split by route for faster loads
7. **Image Optimization**: WebP format, lazy loading
8. **CDN**: Serve static assets from CDN
9. **Monitoring**: Track slow queries, high memory usage
10. **Load Testing**: Test under realistic load before launch

---

## Troubleshooting

### Common Issues

**Issue 1: Database connection timeout**

**Symptoms**: `connect ETIMEDOUT` error when starting API server.

**Diagnosis**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs platform-postgres

# Test connection
psql postgresql://platform:platform_dev_password@localhost:5432/platform
```

**Solutions**:
- Start databases: `pnpm db:up`
- Check DATABASE_URL in .env matches docker-compose.yml
- Ensure PostgreSQL container is healthy: `docker ps`
- Verify firewall not blocking port 5432

---

## Appendix

### Glossary

**ACID**: Atomicity, Consistency, Isolation, Durability - database transaction guarantees.

**Argon2id**: Password hashing algorithm resistant to GPU/ASIC attacks.

**CORS**: Cross-Origin Resource Sharing - security mechanism for cross-domain requests.

**CSRF**: Cross-Site Request Forgery - attack using user's session to make unauthorized requests.

**Drizzle ORM**: TypeScript-first ORM for type-safe database queries.

**Fastify**: High-performance Node.js web framework (3x faster than Express).

**RAG**: Retrieval-Augmented Generation - LLM technique using knowledge base.

**RLS**: Row-Level Security - PostgreSQL feature for automatic row filtering.

**tRPC**: Type-safe RPC framework for TypeScript.

**WebSocket**: Full-duplex communication protocol over TCP.

### Reference Links

**Documentation**:
- Project README: `README.md`
- Comprehensive Audit: `docs/claude-audit-report.md`
- Architecture: `docs/architecture/`
- API Reference: `docs/reference/api.md`

**Technologies**:
- React: https://react.dev
- tRPC: https://trpc.io
- Fastify: https://fastify.dev
- Auth.js: https://authjs.dev
- LiveKit: https://livekit.io

**Security**:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity: https://www.nist.gov/cybersecurity

---

**Last Updated**: 2025-01-25
**Version**: 1.0.0
**Maintained By**: Platform Engineering Team
