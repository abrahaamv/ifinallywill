# Technical Stack - Complete Specification

## 🎯 Stack Philosophy

**Principles**:
1. **Production-grade from day one** - No shortcuts, enterprise architecture
2. **Cost-optimized** - Smart resource allocation, pay for what you use
3. **Developer experience** - Fast builds, type safety, excellent tooling
4. **Scalability built-in** - Horizontal scaling, multi-tenant ready

**Generic Code Name**: `platform` (used throughout codebase)

---

## 🏗️ Monorepo Architecture

### Build System
- **Turborepo 2.3+** - Intelligent caching (3-10x faster builds)
- **pnpm 9.0+** - Fast, disk-efficient package manager
- **TypeScript 5.7+** - Strict mode throughout

### Structure
```
platform/
├── apps/
│   ├── landing/             # Public marketing (www.platform.com) - Vite + React 18
│   ├── dashboard/           # Admin portal (dashboard.platform.com) - Vite + React 18
│   ├── meeting/             # Meeting rooms (meet.platform.com) - Vite + React 18
│   └── widget-sdk/          # Embeddable widget SDK (customer sites)
│
├── packages/
│   ├── shared/              # Shared utilities and types
│   ├── ui/                  # Shared component library (Button, Input, etc.)
│   ├── db/                  # Drizzle schemas + migrations + RLS policies
│   ├── auth/                # Auth.js (NextAuth.js) authentication utilities
│   ├── api-contract/        # tRPC router definitions
│   ├── api/                 # Fastify backend API server
│   ├── realtime/            # WebSocket + Redis Streams server
│   ├── ai-core/             # AI service abstractions (vision, voice, chat)
│   └── knowledge/           # RAG system + embeddings
│
├── livekit-agent/           # Python LiveKit agent (Phase 5 - COMPLETE)
│
├── infrastructure/
│   └── docker/              # Docker Compose (PostgreSQL, Redis)
│
└── docs/                    # Complete documentation
```

---

## 💻 Frontend Stack

### Core Framework
- **Vite 6** - Next-generation build tool
  - Ultra-fast HMR (Hot Module Replacement)
  - Optimized for library mode (widget)
  - Native ESM support
  - Better tree-shaking than webpack

### UI Library
- **React 18.3+** - UI framework
  - Concurrent features
  - Suspense for data fetching
  - Server components ready
  - **@vitejs/plugin-react-swc** (fastest compilation)

### Styling
- **TailwindCSS 4.0** - Utility-first CSS
  - **Pure Tailwind** (no Shadcn or component libraries)
  - Oxide engine (40% faster builds)
  - CSS-in-JS when needed
  - PostCSS plugins

### State Management
- **TanStack Query v5** - Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Pagination/infinite scroll

- **Zustand** - Client state management
  - Lightweight (1KB)
  - No boilerplate
  - DevTools integration

### Type Safety
- **tRPC v11** - End-to-end type safety
  - Auto-complete in frontend
  - No code generation
  - Runtime validation with Zod

- **Zod** - Schema validation
  - Runtime type checking
  - Form validation
  - API request/response validation

---

## ⚙️ Backend Stack

### HTTP Server
- **Fastify 5.3.2+** - Fastest Node.js framework ✅
  - **CRITICAL**: Minimum 5.3.2 for CVE-2025-32442 patch (content-type parsing bypass)
  - **3x faster than Express** (65K vs 20K req/sec)
  - Schema-based validation
  - Excellent TypeScript support
  - Plugin ecosystem
  - Low memory footprint

**Why Fastify**:
```typescript
// Benchmark (req/sec):
// Fastify: 65,000
// Hono:    80,000 (edge-optimized, smaller ecosystem)
// Express: 20,000

// We chose Fastify for:
// - Mature ecosystem
// - Battle-tested in production
// - Better Node.js optimization than edge frameworks
```

### API Layer
- **tRPC v11** - Type-safe RPC
  - End-to-end type safety
  - Auto-complete everywhere
  - No REST boilerplate
  - WebSocket support

- **Zod** - Validation
  - Runtime type checking
  - Parse & validate inputs
  - Error messages

### Runtime
- **Node.js 22 LTS** - JavaScript runtime
  - V8 performance improvements
  - Native ESM support
  - Built-in test runner

---

## 🗄️ Database Stack

### Primary Database
- **PostgreSQL 16+** - Relational database
  - **CRITICAL**: Minimum 17.3/16.7/15.11/14.16/13.19 for CVE-2025-1094 patch (SQL injection actively exploited)
  - ACID compliance
  - JSON support (JSONB)
  - Full-text search
  - Partitioning
  - **Row-level security (RLS)** - MANDATORY for multi-tenant isolation

### Vector Search
- **pgvector** - PostgreSQL extension
  - Vector similarity search
  - HNSW index (sub-linear complexity)
  - Hybrid search (semantic + keyword)
  - No separate vector database needed (cost savings)

### ORM
- **Drizzle ORM** - Type-safe database toolkit ✅
  - **⚠️ CRITICAL**: Drizzle has NO automatic tenant filtering - catastrophic data leakage risk
  - **REQUIRED**: Implement RLS policies or tenant wrapper for ALL queries
  - **100x faster than Prisma** (benchmarks)
  - SQL-first approach
  - No code generation lag
  - 5MB vs Prisma's 80MB bundle
  - Excellent edge/serverless performance
  - Modern PostgreSQL patterns (identity columns)

**Why Drizzle**:
```typescript
// Query performance (ms):
// Drizzle: 2-5ms
// Prisma:  150-300ms
// TypeORM: 100-200ms

// Bundle size:
// Drizzle: 5MB
// Prisma:  80MB (16x larger)
```

### Caching & Queue
- **Redis 7.4.2+** - In-memory data store
  - **CRITICAL**: Minimum 7.4.2+ (or 7.2.7+) for RCE vulnerability patches (CVSS 7.0-8.8)
  - **4 Critical CVEs**: CVE-2024-55656, CVE-2024-46981, CVE-2024-51737, CVE-2024-51480
  - **Redis Streams** (critical for WebSocket broadcasting)
  - Consumer groups for message distribution
  - Session storage
  - Rate limiting
  - Caching AI responses
  - Job queues (Bull MQ)

**Why Redis Streams is required**:
```
1. WebSocket broadcasting - Distribute messages across multiple API instances
2. Consumer groups - Horizontal scaling with reliable message delivery
3. Session storage - Fast <1ms reads
4. Rate limiting - Per-tenant limits
5. Caching - Reduce database load
```

---

## 🔄 Real-Time Communication

### Text Chat (Cost-Optimized)
- **WebSocket** - Bidirectional streaming
  - Native browser API (WebSocket standard)
  - Built-in auto-reconnect
  - **Sticky session support** (load balancer affinity required)
  - 98% browser support
  - Enables typing indicators, read receipts, presence tracking

**Cost**: $0.00001 per hour (negligible)

**Sticky Sessions Required**: Load balancer must route client to same server instance

### Voice + Screen Sharing
- **LiveKit Cloud Enterprise** - WebRTC infrastructure
  - **⚠️ BUDGET ALERT**: Enterprise plan REQUIRED ($5K-10K+/month minimum)
  - Build/Scale plans insufficient (cold starts, limited agents)
  - 99.99% uptime SLA
  - Sub-100ms global latency
  - Full desktop capture
  - Multi-participant rooms
  - AI agent support (40-100 worker pool required)
  - DataChannel for messages

**Cost**: $0.50-2.00 per hour (only when active) + Enterprise base fee

### Why WebSocket + LiveKit
```
WebSocket Advantages:
✅ Bidirectional communication (native support for typing, presence, etc.)
✅ Native browser support (WebSocket API)
✅ Auto-reconnect built-in
✅ HTTP/2 compatible
✅ Lower latency than HTTP polling
✅ Enables real-time features without complexity

Requirements:
⚠️  Sticky sessions (load balancer configuration)
⚠️  Redis Streams for multi-instance message distribution
```

---

## 🤖 AI Services Stack

### Vision Analysis (Screen Understanding)

**Tier 1: Edge Preprocessing** (0 cost)
- Motion detection (JavaScript)
- UI change detection (DOM hashing)
- Frame selection algorithm

**Tier 2: Routine Analysis** (85% of frames)
- **Google Gemini 2.5 Flash Lite**
- Cost: $0.10 per 1M tokens
- Speed: 250-400ms response
- Use: UI element detection, button identification, form guidance

**Tier 3: Complex Reasoning** (15% of frames)
- **Anthropic Claude 3.5 Sonnet**
- Cost: $3 per 1M tokens
- Speed: 300-500ms response
- Use: Multi-step processes, edge cases, empathetic guidance
- **Prompt caching**: 90% cost reduction on repeated context

**Cost Optimization**:
```
Smart Frame Selection: 95% API reduction
- Only analyze meaningful changes
- Expected: 1 frame per 5-10 seconds
- Result: $0.04-0.08 per hour
```

### Voice Pipeline

**Speech-to-Text**:
- **Deepgram Nova-3**
- Cost: $0.0043 per minute
- Latency: <100ms (streaming)
- Accuracy: 47% better than competitors
- Languages: 50+

**LLM Processing**:
- **Primary**: OpenAI GPT-4o ($2.50 per 1M tokens)
- **Fast**: GPT-4o-mini ($0.15 per 1M tokens) for simple queries
- Tier routing: 70% to mini, 30% to full

**Text-to-Speech**:
- **Primary**: ElevenLabs Turbo v2.5
  - Cost: $0.08 per minute
  - Latency: 90ms
  - Quality: Best emotional warmth
  - Use: Elder users, empathetic guidance

- **Alternative**: Cartesia Sonic
  - Cost: $0.038 per 1K characters
  - Latency: 90ms (fastest)
  - Quality: Good
  - Use: Cost-sensitive deployments

**Pipeline Latency**:
```
Target: <800ms end-to-end
- STT: 100ms
- LLM: 250-320ms
- TTS: 90ms
- Network: 100-200ms
Total: ~540-710ms ✅
```

### RAG System (Knowledge Base)

**Embeddings**:
- **Voyage Multimodal-3**
- Dimensions: 1024
- Context: 32,000 tokens
- Handles: Text + images + tables + screenshots (unified)
- Cost: $0.10 per 1M tokens

**Search Strategy**:
```
Stage 1: Hybrid Search (retrieve top 30-50)
- Vector similarity (pgvector cosineDistance)
- Keyword search (pg_trgm)
- Combine with Reciprocal Rank Fusion

Stage 2: Reranking (refine to top 5-10)
- Cohere ReRank v3
- Cross-encoder analysis
- Result: 2-5x accuracy improvement
```

**Chunking Strategy**:
- Semantic boundaries (250-500 tokens)
- Contextual summaries (Anthropic's method)
- 35-67% error reduction vs fixed-size chunks

### AI Observability

**LLM Monitoring**:
- **Langfuse** - Open-source LLM tracing
  - Token usage tracking
  - Cost analysis per tenant
  - Prompt/completion pairscontiinue
  
  - Error rate monitoring

- **Helicone** - LLM gateway (alternative)
  - Automatic caching
  - Cost tracking
  - Rate limiting
  - Usage analytics

---

## 🚀 Infrastructure & Deployment

### Hosting Platform
- **Railway** (recommended for startup phase)
  - Pros: Git-centric, auto-scaling, $5/month credits
  - Pricing: Predictable, usage-based
  - Best for: 100K+ sessions/day
  - Auto-scale: Based on CPU/memory

- **Fly.io** (alternative for global edge)
  - Pros: Usage-based billing, global distribution
  - Best for: Sub-100ms global latency requirements

### Database Hosting
- **Neon PostgreSQL** - Serverless Postgres
  - Pros: Auto-scaling, generous free tier
  - Branching: Git-like database branches
  - Pricing: Pay per usage
  - Alternative: Railway PostgreSQL (same environment)

### Redis Hosting
- **Upstash Redis** - Serverless Redis
  - Pros: Pay per request, global
  - Pricing: $0.20 per 100K requests
  - Alternative: Railway Redis

### CDN & Edge
- **Cloudflare** - CDN + edge network
  - Widget distribution
  - DDoS protection
  - Edge functions (Workers)
  - SSL certificates
  - Pricing: $20/month (Pro plan)

### Monitoring & Observability

**Error Tracking**:
- **Sentry** - Error monitoring
  - Real-time error tracking
  - Source maps
  - Performance monitoring
  - Pricing: $26/month (Team plan)

**Logs**:
- **Axiom** - Log aggregation
  - Fast search
  - Long retention
  - Pricing: $25/month (10GB)

**Uptime**:
- **BetterUptime** - Availability monitoring
  - Multi-region checks
  - Status page
  - Incident management
  - Pricing: $18/month

---

## 🛠️ Development Tools

### Code Quality
- **Biome** - Fast linter + formatter (Rust-based)
  - Replaces ESLint + Prettier
  - 100x faster than Prettier
  - Single configuration
  - Built-in import sorting

### Testing
- **Vitest** - Unit testing (Vite-native)
- **Playwright** - E2E testing
- **Testing Library** - React component testing

### CI/CD
- **GitHub Actions** - Automated workflows
  - Run tests on PR
  - Type checking
  - Build validation
  - Automatic deployment

### Documentation
- **Vitepress** - Documentation site
  - Markdown-based
  - Fast
  - SEO-friendly

---

## 📊 Cost Summary (Monthly)

### Startup Phase (100 customers, 1K sessions/day)
```
Railway (API + DB + Redis):    $50-100
Neon PostgreSQL:               $0-25 (free tier)
LiveKit Cloud:                 $50-100
OpenAI/Gemini APIs:            $300-500
Deepgram STT:                  $100-150
ElevenLabs TTS:                $150-250
Cloudflare Pro:                $20
Monitoring (Sentry+Axiom):     $50-100
────────────────────────────────────────
Total:                         $720-1,245/month

Per-session cost:              $0.70-1.25
```

### Growth Phase (1K customers, 10K sessions/day)
```
Railway (scaled):              $500-800
Neon PostgreSQL:               $150-250
LiveKit:                       $300-500
AI APIs:                       $3,000-5,000
Monitoring:                    $200-300
────────────────────────────────────────
Total:                         $4,150-6,850/month

Per-session cost:              $0.42-0.69
```

### Enterprise Phase (10K customers, 100K sessions/day)
```
Fly.io/Railway (multi-region): $3,000-5,000
Neon:                          $1,000-1,500
LiveKit (or self-hosted):      $2,000-3,000
AI APIs:                       $25,000-35,000
Monitoring:                    $1,000-1,500
────────────────────────────────────────
Total:                         $32,000-46,000/month

Per-session cost:              $0.11-0.15
```

**Target Pricing**: $0.50-2.00 per session → **60-80% gross margin**

---

## ✅ Technology Decisions Summary

### Confirmed Choices ✅
1. **Monorepo**: Turborepo (intelligent caching)
2. **Frontend**: Vite + React + Tailwind (pure)
3. **Backend**: Fastify 5.3.2+ (3x faster than Express + security patches)
4. **Database**: PostgreSQL 16+ + pgvector + Drizzle ORM + RLS policies
5. **Real-time**: WebSocket (text) + LiveKit Enterprise (meetings)
6. **Redis**: Required (7.4.2+ for security, Streams for WebSocket, caching)
7. **AI Vision**: Gemini Flash + Claude Sonnet
8. **AI Voice**: Deepgram + GPT-4o + ElevenLabs
9. **RAG**: Voyage Multimodal-3 + hybrid search
10. **Hosting**: Railway (startup) → Fly.io (scale)

### Real-Time Communication Stack
- **WebSocket**: Bidirectional text chat with sticky sessions
- **LiveKit Enterprise**: All meeting/video features ($5K-10K+/month budget required)
- **Redis Streams**: Multi-instance message distribution with consumer groups

---

**Next Steps**: Review architecture diagram (02-ARCHITECTURE.md)
