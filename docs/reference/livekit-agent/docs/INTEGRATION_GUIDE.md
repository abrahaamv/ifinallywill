# Backend Integration Guide

Complete guide to how the production agent integrates with the TypeScript tRPC backend.

## Overview

The production agent uses **backend_integration.py** as a bridge module to connect the Python LiveKit agent with the TypeScript tRPC backend API. This enables:

- ✅ **Tenant context** from database via room name lookup
- ✅ **Usage tracking** to PostgreSQL costEvents table
- ✅ **Knowledge search** via documented RAG system
- ✅ **Feature flags** for progressive rollout
- ✅ **AI personalities** for tenant customization
- ✅ **Analytics events** for business intelligence

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Python LiveKit Agent                     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ agent.py                                           │  │
│  │ ├─ Multi-modal AI capabilities                     │  │
│  │ ├─ 1 FPS screen capture                           │  │
│  │ └─ Uses BackendClient for all data operations     │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ backend_integration.py                             │  │
│  │ ├─ BackendClient class (httpx AsyncClient)        │  │
│  │ ├─ tRPC request formatting                        │  │
│  │ ├─ Type-safe response parsing                     │  │
│  │ └─ Error handling with retries                    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          ↓ HTTP/JSON
┌──────────────────────────────────────────────────────────┐
│              TypeScript tRPC Backend API                  │
│                                                           │
│  ├─ /trpc/livekit.getTenantByRoom                       │
│  ├─ /trpc/usage.trackCost                               │
│  ├─ /trpc/knowledge.search                              │
│  ├─ /trpc/featureFlags.isEnabled                        │
│  ├─ /trpc/ai.getPersonality                             │
│  └─ /trpc/analytics.recordEvent                         │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database                                │  │
│  │ ├─ tenants table (user organizations)             │  │
│  │ ├─ costEvents table (usage tracking)              │  │
│  │ ├─ knowledge* tables (RAG system)                 │  │
│  │ ├─ ai_personalities table (customization)         │  │
│  │ └─ analytics_events table (business intelligence) │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## BackendClient Usage

### Initialization

```python
from backend_integration import BackendClient, get_backend_client

# Global singleton (recommended)
backend = get_backend_client()

# Or create custom instance
backend = BackendClient(
    base_url="http://localhost:3001",
    api_key="your-agent-api-key",
    timeout=30.0
)
```

### 1. Get Tenant Context

**Purpose**: Retrieve tenant information from room name for multi-tenancy.

**tRPC Endpoint**: `/trpc/livekit.getTenantByRoom`

**Defined in**: `03-API-DESIGN.md` (LiveKit Router)

```python
# In agent entrypoint
async def entrypoint(ctx: JobContext):
    backend = get_backend_client()

    # Get tenant from room name (e.g., "tenant-abc-meeting-123")
    tenant_context = await backend.get_tenant_by_room(ctx.room.name)

    if not tenant_context:
        logger.error(f"No tenant found for room: {ctx.room.name}")
        return

    logger.info(f"Tenant: {tenant_context.name} (tier: {tenant_context.service_tier})")

    # Pass to agent for tenant-aware operations
    agent = VideoAgent(
        instructions=INSTRUCTIONS,
        tenant_context=tenant_context,
        session_id=generate_session_id()
    )
```

**Response**:
```python
@dataclass
class TenantContext:
    id: str                    # Tenant UUID
    name: str                  # Organization name
    service_tier: str          # "free" | "starter" | "professional" | "enterprise"
    api_key: str              # Tenant API key
    metadata: Dict[str, Any]  # Custom tenant settings
```

### 2. Track Usage

**Purpose**: Record AI service usage to costEvents table for billing.

**tRPC Endpoint**: `/trpc/usage.trackCost`

**Defined in**: `03-API-DESIGN.md` (Usage & Billing Router)

**Schema**: `04-DATABASE-SCHEMA.md` (costEvents table)

```python
# Track vision API usage
async def llm_node(self, chat_ctx, tools, model_settings):
    # ... vision API call ...

    # Track cost
    if self.tenant_context and self.session_id:
        vision_cost = len(frames_to_use) * 0.001  # $0.001 per frame

        await self.backend.track_usage(
            tenant_id=self.tenant_context.id,
            session_id=self.session_id,
            service="vision",
            provider="openai",
            tokens_used=len(frames_to_use) * 1000,  # Estimated tokens
            cost_usd=vision_cost,
            metadata={
                "frames": len(frames_to_use),
                "model": "gpt-4o",
                "room_name": self.room_name
            }
        )
```

**Parameters**:
- `tenant_id` - Tenant UUID for isolation
- `session_id` - Meeting session UUID
- `service` - "vision" | "llm" | "stt" | "tts" | "knowledge"
- `provider` - "openai" | "anthropic" | "deepgram" | "cartesia"
- `tokens_used` - Estimated token count (nullable)
- `cost_usd` - Actual USD cost
- `metadata` - Additional context (frames, model, etc.)

### 3. Search Knowledge

**Purpose**: Enhance AI responses with tenant-specific knowledge via RAG.

**tRPC Endpoint**: `/trpc/knowledge.search`

**Defined in**: `03-API-DESIGN.md` (Knowledge Processing Router)

**Implementation**: `08-AI-INTEGRATION.md` (Hybrid Search)

```python
async def enhance_with_knowledge(self, chat_ctx):
    """Enhance context with tenant knowledge"""

    if not self.tenant_context:
        return

    # Get last user message
    last_message = chat_ctx.messages[-1].content if chat_ctx.messages else ""

    # Search tenant knowledge base
    knowledge_results = await self.backend.search_knowledge(
        tenant_id=self.tenant_context.id,
        query=last_message,
        limit=3,
        category=None  # Optional category filter
    )

    if knowledge_results:
        # Add knowledge to context
        knowledge_context = "\n\n".join([
            f"[Knowledge: {r.title}]\n{r.content}"
            for r in knowledge_results
        ])

        chat_ctx.messages.append(
            ChatMessage(
                role="system",
                content=f"Relevant knowledge:\n{knowledge_context}"
            )
        )

        logger.info(f"Enhanced with {len(knowledge_results)} knowledge items")
```

**Response**:
```python
@dataclass
class KnowledgeResult:
    id: str              # Knowledge item UUID
    title: str           # Document title
    content: str         # Relevant excerpt
    score: float         # Similarity score (0-1)
    category: str | None # Optional category
```

### 4. Check Feature Flags

**Purpose**: Progressive rollout and A/B testing of features.

**tRPC Endpoint**: `/trpc/featureFlags.isEnabled`

**Defined in**: `ARCHITECTURE-IMPROVEMENTS.md` (Section 8: Feature Flags)

```python
# Check if advanced vision is enabled
async def should_use_advanced_vision(self):
    if not self.tenant_context:
        return False

    return await self.backend.check_feature_flag(
        flag_key="advanced_vision_analysis",
        tenant_id=self.tenant_context.id,
        attributes={
            "service_tier": self.tenant_context.service_tier
        }
    )

# Use in vision processing
if await self.should_use_advanced_vision():
    # Use GPT-4V with detailed analysis
    model_settings.temperature = 0.3
    model_settings.top_p = 0.9
else:
    # Standard vision analysis
    model_settings.temperature = 0.7
```

### 5. Get AI Personality

**Purpose**: Customize AI behavior per tenant.

**tRPC Endpoint**: `/trpc/ai.getPersonality`

**Schema**: `04-DATABASE-SCHEMA.md` (ai_personalities table)

```python
async def load_ai_personality(self):
    """Load tenant-specific AI personality"""

    personality = await self.backend.get_ai_personality(
        tenant_id=self.tenant_context.id,
        personality_id=None  # Use default for tenant
    )

    if personality:
        # Apply personality to instructions
        self.instructions = personality.get("instructions", self.instructions)
        self.tone = personality.get("tone", "professional")
        self.capabilities = personality.get("capabilities", [])

        logger.info(f"Loaded AI personality: {personality.get('name')}")
```

### 6. Record Analytics Events

**Purpose**: Track agent activities for business intelligence.

**tRPC Endpoint**: `/trpc/analytics.recordEvent`

```python
# Track session events
await self.backend.record_session_event(
    tenant_id=self.tenant_context.id,
    session_id=self.session_id,
    event_type="meeting_started",
    metadata={
        "room_name": self.room_name,
        "participant_count": len(participants),
        "features_enabled": ["voice", "vision", "knowledge"]
    }
)

# Track important interactions
await self.backend.record_session_event(
    tenant_id=self.tenant_context.id,
    session_id=self.session_id,
    event_type="knowledge_enhanced_response",
    metadata={
        "query": user_question,
        "knowledge_items": len(knowledge_results),
        "response_time_ms": response_time
    }
)
```

## Error Handling

### Connection Errors

```python
try:
    tenant = await backend.get_tenant_by_room(room_name)
except Exception as e:
    logger.error(f"Backend connection failed: {e}")
    # Fall back to default tenant or graceful degradation
    tenant = None
```

### Graceful Degradation

```python
# Usage tracking failure doesn't break agent
success = await backend.track_usage(...)
if not success:
    logger.warning("Usage tracking failed, continuing anyway")

# Knowledge search failure returns empty results
knowledge_results = await backend.search_knowledge(...)
if not knowledge_results:
    logger.info("No knowledge found, using base instructions only")
```

## Performance Optimization

### Connection Pooling

```python
# BackendClient uses httpx.AsyncClient with connection pooling
self.client = httpx.AsyncClient(
    base_url=self.base_url,
    headers=headers,
    timeout=timeout,
    follow_redirects=True  # Automatic connection reuse
)
```

### Async Operations

```python
# All backend calls are async and non-blocking
await backend.track_usage(...)  # Doesn't block AI processing
```

### Caching (Future)

```python
# Cache tenant context for session duration
self.tenant_cache = {}

async def get_tenant_with_cache(self, room_name):
    if room_name in self.tenant_cache:
        return self.tenant_cache[room_name]

    tenant = await backend.get_tenant_by_room(room_name)
    self.tenant_cache[room_name] = tenant
    return tenant
```

## Testing

### Local Development

```bash
# 1. Start backend
cd packages/api
pnpm dev  # http://localhost:3001

# 2. Test backend connection
curl http://localhost:3001/health

# 3. Start agent
cd ai_agent_true
./start.sh

# Agent will connect to backend and log:
# ✅ Backend connection successful
```

### Mock Backend

```python
# For testing without backend
class MockBackendClient:
    async def get_tenant_by_room(self, room_name):
        return TenantContext(
            id="test-tenant-id",
            name="Test Tenant",
            service_tier="professional",
            api_key="test-key",
            metadata={}
        )

    async def track_usage(self, **kwargs):
        logger.info(f"Mock: track_usage {kwargs}")
        return True
```

## Security

### API Authentication

```python
# Agent authenticates with backend using AGENT_API_KEY
headers = {
    "Authorization": f"Bearer {self.api_key}"
}
```

### Tenant Isolation

```python
# All operations scoped to tenant_id
await backend.track_usage(
    tenant_id=self.tenant_context.id,  # Required
    ...
)
```

### Data Privacy

```python
# No sensitive data in logs
logger.info(f"Tenant: {tenant.name}")  # OK
logger.debug(f"API Key: {tenant.api_key}")  # ❌ NEVER!
```

## Next Steps

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[SETUP.md](SETUP.md)** - Setup and deployment guide
- **Platform docs** - See `03-API-DESIGN.md` for complete tRPC API reference
