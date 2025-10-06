# LiveKit Agent - Reference Implementation

> **Reference/Playground Implementation** - This code was developed during experimentation and serves as a reference for the production implementation.

**For the production implementation guide, see**: [livekit-agent-implementation.md](../livekit-agent-implementation.md)

---

**Original Description**: Production-ready LiveKit agent with complete backend integration.

This is the extracted, refined reference LiveKit agent implementation. It integrates with the TypeScript tRPC backend, provides multi-modal AI capabilities for real-time sessions, and includes enterprise-grade monitoring and cost tracking.

## What This Is

This agent is the **production version** extracted from playground experimentation. It contains:

- ✅ **Expert LiveKit patterns** (1 FPS screen capture, temporal frames, memory management)
- ✅ **Complete backend integration** via tRPC APIs
- ✅ **Usage tracking** to PostgreSQL costEvents table
- ✅ **Knowledge enhancement** via backend RAG system
- ✅ **Multi-tenancy support** with tenant isolation
- ✅ **Production monitoring** aligned with platform observability standards
- ❌ **No duplicate systems** (removed redundant knowledge/business modules)
- ❌ **No hardcoded configs** (service tiers from backend API)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LiveKit Cloud / Server                    │
├─────────────────────────────────────────────────────────────┤
│                     Production Agent                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ agent.py - Main LiveKit Agent                         │ │
│  │ ├─ 1 FPS screen capture (95% cost reduction)          │ │
│  │ ├─ Temporal frame context                             │ │
│  │ ├─ Multi-modal AI (voice, vision, text)               │ │
│  │ └─ Production error handling                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ backend_integration.py - tRPC Bridge                  │ │
│  │ ├─ Tenant context from room name                      │ │
│  │ ├─ Usage tracking to costEvents                       │ │
│  │ ├─ Knowledge search via RAG system                    │ │
│  │ └─ Feature flags for rollout                          │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              TypeScript tRPC Backend API                     │
│       (Tenant management, Usage tracking, Knowledge)         │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup

```bash
# One-time setup
./setup.sh

# Configure API keys
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start Agent

```bash
./start.sh
```

The agent will:
1. Connect to LiveKit server
2. Connect to backend API for tenant context
3. Wait for meeting room joins
4. Provide multi-modal AI assistance

### 3. Test Integration

```bash
# In another terminal, start the backend
cd ../../packages/api
pnpm dev

# Agent will connect to backend at http://localhost:3001
# Create a meeting room via frontend to test
```

## Key Features

### 1 FPS Screen Capture
```python
# Captures 1 frame per second (vs 30 fps)
# 95% cost reduction on vision API calls
# Temporal labeling: "first", "middle", "most recent"
```

### Backend Integration
```python
# Get tenant context
tenant = await backend.get_tenant_by_room(room_name)

# Track usage
await backend.track_usage(
    tenant_id=tenant.id,
    service="vision",
    cost_usd=0.015
)

# Search knowledge
results = await backend.search_knowledge(
    tenant_id=tenant.id,
    query="user question"
)
```

### Multi-tenancy
- Tenant context passed throughout agent lifecycle
- All API calls include tenant_id for isolation
- Usage tracked per tenant for billing

## Project Structure

```
ai_agent_true/
├── agent.py                    # Main LiveKit agent (465 lines)
├── backend_integration.py      # tRPC backend bridge (295 lines)
├── core/
│   ├── __init__.py            # Module exports
│   ├── config.py              # Environment configuration
│   └── monitoring.py          # Logging and metrics
├── docs/
│   ├── SETUP.md               # Setup guide
│   ├── INTEGRATION_GUIDE.md   # Backend integration patterns
│   └── ARCHITECTURE.md        # Architecture overview
├── requirements.txt           # Python dependencies
├── .env.example              # Configuration template
├── setup.sh                  # Setup script
├── start.sh                  # Start script
└── README.md                 # This file
```

## Configuration

See `.env.example` for all configuration options. Required:

- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `OPENAI_API_KEY` - OpenAI API key
- `DEEPGRAM_API_KEY` - Deepgram API key
- `API_BASE_URL` - Backend API URL (default: http://localhost:3001)
- `AGENT_API_KEY` - Backend authentication key

Optional (TTS):
- `CARTESIA_API_KEY` - Development TTS
- `RIME_API_KEY` - Premium production voice

## Documentation

- **[SETUP.md](docs/SETUP.md)** - Complete setup guide
- **[INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)** - Backend integration patterns
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Architecture and design decisions

## Integration with Platform

This agent integrates with the platform's documented architecture:

- **03-API-DESIGN.md** - Uses tRPC procedures for backend communication
- **04-DATABASE-SCHEMA.md** - Tracks usage to costEvents table
- **08-AI-INTEGRATION.md** - Uses documented RAG system
- **11-OBSERVABILITY.md** - Aligned monitoring and logging
- **13-CONFIGURATION-GUIDE.md** - Standard environment configuration

## What Was Removed

From the playground `ai-agent`, we removed:

- ❌ `knowledge_engine.py` - Third RAG system (used backend RAG instead)
- ❌ `business_logic.py` - Hardcoded demo code (will be in backend)
- ❌ `smart_vision_optimizer.py` - Redundant (1 FPS already optimized)
- ❌ `SERVICE_TIER_CONFIGS` - Duplicate config (fetch from backend)
- ❌ Demo/testing files - Not needed for production

## Scaling

Current capacity:
- **10-50 concurrent meetings** per agent instance
- **Sub-200ms** backend API response times
- **95% cost reduction** vs naive 30 FPS capture

Horizontal scaling:
- Deploy multiple agent instances
- Load balance via LiveKit orchestration
- Shared backend API and database
- Tenant isolation ensures data separation

## Troubleshooting

### Agent won't start
- Check `.env` configuration
- Verify all required API keys are set
- Ensure virtual environment is activated

### Backend connection failed
- Verify `API_BASE_URL` is correct
- Check backend is running (`pnpm dev` in packages/api)
- Verify `AGENT_API_KEY` is valid

### Vision API errors
- Check `OPENAI_API_KEY` is valid
- Verify screen sharing is enabled in meeting
- Check logs for specific error messages

## Support

For issues or questions:
1. Check `docs/` directory for detailed guides in this reference implementation
2. Review platform documentation in `../../../docs/` (project root docs)
3. See implementation guide at `../livekit-agent-implementation.md`

## License

Same as AI Assistant Platform main project.
