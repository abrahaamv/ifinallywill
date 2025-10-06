# LiveKit Agent - Production Implementation Guide

> **Phase 5 Implementation** - Comprehensive guide for building the production LiveKit agent for real-time multi-modal AI sessions

**Status**: Implementation pending (Scheduled for Phase 5: Weeks 11-13)

**Reference Code**: See [livekit-agent/](./livekit-agent/) for playground/experimental implementation

> **🚨 BUDGET CRITICAL**: LiveKit Enterprise plan REQUIRED for production
> - **Minimum Cost**: $5,000-$10,000+/month base fee
> - **Build/Scale Plans Insufficient**: Cold starts, limited agent pool (unusable for production)
> - **Enterprise Features Required**: 40-100 worker pool, sub-100ms latency, 99.99% SLA
> - **Budget Approval**: Secure executive approval BEFORE Phase 5 implementation
> - **Alternative**: Self-hosted LiveKit (significant DevOps overhead, no SLA)

---

## Table of Contents

1. [Overview](#overview)
2. [LiveKit Enterprise Requirements](#livekit-enterprise-requirements)
3. [Architecture](#architecture)
4. [Implementation Phases](#implementation-phases)
5. [Core Components](#core-components)
6. [Backend Integration](#backend-integration)
7. [Cost Optimization Strategies](#cost-optimization-strategies)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Migration from Reference](#migration-from-reference)

---

## Overview

### Purpose

The production LiveKit agent is a Python-based server-side participant that joins LiveKit rooms to provide:
- **Multi-modal AI interaction** (voice, vision, text)
- **Real-time video/audio processing** via LiveKit WebRTC
- **Cost-optimized provider routing** (80% cost reduction)
- **Backend integration** via tRPC APIs
- **Multi-tenancy support** with data isolation

### Key Differences from Reference Implementation

| Aspect | Reference (Playground) | Production |
|--------|----------------------|------------|
| **Location** | `docs/reference/livekit-agent/` | `livekit-agent/` (root) |
| **Purpose** | Experimentation | Production deployment |
| **Error Handling** | Basic | Comprehensive with retries |
| **Monitoring** | Logging only | Full observability stack |
| **Configuration** | Hardcoded | Environment-driven |
| **Testing** | Manual | Automated test suite |
| **Deployment** | Development only | Production-ready with Docker |

---

## LiveKit Enterprise Requirements

### Why Enterprise Plan is Mandatory

**Build/Scale Plan Limitations** (NOT suitable for production):
- **Cold Starts**: 5-30 second delays when agent not running
- **Limited Agent Pool**: 1-5 concurrent agents maximum
- **No SLA**: No uptime guarantees or support commitments
- **Inconsistent Performance**: Resource sharing with other customers
- **Poor User Experience**: Delays destroy real-time interaction quality

**Enterprise Plan Benefits** (REQUIRED for production):
- **40-100 Worker Pool**: Pre-warmed agents, instant availability
- **Sub-100ms Latency**: Global edge network, optimized routing
- **99.99% SLA**: Financial guarantees, 24/7 support
- **Dedicated Resources**: No resource contention, predictable performance
- **Priority Support**: Direct Slack channel, dedicated account manager
- **Custom Scaling**: Tailored to your traffic patterns

### Budget Planning

**Monthly Costs**:
```
Enterprise Base Fee:     $5,000-$10,000/month (minimum)
Variable Usage:          $0.50-$2.00 per session hour
AI Provider Costs:       $0.04-$0.08 per session hour (optimized)
────────────────────────────────────────────────────
Total (1000 sessions):   $5,500-$10,500/month
Total (10K sessions):    $10,000-$25,000/month
```

**Cost Justification**:
- **Per-Session Value**: $50-$200 revenue potential
- **Break-Even**: 25-200 paid sessions/month
- **Margin Impact**: Enterprise fee = 5-10% of revenue at scale
- **Alternative Cost**: Self-hosting = $8K-$15K/month (DevOps + infrastructure)

### Pre-Implementation Checklist

**Before starting Phase 5**:
- [ ] Executive budget approval secured ($5K-$10K+/month)
- [ ] LiveKit Enterprise contract signed
- [ ] Account manager assigned
- [ ] Dedicated Slack channel active
- [ ] Worker pool size determined (40-100 agents)
- [ ] Global edge regions selected
- [ ] SLA terms reviewed and accepted
- [ ] Billing alerts configured

**Alternative Path** (if budget rejected):
- [ ] Evaluate self-hosted LiveKit (significant DevOps investment)
- [ ] Consider Phase 5 delay until budget available
- [ ] Explore alternative WebRTC providers (inferior AI integration)

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────┐
│         LiveKit Cloud Enterprise Infrastructure          │
│  (40-100 worker pool, sub-100ms latency, 99.99% SLA)   │
├─────────────────────────────────────────────────────────┤
│              Production LiveKit Agent                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Main Agent Process (agent.py)                     │ │
│  │ ├─ Room connection & participant management      │ │
│  │ ├─ 1 FPS screen capture (cost optimization)      │ │
│  │ ├─ Multi-modal processing pipeline               │ │
│  │ └─ Error handling & recovery                     │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Provider Layer (providers/)                       │ │
│  │ ├─ Vision: Gemini Flash 2.5 + Claude 3.5 Sonnet │ │
│  │ ├─ LLM: GPT-4o-mini + GPT-4o                     │ │
│  │ ├─ STT: Deepgram Nova-3                          │ │
│  │ ├─ TTS: ElevenLabs Turbo v2.5                    │ │
│  │ └─ Embeddings: Voyage Multimodal-3               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Backend Integration (integration/)                │ │
│  │ ├─ tRPC Client (authenticated)                   │ │
│  │ ├─ Tenant context management                     │ │
│  │ ├─ Usage tracking (cost events)                  │ │
│  │ └─ Knowledge base queries (RAG)                  │ │
│  └────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│          TypeScript Backend (tRPC + Fastify)             │
│     (Tenant management, Auth, Knowledge, Analytics)      │
└─────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**1. Main Agent (`agent.py`)**
- LiveKit room lifecycle management
- Participant join/leave handling
- Multi-modal processing coordination
- Error recovery and graceful degradation

**2. Provider Abstraction (`providers/`)**
- Unified interface for all AI providers
- Complexity-based routing logic
- Fallback mechanisms
- Cost tracking per request

**3. Backend Integration (`integration/`)**
- tRPC API client with authentication
- Tenant context resolution
- Real-time usage tracking
- Knowledge base integration

**4. Core Services (`core/`)**
- Configuration management
- Monitoring and observability
- Utilities and helpers

---

## Implementation Phases

### Prerequisites

**BEFORE Phase 5.1**:
1. **LiveKit Enterprise Contract**: Signed and active
2. **Budget Approval**: $5K-$10K+/month confirmed
3. **Account Setup**: Enterprise credentials issued
4. **Backend Ready**: tRPC APIs deployed and tested
5. **Security Patches**: All critical vulnerabilities patched

### Phase 5.1: Project Setup (Day 1-2)

**Directory Structure**:
```
livekit-agent/
├── agent.py                 # Main LiveKit agent
├── core/
│   ├── __init__.py
│   ├── config.py           # Environment configuration
│   ├── monitoring.py       # Logging and metrics
│   └── utils.py            # Helper functions
├── providers/
│   ├── __init__.py
│   ├── base.py             # Provider interfaces
│   ├── vision.py           # Vision providers
│   ├── llm.py              # LLM providers
│   ├── speech.py           # STT/TTS providers
│   └── router.py           # Routing logic
├── integration/
│   ├── __init__.py
│   ├── trpc_client.py      # Backend API client
│   ├── tenant.py           # Tenant management
│   └── tracking.py         # Usage tracking
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── requirements.txt         # Python dependencies
├── requirements-dev.txt     # Development dependencies
├── .env.example            # Environment template
├── setup.py                # Package setup
├── Dockerfile              # Production container
├── docker-compose.yml      # Local development
└── README.md               # Setup instructions
```

**Dependencies** (`requirements.txt`):
```txt
# LiveKit
livekit==0.16.2
livekit-agents==0.9.2
livekit-plugins-openai==0.8.5
livekit-plugins-deepgram==0.6.4
livekit-plugins-elevenlabs==0.6.2

# AI Providers
openai>=1.50.0
anthropic>=0.37.0
google-generativeai>=0.8.0
voyageai>=0.2.0

# HTTP & Async
httpx>=0.27.0
aiohttp>=3.10.0

# Utilities
python-dotenv>=1.0.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
```

### Phase 5.2: Core Infrastructure (Day 3-5)

**1. Configuration Management** (`core/config.py`):
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LiveKit
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: str

    # Backend API
    api_base_url: str = "http://localhost:3001"
    api_key: str

    # AI Providers
    openai_api_key: str
    anthropic_api_key: str
    google_api_key: str
    deepgram_api_key: str
    elevenlabs_api_key: str
    voyage_api_key: str

    # Agent Configuration
    log_level: str = "INFO"
    max_concurrent_rooms: int = 10
    vision_fps: float = 1.0  # 1 FPS for cost optimization

    class Config:
        env_file = ".env"

settings = Settings()
```

**2. Monitoring** (`core/monitoring.py`):
```python
import logging
import structlog
from typing import Dict, Any

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

class MetricsCollector:
    """Collect and track agent metrics"""

    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "rooms_joined": 0,
            "messages_processed": 0,
            "errors": 0,
            "total_cost_usd": 0.0,
        }

    def increment(self, metric: str, value: float = 1.0):
        if metric in self.metrics:
            self.metrics[metric] += value

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics.copy()

metrics = MetricsCollector()
```

### Phase 5.3: Provider Abstraction Layer (Day 6-10)

**Base Provider Interface** (`providers/base.py`):
```python
from abc import ABC, abstractmethod
from typing import Optional, AsyncIterator
from enum import Enum

class ComplexityLevel(Enum):
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"

class VisionProvider(ABC):
    @abstractmethod
    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        complexity: ComplexityLevel = ComplexityLevel.SIMPLE
    ) -> str:
        """Analyze image and return description"""
        pass

class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(
        self,
        messages: list,
        complexity: ComplexityLevel = ComplexityLevel.SIMPLE
    ) -> str:
        """Generate text response"""
        pass

class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_data: bytes) -> str:
        """Transcribe audio to text"""
        pass

class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize text to speech"""
        pass
```

**Provider Router** (`providers/router.py`):
```python
from .base import ComplexityLevel, VisionProvider, LLMProvider

class ProviderRouter:
    """Route requests to appropriate providers based on complexity"""

    def __init__(self, config):
        # Initialize providers
        self.vision_simple = GeminiFlashProvider(config)
        self.vision_complex = ClaudeVisionProvider(config)

        self.llm_simple = GPT4oMiniProvider(config)
        self.llm_complex = GPT4oProvider(config)

    async def route_vision(
        self,
        image_data: bytes,
        prompt: str,
        complexity: ComplexityLevel
    ) -> tuple[str, float]:
        """Route vision request and return (result, cost_usd)"""

        if complexity == ComplexityLevel.COMPLEX:
            provider = self.vision_complex
        else:
            provider = self.vision_simple

        result = await provider.analyze_image(image_data, prompt, complexity)
        cost = provider.calculate_cost(len(prompt), len(result))

        return result, cost

    async def route_llm(
        self,
        messages: list,
        complexity: ComplexityLevel
    ) -> tuple[str, float]:
        """Route LLM request and return (result, cost_usd)"""

        if complexity == ComplexityLevel.COMPLEX:
            provider = self.llm_complex
        else:
            provider = self.llm_simple

        result = await provider.generate_response(messages, complexity)
        cost = provider.calculate_cost(messages, result)

        return result, cost
```

### Phase 5.4: Backend Integration (Day 11-14)

**tRPC Client** (`integration/trpc_client.py`):
```python
import httpx
from typing import Dict, Any, Optional

class TRPCClient:
    """Client for backend tRPC API"""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"}
        )

    async def query(self, procedure: str, input_data: Optional[Dict] = None) -> Any:
        """Execute tRPC query"""
        url = f"{self.base_url}/trpc/{procedure}"

        params = {}
        if input_data:
            import json
            params["input"] = json.dumps(input_data)

        response = await self.client.get(url, params=params)
        response.raise_for_status()

        result = response.json()
        return result.get("result", {}).get("data")

    async def mutate(self, procedure: str, input_data: Dict) -> Any:
        """Execute tRPC mutation"""
        url = f"{self.base_url}/trpc/{procedure}"

        response = await self.client.post(url, json=input_data)
        response.raise_for_status()

        result = response.json()
        return result.get("result", {}).get("data")

    async def close(self):
        await self.client.aclose()
```

**Tenant Management** (`integration/tenant.py`):
```python
from .trpc_client import TRPCClient
from typing import Optional
import re

class TenantManager:
    """Manage tenant context from room names"""

    def __init__(self, trpc_client: TRPCClient):
        self.client = trpc_client
        self._cache: Dict[str, str] = {}

    def extract_tenant_id(self, room_name: str) -> Optional[str]:
        """Extract tenant ID from room name"""
        # Room name format: "tenant_{tenant_id}_{meeting_id}"
        match = re.match(r"tenant_([^_]+)_", room_name)
        if match:
            return match.group(1)
        return None

    async def get_tenant_by_room(self, room_name: str) -> Optional[Dict]:
        """Get tenant information from room name"""
        tenant_id = self.extract_tenant_id(room_name)
        if not tenant_id:
            return None

        # Check cache
        if tenant_id in self._cache:
            return self._cache[tenant_id]

        # Query backend
        tenant = await self.client.query(
            "tenants.getById",
            {"id": tenant_id}
        )

        if tenant:
            self._cache[tenant_id] = tenant

        return tenant
```

**Usage Tracking** (`integration/tracking.py`):
```python
from .trpc_client import TRPCClient
from datetime import datetime
from typing import Dict

class UsageTracker:
    """Track usage and costs to backend"""

    def __init__(self, trpc_client: TRPCClient):
        self.client = trpc_client

    async def track_usage(
        self,
        tenant_id: str,
        service: str,
        cost_usd: float,
        metadata: Dict = None
    ):
        """Track usage event to backend costEvents table"""

        event_data = {
            "tenantId": tenant_id,
            "service": service,
            "costUsd": cost_usd,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }

        try:
            await self.client.mutate(
                "analytics.trackCost",
                event_data
            )
        except Exception as e:
            logger.error("Failed to track usage", error=str(e))
```

### Phase 5.5: Main Agent Implementation (Day 15-21)

**Main Agent** (`agent.py`):
```python
import asyncio
from livekit import rtc
from livekit.agents import JobContext, WorkerOptions, cli
from core.config import settings
from core.monitoring import logger, metrics
from providers.router import ProviderRouter
from integration.trpc_client import TRPCClient
from integration.tenant import TenantManager
from integration.tracking import UsageTracker

class AIAssistantAgent:
    """Production AI Assistant Agent"""

    def __init__(self):
        self.router = ProviderRouter(settings)
        self.trpc = TRPCClient(settings.api_base_url, settings.api_key)
        self.tenant_mgr = TenantManager(self.trpc)
        self.tracker = UsageTracker(self.trpc)

    async def process_job(self, ctx: JobContext):
        """Main job processing logic"""

        logger.info("Job started", room=ctx.room.name)
        metrics.increment("rooms_joined")

        # Get tenant context
        tenant = await self.tenant_mgr.get_tenant_by_room(ctx.room.name)
        if not tenant:
            logger.error("Tenant not found", room=ctx.room.name)
            return

        tenant_id = tenant["id"]
        logger.info("Tenant resolved", tenant_id=tenant_id)

        # Connect to room
        await ctx.connect()

        # Start screen capture (1 FPS for cost optimization)
        screen_track = None
        for participant in ctx.room.participants.values():
            for track in participant.tracks.values():
                if track.kind == rtc.TrackKind.KIND_VIDEO:
                    screen_track = track
                    break

        if screen_track:
            await self.process_screen_track(
                screen_track,
                tenant_id,
                ctx
            )

    async def process_screen_track(
        self,
        track: rtc.Track,
        tenant_id: str,
        ctx: JobContext
    ):
        """Process screen share at 1 FPS"""

        async for frame in track:
            # Capture at 1 FPS
            await asyncio.sleep(1.0)

            # Extract frame data
            frame_data = frame.to_bytes()

            # Analyze with cost-optimized routing
            description, cost = await self.router.route_vision(
                frame_data,
                "Describe what you see on the screen",
                complexity=ComplexityLevel.SIMPLE
            )

            # Track usage
            await self.tracker.track_usage(
                tenant_id=tenant_id,
                service="vision",
                cost_usd=cost,
                metadata={"fps": 1.0}
            )

            logger.info(
                "Frame processed",
                tenant_id=tenant_id,
                cost_usd=cost
            )

async def entrypoint(ctx: JobContext):
    """Agent entry point"""
    agent = AIAssistantAgent()
    await agent.process_job(ctx)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

---

## Cost Optimization Strategies

### 1. 1 FPS Screen Capture

**Cost Impact**: 95% reduction vs 30 FPS

```python
# Instead of processing every frame:
# 30 FPS × $0.50/1M tokens × 60s = $0.90/minute

# Process 1 FPS:
# 1 FPS × $0.50/1M tokens × 60s = $0.03/minute
```

**Implementation**:
```python
async def capture_frames_optimized(track: rtc.Track):
    """Capture frames at 1 FPS"""
    frame_interval = 1.0  # seconds

    async for frame in track:
        await asyncio.sleep(frame_interval)
        yield frame
```

### 2. Complexity-Based Routing

**Vision Routing**:
- 85% routine frames → Gemini Flash 2.5 ($0.10/1M)
- 15% complex frames → Claude 3.5 Sonnet ($3.00/1M)
- **Weighted average**: $0.50/1M (80% savings)

**LLM Routing**:
- 70% simple queries → GPT-4o-mini ($0.15/1M)
- 30% complex queries → GPT-4o ($2.50/1M)
- **Weighted average**: $0.50/1M (80% savings)

---

## Testing Strategy

### Unit Tests
```bash
pytest tests/unit/ -v --cov=livekit-agent
```

### Integration Tests
```bash
pytest tests/integration/ -v
```

### End-to-End Tests
```bash
pytest tests/e2e/ -v --livekit-url=$LIVEKIT_URL
```

**Test Coverage Target**: ≥80%

---

## Deployment

### Docker Production Build

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run agent
CMD ["python", "agent.py", "start"]
```

### Environment Variables

See `.env.example` for required configuration.

### Production Checklist

**LiveKit Enterprise**:
- [ ] Enterprise plan active and verified
- [ ] Worker pool size configured (40-100 agents)
- [ ] Edge regions selected and tested
- [ ] SLA monitoring configured
- [ ] Account manager contact confirmed
- [ ] Dedicated Slack channel active

**Application Configuration**:
- [ ] All environment variables configured
- [ ] Backend API accessible from agent
- [ ] LiveKit Enterprise credentials valid
- [ ] AI provider API keys tested
- [ ] Monitoring and logging configured
- [ ] Error handling tested
- [ ] Cost tracking validated
- [ ] Multi-tenancy isolation verified

**Performance Validation**:
- [ ] Sub-100ms latency achieved
- [ ] Zero cold starts confirmed
- [ ] 99.99% uptime in staging
- [ ] Agent auto-scaling tested
- [ ] Global failover tested

---

## Migration from Reference

### Code Reuse

**Can be reused directly**:
- Provider abstraction patterns
- Cost calculation logic
- Basic LiveKit integration patterns

**Needs adaptation**:
- Error handling (add retries, circuit breakers)
- Configuration (move to pydantic-settings)
- Monitoring (add structured logging)
- Testing (add comprehensive test suite)

### Migration Steps

1. **Copy core logic** from `docs/reference/livekit-agent/`
2. **Refactor configuration** to use pydantic-settings
3. **Add production error handling** with retries
4. **Implement monitoring** with structured logging
5. **Add comprehensive tests** (unit, integration, E2E)
6. **Dockerize** for production deployment
7. **Validate** against all requirements

---

## Next Steps

1. Review this implementation guide
2. Set up development environment
3. Implement Phase 5.1 (Project Setup)
4. Follow implementation phases sequentially
5. Test thoroughly at each phase
6. Deploy to staging environment
7. Validate against production requirements
8. Deploy to production

---

## Budget Approval Template

**For Finance/Executive Team**:

```markdown
## LiveKit Enterprise Budget Request

**Request**: $5,000-$10,000/month recurring (Enterprise plan)

**Justification**:
- REQUIRED for production multi-modal AI assistant
- Build/Scale plans unsuitable (cold starts, limited agents)
- Enterprise = 99.99% SLA + sub-100ms latency + 40-100 worker pool

**Revenue Impact**:
- Per-session value: $50-$200 (customer acquisition/support efficiency)
- Break-even: 25-200 paid sessions/month
- Scale impact: 5-10% of revenue (sustainable margin)

**Alternative Analysis**:
- Self-hosted LiveKit: $8K-$15K/month (DevOps + infrastructure) + NO SLA
- Delay Phase 5: Competitive disadvantage, delayed revenue
- Alternative providers: Inferior AI integration, vendor lock-in risk

**Risk Assessment**:
- WITHOUT Enterprise: Production unusable (cold starts destroy UX)
- WITH Enterprise: Competitive advantage, reliable revenue stream

**Recommendation**: Approve Enterprise plan for Phase 5 start (Week 11)
```

---

**Implementation Timeline**: 14-21 days (Weeks 11-13, Phase 5)

**Success Criteria**:
- ✅ LiveKit Enterprise plan active and validated
- ✅ 1 FPS screen capture working
- ✅ Cost optimization validated (80% AI savings)
- ✅ Backend integration functional
- ✅ Multi-tenancy isolation verified
- ✅ All tests passing (≥80% coverage)
- ✅ Sub-100ms latency achieved
- ✅ 99.99% uptime in staging
- ✅ Production deployment successful
