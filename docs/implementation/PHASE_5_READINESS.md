# Phase 5 Readiness - AI Integration + LiveKit

**Status**: ✅ Ready to Start (Phase 4 Complete)
**Duration**: 3 weeks (Weeks 11-13)
**Prerequisites**: All Phase 1-4 deliverables complete
**Budget Requirement**: LiveKit Enterprise approval MANDATORY

---

## 🚨 CRITICAL: Budget Approval Required

**LiveKit Enterprise Plan**: $5K-10K+/month minimum ($60K-120K+/year)

**Why Enterprise Required**:
- Build/Scale plans have cold starts (production insufficient)
- Need 40-100 worker pool for concurrent meetings
- Each worker: 4 cores + 8GB RAM minimum
- No cold start tolerance for real-time video/audio

**Action Required**: Secure budget approval BEFORE starting Phase 5 implementation.

---

## Prerequisites Checklist

### ✅ Phase 1-4 Complete

**Phase 1 - Project Scaffolding**:
- ✅ Turborepo monorepo with pnpm workspaces
- ✅ TypeScript strict mode configuration
- ✅ Biome linting/formatting
- ✅ Docker Compose for local databases

**Phase 2 - Security + Database + Auth**:
- ✅ PostgreSQL 16.7+ with Row-Level Security
- ✅ 15 database tables with 70 RLS policies
- ✅ 55 performance indexes (10-1000x speedup)
- ✅ Auth.js OAuth (Google, Microsoft)
- ✅ Tenant context utilities

**Phase 3 - Backend APIs**:
- ✅ 5 tRPC routers (users, widgets, knowledge, sessions, health)
- ✅ Auth.js middleware with request-scoped RLS
- ✅ 85% test coverage
- ✅ Health check system

**Phase 4 - Frontend Applications**:
- ✅ 16 UI components (Radix UI + shadcn/ui)
- ✅ Landing page (5 pages, 366 KB)
- ✅ Dashboard (6 sections, 410 KB)
- ✅ Meeting rooms (video grid UI, 346 KB)
- ✅ Widget SDK (embeddable chat, 289 KB ES / 172 KB UMD)

### Required API Keys

```bash
# AI Providers (packages/ai-core)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Speech Services (livekit-agent)
DEEPGRAM_API_KEY=...
ELEVEN_LABS_API_KEY=...

# Embeddings (packages/knowledge)
VOYAGE_API_KEY=...

# LiveKit Cloud (apps/meeting + livekit-agent)
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### Infrastructure Requirements

**PostgreSQL 16.7+**:
```bash
# Already configured via Phase 2
docker compose up -d postgres
psql $DATABASE_URL -c "SELECT version();"
```

**Redis 7.4.2+**:
```bash
# Already configured via Phase 2
docker compose up -d redis
redis-cli PING
```

**Python 3.11+ Environment**:
```bash
cd livekit-agent
python3 --version  # Should be 3.11+
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Phase 5 Week-by-Week Plan

### Week 1 (Days 1-5): AI Provider Integration

**Day 1-2: Cost-Optimized Routing Logic**

**Goal**: Implement intelligent AI provider routing for 75-85% cost reduction

**Files to Create**:
- `packages/ai-core/src/router.ts` - Provider selection logic
- `packages/ai-core/src/providers/openai.ts` - OpenAI integration
- `packages/ai-core/src/providers/anthropic.ts` - Anthropic integration
- `packages/ai-core/src/providers/google.ts` - Google AI integration
- `packages/ai-core/src/cost-tracker.ts` - Usage tracking

**Routing Strategy**:
```typescript
// Vision Tasks (85% routine)
if (hasImage) {
  return 'gemini-flash-2.5';  // $0.02/1M input + $0.08/1M output
}

// LLM Tasks
const complexity = analyzeComplexity(prompt);
if (complexity < 0.7) {
  return 'gpt-4o-mini';  // 70% of requests, $0.15/1M input + $0.60/1M output
} else {
  return 'gpt-4o';  // 30% of requests, $2.50/1M input + $10.00/1M output
}

// Fallback for errors
if (primaryProviderFails) {
  return 'claude-3.5-sonnet';  // $3/1M input + $15/1M output
}
```

**Expected Outcome**: Blended rate of ~$0.50/1M tokens (75-85% reduction from Claude-only)

**Testing**:
```bash
cd packages/ai-core
pnpm test src/router.test.ts
pnpm build
```

**Validation**:
- [ ] All 3 providers integrated
- [ ] Complexity analysis working
- [ ] Cost tracking accurate
- [ ] Fallback mechanism tested
- [ ] Unit tests passing (>80% coverage)

---

**Day 3-4: Chat API Endpoint**

**Goal**: Connect frontend chat interfaces to AI providers

**Files to Modify**:
- `packages/api-contract/src/routers/chat.ts` - Chat router definition
- `packages/api/src/routers/chat.ts` - Chat implementation
- `apps/dashboard/src/pages/ChatPage.tsx` - Connect to API
- `apps/widget-sdk/src/Widget.tsx` - Connect to API

**API Endpoint**:
```typescript
// POST /api/trpc/chat.sendMessage
export const chatRouter = t.router({
  sendMessage: t.procedure
    .input(z.object({
      sessionId: z.string().uuid(),
      content: z.string().min(1),
      attachments: z.array(z.object({
        type: z.enum(['image', 'file']),
        url: z.string().url(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId } = ctx;

      // 1. Save user message to database
      const userMessage = await ctx.db.insert(messages).values({
        id: generateId(),
        tenantId,
        userId,
        sessionId: input.sessionId,
        role: 'user',
        content: input.content,
        createdAt: new Date(),
      });

      // 2. Route to appropriate AI provider
      const aiResponse = await aiRouter.complete({
        messages: await getSessionHistory(input.sessionId),
        userId,
        tenantId,
      });

      // 3. Save AI response to database
      const assistantMessage = await ctx.db.insert(messages).values({
        id: generateId(),
        tenantId,
        sessionId: input.sessionId,
        role: 'assistant',
        content: aiResponse.content,
        model: aiResponse.model,
        createdAt: new Date(),
      });

      // 4. Track cost event
      await ctx.db.insert(costEvents).values({
        id: generateId(),
        tenantId,
        userId,
        sessionId: input.sessionId,
        provider: aiResponse.provider,
        model: aiResponse.model,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        cost: aiResponse.usage.cost,
        createdAt: new Date(),
      });

      return assistantMessage;
    }),
});
```

**Testing**:
```bash
cd packages/api
pnpm test src/routers/chat.test.ts
curl -X POST http://localhost:3001/api/trpc/chat.sendMessage \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "...", "content": "Hello"}'
```

**Validation**:
- [ ] Chat endpoint working
- [ ] Messages saved to database
- [ ] Cost tracking accurate
- [ ] Frontend integration complete
- [ ] Error handling robust

---

**Day 5: Knowledge Base RAG Integration**

**Goal**: Connect chat API to knowledge base for context-aware responses

**Files to Modify**:
- `packages/knowledge/src/retrieval.ts` - Hybrid search implementation
- `packages/api/src/routers/chat.ts` - Add RAG retrieval before AI call

**RAG Flow**:
```typescript
// 1. User sends message
const userMessage = input.content;

// 2. Retrieve relevant knowledge chunks
const relevantChunks = await knowledgeRetrieval.search({
  tenantId,
  query: userMessage,
  limit: 5,
  minScore: 0.7,
});

// 3. Construct context-enhanced prompt
const systemPrompt = `You are an AI assistant. Use the following context to answer the user's question:

Context:
${relevantChunks.map(c => c.content).join('\n\n')}

If the context doesn't contain relevant information, say so and provide a general answer.`;

// 4. Send to AI provider
const aiResponse = await aiRouter.complete({
  systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
  userId,
  tenantId,
});
```

**Testing**:
```bash
# Upload test document
curl -X POST http://localhost:3001/api/trpc/knowledge.uploadDocument \
  -F "file=@test-doc.pdf"

# Query with RAG
curl -X POST http://localhost:3001/api/trpc/chat.sendMessage \
  -d '{"sessionId": "...", "content": "What does the document say about pricing?"}'
```

**Validation**:
- [ ] RAG retrieval working
- [ ] Context injection successful
- [ ] Responses cite sources
- [ ] Performance acceptable (<500ms)

---

### Week 2 (Days 6-10): LiveKit Integration

**Day 6-7: LiveKit Room Management**

**Goal**: Implement LiveKit room creation and management APIs

**Files to Create**:
- `packages/api-contract/src/routers/meeting.ts` - Meeting router definition
- `packages/api/src/routers/meeting.ts` - Meeting implementation
- `packages/api/src/lib/livekit.ts` - LiveKit SDK integration

**API Endpoints**:
```typescript
export const meetingRouter = t.router({
  createRoom: t.procedure
    .input(z.object({
      name: z.string().min(1),
      maxParticipants: z.number().int().positive().default(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId } = ctx;

      // 1. Create room in database
      const meeting = await ctx.db.insert(meetings).values({
        id: generateId(),
        tenantId,
        createdBy: userId,
        name: input.name,
        roomId: `${tenantId}-${generateShortId()}`,
        maxParticipants: input.maxParticipants,
        status: 'active',
        createdAt: new Date(),
      });

      // 2. Create LiveKit room
      await livekitClient.createRoom({
        name: meeting.roomId,
        emptyTimeout: 300, // 5 minutes
        maxParticipants: input.maxParticipants,
      });

      return meeting;
    }),

  generateToken: t.procedure
    .input(z.object({
      roomId: z.string(),
      participantName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { tenantId, userId } = ctx;

      // Generate LiveKit access token
      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
          identity: `${tenantId}-${userId}`,
          name: input.participantName,
        }
      );

      token.addGrant({
        room: input.roomId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      });

      return {
        token: token.toJwt(),
        url: process.env.LIVEKIT_URL,
      };
    }),
});
```

**Testing**:
```bash
cd packages/api
pnpm test src/routers/meeting.test.ts
```

**Validation**:
- [ ] Rooms created successfully
- [ ] Tokens generated correctly
- [ ] Multi-tenant isolation working
- [ ] Room cleanup on timeout

---

**Day 8-9: Meeting App LiveKit Integration**

**Goal**: Replace placeholder UI with real LiveKit video/audio

**Files to Modify**:
- `apps/meeting/package.json` - Add `@livekit/components-react`
- `apps/meeting/src/pages/RoomPage.tsx` - LiveKit integration
- `apps/meeting/src/hooks/useLiveKit.ts` - LiveKit connection hook

**LiveKit Integration**:
```typescript
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');

  useEffect(() => {
    // Fetch LiveKit token from API
    async function getToken() {
      const response = await trpc.meeting.generateToken.mutate({
        roomId,
        participantName: displayName,
      });
      setToken(response.token);
      setServerUrl(response.url);
    }
    getToken();
  }, [roomId, displayName]);

  if (!token) return <div>Loading...</div>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

**Testing**:
```bash
# Start meeting app
cd apps/meeting
pnpm dev

# Open in 2 browsers
# http://localhost:5175
# Create room, join from both browsers
# Verify video/audio working
```

**Validation**:
- [ ] Video streams working
- [ ] Audio streams working
- [ ] Screen sharing working
- [ ] Participant list accurate
- [ ] Connection state handling

---

**Day 10: Python LiveKit Agent Setup**

**Goal**: Create Python agent for multi-modal AI processing

**Files to Create**:
- `livekit-agent/requirements.txt` - Python dependencies
- `livekit-agent/agent.py` - Main agent implementation
- `livekit-agent/.env` - Agent configuration

**Agent Implementation** (see `docs/reference/livekit-agent-implementation.md` for full code):
```python
import asyncio
from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm

# Cost-optimized: 1 FPS screen capture (96% reduction vs 30 FPS)
SCREEN_CAPTURE_FPS = 1

async def entrypoint(ctx: JobContext):
    """Multi-modal AI agent with voice, vision, and text"""

    # Connect to LiveKit room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize AI providers
    openai_llm = llm.OpenAI()
    gemini_vision = llm.Gemini()  # For screen capture analysis

    # Setup voice activity detection
    async with VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai_llm,
        tts=elevenlabs.TTS(),
    ) as assistant:
        assistant.start(ctx.room)

        # Screen capture analysis loop (1 FPS)
        async for frame in screen_capture_stream(fps=SCREEN_CAPTURE_FPS):
            analysis = await gemini_vision.analyze(frame)
            await assistant.add_context(analysis)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

**Testing**:
```bash
cd livekit-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Test agent
python agent.py dev
```

**Validation**:
- [ ] Agent connects to LiveKit
- [ ] Voice transcription working (Deepgram)
- [ ] Text-to-speech working (ElevenLabs)
- [ ] Screen capture at 1 FPS
- [ ] Multi-modal context working

---

### Week 3 (Days 11-15): Integration & Testing

**Day 11-12: End-to-End Integration**

**Goal**: Connect all components for complete AI-powered meetings

**Integration Points**:
1. Frontend (meeting app) → LiveKit Cloud
2. LiveKit Cloud ← Python Agent (multi-modal AI)
3. Python Agent → Backend API (tenant context, knowledge base)
4. Backend API → AI Providers (OpenAI, Gemini, Anthropic)
5. Backend API → Database (messages, cost tracking)

**Testing Scenarios**:
```bash
# Scenario 1: Voice-only meeting
1. Create room in meeting app
2. Join with voice enabled
3. Speak to AI assistant
4. Verify transcription + response
5. Check cost tracking in database

# Scenario 2: Screen sharing with AI analysis
1. Create room
2. Enable screen sharing
3. Open document on screen
4. Ask AI "What's on my screen?"
5. Verify AI analyzes at 1 FPS
6. Check cost (should be 96% lower than 30 FPS)

# Scenario 3: Knowledge base integration
1. Upload document to knowledge base
2. Create meeting
3. Ask AI about document content
4. Verify RAG retrieval working
5. Check response cites sources
```

**Validation**:
- [ ] All scenarios passing
- [ ] No errors in logs
- [ ] Cost tracking accurate
- [ ] Performance acceptable (<2s latency)

---

**Day 13-14: Performance Optimization**

**Goal**: Optimize for production load

**Optimization Areas**:

**1. Screen Capture Frame Rate Validation**:
```python
# Verify 1 FPS screen capture
import time

frame_times = []
async for frame in screen_capture_stream(fps=1):
    frame_times.append(time.time())

avg_fps = len(frame_times) / (frame_times[-1] - frame_times[0])
assert 0.9 <= avg_fps <= 1.1, f"FPS out of range: {avg_fps}"
```

**2. AI Provider Latency**:
```typescript
// Add latency tracking
const startTime = Date.now();
const response = await aiRouter.complete(prompt);
const latency = Date.now() - startTime;

await db.insert(costEvents).values({
  latency,
  // ... other fields
});

// Alert if latency > 2s
if (latency > 2000) {
  logger.warn('High AI latency', { latency, provider, model });
}
```

**3. Database Query Optimization**:
```sql
-- Add index for message retrieval
CREATE INDEX CONCURRENTLY idx_messages_session_created
ON messages(tenant_id, session_id, created_at DESC);

-- Validate query performance
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE tenant_id = '...' AND session_id = '...'
ORDER BY created_at DESC
LIMIT 50;
-- Should use index scan, not seq scan
```

**Validation**:
- [ ] Screen capture at 1 FPS ± 0.1
- [ ] AI response latency <2s p95
- [ ] Database queries <100ms p95
- [ ] No memory leaks (24h soak test)

---

**Day 15: Documentation & Handoff**

**Goal**: Complete Phase 5 documentation

**Documents to Create**:
1. `docs/implementation/phase-5-implementation.md` - Complete implementation log
2. `docs/reference/ai-provider-routing.md` - Provider selection logic
3. `docs/reference/livekit-integration.md` - LiveKit setup guide
4. `docs/operations/ai-cost-monitoring.md` - Cost tracking dashboard

**Update Existing Docs**:
- `README.md` - Update status to Phase 5 complete
- `docs/guides/roadmap.md` - Mark Phase 5 complete, Phase 6 ready
- `CLAUDE.md` - Update quick start with AI configuration

**Validation**:
- [ ] All documentation complete
- [ ] Architecture diagrams updated
- [ ] API reference up-to-date
- [ ] Runbooks complete

---

## Success Criteria

### Functional Requirements

- [ ] AI chat working in Dashboard app
- [ ] AI chat working in Widget SDK
- [ ] LiveKit video/audio working in Meeting app
- [ ] Python agent processing voice, vision, text
- [ ] Knowledge base RAG integration working
- [ ] Cost tracking accurate in database

### Performance Requirements

- [ ] AI response latency <2s p95
- [ ] Screen capture at 1 FPS (96% cost reduction validated)
- [ ] Database queries <100ms p95
- [ ] No memory leaks (24h soak test passing)

### Cost Requirements

- [ ] Blended AI rate ~$0.50/1M tokens (75-85% reduction validated)
- [ ] Screen capture cost 96% lower than 30 FPS baseline
- [ ] Cost tracking dashboard showing savings

### Quality Requirements

- [ ] TypeScript strict mode passing
- [ ] Test coverage >80% for new code
- [ ] All builds successful (<5s with Turbo cache)
- [ ] No runtime errors in dev/prod

---

## Risk Mitigation

### High Risk: LiveKit Enterprise Cost

**Mitigation**: Secure budget approval BEFORE starting Phase 5

**Contingency**: If budget not approved, defer to Phase 7 and focus on text-only chat with cost-optimized AI routing

### Medium Risk: Python Agent Complexity

**Mitigation**: Use reference implementation from `docs/reference/livekit-agent/`

**Contingency**: Start with voice-only, add vision in Phase 6

### Low Risk: AI Provider Rate Limits

**Mitigation**: Implement exponential backoff and fallback to alternative providers

**Contingency**: Cache common responses, implement request queuing

---

## Phase 5 Completion Checklist

Before marking Phase 5 complete:

- [ ] All Week 1-3 tasks completed
- [ ] All validation criteria met
- [ ] All success criteria achieved
- [ ] All documentation updated
- [ ] Phase 5 implementation doc created
- [ ] Phase 6 readiness doc prepared
- [ ] Git commit with clean history

---

**Next Phase**: Phase 6 - Real-time Features (Weeks 14-15)

**Phase 6 Preview**:
- WebSocket chat via `packages/realtime`
- Redis Streams message broadcasting
- Real-time notifications and presence
- Load balancer sticky sessions
- Multi-instance coordination

---

**Prepared By**: Claude Code + SPARC Methodology
**Date**: 2025-10-07
**Status**: ✅ Ready for Implementation (Pending Budget Approval)
