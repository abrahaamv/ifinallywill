# AI Assistant Platform

> Enterprise-grade real-time AI interaction system with multi-modal capabilities, cost-optimized provider architecture (75-85% cost reduction), and comprehensive knowledge management.

**Status**: Production Ready | **Security Score**: 99/100 | **Build**: Passing | **Phases**: 12/12 Complete
**Platform**: 50 database tables | 24 tRPC routers | 4 React apps | Janus WebRTC + Gemini Voice AI

---

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 9+, Python 3.11+, Docker

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start databases
pnpm db:up

# Start all services
pnpm dev
```

### Production URLs (Live)

| Service | URL | Description |
|---------|-----|-------------|
| Landing | https://visualkit.live | Marketing site |
| Dashboard | https://app.visualkit.live | Tenant admin portal |
| Meeting | https://meet.visualkit.live | Video rooms with AI agent |
| API | https://api.visualkit.live | tRPC backend |
| Agent | https://agent.visualkit.live | Voice AI (VK-Agent) |
| Janus | wss://janus.visualkit.live | WebRTC signaling |
| Widget CDN | https://cdn.visualkit.live | Embeddable widget |
| Support | https://support.visualkit.live | Chatwoot |

### Local Development

| Service | URL | Description |
|---------|-----|-------------|
| Landing | http://localhost:5173 | Marketing site |
| Dashboard | http://localhost:5174 | Admin portal |
| Meeting | http://localhost:5175 | Video rooms |
| Widget SDK | http://localhost:5176 | Widget demo |
| API | http://localhost:3001 | tRPC backend |
| Realtime | http://localhost:3002 | WebSocket server |

---

## Project Structure

```
platform/
├── apps/
│   ├── landing/         # Public marketing site
│   ├── dashboard/       # Admin portal
│   ├── meeting/         # Video meeting rooms
│   └── widget-sdk/      # Embeddable chat widget
├── packages/
│   ├── api/             # Fastify + tRPC server
│   ├── api-contract/    # tRPC router definitions
│   ├── auth/            # Auth.js authentication
│   ├── db/              # Drizzle ORM + PostgreSQL
│   ├── knowledge/       # RAG system
│   ├── realtime/        # WebSocket + Redis Streams
│   ├── shared/          # Common utilities
│   └── ui/              # Shared UI components
├── services/
│   ├── vk-agent/        # Python Voice AI (Janus + Gemini)
│   └── vk-ice/          # ICE server
├── infrastructure/      # Deployment configs (Hetzner, Docker)
└── docs/                # Documentation
```

---

## Key Features

### Cost-Optimized AI (75-85% reduction)

- **Vision**: Gemini Live API with native voice ($0.075-0.30/1M tokens)
- **Chat**: GPT-4o-mini (70%) + GPT-4o (30%) routing
- **Video**: 1 FPS screen capture (96% cost reduction)

### Enterprise Security (99/100 score)

- Auth.js with OAuth PKCE + Argon2id passwords
- TOTP MFA + session rotation
- PostgreSQL RLS (76+ policies)
- Helmet.js security headers (11 headers)
- CSRF protection + rate limiting

### Real-time Capabilities

- Janus Gateway for WebRTC video/audio
- VK-Agent for Gemini Live API voice AI
- WebSocket + Redis Streams for chat
- Shadow DOM widget isolation

### Enterprise Features (Phase 12)

- CRM integrations (Salesforce, HubSpot, Zendesk)
- Ticketing (Jira, Linear, GitHub Issues)
- Knowledge sync (Notion, Confluence, SharePoint)
- CRAG (Corrective RAG) with query refinement
- Quality assurance with hallucination detection
- SSO, custom roles, trusted devices

---

## Commands

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build for production
pnpm typecheck        # TypeScript validation
pnpm lint             # Biome linting
pnpm test             # Run tests

# Database
pnpm db:up            # Start PostgreSQL + Redis
pnpm db:down          # Stop databases
pnpm db:push          # Push schema changes
pnpm db:seed          # Seed test data
```

---

## Technology Stack

**Frontend**: React 18, Vite 6, Tailwind CSS v4, shadcn/ui
**Backend**: Fastify 5.3, tRPC v11, Drizzle ORM
**Database**: PostgreSQL 16+ (50 tables), Redis 7.4+
**AI**: OpenAI, Anthropic, Google Gemini, Voyage embeddings, Cohere reranking
**Real-time**: Janus Gateway (WebRTC), WebSocket, Redis Streams
**Voice**: VK-Agent (Python) + Gemini Live API
**Auth**: Auth.js v5

---

## Documentation

- [Getting Started](docs/getting-started/overview.md)
- [Architecture](docs/architecture/system-design.md)
- [API Reference](docs/reference/api.md)
- [Database Schema](docs/reference/database.md)
- [Deployment Guide](docs/operations/deployment.md)
- [Phase Documentation](docs/phases/)

See [docs/README.md](docs/README.md) for complete documentation index.

---

## Widget SDK (CDN)

The widget can be embedded via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@latest/dist/widget-sdk.umd.js"></script>
<script>
  new PlatformWidget('widget-container', {
    apiKey: 'your-api-key',
    apiUrl: 'https://api.your-domain.com/trpc'
  });
</script>
```

See [Widget SDK Documentation](docs/reference/widget-sdk.md) for integration guides.

---

## License

Proprietary - All rights reserved
