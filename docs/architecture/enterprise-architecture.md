# VisualKit Enterprise Architecture

> **The Definitive Technical Reference for VisualKit AI Platform**
>
> *Enterprise-Grade Real-Time AI Interaction System*

**Document Version**: 1.0.0
**Last Updated**: December 2025
**Status**: Production-Ready (92% Complete - 11/12 Phases)
**Security Score**: 99/100

---
### REVIEW: 
## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Domain Architecture](#3-domain-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Authentication & Security](#5-authentication--security)
6. [AI Architecture](#6-ai-architecture)
7. [Real-Time Communication](#7-real-time-communication)
8. [Chatwoot Integration](#8-chatwoot-integration)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
10. [API Reference](#10-api-reference)
11. [Development Guide](#11-development-guide)
12. [Operational Runbook](#12-operational-runbook)
13. [Roadmap & Future](#13-roadmap--future)

---

# 1. Executive Summary

## 1.1 Platform Overview

**VisualKit** is a vertically integrated AI agent platform combining free WebRTC infrastructure with visual AI capabilities. The platform serves as both an **SDK provider** (like LiveKit) and a **product provider** (like Tawk.to/Intercom/Zoom), enabling businesses to deploy AI agents that can see customer screens—a unique capability no competitor offers.

### Core Value Proposition

| Capability | Description | Business Impact |
|------------|-------------|-----------------|
| **Visual AI** | AI that can see customer screens in real-time | 46% faster resolution, 75% of issues needing visual context now solved |
| **Multi-Modal** | Voice + Vision + Text unified experience | Complete user assistance without switching tools |
| **85-90% Cost Savings** | Self-hosted Janus vs managed WebRTC | $55K-115K annual savings vs LiveKit Cloud |
| **Enterprise Security** | 99/100 audit score, OWASP compliant | Enterprise-ready from day one |
| **Human Escalation** | Chatwoot integration for live agents | Seamless handoff with full AI transcript |

### Four Product Lines

| Product | Description | Target Market |
|---------|-------------|---------------|
| **Free Widget** | Embeddable AI chatbot with voice, vision, screen sharing. Pre-built UI. | SMBs wanting turnkey AI support. Tawk.to/Intercom users. |
| **SDK/API** | WSS URL + API Key + minimal components. Developers build custom UI. | Developers building WhatsApp, Telegram, mobile integrations. |
| **meet.visualkit.live** | Full meeting rooms with scheduling, recording, multi-participant + AI agents. | Businesses needing video meetings with AI. Zoom alternative. |
| **Dashboard** | Unified management: AI Personalities, Widget Config, Knowledge Base, Billing. | All customers - single pane of glass. |

### Product Capability Matrix

| Capability | Free Widget | SDK | Meetings | Dashboard |
|------------|:-----------:|:---:|:--------:|:---------:|
| Voice AI | ✓ | ✓ | ✓ | Config |
| Text Chat | ✓ | ✓ | ✓ | Config |
| Vision AI (Screen See) | ✓ | ✓ | ✓ | Config |
| Screen Share | ✓ | ✓ | ✓ | Config |
| Custom UI | ✗ | ✓ | ✗ | N/A |
| Create Rooms | ✗ | ✗ | ✓ | Manage |
| Schedule Meetings | ✗ | ✗ | ✓ | Manage |
| Multi-Participant | ✗ | ✗ | ✓ | N/A |
| Recording | Premium | ✗ | Premium | View |
| Hosting Responsibility | VisualKit | Customer | VisualKit | VisualKit |
| WhatsApp/Telegram | ✗ | Build Own | ✗ | N/A |

**Key Distinction:** SDK users get the AI brain + WebRTC pipe but NOT room orchestration. They can build chatbots, not meeting platforms. This protects the meet.visualkit.live product from SDK-based competition.

### Current Status

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISUALKIT PLATFORM STATUS                     │
├─────────────────────────────────────────────────────────────────┤
│  Completion:        92% (11/12 Phases)                          │
│  Security Score:    99/100                                       │
│  Build Status:      All 13 packages passing                     │
│  Database:          50 tables, 76+ RLS policies                 │
│  Test Coverage:     77/77 security tests passing                │
│  Production Ready:  Yes (Phases 1-11 complete)                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Technology Stack Summary

### Frontend
- **Framework**: React 18.3.1 + Vite 6.4.1
- **Styling**: Tailwind CSS v4.1.14 + shadcn/ui
- **Type Safety**: TypeScript 5.7.2 (strict mode)

### Backend
- **Runtime**: Node.js 22 LTS
- **Framework**: Fastify 5.3.2+
- **API Layer**: tRPC v11 (end-to-end type safety)
- **Validation**: Zod schemas

### Database
- **Primary**: PostgreSQL 16.7+ with pgvector
- **ORM**: Drizzle ORM (100x faster than Prisma)
- **Cache**: Redis 7.4.2+ (Streams, Sessions, Rate Limiting)

### AI Services
- **LLM**: OpenAI GPT-4o/4o-mini, Anthropic Claude, Google Gemini
- **Voice**: Deepgram Nova-3 (STT), ElevenLabs/Cartesia (TTS)
- **Embeddings**: Voyage Multimodal-3 (1024-dim)
- **Live API**: Gemini 2.0 Flash Live (native voice/video)

### Real-Time (VK Media Engine)
- **WebRTC Gateway**: Janus Gateway (self-hosted) - AudioBridge + VideoRoom plugins
- **Text Chat**: WebSocket + Redis Streams
- **TURN/STUN**: VK-ICE Service (free credential extraction from 8x8/KMeet)
- **Human Escalation**: Chatwoot (Ruby on Rails, modified)

---

# 2. System Architecture

## 2.1 High-Level Architecture

```

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           VISUALKIT.LIVE ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    1. INFRASTRUCTURE LAYER (VK MEDIA ENGINE)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │   │
│  │  │ Janus Gateway│  │ VK-ICE       │  │ VK Agent Runtime             │  │   │
│  │  │ (AudioBridge │  │ (TURN/STUN)  │  │ (Python + Gemini Live)       │  │   │
│  │  │  VideoRoom)  │  │ Free Creds   │  │                              │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│  ┌───────────────────────────────────┼─────────────────────────────────────┐   │
│  │                    2. PLATFORM LAYER                                     │   │
│  │                                   │                                      │   │
│  │  ┌────────────────────────────────┴────────────────────────────────┐   │   │
│  │  │                  DASHBOARD (dashboard.visualkit.live)            │   │   │
│  │  ├──────────────────────────────────────────────────────────────────┤   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐│   │   │
│  │  │  │ AI Agent   │ │ Knowledge  │ │ Widget     │ │ API Keys &     ││   │   │
│  │  │  │ Builder    │ │ Base (RAG) │ │ Config     │ │ Authentication ││   │   │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────────┘│   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐│   │   │
│  │  │  │ Analytics  │ │ Team       │ │ Billing &  │ │ Conversations  ││   │   │
│  │  │  │ & Costs    │ │ Management │ │ Usage      │ │ (Chatwoot)     ││   │   │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────────┘│   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │               MEETING ROOMS (meet.visualkit.live)                │    │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │    │   │
│  │  │  │ Video Grid │ │ Screen     │ │ AI Agent   │ │ Real-time    │ │    │   │
│  │  │  │ (VK Media) │ │ Share      │ │ Participant│ │ Chat         │ │    │   │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │                    API LAYER (api.visualkit.live)                │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │   │
│  │  │  │ tRPC     │ │ WebSocket│ │ VK Media │ │ Auth.js  │           │    │   │
│  │  │  │ Routers  │ │ Server   │ │ Tokens   │ │ Sessions │           │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    3. CUSTOMER INTEGRATION LAYER                          │  │
│  │  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐│  │
│  │  │        WIDGET SDK               │  │      WIDGET SDK (CDN)           ││  │
│  │  │   (NPM: @visualkit/widget)      │  │   cdn.visualkit.live/v1/        ││  │
│  │  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  ││  │
│  │  │  │ Shadow DOM Isolation     │  │  │  │ <script src="...">        │  ││  │
│  │  │  │ 52-86KB gzipped          │  │  │  │ window.VisualKit.init()   │  ││  │
│  │  │  │ Lighthouse 98/100        │  │  │  │                           │  ││  │
│  │  │  └───────────────────────────┘  │  │  └───────────────────────────┘  ││  │
│  │  └─────────────────────────────────┘  └─────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    4. DATA LAYER                                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ PostgreSQL 16+  │  │ Redis 7.4+      │  │ Cloud Storage (S3/GCS) │   │  │
│  │  │ + pgvector      │  │ Streams/Cache   │  │ Documents & Media      │   │  │
│  │  │ 50 tables       │  │ Sessions        │  │                        │   │  │
│  │  │ 76+ RLS policies│  │ Rate limiting   │  │                        │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Deployment Modes

VisualKit supports two primary deployment modes optimized for different use cases:

### Mode 1: Embedded Widget (Customer Websites)

```
┌────────────────────────────────────────────────────────────────┐
│                      Customer Website                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Customer DOM                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Header    │  │   Content   │  │   Footer    │     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         Widget Container (Shadow DOM)            │   │  │
│  │  │  ┌────────────────────────────────────────────┐  │   │  │
│  │  │  │  #shadow-root (open)                      │  │   │  │
│  │  │  │  ┌──────────────────────────────────────┐ │  │   │  │
│  │  │  │  │  <style> Widget styles </style>      │ │  │   │  │
│  │  │  │  │  <div class="widget-chat">           │ │  │   │  │
│  │  │  │  │    AI Chat Interface                 │ │  │   │  │
│  │  │  │  │    + Screen Share Request            │ │  │   │  │
│  │  │  │  │  </div>                              │ │  │   │  │
│  │  │  │  └──────────────────────────────────────┘ │  │   │  │
│  │  │  └────────────────────────────────────────────┘  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

Benefits:
✅ Complete CSS/JS isolation via Shadow DOM
✅ No style conflicts with host site
✅ WebSocket text chat (low cost)
✅ Optional upgrade to VK Media Engine for screen sharing
✅ 52-86KB gzipped bundle size
```

### Mode 2: Standalone Meeting Rooms

```
┌────────────────────────────────────────────────────────────────┐
│                    meet.visualkit.live                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Meeting Room UI                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                   Video Grid                        │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │  │
│  │  │  │ User 1   │ │ User 2   │ │ AI Agent │           │  │  │
│  │  │  │ (video)  │ │ (screen) │ │ (avatar) │           │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                  Control Bar                        │  │  │
│  │  │  [Mic] [Camera] [Screen] [Chat] [Leave]            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

Features:
✅ Full VK Media Engine (Janus) WebRTC integration
✅ AI agent participates as room member
✅ Voice + Vision + Text capabilities
✅ Screen sharing with 1 FPS AI analysis
✅ Human agent escalation support
```

## 2.3 Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT ISOLATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request Flow:                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. API Request arrives with session cookie or API key    │   │
│  │    ↓                                                      │   │
│  │ 2. Auth.js validates session → extracts tenantId          │   │
│  │    ↓                                                      │   │
│  │ 3. tRPC context populated with tenant context             │   │
│  │    ↓                                                      │   │
│  │ 4. Database query executes with RLS policy:               │   │
│  │    SET LOCAL app.tenant_id = 'tenant-uuid'                │   │
│  │    ↓                                                      │   │
│  │ 5. PostgreSQL enforces row-level filtering automatically  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Security Layers:                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Layer 1: API Authentication (session/API key)              │ │
│  │ Layer 2: tRPC Context (tenant context injection)           │ │
│  │ Layer 3: PostgreSQL RLS (FORCE ROW LEVEL SECURITY)         │ │
│  │ Layer 4: Application Logic (tenant-scoped queries)         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ⚠️ CRITICAL: Drizzle ORM has NO automatic tenant filtering    │
│  PostgreSQL RLS with FORCE enabled is MANDATORY for security    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2.4 Monorepo Structure

```
platform/
├── apps/
│   ├── landing/              # @platform/landing (www.visualkit.live)
│   │   ├── src/
│   │   │   ├── pages/        # Home, Pricing, Features, About, Contact
│   │   │   └── components/   # Marketing components
│   │   └── package.json
│   │
│   ├── dashboard/            # @platform/dashboard (dashboard.visualkit.live)
│   │   ├── src/
│   │   │   ├── pages/        # Knowledge, Widgets, Analytics, Settings
│   │   │   ├── features/     # AI Chat, Conversations, Team
│   │   │   └── layouts/      # DashboardLayout with sidebar
│   │   └── package.json
│   │
│   ├── meeting/              # @platform/meeting (meet.visualkit.live)
│   │   ├── src/
│   │   │   ├── components/   # VideoGrid, Controls, Chat
│   │   │   └── hooks/        # useVKRoom, useVKMedia
│   │   └── package.json
│   │
│   ├── widget-sdk/           # @platform/widget-sdk (NPM + CDN)
│   │   ├── src/
│   │   │   ├── widget.tsx    # Main widget component
│   │   │   ├── sdk.ts        # JavaScript SDK
│   │   │   └── shadow-dom.ts # Shadow DOM isolation
│   │   └── package.json
│   │
│   └── chatwoot/             # Human escalation (Chatwoot integration)
│       ├── docker-compose.platform.yml
│       └── .env
│
├── packages/
│   ├── api/                  # @platform/api - Fastify server
│   │   └── src/server.ts     # Main server setup
│   │
│   ├── api-contract/         # @platform/api-contract - tRPC routers
│   │   └── src/routers/      # 15+ tRPC routers
│   │
│   ├── db/                   # @platform/db - Drizzle ORM
│   │   ├── src/schema/       # 28 table definitions
│   │   └── migrations/       # 13 migration files
│   │
│   ├── auth/                 # @platform/auth - Auth.js
│   │   └── src/services/     # Password, MFA, API Keys
│   │
│   ├── realtime/             # @platform/realtime - WebSocket
│   │   └── src/server.ts     # WebSocket + Redis Streams
│   │
│   ├── ai-core/              # @platform/ai-core - AI providers
│   │   └── src/providers/    # OpenAI, Anthropic, Gemini
│   │
│   ├── knowledge/            # @platform/knowledge - RAG system
│   │   └── src/services/     # Embeddings, Retrieval, Chunking
│   │
│   ├── shared/               # @platform/shared - Utilities
│   │   └── src/              # Types, errors, logger
│   │
│   ├── ui/                   # @platform/ui - Components
│   │   └── src/components/   # 16 shadcn/ui components
│   │
│   └── vk-client/            # @platform/vk-client - TypeScript SDK
│       └── src/
│           ├── VKClient.ts   # Main SDK client
│           ├── VKAgent.ts    # Agent connection handler
│           └── janus/        # Janus signaling abstraction
│
├── services/
│   ├── janus-gateway/        # VK Media Engine (Janus)
│   │   ├── Dockerfile
│   │   ├── janus.jcfg        # AudioBridge + VideoRoom config
│   │   └── docker-compose.yml
│   │
│   ├── vk-ice/               # ICE Credential Service (TURN/STUN)
│   │   ├── vk_ice/
│   │   │   ├── __init__.py   # Package exports
│   │   │   ├── api.py        # FastAPI REST endpoints
│   │   │   ├── cache.py      # TTL-based credential caching
│   │   │   ├── config.py     # Configuration management
│   │   │   ├── engine.py     # Main orchestrator (failover, caching)
│   │   │   ├── main.py       # Entry point / CLI
│   │   │   ├── models.py     # Data models (IceServer, IceConfig)
│   │   │   └── providers/    # Credential extraction providers
│   │   │       ├── x8x8.py   # 8x8/Brave Talk (XEP-0215)
│   │   │       ├── kmeet.py  # KMeet EU (Infomaniak)
│   │   │       └── fallback.py # Public STUN servers
│   │   └── requirements.txt
│   │
│   ├── vk-agent/             # Python AI Agent Runtime
│   │   ├── agent.py          # Main agent entry
│   │   ├── janus_client.py   # Janus signaling
│   │   ├── gemini_client.py  # Gemini Live API integration
│   │   ├── rtp_handler.py    # Audio/video RTP processing
│   │   ├── backend_client.py # tRPC API client
│   │   └── requirements.txt
│   │
│   └── chatwoot/             # Human escalation (Chatwoot)
│       └── docker-compose.yml
│
├── infrastructure/
│   ├── docker/               # Local development
│   ├── staging/              # GCP staging deployment
│   └── production/           # GCP production deployment
│
├── _deprecated/
│   └── livekit-agent/        # Archived LiveKit code
│
└── docs/                     # Documentation (this file)
```

---

# 3. Domain Architecture

## 3.0 URL Structure

### Domain Architecture

| URL | Purpose |
|-----|---------|
| **visualkit.live** | Marketing landing page, pricing, documentation |
| **dashboard.visualkit.live** | Main dashboard application (all management) |
| **meet.visualkit.live** | Meeting rooms with AI agents |
| meet.visualkit.live/[room-id] | Individual meeting room |
| **widget.visualkit.live** | Widget embed script host (/embed.js) |
| **api.visualkit.live** | REST/tRPC API for SDK users |
| **wss.visualkit.live** | WebSocket endpoint for real-time connections |
| **docs.visualkit.live** | API documentation and guides |

### Dashboard Routes

```
dashboard.visualkit.live/
├── /                      # Overview (stats, quick actions)
├── /conversations         # Chatwoot embed (escalated only)
├── /transcripts           # Full AI conversation history
├── /recordings            # Screen recordings (Premium)
├── /agents                # Agent management
│   ├── /agents/personalities  # AI Personalities config
│   └── /agents/deployments    # Where each agent is deployed
├── /knowledge             # RAG documents
├── /widget-config         # Widget appearance & behavior
├── /meetings              # Meeting room management
│   ├── /meetings/rooms    # Active rooms
│   ├── /meetings/schedule # Scheduling
│   └── /meetings/recordings # Meeting recordings
├── /integrations          # Third-party connections
├── /api-keys              # SDK developer credentials
├── /team                  # Team members
├── /billing               # Subscription & usage
└── /settings              # Account settings
```

## 3.1 dashboard.visualkit.live

The administrative portal for tenant configuration and management.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| **AI Personalities** | Configure chatbot personas | ✅ Complete |
| **Knowledge Base** | Upload and manage RAG documents | ✅ Complete |
| **Widget Config** | Domain whitelisting, themes | ✅ Complete |
| **Analytics** | Cost tracking, usage metrics | ✅ Complete |
| **Team Management** | Users, roles, permissions | ✅ Complete |
| **API Keys** | Generate and manage API keys | ✅ Complete |
| **Conversations** | Chatwoot iframe integration | ✅ Complete |
| **Recordings** | Meeting recordings (planned) | ⏸️ Planned |

### Page Structure

```typescript
// apps/dashboard/src/App.tsx
<Routes>
  <Route path="/" element={<DashboardLayout />}>
    <Route index element={<HomePage />} />
    <Route path="personalities" element={<PersonalitiesPage />} />
    <Route path="knowledge" element={<KnowledgePage />} />
    <Route path="conversations" element={<ConversationsPage />} />  {/* Chatwoot */}
    <Route path="rooms" element={<RoomsPage />} />
    <Route path="deployments" element={<DeploymentsPage />} />
    <Route path="analytics" element={<AnalyticsPage />} />
    <Route path="api-keys" element={<ApiKeysPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route>
</Routes>
```

## 3.2 meet.visualkit.live

Real-time meeting rooms with AI agent participation.

### VK Media Engine Integration

```typescript
// apps/meeting/src/hooks/useVKRoom.ts
import { VKClient, VKRoom } from '@platform/vk-client';

export function useVKRoom(roomName: string, token: string) {
  const [room, setRoom] = useState<VKRoom | null>(null);
  const [participants, setParticipants] = useState<VKParticipant[]>([]);

  useEffect(() => {
    const client = new VKClient({
      wsUrl: 'wss://wss.visualkit.live',
      token,
    });

    client.joinRoom(roomName).then(setRoom);

    return () => client.disconnect();
  }, [roomName, token]);

  return { room, participants };
}
```

### Room Naming Convention

```
tenant_{tenantId}_session_{sessionId}

Example: tenant_abc123_session_xyz789
```

## 3.3 api.visualkit.live

The tRPC API server handling all backend operations.

### Server Configuration

```typescript
// packages/api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({
  logger: true,
  maxParamLength: 5000,
});

// Security middleware
await app.register(cors, corsConfig);
await app.register(helmet, helmetConfig);

// tRPC integration
await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

// WebSocket support
await app.register(websocketPlugin);

// Health checks
app.get('/health', healthHandler);
app.get('/ready', readinessHandler);

app.listen({ port: 3001, host: '0.0.0.0' });
```

## 3.4 Widget SDK

Embeddable chat widget for customer websites.

### Installation

```html
<!-- CDN Installation -->
<script src="https://cdn.visualkit.live/v1/widget.js"></script>
<script>
  VisualKit.init({
    apiKey: 'pk_live_xxxxx',
    theme: 'auto',
    position: 'bottom-right',
    greeting: 'Hello! How can I help you today?',
  });
</script>
```

```typescript
// NPM Installation
import { VisualKitWidget } from '@visualkit/widget';

VisualKitWidget.init({
  apiKey: process.env.VISUALKIT_API_KEY,
  containerId: 'widget-container',
});
```

### Bundle Specifications

| Metric | Value |
|--------|-------|
| Bundle Size (gzipped) | 52-86 KB |
| Lighthouse Score | 98/100 |
| Load Time (3G) | <500ms |
| Memory Footprint | <10MB |
| Browser Support | ES2020+ |

## 3.5 SDK/API (Developer Integration)

The SDK provides the AI brain + WebRTC pipe without room orchestration. Developers can build custom chatbots but cannot replicate meeting functionality.

### What SDK Provides
- WSS URL for real-time connection
- API Key for authentication
- Minimal UI-agnostic components
- Voice AI (send/receive audio)
- Vision AI (send screen frames)
- Text fallback
- Event system for UI updates

### What SDK Does NOT Provide
- Room creation APIs (use meet.visualkit.live)
- Meeting scheduling
- Multi-participant management
- Recording capabilities
- Pre-built UI components

### TypeScript SDK

```typescript
// visualkit SDK - TypeScript/JavaScript
import { VKClient, VKAgent } from 'visualkit';

// 1. Initialize client with credentials from dashboard
const client = new VKClient({
  apiKey: 'vk_live_abc123...',
  wsUrl: 'wss://wss.visualkit.live'
});

// 2. Connect to agent (created in dashboard)
const agent = await client.connectAgent({
  agentId: 'agent_xyz789',
  visitorId: 'visitor_123',  // Your visitor identifier
  metadata: { name: 'John' } // Optional context
});

// 3. Voice - developer handles their own UI
await agent.startVoice(microphoneStream);
agent.on('audio', (audioData) => {
  // Play through developer's audio element
});

// 4. Vision - developer handles UI
await agent.shareScreen(screenStream);

// 5. Text fallback
await agent.sendText('Hello');
agent.on('text', (message) => {
  // Render in developer's chat UI
});

// 6. Events for UI state
agent.on('agentSpeaking', () => { });
agent.on('agentThinking', () => { });
agent.on('connectionLost', () => { });

// BLOCKED METHODS - These don't exist in SDK
// client.createRoom()        ❌ Not available
// client.inviteParticipant() ❌ Not available
// client.scheduleMeeting()   ❌ Not available
```

### Python SDK

```python
# visualkit SDK - Python
from visualkit import VKClient, VKAgent

client = VKClient(
    api_key='vk_live_abc123...',
    ws_url='wss://wss.visualkit.live'
)

agent = await client.connect_agent(
    agent_id='agent_xyz789',
    visitor_id='visitor_123'
)

# Voice handling
await agent.start_voice(audio_source)

@agent.on('audio')
async def handle_audio(data):
    # Process incoming audio
    pass

# Screen sharing
await agent.share_screen(frame_generator)

# Text
await agent.send_text('Hello')
```

## 3.6 Pricing & Monetization

### Widget/Platform Tiers

| Feature | Free ($0) | Starter ($39) | Pro ($99) | Scale ($299) |
|---------|:---------:|:-------------:|:---------:|:------------:|
| Conversations/mo | 100 | 500 | 2,000 | Unlimited |
| Operators | 1 | 3 | Unlimited | Unlimited |
| AI Capabilities | Text only | + Voice | + Vision | Full multimodal |
| Knowledge Base (RAG) | 1 source | 5 sources | Unlimited | Unlimited |
| Branding | VisualKit badge | Removable | Custom | White-label |
| Human Escalation | ✗ | Basic | Full | Full + routing |
| Screen Recording | ✗ | ✗ | ✓ | ✓ |
| Integrations | None | Basic (3) | All | All + custom |
| API Access | ✗ | ✗ | ✓ | ✓ |
| HIPAA Compliance | ✗ | ✗ | ✗ | ✓ |

### Meeting Tiers (meet.visualkit.live)

| Feature | Free ($0) | Starter ($19) | Pro ($49) | Business ($149) |
|---------|:---------:|:-------------:|:---------:|:---------------:|
| Meetings/month | 3/week | 20 | Unlimited | Unlimited |
| Duration | 5 min | 30 min | 60 min | Unlimited |
| Rooms | 1 | 3 | 10 | Unlimited |
| Custom AI Agents | 1 shared | 1 custom | 3 custom | Unlimited |
| Recording | ✗ | ✗ | ✓ | ✓ + transcripts |
| Scheduling | ✗ | Basic | Calendar sync | Full + reminders |
| Branding | Watermark | Removable | Custom logo | Full white-label |

### Usage-Based Pricing Add-on

For customers exceeding tier limits:

| Usage Type | Cost |
|------------|------|
| AI responses above tier | $0.15/response |
| Additional conversations | $0.10/conversation |
| Screen recording storage | $0.05/GB/month |
| API calls (SDK) | $0.001/call after 10K free |

### Regional Pricing (LATAM Strategy)

PPP-based pricing for Latin American markets (40-60% of US pricing):

| Region | Pricing | Currency |
|--------|---------|----------|
| Guatemala/Central America | 50% of US | USD |
| Brazil | 60% of US | BRL |
| Mexico | 60% of US | MXN |
| Colombia | 50% of US | COP |
| Argentina | 40% of US (floor) | ARS |

**Strategy:**
- Display local currencies
- Floor at 30% of US pricing to prevent abuse
- Leverage Guatemala home-market advantage
- WhatsApp-native integration (mandatory for LATAM)
- Native Spanish/Portuguese AI (not translated English)

## 3.7 Capability Restrictions

### Protected Vertical: Legal Document Generation

VisualKit restricts certain capabilities to protect legal document generation partnerships.

**ALLOWED Capabilities (All Tiers):**
- Voice conversation
- Text chat
- Screen viewing (vision AI)
- RAG / Knowledge base
- Basic tool calling (search, lookup, calculate)
- Webhook triggers
- CRM integrations
- Customer support workflows
- Sales assistance
- Meeting assistance

**RESTRICTED Capabilities (Not Available):**
- Document generation APIs
- PDF form filling
- Legal/compliance templates
- E-signature integrations
- Multi-step document workflows
- Estate planning tools
- Contract generation

### Terms of Service Enforcement

> "VisualKit.live agents may not be used for: (a) legal document generation, including but not limited to wills, trusts, powers of attorney, or contracts; (b) estate planning services; (c) tax document preparation; (d) any service requiring legal licensing. Violation results in immediate account termination."

### Technical Enforcement

- No document generation APIs exposed in SDK
- Keyword filtering in agent prompts
- Tool whitelist - only approved tools available
- Audit logging for compliance monitoring
- Rate limiting on sensitive operations

---

# 4. Database Architecture

## 4.1 Schema Overview

VisualKit uses PostgreSQL 16+ with pgvector extension for vector similarity search and Row-Level Security (RLS) for multi-tenant isolation.

### Tables Summary (28 Total)

| Category | Tables | Description |
|----------|--------|-------------|
| **Core** | 6 | tenants, users, widgets, meetings, sessions, messages |
| **Auth.js** | 3 | accounts, auth_sessions, verification_tokens |
| **Knowledge** | 2 | knowledge_documents, knowledge_chunks (pgvector) |
| **Cost Tracking** | 3 | cost_events, cost_summaries, budget_alerts |
| **AI Config** | 1 | ai_personalities |
| **Security** | 3 | api_keys, audit_logs, data_requests |
| **AI Optimization** | 4 | rag_evaluation_runs, rag_evaluations, rag_test_sets, rag_quality_thresholds |
| **End-User** | 5 | end_users, survey_responses, unresolved_problems, unresolved_problem_users, escalations |
| **Files** | 1 | chat_files |

## 4.2 Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  tenants ───────────────────────┬────────────────────────────────────────────── │
│  ├─ id (UUID) PK                │                                               │
│  ├─ name                        │                                               │
│  ├─ plan                        │                                               │
│  └─ settings (JSONB)            │                                               │
│                                 │                                               │
│  ┌──────────────────────────────┴───────────────────────────────────────────┐  │
│  │                                                                           │  │
│  ▼                              ▼                              ▼             │  │
│  users                          widgets                        meetings      │  │
│  ├─ id (UUID) PK                ├─ id (UUID) PK                ├─ id PK      │  │
│  ├─ tenant_id FK ──────────────►├─ tenant_id FK ──────────────►├─ tenant_id  │  │
│  ├─ email                       ├─ name                        ├─ room_name  │  │
│  ├─ password_hash               ├─ domain_whitelist            ├─ janus_room │  │
│  ├─ role                        └─ settings (JSONB)            └─ created_by │  │
│  └─ mfa_secret (encrypted)                                                   │  │
│              │                              │                        │       │  │
│              ▼                              ▼                        ▼       │  │
│         api_keys                       sessions ◄───────────────────┘       │  │
│         ├─ id PK                       ├─ id (UUID) PK                       │  │
│         ├─ tenant_id                   ├─ tenant_id FK                       │  │
│         ├─ key_hash                    ├─ widget_id FK                       │  │
│         ├─ permissions                 ├─ meeting_id FK                      │  │
│         └─ expires_at                  ├─ mode ('text' | 'meeting')          │  │
│                                        └─ cost_usd                           │  │
│                                                 │                            │  │
│                                                 ▼                            │  │
│  knowledge_documents                       messages                          │  │
│  ├─ id (UUID) PK                           ├─ id (UUID) PK                   │  │
│  ├─ tenant_id FK                           ├─ session_id FK ────────────────►│  │
│  ├─ title                                  ├─ role                           │  │
│  ├─ content                                ├─ content                        │  │
│  └─ embedding (vector 1024)                └─ timestamp                      │  │
│              │                                                               │  │
│              ▼                                                               │  │
│  knowledge_chunks                                                            │  │
│  ├─ id (UUID) PK                                                             │  │
│  ├─ document_id FK ─────────────────────────────────────────────────────────►│  │
│  ├─ content                                                                  │  │
│  ├─ embedding (vector 1024)                                                  │  │
│  ├─ position                                                                 │  │
│  └─ tsvector (BM25 full-text)                                               │  │
│                                                                              │  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Row-Level Security (RLS)

### Policy Implementation

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Create isolation policies
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', TRUE));

CREATE POLICY tenant_isolation_sessions ON sessions
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', TRUE));

CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE tenant_id::text = current_setting('app.tenant_id', TRUE)
    )
  );

-- Helper function for edge cases
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.tenant_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### TypeScript Tenant Wrapper

```typescript
// packages/db/src/tenant-wrapper.ts
export async function withTenantContext<T>(
  db: DrizzleInstance,
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set tenant context for this transaction
    await tx.execute(sql`SET LOCAL app.tenant_id = ${tenantId}`);

    // Execute query with automatic RLS filtering
    return await callback();
  });
}

// Usage
const messages = await withTenantContext(db, ctx.tenantId, async () => {
  return await db.select().from(messagesTable).limit(100);
});
```

## 4.4 Index Strategy

```sql
-- Performance indexes (30+ total)
-- Knowledge base indexes
CREATE INDEX idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_knowledge_chunks_document_id
  ON knowledge_chunks (document_id);

CREATE INDEX idx_knowledge_chunks_tsvector
  ON knowledge_chunks USING gin (tsvector);

-- Session and message indexes
CREATE INDEX idx_sessions_tenant_id ON sessions (tenant_id);
CREATE INDEX idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX idx_messages_session_id ON messages (session_id);
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);

-- User and auth indexes
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);

-- Cost tracking indexes
CREATE INDEX idx_cost_events_tenant_date
  ON cost_events (tenant_id, created_at DESC);
CREATE INDEX idx_cost_events_service_type
  ON cost_events (service_type);
```

## 4.5 Connection Pooling

```typescript
// packages/db/src/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionConfig = {
  max: 50,                    // Maximum connections
  idle_timeout: 20,           // Close idle connections after 20s
  max_lifetime: 3600,         // Max connection age: 1 hour
  connect_timeout: 10,        // Connection timeout: 10s
  prepare: false,             // Disable prepared statements for PgBouncer
};

const client = postgres(process.env.DATABASE_URL!, connectionConfig);
export const db = drizzle(client);
```

---

# 5. Authentication & Security

## 5.1 Authentication Architecture

### Auth.js Integration

```typescript
// packages/auth/src/config.ts
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from '@auth/core/providers/google';

export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),

  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  session: {
    strategy: 'database',
    maxAge: 8 * 60 * 60,      // 8 hours (NIST AAL2)
    updateAge: 30 * 60,        // Refresh every 30 minutes
  },

  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.tenantId = user.tenantId;
      session.user.role = user.role;
      return session;
    },
  },
};
```

## 5.2 Password Security (Argon2id)

```typescript
// packages/auth/src/services/password.service.ts
import * as argon2 from 'argon2';

export class PasswordService {
  // OWASP 2025 recommended parameters
  private static readonly ARGON2_CONFIG = {
    type: argon2.argon2id,
    memoryCost: 19456,  // 19MB
    timeCost: 2,        // 2 iterations
    parallelism: 1,     // Single-threaded
  };

  async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, this.ARGON2_CONFIG);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // Automatic bcrypt → Argon2id migration
  async verifyAndUpgrade(
    password: string,
    hash: string,
    algorithm: 'bcrypt' | 'argon2id'
  ): Promise<{ valid: boolean; newHash?: string }> {
    if (algorithm === 'bcrypt') {
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, hash);

      if (valid) {
        const newHash = await this.hashPassword(password);
        return { valid: true, newHash };
      }
    }

    const valid = await this.verifyPassword(password, hash);
    return { valid };
  }
}
```

## 5.3 Multi-Factor Authentication (TOTP)

```typescript
// packages/auth/src/services/mfa.service.ts
import { TOTP, Secret, generateSecret } from 'otpauth';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class MFAService {
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');
  }

  async generateSetup(userEmail: string): Promise<MFASetup> {
    const secret = generateSecret({ length: 32 });

    const totp = new TOTP({
      issuer: 'VisualKit',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );

    const hashedBackupCodes = await this.hashBackupCodes(backupCodes);
    const encryptedSecret = this.encryptSecret(secret.base32);

    return {
      secret: secret.base32,
      encryptedSecret,
      qrCode: totp.toString(),
      backupCodes,
      hashedBackupCodes,
    };
  }

  async verifyCode(code: string, encryptedSecret: string): Promise<boolean> {
    const secret = this.decryptSecret(encryptedSecret);

    const totp = new TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });

    // Allow ±1 period tolerance (90 seconds total)
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }

  private encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  private decryptSecret(encryptedData: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

## 5.4 API Key Management

```typescript
// packages/auth/src/services/api-key.service.ts
import crypto from 'crypto';

export class ApiKeyService {
  private static readonly KEY_LENGTH = 32;
  private static readonly SECRET = env.API_KEY_SECRET;

  static generateApiKey(type: 'publishable' | 'secret'): ApiKeyResult {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const key = randomBytes.toString('base64url');

    const prefix = type === 'publishable' ? 'pk_live' : 'sk_live';
    const apiKey = `${prefix}_${key}`;

    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = `${prefix}_${key.slice(0, 7)}...`;

    return { apiKey, keyHash, keyPrefix };
  }

  static hashApiKey(apiKey: string): string {
    return crypto
      .createHmac('sha256', this.SECRET)
      .update(apiKey)
      .digest('hex');
  }

  static isValidFormat(apiKey: string): boolean {
    return /^(pk|sk)_live_[A-Za-z0-9_-]{43}$/.test(apiKey);
  }
}
```

## 5.5 Rate Limiting

```typescript
// packages/api/src/middleware/rate-limiter.ts
export const rateLimitConfig = {
  default: { window: 15 * 60, max: 100 },      // 100 req / 15 min
  auth: { window: 15 * 60, max: 20 },          // 20 req / 15 min (NIST)
  signup: { window: 60 * 60, max: 5 },         // 5 req / hour
  'password-reset': { window: 60 * 60, max: 3 }, // 3 req / hour
  'api-keys': { window: 60 * 60, max: 10 },    // 10 req / hour
  widget: { window: 60, max: 60 },             // 60 req / min
};

export async function checkRateLimit(
  redis: Redis,
  identifier: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  const config = rateLimitConfig[tier];
  const key = `rate_limit:${tier}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.window * 1000;

  // Sliding window implementation
  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= config.max) {
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const retryAfter = Math.ceil(
      (Number(oldest[1]) + config.window * 1000 - now) / 1000
    );

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, config.window);

  return {
    allowed: true,
    remaining: config.max - count - 1,
  };
}
```

## 5.6 Security Headers (Helmet.js)

```typescript
// packages/api/src/middleware/helmet.ts
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};
```

## 5.7 Security Compliance Summary

| Standard | Compliance | Score |
|----------|------------|-------|
| **OWASP Top 10 2021** | 100% | 10/10 |
| **OWASP API Top 10 2023** | 90% | 9/10 |
| **NIST SP 800-63B** | 95% | 19/20 |
| **Overall Security Score** | - | 99/100 |

---

# 6. AI Architecture

## 6.1 Cost-Optimized Routing

VisualKit achieves **75-85% cost reduction** through intelligent model routing.

### Dashboard Chat API (Two-Tier)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT API ROUTING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Query                                                      │
│      │                                                           │
│      ▼                                                           │
│  ┌───────────────────────────────────────────┐                  │
│  │         Complexity Classifier              │                  │
│  │  - Query length                            │                  │
│  │  - Technical terms                         │                  │
│  │  - Context requirements                    │                  │
│  └─────────────┬─────────────────────────────┘                  │
│                │                                                 │
│       ┌────────┴────────┐                                       │
│       │                 │                                       │
│       ▼                 ▼                                       │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Simple (70%)│  │Complex (30%)│                               │
│  │ GPT-4o-mini │  │   GPT-4o    │                               │
│  │ $0.15/1M    │  │   $5.00/1M  │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                  │
│  Blended Cost: ~$0.65/1M tokens (vs $5.00 without routing)      │
│  Savings: 87%                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### VK Agent (Three-Tier Vision)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISION ANALYSIS ROUTING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Screen Frame (1 FPS)                                           │
│      │                                                           │
│      ▼                                                           │
│  ┌───────────────────────────────────────────┐                  │
│  │         pHash Deduplication                │                  │
│  │  - Perceptual hash comparison              │                  │
│  │  - Hamming distance threshold: 10          │                  │
│  │  - Skip if frame unchanged                 │                  │
│  │  → 60-75% frame reduction                  │                  │
│  └─────────────┬─────────────────────────────┘                  │
│                │                                                 │
│                ▼                                                 │
│  ┌───────────────────────────────────────────┐                  │
│  │         Attempt 1: Gemini Flash-Lite       │                  │
│  │  - 60% of resolutions                      │                  │
│  │  - Cost: $0.06/resolution                  │                  │
│  │  - Speed: 250-400ms                        │                  │
│  └─────────────┬─────────────────────────────┘                  │
│                │ (if confidence < threshold)                     │
│                ▼                                                 │
│  ┌───────────────────────────────────────────┐                  │
│  │         Attempt 2: Gemini Flash            │                  │
│  │  - 25% of resolutions                      │                  │
│  │  - Cost: $0.08/resolution                  │                  │
│  │  - Speed: 300-450ms                        │                  │
│  └─────────────┬─────────────────────────────┘                  │
│                │ (if still uncertain)                            │
│                ▼                                                 │
│  ┌───────────────────────────────────────────┐                  │
│  │         Attempt 3: Claude Sonnet 4.5       │                  │
│  │  - 15% of resolutions                      │                  │
│  │  - Cost: $0.40/resolution                  │                  │
│  │  - Speed: 400-600ms                        │                  │
│  │  + Prompt caching (90% cost reduction)     │                  │
│  └───────────────────────────────────────────┘                  │
│                                                                  │
│  Philosophy: "Upgrade the brain, not the eyes"                  │
│  - Same pHash across all attempts                                │
│  - Worst-case: $0.54/resolution (all 3 attempts)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Gemini Live API (Production)

The Python VK Agent uses Gemini's native Live API for voice/video, connected to users via Janus Gateway.

```python
# services/vk-agent/agent.py
from janus_client import JanusSession, AudioBridge, VideoRoom
from gemini_client import GeminiLiveStream
from rtp_handler import RTPProcessor
from backend_client import VisualKitAPI

class VKAgent:
    """VisualKit AI Agent with Janus + Gemini Live integration."""

    def __init__(self, room_id: str, api_key: str):
        # Initialize Janus session
        self.janus = JanusSession('wss://wss.visualkit.live/janus')
        self.audio = AudioBridge(self.janus)
        self.video = VideoRoom(self.janus)

        # Gemini Live API for AI
        self.gemini = GeminiLiveStream('gemini-2.0-flash-live-001')
        self.api = VisualKitAPI(api_key)

    async def on_track_subscribed(self, track):
        if track.kind == 'video':
            # Process screen share at 1 FPS
            await self.analyze_screen(track)

    async def on_audio_received(self, audio_data):
        # Native voice streaming with sub-500ms latency
        response = await self.model.generate_content_async(
            [audio_data],
            generation_config={
                'response_mime_type': 'audio/pcm',
            }
        )
        await self.publish_audio(response.audio)
```

### Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| Input tokens | $0.075/1M | Audio + video frames |
| Output tokens | $0.30/1M | Voice responses |
| Video streaming | ~$0.50/hour | 1 FPS screen share |
| **Audio** | Included | Native streaming |

### Benefits vs Manual Pipeline

| Metric | Gemini Live API | Manual STT→LLM→TTS |
|--------|-----------------|---------------------|
| Latency | Sub-500ms | 2-5 seconds |
| Code complexity | ~200 lines | ~1,000+ lines |
| Voice quality | Native | Stitched |
| Interruption | Built-in | Custom handling |

## 6.3 RAG System (Knowledge Base)

### Hybrid Retrieval Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG RETRIEVAL PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Query: "How do I export invoices to Excel?"               │
│      │                                                           │
│      ├────────────────────┬────────────────────┬───────────────┐│
│      │                    │                    │               ││
│      ▼                    ▼                    ▼               ││
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        ││
│  │  Semantic   │    │  BM25       │    │  Metadata   │        ││
│  │  Search     │    │  Full-text  │    │  Filtering  │        ││
│  │  (pgvector) │    │  (tsvector) │    │  (category) │        ││
│  │  Top 30     │    │  Top 30     │    │             │        ││
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        ││
│         │                  │                  │               ││
│         └────────┬─────────┴──────────────────┘               ││
│                  │                                             ││
│                  ▼                                             ││
│  ┌───────────────────────────────────────────┐                ││
│  │    Reciprocal Rank Fusion (RRF)            │                ││
│  │    - Vector similarity: 40%                │                ││
│  │    - BM25 relevance: 35%                   │                ││
│  │    - Metadata match: 25%                   │                ││
│  │    → Top 50 candidates                     │                ││
│  └─────────────┬─────────────────────────────┘                ││
│                │                                               ││
│                ▼                                               ││
│  ┌───────────────────────────────────────────┐                ││
│  │    Cohere ReRank v3                        │                ││
│  │    - Cross-encoder analysis                │                ││
│  │    - 20-40% accuracy improvement           │                ││
│  │    → Top 5-10 final results                │                ││
│  └─────────────┬─────────────────────────────┘                ││
│                │                                               ││
│                ▼                                               ││
│  ┌───────────────────────────────────────────┐                ││
│  │    Context Assembly                        │                ││
│  │    - Chunk content                         │                ││
│  │    - ±2 surrounding chunks                 │                ││
│  │    - Document metadata                     │                ││
│  │    - Relevance scores                      │                ││
│  └───────────────────────────────────────────┘                ││
│                                                                ││
└─────────────────────────────────────────────────────────────────┘
```

### Embeddings Configuration

```typescript
// packages/knowledge/src/services/embeddings.ts
import Voyage from 'voyageai';

export class EmbeddingService {
  private client = new Voyage(env.VOYAGE_API_KEY);

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embed({
      input: this.sanitizeText(text),
      model: 'voyage-multimodal-3',
    });

    return response.embeddings[0];  // 1024 dimensions
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/\x00/g, '')           // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // Control chars
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim()
      .slice(0, 32000);               // Max context length
  }
}
```

## 6.4 RAGAS Evaluation Framework

```typescript
// packages/ai-core/src/services/evaluation.ts
export interface RAGASMetrics {
  faithfulness: number;     // Answer grounded in context
  answerRelevancy: number;  // Answer addresses question
  contextPrecision: number; // Retrieved context relevant
  contextRecall: number;    // All relevant info retrieved
}

export async function evaluateRAG(
  question: string,
  answer: string,
  contexts: string[],
  groundTruth: string
): Promise<RAGASMetrics> {
  // Implementation uses LLM-as-judge approach
  const [faithfulness, relevancy, precision, recall] = await Promise.all([
    evaluateFaithfulness(answer, contexts),
    evaluateRelevancy(question, answer),
    evaluatePrecision(question, contexts),
    evaluateRecall(question, contexts, groundTruth),
  ]);

  return { faithfulness, answerRelevancy: relevancy, contextPrecision: precision, contextRecall: recall };
}
```

---

# 7. Real-Time Communication

## 7.1 WebSocket + Redis Streams

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client 1                 Client 2                 Client 3      │
│     │                        │                        │          │
│     └────────┬───────────────┴───────────────┬────────┘          │
│              │                               │                   │
│              ▼                               ▼                   │
│  ┌───────────────────┐            ┌───────────────────┐         │
│  │   API Instance 1  │            │   API Instance 2  │         │
│  │   (WebSocket)     │            │   (WebSocket)     │         │
│  └─────────┬─────────┘            └─────────┬─────────┘         │
│            │                                │                    │
│            └────────────┬───────────────────┘                    │
│                         │                                        │
│                         ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Redis Streams                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Stream: tenant_{id}_chat                           │  │  │
│  │  │  Consumer Group: websocket-servers                   │  │  │
│  │  │  - Ensures message delivery across restarts          │  │  │
│  │  │  - Distributes load across instances                 │  │  │
│  │  │  - Maintains message order                           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Features:                                                       │
│  ✅ Bidirectional communication                                  │
│  ✅ Auto-reconnection (exponential backoff)                      │
│  ✅ Typing indicators (3s debounce)                              │
│  ✅ Presence tracking                                            │
│  ✅ Message queue for offline resilience                         │
│  ✅ Heartbeat (30s ping/pong)                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Server Implementation

```typescript
// packages/realtime/src/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';

const wss = new WebSocketServer({ port: 3002 });
const redis = new Redis(process.env.REDIS_URL);
const publisher = new Redis(process.env.REDIS_URL);

// Consumer group for distributed message handling
const CONSUMER_GROUP = 'websocket-servers';
const CONSUMER_NAME = `server-${process.pid}`;

wss.on('connection', async (ws: WebSocket, req) => {
  const tenantId = extractTenantId(req);
  const streamKey = `tenant:${tenantId}:chat`;

  // Join consumer group
  try {
    await redis.xgroup('CREATE', streamKey, CONSUMER_GROUP, '0', 'MKSTREAM');
  } catch (e) {
    // Group already exists
  }

  // Read messages from stream
  const readMessages = async () => {
    while (ws.readyState === WebSocket.OPEN) {
      const messages = await redis.xreadgroup(
        'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
        'BLOCK', 5000,
        'STREAMS', streamKey, '>'
      );

      if (messages) {
        for (const [, entries] of messages) {
          for (const [id, fields] of entries) {
            ws.send(JSON.stringify(Object.fromEntries(fields)));
            await redis.xack(streamKey, CONSUMER_GROUP, id);
          }
        }
      }
    }
  };

  readMessages();

  // Handle incoming messages
  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    await publisher.xadd(streamKey, '*', ...Object.entries(message).flat());
  });

  // Heartbeat
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});
```

### Client Hook

```typescript
// apps/dashboard/src/hooks/useWebSocket.ts
export function useWebSocket(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/chat/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      };

      ws.onclose = () => {
        setConnectionState('disconnected');

        // Exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [sessionId]);

  const sendMessage = (content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    }
  };

  return { messages, sendMessage, connectionState };
}
```

## 7.2 VK Media Engine (Janus Gateway)

### Cost Comparison: Self-Hosted vs Managed WebRTC

| Item | Managed (LiveKit Cloud) | Self-Hosted (VisualKit) |
|------|------------------------|-------------------------|
| WebRTC Infrastructure | $5,000 - $10,000/month | $300/month (3x VMs) |
| TURN Servers | Included | **$0** (VK-ICE extracts free credentials) |
| Bandwidth (10TB) | Included | $100/month |
| **Monthly Total** | **$5,000 - $10,000** | **~$400** |
| **Annual Cost** | **$60,000 - $120,000** | **~$4,800** |
| **Savings** | - | **92-96%** |

> **VK-ICE Innovation**: VisualKit extracts free TURN/STUN credentials from public WebRTC platforms (8x8/Brave Talk, KMeet), eliminating the need for self-hosted Coturn ($20-50/month) or paid services like Xirsys ($30-100/month).

### Janus Gateway Deployment

```yaml
# services/janus-gateway/docker-compose.yml
version: '3.8'

services:
  janus:
    build: .
    ports:
      - '8088:8088'     # HTTP API
      - '8089:8089'     # HTTPS API
      - '8188:8188'     # WebSocket
      - '10000-10200:10000-10200/udp'  # RTP media
    environment:
      - JANUS_API_SECRET=${JANUS_API_SECRET}
      - JANUS_ADMIN_SECRET=${JANUS_ADMIN_SECRET}
      - VK_ICE_URL=http://vk-ice:3003  # ICE credentials from VK-ICE
    volumes:
      - ./janus.jcfg:/opt/janus/etc/janus/janus.jcfg
      - ./janus.plugin.audiobridge.jcfg:/opt/janus/etc/janus/janus.plugin.audiobridge.jcfg
      - ./janus.plugin.videoroom.jcfg:/opt/janus/etc/janus/janus.plugin.videoroom.jcfg
    depends_on:
      - vk-ice
    restart: unless-stopped

  vk-ice:
    build: ../vk-ice
    ports:
      - '3003:3003'     # ICE API
    environment:
      - VK_ICE_PROVIDERS=8x8,kmeet,fallback
      - VK_ICE_CACHE_TTL=3600
      - VK_ICE_LOG_LEVEL=INFO
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3003/health']
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

> **Note**: VK-ICE replaces traditional Coturn + Xirsys setup by extracting free TURN/STUN credentials from public WebRTC platforms.

### Room Management Router

```typescript
// packages/api-contract/src/routers/vk-rooms.ts
import { createJanusSession, VideoRoomPlugin } from '@platform/vk-client';

export const vkRoomsRouter = router({
  createRoom: protectedProcedure
    .input(z.object({ name: z.string(), maxParticipants: z.number().default(10) }))
    .mutation(async ({ input, ctx }) => {
      const roomId = `tenant_${ctx.tenantId}_${input.name}`;

      // Create VideoRoom in Janus
      const session = await createJanusSession(env.JANUS_WS_URL);
      const videoRoom = await session.attach(VideoRoomPlugin);

      await videoRoom.create({
        room: roomId,
        publishers: input.maxParticipants,
        is_private: true,
        secret: env.JANUS_ROOM_SECRET,
      });

      return { roomId };
    }),

  getToken: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Generate JWT for room access
      const token = jwt.sign({
        roomId: input.roomId,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        permissions: ['publish', 'subscribe'],
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }, env.JANUS_JWT_SECRET);

      return { token, wsUrl: 'wss://wss.visualkit.live/janus' };
    }),
});
```

### VK Terminology (Public-Facing)

| Internal/Technical | Public Name | Notes |
|-------------------|-------------|-------|
| Janus Gateway | VK Media Engine | Never mention Janus publicly |
| Janus Session | VK Session | |
| Janus VideoRoom | VK Room | |
| Janus AudioBridge | VK Voice | |
| VK-ICE / TURN servers | VK Relay | Free credential extraction |
| VK-ICE / STUN servers | VK Discovery | Never mention 8x8/KMeet source |
| janus_gemini_bridge | vk_agent | |
| RTP forwarding | Media streaming | Never expose RTP details |

## 7.3 VK-ICE (ICE Credential Service)

VK-ICE is a production-grade service that extracts free TURN/STUN credentials from public WebRTC platforms, eliminating the need for paid TURN servers.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VK-ICE SERVICE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FastAPI REST API                       │   │
│  │  GET  /api/ice/credentials  - Get ICE credentials        │   │
│  │  GET  /api/ice/providers    - List providers             │   │
│  │  GET  /api/ice/health       - Health check               │   │
│  │  GET  /api/ice/stats        - Statistics                 │   │
│  └────────────────────────────────┬─────────────────────────┘   │
│                                   │                              │
│  ┌────────────────────────────────┴─────────────────────────┐   │
│  │                      IceEngine                            │   │
│  │  - Multi-provider orchestration                           │   │
│  │  - Automatic failover                                     │   │
│  │  - TTL-based caching                                      │   │
│  │  - Health monitoring                                      │   │
│  └────────────────────────────────┬─────────────────────────┘   │
│                                   │                              │
│  ┌────────────────────────────────┴─────────────────────────┐   │
│  │                     Providers                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ 8x8 (Brave) │ │   KMeet     │ │    Fallback         │ │   │
│  │  │ XEP-0215    │ │ EU Backup   │ │  Public STUN        │ │   │
│  │  │ 35 PoPs     │ │ Swiss       │ │  Always available   │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Provider Details

| Provider | Method | Coverage | TTL | Use Case |
|----------|--------|----------|-----|----------|
| **8x8 (Primary)** | XEP-0215 via XMPP | 35 PoPs globally | 1 hour | Primary TURN relay |
| **KMeet (EU Backup)** | HTTP API | Switzerland | 1 hour | GDPR compliance, EU users |
| **Fallback** | Static config | Global | 60s | Last resort (STUN only) |

### Failover Behavior

```
Request arrives
    │
    ▼
┌─────────────────┐
│ Check cache     │──── Hit ────► Return cached
└────────┬────────┘
         │ Miss
         ▼
┌─────────────────┐
│ Try 8x8         │──── Success ─► Cache & Return
└────────┬────────┘
         │ Fail
         ▼ (wait 0.5s)
┌─────────────────┐
│ Try KMeet       │──── Success ─► Cache & Return
└────────┬────────┘
         │ Fail
         ▼ (wait 0.5s)
┌─────────────────┐
│ Try Fallback    │──── Success ─► Cache & Return (STUN only)
└─────────────────┘
```

### Integration with VK Platform

```typescript
// packages/vk-client/src/janus/JanusClient.ts
async function getIceConfig(): Promise<RTCConfiguration> {
  const response = await fetch('http://vk-ice:3003/api/ice/credentials');
  const data = await response.json();

  return {
    iceServers: data.iceServers,
    iceCandidatePoolSize: 10,
  };
}

// Use in WebRTC connection
const pc = new RTCPeerConnection(await getIceConfig());
```

```python
# services/vk-agent/agent.py
from vk_ice import IceEngine

class VKAgent:
    def __init__(self):
        self.ice_engine = IceEngine()

    async def start(self):
        await self.ice_engine.start()

    async def get_ice_config(self):
        config = await self.ice_engine.get_credentials()
        return config.to_rtc_configuration()
```

### Cost Savings

| Approach | Monthly Cost | VK-ICE Savings |
|----------|-------------|----------------|
| Self-hosted Coturn | $20 - $50 | 100% |
| Xirsys (backup) | $30 - $100 | 100% |
| Managed TURN (Twilio) | $0.40/GB | 100% |
| **VK-ICE** | **$0** | - |

### Configuration

```bash
# Environment Variables
VK_ICE_HOST=0.0.0.0
VK_ICE_PORT=3003
VK_ICE_LOG_LEVEL=INFO
VK_ICE_PROVIDERS=8x8,kmeet,fallback  # Priority order
VK_ICE_CACHE_TTL=3600                # 1 hour cache
VK_ICE_FAILOVER_DELAY=0.5            # 500ms between retries
VK_ICE_MAX_RETRIES=3
```

### API Reference

```bash
# Get ICE credentials (auto-selects best provider)
curl http://localhost:3003/api/ice/credentials

# Response:
{
  "iceServers": [
    {"urls": ["stun:stun.l.google.com:19302"]},
    {
      "urls": ["turn:prod-8x8-turnrelay-oracle.jitsi.net:443?transport=tcp"],
      "username": "1733750400:room123",
      "credential": "abc123..."
    }
  ],
  "provider": "8x8",
  "ttl_seconds": 3600,
  "remaining_ttl": 3595,
  "has_turn": true,
  "has_stun": true
}

# Force specific provider
curl "http://localhost:3003/api/ice/credentials?provider=kmeet"

# Health check
curl http://localhost:3003/api/ice/health
```

---

# 8. Chatwoot Integration

## 8.1 Human Escalation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESCALATION WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Trigger Conditions                                          │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ - AI fails to resolve after 3 attempts                │   │
│     │ - Session exceeds 10 minutes                          │   │
│     │ - Duplicate problem detected (semantic matching)       │   │
│     │ - User explicitly requests human                       │   │
│     │ - Sentiment analysis detects frustration              │   │
│     └───────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  2. Escalation Creation                                         │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ INSERT INTO escalations (                              │   │
│     │   tenant_id, session_id, escalation_type,             │   │
│     │   reason, problem_id, meeting_url, within_hours       │   │
│     │ )                                                      │   │
│     └───────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  3. Chatwoot Notification                                       │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ POST /api/v1/accounts/{account_id}/conversations       │   │
│     │ {                                                      │   │
│     │   "source_id": "visualkit_{session_id}",              │   │
│     │   "inbox_id": {inbox_id},                             │   │
│     │   "custom_attributes": {                               │   │
│     │     "meeting_url": "https://meet.visualkit.live/...", │   │
│     │     "escalation_reason": "user_request",              │   │
│     │     "ai_transcript": [...],                           │   │
│     │   }                                                    │   │
│     │ }                                                      │   │
│     └───────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  4. Agent Dashboard                                             │
│     ┌───────────────────────────────────────────────────────┐   │
│     │ Chatwoot shows conversation with:                      │   │
│     │ - Full AI transcript history                           │   │
│     │ - Escalation reason and context                        │   │
│     │ - One-click meeting join button                        │   │
│     │ - Customer information                                 │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 8.2 Docker Compose Configuration

```yaml
# apps/chatwoot/docker-compose.platform.yml
version: '3.8'

services:
  chatwoot:
    build:
      context: .
      dockerfile: ./docker/Dockerfile
    container_name: platform-chatwoot
    restart: unless-stopped
    ports:
      - '3000:3000'
    env_file: .env
    environment:
      - RAILS_ENV=development
      - NODE_ENV=development
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        bundle install
        bundle exec rails db:prepare
        rm -f tmp/pids/server.pid
        bundle exec rails s -p 3000 -b '0.0.0.0'
    healthcheck:
      test: ['CMD', 'curl', '-sf', 'http://localhost:3000/api']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s
    networks:
      - platform-network

  chatwoot-sidekiq:
    build:
      context: .
      dockerfile: ./docker/Dockerfile
    container_name: platform-chatwoot-sidekiq
    restart: unless-stopped
    env_file: .env
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        bundle install
        bundle exec sidekiq -C config/sidekiq.yml
    depends_on:
      chatwoot:
        condition: service_started
    networks:
      - platform-network

  mailhog:
    image: mailhog/mailhog
    container_name: platform-mailhog
    ports:
      - '1025:1025'  # SMTP
      - '8025:8025'  # Web UI
    networks:
      - platform-network

networks:
  platform-network:
    external: true
```

## 8.3 Envi\
ment Configuration

```bash
# apps/chatwoot/.env

# Application
SECRET_KEY_BASE=replace_with_64_char_hex_secret
FRONTEND_URL=http://localhost:3000
FORCE_SSL=false
ENABLE_ACCOUNT_SIGNUP=true

# Database (shared PostgreSQL)
POSTGRES_HOST=platform-postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot
POSTGRES_USERNAME=platform
POSTGRES_PASSWORD=platform_dev_password

# Redis (shared)
REDIS_URL=redis://:platform_redis_password@platform-redis:6379

# Mail (Mailhog for development)
MAILER_SENDER_EMAIL=Chatwoot <accounts@visualkit.live>
SMTP_ADDRESS=mailhog
SMTP_PORT=1025
SMTP_AUTHENTICATION=none

# VisualKit Integration
VISUALKIT_API_URL=http://host.docker.internal:3001
VISUALKIT_WEBHOOK_SECRET=your_webhook_secret_here
```

## 8.4 Dashboard Integration

```typescript
// apps/dashboard/src/pages/ConversationsPage.tsx
export function ConversationsPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'escalated'>('ai');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ai">AI Transcripts</TabsTrigger>
          <TabsTrigger value="escalated">
            Escalated
            {escalatedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {escalatedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <AITranscriptsList />
        </TabsContent>

        <TabsContent value="escalated" className="h-full">
          <iframe
            src={`${CHATWOOT_URL}/app/accounts/1/conversations`}
            className="w-full h-full border-0"
            title="Chatwoot Conversations"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 8.5 Chatwoot Modifications Required

Self-hosted and modified Chatwoot embedded at `dashboard.visualkit.live/conversations`. Only escalated conversations shown.

**Modifications:**

1. Remove Chatwoot branding completely
2. Filter inbox to escalated conversations only
3. Add screen recording viewer component
4. Integrate AI transcript panel (full conversation history)
5. Add customer context sidebar from VisualKit data
6. SSO with VisualKit dashboard authentication

## 8.6 Screen Recording Feature (Premium)

For premium users, screen recordings of AI conversations are stored and viewable by human agents during escalation.


- Recording stored in S3-compatible storage
- Linked to conversation in Chatwoot
- Thumbnail timeline for quick navigation
- Sync playback with transcript timestamps
- Download option for compliance

**Storage Pricing:** $0.05/GB/month

---

# 9. Deployment & Infrastructure

## 9.1 GCP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GCP INFRASTRUCTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Cloud Load Balancer                   │    │
│  │  - SSL termination                                       │    │
│  │  - Global anycast                                        │    │
│  │  - DDoS protection                                       │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                        │                                         │
│  ┌─────────────────────┴───────────────────────────────────┐    │
│  │                    Cloud CDN                             │    │
│  │  - Static assets (dashboard, landing, meeting)           │    │
│  │  - Widget SDK distribution                               │    │
│  │  - Edge caching                                          │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                        │                                         │
│         ┌──────────────┴──────────────┐                         │
│         │                             │                          │
│         ▼                             ▼                          │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │     Cloud Run       │    │     GCE VM          │             │
│  │  ┌───────────────┐  │    │  ┌───────────────┐  │             │
│  │  │ API Server    │  │    │  │ Janus Gateway │  │             │
│  │  │ (auto-scale)  │  │    │  │ + Coturn      │  │             │
│  │  └───────────────┘  │    │  └───────────────┘  │             │
│  │  ┌───────────────┐  │    │  ┌───────────────┐  │             │
│  │  │ WebSocket     │  │    │  │ VK Agent      │  │             │
│  │  │ (min 1)       │  │    │  │ (Python)      │  │             │
│  │  └───────────────┘  │    │  └───────────────┘  │             │
│  └─────────────────────┘    └─────────────────────┘             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Managed Services                      │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │    │
│  │  │ Cloud SQL     │  │ MemoryStore   │  │ Cloud       │  │    │
│  │  │ PostgreSQL 16 │  │ Redis 7.4     │  │ Storage     │  │    │
│  │  │ + pgvector    │  │               │  │             │  │    │
│  │  └───────────────┘  └───────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 9.2 Cost Breakdown

### Staging Environment (~$225-280/month)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (API) | 1 vCPU, 512MB | $30-50 |
| Cloud Run (WebSocket) | 1 vCPU, 512MB | $30-50 |
| Cloud SQL (PostgreSQL) | db-n1-standard-1 | $50-70 |
| MemoryStore (Redis) | 1GB Basic | $30-40 |
| GCE (Janus + Coturn) | e2-medium | $30-40 |
| Cloud Storage + CDN | ~50GB | $10-20 |
| Network egress | ~100GB | $10-20 |

### Production Environment (~$650-900/month with CUDs)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (API) | 2 vCPU, 2GB, min 2 | $100-150 |
| Cloud Run (WebSocket) | 2 vCPU, 1GB, min 2 | $80-120 |
| Cloud SQL (PostgreSQL) | db-n1-standard-4 + replica | $200-300 |
| MemoryStore (Redis) | 5GB HA | $100-150 |
| GCE (Janus cluster) | 3x e2-standard-2 | $150-200 |
| Cloud Storage + CDN | ~500GB | $30-50 |

## 9.3 CI/CD Pipelines

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy visualkit-api \
            --image gcr.io/$PROJECT_ID/api:$GITHUB_SHA \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated
```

## 9.4 Local Development

```bash
# Start all services
pnpm install
pnpm db:up          # PostgreSQL + Redis
pnpm dev            # All apps + API + Python agent

# Individual services
pnpm dev:dashboard  # Dashboard only (port 5174)
pnpm dev:api        # API server (port 3001)
pnpm dev:agent      # Python VK Agent (Janus + Gemini)

# Chatwoot (separate process)
cd apps/chatwoot
docker compose -f docker-compose.platform.yml up -d
```

---

# 10. API Reference

## 10.1 tRPC Router Overview

| Router | Procedures | Description |
|--------|------------|-------------|
| `auth` | 8 | Authentication, OAuth, session management |
| `users` | 6 | User CRUD, roles, profile |
| `widgets` | 6 | Widget configuration, domains |
| `sessions` | 5 | Chat session lifecycle |
| `chat` | 4 | AI chat with RAG integration |
| `vkRooms` | 4 | Room tokens, room management (Janus) |
| `knowledge` | 6 | Document upload, search |
| `analytics` | 4 | Cost metrics, usage |
| `apiKeys` | 5 | API key management |
| `aiPersonalities` | 5 | AI persona configuration |
| `escalations` | 5 | Human handoff |
| `endUsers` | 6 | End-user identity |
| `surveys` | 4 | Feedback collection |
| `problems` | 4 | Issue tracking |
| `health` | 2 | Liveness, readiness |

## 10.2 Core Endpoints

### Authentication

```typescript
// Sign in with OAuth
auth.signIn
  Input: { provider: 'google' | 'microsoft', callbackUrl?: string }
  Output: { url: string }

// Get current session
auth.getSession
  Input: none
  Output: { user: User, expires: Date } | null

// Sign out
auth.signOut
  Input: none
  Output: { success: boolean }
```

### Chat

```typescript
// Send message with RAG
chat.send
  Input: {
    sessionId: string,
    message: string,
    includeContext?: boolean
  }
  Output: {
    id: string,
    content: string,
    role: 'assistant',
    context?: RAGContext[]
  }

// Stream message (SSE)
chat.stream
  Input: { sessionId: string, message: string }
  Output: AsyncIterator<{ chunk: string, done: boolean }>
```

### VK Rooms (Janus)

```typescript
// Create room
vkRooms.createRoom
  Input: { name: string, maxParticipants?: number }
  Output: { roomId: string }

// Get join token
vkRooms.getToken
  Input: { roomId: string }
  Output: { token: string, wsUrl: string }

// List rooms
vkRooms.list
  Input: { status?: 'active' | 'all' }
  Output: { rooms: Array<{ roomId: string, participants: number }> }
```

### Knowledge Base

```typescript
// Upload document
knowledge.upload
  Input: {
    file: File,
    title: string,
    metadata?: Record<string, unknown>
  }
  Output: { documentId: string, chunkCount: number }

// Search
knowledge.search
  Input: {
    query: string,
    limit?: number,
    filters?: { category?: string }
  }
  Output: {
    results: Array<{
      content: string,
      score: number,
      documentId: string
    }>
  }
```

## 10.3 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `TENANT_MISMATCH` | 403 | Cross-tenant access attempt |
| `VALIDATION_ERROR` | 400 | Invalid input |

---

# 11. Development Guide

## 11.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥20.0.0 | JavaScript runtime |
| pnpm | ≥9.0.0 | Package manager |
| Python | ≥3.11 | VK Agent (Janus + Gemini) |
| Docker | Latest | Local databases |
| PostgreSQL | 16.7+ | Primary database |
| Redis | 7.4.2+ | Cache and streams |

## 11.2 Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/platform.git
cd platform

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start databases
pnpm db:up

# Push database schema
pnpm db:push

# Seed demo data
pnpm db:seed

# Start development
pnpm dev
```

## 11.3 Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:dashboard          # Dashboard only
pnpm dev:api                # API server only
pnpm dev:agent              # Python agent only

# Quality
pnpm typecheck              # TypeScript validation
pnpm lint                   # Biome linting
pnpm test                   # Run all tests
pnpm build                  # Production build

# Database
pnpm db:up                  # Start PostgreSQL + Redis
pnpm db:down                # Stop databases
pnpm db:push                # Push schema changes
pnpm db:seed                # Seed test data
pnpm db:studio              # Open Drizzle Studio

# Chatwoot
pnpm chatwoot:up            # Start Chatwoot
pnpm chatwoot:down          # Stop Chatwoot
pnpm chatwoot:logs          # View logs
pnpm chatwoot:console       # Rails console
```

## 11.4 Adding a New Feature

### 1. Database Schema (if needed)

```typescript
// packages/db/src/schema/new-feature.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const newFeatureTable = pgTable('new_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 2. tRPC Router

```typescript
// packages/api-contract/src/routers/new-feature.ts
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const newFeatureRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.insert(newFeatureTable).values({
        tenantId: ctx.tenantId,
        name: input.name,
      }).returning();
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(newFeatureTable)
        .where(eq(newFeatureTable.tenantId, ctx.tenantId));
    }),
});
```

### 3. Frontend Integration

```typescript
// apps/dashboard/src/pages/NewFeaturePage.tsx
import { trpc } from '../utils/trpc';

export function NewFeaturePage() {
  const { data, isLoading } = trpc.newFeature.list.useQuery();
  const createMutation = trpc.newFeature.create.useMutation();

  // Component implementation
}
```

---

# 12. Operational Runbook

## 12.1 Monitoring

### Health Checks

```bash
# API health
curl https://api.visualkit.live/health
# Expected: {"status":"healthy","version":"1.0.0"}

# Readiness (includes database)
curl https://api.visualkit.live/ready
# Expected: {"status":"ready","database":"connected","redis":"connected"}
```

### Key Metrics

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| API latency (p95) | >500ms | Scale up Cloud Run |
| Error rate | >1% | Check logs, rollback if needed |
| CPU usage | >80% | Scale up instances |
| Database connections | >80% pool | Check for connection leaks |
| Redis memory | >80% | Increase instance size |

## 12.2 Backup Procedures

### PostgreSQL

```bash
# Manual backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d).sql

# Restore
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20251201.sql

# Cloud SQL: Automated daily backups enabled
# Retention: 7 days
# Point-in-time recovery: Enabled
```

### Redis

```bash
# Manual backup
redis-cli BGSAVE
# RDB file created at /data/dump.rdb

# MemoryStore: Automatic RDB snapshots
# Frequency: Every 24 hours
# Retention: 7 days
```

## 12.3 Disaster Recovery

### RTO/RPO Targets

| Scenario | RTO | RPO |
|----------|-----|-----|
| Database failure | 15 minutes | 5 minutes |
| Region outage | 1 hour | 15 minutes |
| Complete failure | 4 hours | 1 hour |

### Recovery Steps

1. **Database Failure**
   - Cloud SQL automatic failover to read replica
   - Update connection strings if needed
   - Verify data integrity

2. **Region Outage**
   - Failover to secondary region
   - Update DNS records
   - Restore from cross-region backups

3. **Complete Failure**
   - Provision new infrastructure from Terraform
   - Restore from latest backups
   - Verify all services operational

## 12.4 Scaling Playbook

### Horizontal Scaling (Cloud Run)

```bash
# Increase minimum instances
gcloud run services update visualkit-api \
  --min-instances=5 \
  --max-instances=20

# Increase concurrency
gcloud run services update visualkit-api \
  --concurrency=100
```

### Vertical Scaling (Cloud SQL)

```bash
# Increase instance size
gcloud sql instances patch visualkit-db \
  --tier=db-n1-standard-8

# Add read replica
gcloud sql instances create visualkit-db-replica \
  --master-instance-name=visualkit-db
```

---

# 13. Roadmap & Future

## 13.1 Current Phase Status

| Phase | Status | Completion |
|-------|--------|------------|
| 1-8 | ✅ Complete | 100% |
| 9 | ✅ Complete | 100% |
| 10 | ✅ Complete | 100% |
| 11 | ✅ Complete | 100% |
| 12 | ⏸️ Paused | 50% |
| **Overall** | - | **92%** |

## 13.2 Phase 12 Remaining Work

### Completed (Weeks 1-5)
- ✅ Hybrid RAG with RRF
- ✅ BM25 full-text search
- ✅ Small2Big retrieval
- ✅ RAGAS evaluation integration
- ✅ A/B testing framework

### Pending (Weeks 6-12)
- ⏸️ CRM integrations (Salesforce, HubSpot, Zendesk)
- ⏸️ Advanced routing intelligence
- ⏸️ Production optimization
- ⏸️ Enterprise SSO (SAML, OIDC)

## 13.3 Future Enhancements

### Short-Term (Q1 2026)
- WebAuthn/FIDO2 authentication
- Advanced analytics dashboard
- Custom webhook integrations
- White-label support

### Medium-Term (Q2-Q3 2026)
- Multi-region deployment
- Edge inference for vision
- Custom model fine-tuning
- Advanced conversation analytics

### Long-Term (2027+)
- On-premise deployment option
- Industry-specific AI models
- Compliance certifications (SOC 2, HIPAA)
- Enterprise marketplace

## 13.4 Competitive Positioning

### Competitive Landscape

| Competitor | Strengths | Weaknesses | VisualKit Advantage |
|------------|-----------|------------|---------------------|
| **LiveKit** | Developer-focused, OpenAI partnership, $45M funding | Expensive cloud ($5-10K/mo), complex self-host, no UI | Turnkey solution, 90% cheaper, visual AI included |
| **Tawk.to** | Free forever, 235K+ websites, proven model | Basic AI, no vision, limited customization | Visual AI, voice, modern UX, screen sharing |
| **Intercom Fin** | High resolution rates (51-93%), strong brand | $0.99/resolution unpredictable, expensive seats | Predictable pricing, visual context for complex issues |
| **Crisp** | Good UX, affordable pricing | No visual AI, limited voice | Full multimodal (voice + vision + text) |
| **Zoom/Teams** | Ubiquitous, enterprise trust | No AI agents, expensive, generic | AI-native meetings, purpose-built for agent use |

### Unique Value Proposition

**"AI that can actually see your customer's screen"**

- 75% of chatbots fail on complex issues needing visual context
- Visual support reduces resolution time by 46%
- Cobrowsing market: $2.6B (2024) → $11.3B (2035) at 14.87% CAGR
- No competitor offers integrated AI + vision + voice + chat

### Target Verticals (Priority Order)

1. **SaaS Technical Support** - "AI that can see screens" solves software troubleshooting where chatbots fail
2. **E-commerce Support** - Visual context critical for product defects, assembly, fit issues
3. **Fintech Visual KYC** - Video KYC in <3 minutes becoming standard
4. **LATAM Market** - Guatemala-based advantage, WhatsApp-first, underserved by US competitors

### Success Metrics

| Metric | Month 6 | Month 12 | Year 2 |
|--------|:-------:|:--------:|:------:|
| Active free users | 500 | 2,000 | 10,000 |
| Paying customers | 10 | 50 | 300 |
| MRR | $500 | $5,000 | $30,000 |
| Free→Paid conversion | 2% | 3% | 4% |
| Widget installations | 100 | 500 | 3,000 |
| SDK developers | 20 | 100 | 500 |
| Meeting minutes/month | 1,000 | 10,000 | 100,000 |

### North Star Metric

**"AI Conversations with Visual Context per Week"**

This metric captures the unique value proposition: AI that can see screens. Growth in this metric indicates product-market fit for the core differentiator.

## 13.5 Implementation Phases

### Phase 1: Dashboard & Branding (Week 1-2)

1. Update branding: Logo, colors, typography to VisualKit
2. Restructure sidebar navigation per dashboard routes
3. Create /conversations page placeholder
4. Create /recordings page placeholder
5. Create /meetings section pages
6. Update all page titles and meta tags
7. Configure environment variables for domains

### Phase 2: Chatwoot Integration (Week 2-3)

1. Clone Chatwoot repository
2. Set up Chatwoot Docker deployment
3. Remove Chatwoot branding from UI
4. Implement SSO with VisualKit auth
5. Create conversation filter (escalated only)
6. Embed Chatwoot in /conversations via iframe
7. Add AI transcript panel component
8. Test escalation flow end-to-end

### Phase 3: Janus Infrastructure (Week 3-5)

1. Create services/janus-gateway/ directory
2. Set up Janus Docker deployment
3. Configure AudioBridge + VideoRoom plugins
4. Set up Coturn for TURN/STUN
5. Copy janus_gemini_bridge code to services/vk-agent/
6. Port backend_client.py from livekit-agent
7. Create TypeScript Janus client (packages/vk-client/)
8. Test audio round-trip
9. Test video/screen sharing

### Phase 4: Widget Product (Week 5-7)

1. Update apps/widget-sdk/ to use vk-client
2. Implement widget configuration UI
3. Create embed.js script generator
4. Add tier-based feature gating
5. Implement 'Powered by VisualKit' branding
6. Add concurrent user tracking (Redis)
7. Test widget on external domains
8. Create widget documentation

### Phase 5: Meeting Product (Week 7-9)

1. Build apps/meeting/ room UI
2. Implement room creation API
3. Add multi-participant support
4. Build scheduling system
5. Implement recording (premium)
6. Add AI agent joining flow
7. Create meeting links (/[room-id])
8. Test with free tier limits (5 min, 3/week)

### Phase 6: SDK & Monetization (Week 9-12)

1. Build SDK package (TypeScript + Python)
2. Create API key management UI
3. Implement rate limiting
4. Build usage tracking system
5. Integrate Stripe for payments
6. Implement tier gating middleware
7. Create billing UI
8. Write SDK documentation
9. Launch beta

## 13.6 Go-to-Market Strategy

### Launch Timeline

| Phase | Timeline | Goals |
|-------|----------|-------|
| **Alpha** | Months 1-3 | Internal testing, 10 beta users, core features |
| **Beta** | Months 4-6 | 100 free users, Indie Hackers launch, feedback loop |
| **Launch** | Month 7 | Product Hunt, Hacker News, paid tiers enabled |
| **Growth** | Months 8-12 | 500+ active users, first paying customers, LATAM expansion |

### Zero-Budget Marketing

Following proven solo founder playbooks (Plausible Analytics: $1M ARR, Tony Dinh: $45K/month):

- Build in public on Indie Hackers and Twitter/X
- Weekly progress updates with technical insights
- Comparison content: "VisualKit vs LiveKit vs Agora"
- Tutorial content: "Build AI support with screen-sharing in 30 minutes"
- Reddit engagement: r/webdev, r/SideProject, r/programming (80% help, 20% mention)
- Dev.to / Hashnode technical blog posts
- Product Hunt Coming Soon page from day 1

### Content Calendar (First 90 Days)

- **Week 1-2:** Indie Hackers profile, Twitter setup, first technical post
- **Month 1:** Daily 20min Reddit engagement, weekly IH updates, build 10 relationships
- **Month 2:** Comparison post, tutorial, cross-post to Dev.to
- **Month 3:** Soft launch IH, Show HN, Product Hunt launch

### LATAM Strategy

Leverage Guatemala home-market advantage:

- WhatsApp-native integration (mandatory for LATAM)
- Native Spanish/Portuguese AI (not translated English)
- Start Brazil-first (largest market), expand Mexico/Colombia
- Partner with LATAM SaaS companies for distribution
- Regional pricing (40-60% of US)

## 13.7 Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Janus complexity | Delayed launch, bugs | Use proven janus_gemini_bridge code, extensive testing |
| TURN server costs spike | Margin erosion | Self-hosted Coturn, Xirsys backup, usage monitoring |
| Gemini API changes | Agent breaks | Abstract AI layer, fallback to GPT-4, version pinning |
| Scale bottlenecks | Performance issues | Load testing early, horizontal scaling design |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiveKit copies visual AI | Lost differentiation | Move fast, build brand, target SMB (not their market) |
| Low conversion free→paid | Revenue shortfall | Strong feature gates, usage limits, branding value |
| Solo founder burnout | Project stalls | Phase releases, MVP mindset, defer non-critical features |
| Legal vertical competition | Lost Ron Law revenue | TOS restrictions, technical blocks, monitoring |

### Infrastructure Risk (CRITICAL)

**Previous plan relied on free 8x8/Brave Talk TURN servers. Research revealed this violates their TOS.**

**Resolution:** Self-hosted infrastructure (~$450/month):

- Coturn on Digital Ocean/Hetzner: $20-50/month
- Xirsys managed backup: $33/month
- Janus Gateway: $300/month (3x VMs)
- Bandwidth: $100/month
- Still achieves 85-90% cost reduction vs LiveKit Cloud
- Fully compliant, no dependency on third-party free tiers

---

## Appendix A: Environment Variables

```bash
# Core
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/platform
REDIS_URL=redis://:password@host:6379

# Authentication
AUTH_SECRET=your-32-character-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MFA_ENCRYPTION_KEY=your-64-character-hex-key
API_KEY_SECRET=your-32-character-secret

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
VOYAGE_API_KEY=pa-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...

# VK Media Engine (Janus)
JANUS_WS_URL=wss://wss.visualkit.live/janus
JANUS_API_SECRET=your-janus-api-secret
JANUS_JWT_SECRET=your-jwt-secret
JANUS_ROOM_SECRET=your-room-secret

# TURN/STUN (Coturn)
TURN_SERVER=turn:turn.visualkit.live:3478
TURN_USER=your-turn-user
TURN_PASSWORD=your-turn-password

# URLs
FRONTEND_URL=https://www.visualkit.live
DASHBOARD_URL=https://dashboard.visualkit.live
MEETING_URL=https://meet.visualkit.live
API_URL=https://api.visualkit.live
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **RLS** | Row-Level Security - PostgreSQL feature for automatic tenant isolation |
| **RAG** | Retrieval-Augmented Generation - Enhancing LLM responses with knowledge base |
| **tRPC** | TypeScript RPC framework for end-to-end type safety |
| **SFU** | Selective Forwarding Unit - WebRTC media server architecture |
| **pHash** | Perceptual hash - Image similarity comparison algorithm |
| **TOTP** | Time-based One-Time Password - MFA standard (RFC 6238) |
| **RRF** | Reciprocal Rank Fusion - Method to combine multiple search rankings |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | December 2025 | Initial comprehensive documentation |

---

**End of Document**

*This document is the single source of truth for the VisualKit platform architecture and should be kept up-to-date with all significant changes.*
