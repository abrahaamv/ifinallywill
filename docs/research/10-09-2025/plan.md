# LiveKit Multi-Modal Agent Implementation Plan

## Overview

**Goal**: Implement production-ready LiveKit agent with 80-90% cost reduction through:
- Three-tier AI routing (Gemini Flash-Lite 60% → Flash 25% → Claude Sonnet 4.5 15%)
- Frame deduplication with perceptual hashing (60-75% reduction)
- Adaptive FPS (30 FPS → 5 FPS idle, 40-60% reduction)
- Anthropic 90% prompt caching
- Single worker process handling multiple rooms via subprocess isolation

**Current Status**:
- Backend tRPC router exists (`packages/api-contract/src/routers/livekit.ts`) - basic stubs
- Python agent folder exists but needs complete rewrite based on latest research
- Meeting app frontend ready for integration

## Phase 1: Core Agent Architecture (Days 1-2)

### Files to Create/Update:

1. **`livekit-agent/agent.py`** (Main orchestrator)
   - Replace existing with AgentSession-based implementation (not deprecated VoicePipelineAgent)
   - Worker pattern with `prewarm_fnc` for shared model loading
   - Multi-modal processing (voice, vision, text)
   - Extract tenant context from room metadata
   - Function tools: search_knowledge, get_user_profile, create_task, log_insight

2. **`livekit-agent/ai_router.py`** (Three-tier routing)
   - ComplexityLevel enum (SIMPLE/MODERATE/COMPLEX)
   - Heuristic-based complexity estimation
   - Route to gemini-2.5-flash-lite (60%) / flash (25%) / claude-sonnet-4.5 (15%)
   - Cost tracking per request

3. **`livekit-agent/frame_processor.py`** (Vision optimization)
   - Perceptual hashing with imagehash library
   - Adaptive FPS (30 active / 5 idle)
   - Frame deduplication (threshold=10 Hamming distance)
   - JPEG encoding with quality=85
   - Statistics tracking (frames processed/skipped, deduplication rate)

4. **`livekit-agent/backend_client.py`** (Fastify integration)
   - httpx AsyncClient with connection pooling
   - JWT token generation for service-to-service auth
   - Retry logic and circuit breaking
   - Methods: get(), post(), close()

5. **`livekit-agent/config.py`** (Configuration)
   - Load per-tenant settings from backend API
   - Environment variable management
   - Model configuration and thresholds

6. **`livekit-agent/requirements.txt`** (Dependencies)
   - livekit-agents >= 0.10.0
   - livekit-plugins-deepgram
   - livekit-plugins-elevenlabs
   - livekit-plugins-openai
   - livekit-plugins-anthropic
   - livekit-plugins-google
   - livekit-plugins-silero
   - opencv-python, Pillow, imagehash (vision)
   - httpx, pyjwt (backend client)
   - asyncpg, redis[asyncio] (database/cache)

## Phase 2: Provider Management (Days 3-4)

### Files to Create:

7. **`livekit-agent/providers/manager.py`** (Singleton provider manager)
   - AIProviderManager singleton pattern
   - Connection pooling for OpenAI/Anthropic/Google
   - Tenant-aware TokenBucket rate limiting
   - _get_tenant_tier() from backend API

8. **`livekit-agent/providers/distributed_limiter.py`** (Redis rate limiting)
   - DistributedRateLimiter class
   - Sliding window algorithm with Redis sorted sets
   - check_rate_limit() and get_wait_time()
   - Cross-worker rate limit coordination

9. **`livekit-agent/monitoring.py`** (Metrics collection)
   - MetricsCollector class
   - Track: requests, costs, frame counts, latency
   - Export to Prometheus format
   - Write to PostgreSQL cost_events table

## Phase 3: Knowledge Base Integration (Day 5)

### Files to Create:

10. **`livekit-agent/rag/knowledge_base.py`** (PostgreSQL connection pool)
    - KnowledgeBasePool singleton with asyncpg
    - acquire_tenant_connection() context manager
    - Sets `app.current_tenant_id` for RLS
    - query_knowledge_base() with pgvector cosine similarity

11. **`livekit-agent/rag/embeddings.py`** (Voyage AI embeddings)
    - EmbeddingService class
    - Redis caching for embeddings (24h TTL)
    - generate_embedding() async method

## Phase 4: Backend Updates (Day 6)

### Backend Files to Update:

12. **`packages/api-contract/src/routers/livekit.ts`** (Complete router)
    - createRoom: Generate JWT token with tenant metadata
    - joinRoom: Validate tenant access, return token
    - getRoomToken: Refresh token for existing room
    - listRooms: Query LiveKit API for tenant rooms
    - deleteRoom: Clean up room resources

13. **`packages/api/src/services/livekit.ts`** (Service layer)
    - LiveKit SDK integration
    - Token generation with custom claims (tenant_id, user_id)
    - Room management (create, delete, list)
    - Webhook handling for agent events

## Phase 5: Docker & Kubernetes (Days 7-8)

### Infrastructure Files:

14. **`livekit-agent/Dockerfile`**
    - Multi-stage build (builder + runtime)
    - Python 3.11+ base image
    - Install OpenCV dependencies
    - COPY requirements and code
    - CMD: python agent.py

15. **`livekit-agent/docker-compose.yml`** (Local testing)
    - livekit-agent service
    - Links to PostgreSQL, Redis
    - Environment variables from .env
    - Health check endpoint :8081

16. **`infrastructure/k8s/livekit-agent-deployment.yaml`**
    - Deployment with 10 replicas
    - HorizontalPodAutoscaler (10-100 pods)
    - Scale trigger: livekit_active_rooms metric
    - Resources: 2-4 CPU, 4-8GB RAM per pod

17. **`infrastructure/k8s/livekit-agent-service.yaml`**
    - ClusterIP service for health checks
    - Port 8081 for metrics/health

## Phase 6: Testing & Validation (Days 9-10)

### Test Files:

18. **`livekit-agent/tests/test_agent.py`** (Unit tests)
    - Test worker initialization
    - Test prewarm_fnc model loading
    - Test room connection
    - Mock backend client

19. **`livekit-agent/tests/test_ai_router.py`** (Routing logic)
    - Test complexity estimation
    - Verify 60/25/15 distribution
    - Test model selection

20. **`livekit-agent/tests/test_frame_processor.py`** (Vision optimization)
    - Test perceptual hashing
    - Test FPS throttling
    - Test deduplication rate
    - Verify 60-75% reduction

21. **`livekit-agent/tests/integration/test_end_to_end.py`** (E2E)
    - Create test room
    - Connect agent
    - Send test audio/video
    - Verify responses
    - Check cost tracking

## Key Implementation Decisions

1. **Architecture**: Single worker process with subprocess isolation per room (Worker pattern)
2. **AI Routing**: Three-tier (Flash-Lite 60% / Flash 25% / Sonnet 15%)
3. **Vision**: Perceptual hashing + adaptive FPS (30→5)
4. **Provider Isolation**: Singleton + tenant-aware TokenBucket + distributed Redis limiter
5. **Knowledge Base**: Shared connection pool (10-50 connections) + PostgreSQL RLS
6. **Scaling**: Kubernetes HPA based on room count (10-100 pods)
7. **State**: Conversation in memory, session in Redis, persistent in PostgreSQL
8. **Deployment**: LiveKit Cloud for rapid launch, Kubernetes option for control

## Success Criteria

- ✅ Agent connects to LiveKit server and joins rooms
- ✅ Multi-modal processing (voice, vision, text) working
- ✅ Three-tier AI routing achieves 60/25/15 distribution
- ✅ Frame deduplication achieves 60-75% reduction
- ✅ Adaptive FPS working (30→5)
- ✅ Backend integration: knowledge search, user profile, task creation
- ✅ Cost tracking to PostgreSQL cost_events table
- ✅ Rate limiting per tenant tier
- ✅ RLS tenant isolation verified
- ✅ 80-90% total cost reduction achieved
- ✅ <500ms end-to-end latency (voice)
- ✅ Kubernetes deployment with HPA working

## Timeline: 10 Days

**Days 1-2**: Core agent (agent.py, ai_router.py, frame_processor.py, backend_client.py, config.py, requirements.txt)
**Days 3-4**: Provider management (manager.py, distributed_limiter.py, monitoring.py)
**Day 5**: Knowledge base integration (knowledge_base.py, embeddings.py)
**Day 6**: Backend updates (livekit router, service layer)
**Days 7-8**: Docker & Kubernetes (Dockerfile, docker-compose, K8s manifests)
**Days 9-10**: Testing & validation (unit, integration, E2E tests)

## Cost Breakdown

**Target**: 80-90% total reduction

**Individual Components**:
- Frame deduplication: 60-75% reduction (perceptual hashing, threshold=10)
- Prompt caching: 50-90% savings (Anthropic 90%, OpenAI 50%, Gemini 75%)
- Adaptive FPS: 40-60% reduction (30 FPS → 5 FPS idle)
- Three-tier routing: 40% cost reduction (Flash-Lite 60% of traffic vs GPT-4)

**Combined Effect**: Layered optimizations achieve 80-90% total cost reduction ✅

## References

- Research document: `docs/research/10-09-2025/livekit-agent-implementation.md`
- LiveKit Agents documentation: https://docs.livekit.io/agents/
- Current implementation: `livekit-agent/` (needs rewrite)
- Backend router: `packages/api-contract/src/routers/livekit.ts`
