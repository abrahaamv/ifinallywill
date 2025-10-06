# Integration Guide

## 🎯 Purpose

This document explains **how all components integrate together** in the AI Assistant Platform. It shows the complete data flows, API connections, and real-time event patterns.

---

## 🔄 **System Integration Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ tRPC Client  │  │ SSE Client   │  │ LiveKit      │      │
│  │ (HTTP/JSON)  │  │ (EventSource)│  │ (WebRTC)     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ API Server   │  │ API Server   │  │ LiveKit      │      │
│  │ (Fastify)    │  │ (Fastify)    │  │ (Cloud SFU)  │      │
│  │ Instance 1   │  │ Instance 2   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼──────────────────┼─────────────────────────────────┘
          │                  │
          └──────────────────┼──────────────────┘
                             ↓
                      ┌─────────────┐
                      │    Redis    │
                      │  (Pub/Sub)  │
                      └─────────────┘
                             ↓
                      ┌─────────────┐
                      │  PostgreSQL │
                      │  + pgvector │
                      └─────────────┘
```

---

## 1️⃣ **Authentication Flow**

### Registration & Login

```typescript
// FRONTEND: apps/dashboard/src/components/auth/RegisterForm.tsx
import { trpc } from '@/utils/trpc';

function RegisterForm() {
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async (data: RegisterInput) => {
    // Step 1: Call tRPC mutation
    const result = await registerMutation.mutateAsync({
      email: data.email,
      password: data.password,
      tenantName: data.companyName,
    });

    // Step 2: Session cookie automatically set by server
    // Step 3: Redirect to dashboard
    router.push('/dashboard');
  };
}
```

```typescript
// BACKEND: packages/api-contract/src/routers/auth.ts
export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // Step 1: Hash password with Argon2id
      const passwordHash = await hash(input.password);

      // Step 2: Create tenant
      const [tenant] = await ctx.db
        .insert(tenants)
        .values({ name: input.tenantName })
        .returning();

      // Step 3: Create user
      const [user] = await ctx.db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          tenantId: tenant.id,
        })
        .returning();

      // Step 4: Create session with Lucia
      const session = await lucia.createSession(user.id, {});

      // Step 5: Set session cookie
      const sessionCookie = lucia.createSessionCookie(session.id);
      ctx.res.headers['Set-Cookie'] = sessionCookie.serialize();

      return { user, tenant };
    }),
});
```

### Session Validation

```typescript
// BACKEND: packages/api-contract/src/context.ts
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // Step 1: Extract session cookie
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? '');

  // Step 2: Validate session
  const { session, user } = sessionId
    ? await lucia.validateSession(sessionId)
    : { session: null, user: null };

  // Step 3: Create tenant-scoped database context
  const tenantDb = user ? createTenantContext(db, user.tenantId) : null;

  return {
    session,
    user,
    tenantId: user?.tenantId ?? null,
    db,
    tenantDb, // Automatically filters by tenant_id
    req,
    res,
  };
}
```

---

## 2️⃣ **tRPC Client-Server Integration**

### Client Setup

```typescript
// FRONTEND: apps/dashboard/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@platform/api-contract';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:3001/trpc',
          credentials: 'include', // Include cookies
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Server Setup

```typescript
// BACKEND: apps/api/src/routes/trpc.ts
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from '@platform/api-contract';
import { createContext } from '@platform/api-contract/context';

export default async function trpcRoutes(fastify: FastifyInstance) {
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });
}
```

### Using tRPC in Components

```typescript
// FRONTEND: apps/dashboard/src/pages/widgets.tsx
import { trpc } from '@/utils/trpc';

function WidgetsPage() {
  // Queries (GET)
  const { data: widgets, isLoading } = trpc.widgets.list.useQuery();

  // Mutations (POST/PUT/DELETE)
  const createWidget = trpc.widgets.create.useMutation({
    onSuccess: () => {
      // Invalidate cache to refetch
      trpc.useContext().widgets.list.invalidate();
    },
  });

  const handleCreate = () => {
    createWidget.mutate({ name: 'New Widget' });
  };

  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : (
        widgets?.map((widget) => <WidgetCard key={widget.id} widget={widget} />)
      )}
    </div>
  );
}
```

---

## 3️⃣ **Server-Sent Events (SSE) Chat Flow**

### Client Connection

```typescript
// FRONTEND: apps/dashboard/src/hooks/useSSEChat.ts
import { useEffect, useState } from 'react';

export function useSSEChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Step 1: Connect to SSE endpoint
    const eventSource = new EventSource(
      `http://localhost:3001/trpc/chat.subscribe?input=${encodeURIComponent(
        JSON.stringify({ sessionId })
      )}`,
      { withCredentials: true }
    );

    // Step 2: Listen for events
    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });

    eventSource.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    });

    eventSource.addEventListener('heartbeat', () => {
      // Keep connection alive
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [sessionId]);

  const sendMessage = async (content: string) => {
    // Step 3: Send message via tRPC mutation
    await trpc.chat.sendMessage.mutate({
      sessionId,
      content,
    });
  };

  return { messages, isConnected, sendMessage };
}
```

### Server SSE Broadcasting

```typescript
// BACKEND: packages/api-contract/src/routers/chat.ts
export const chatRouter = router({
  // SSE subscription endpoint
  subscribe: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Step 1: Register SSE connection
      ctx.fastify.sse.register({
        sessionId: input.sessionId,
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        response: ctx.res,
      });

      // Connection stays open
      return new Promise(() => {});
    }),

  // Send message mutation
  sendMessage: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Step 1: Save to database
      const [message] = await ctx.tenantDb.insert.message({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        role: 'user',
        content: input.content,
      });

      // Step 2: Broadcast via Redis pub/sub (all instances receive)
      await ctx.fastify.sse.broadcast(input.sessionId, {
        sessionId: input.sessionId,
        tenantId: ctx.tenantId,
        role: 'user',
        content: input.content,
        timestamp: message.createdAt.toISOString(),
      });

      return { success: true };
    }),
});
```

### Multi-Instance Broadcasting

```typescript
// BACKEND: packages/shared/src/services/sse-manager.ts
export class SSEConnectionManager {
  private connections = new Map<string, SSEConnection>();
  private pubsub: RedisPubSubManager;

  constructor(pubsub: RedisPubSubManager) {
    this.pubsub = pubsub;

    // Listen for messages from Redis
    this.pubsub.on('message', ({ sessionId, ...message }) => {
      this.sendToClient(sessionId, message);
    });
  }

  async broadcast(sessionId: string, message: any): Promise<void> {
    // Step 1: Publish to Redis (all instances receive)
    await this.pubsub.publish(sessionId, message);

    // Step 2: Also send to local client if connected
    this.sendToClient(sessionId, message);
  }

  private sendToClient(sessionId: string, message: any): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      // Client connected to this instance
      const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
      connection.response.raw.write(data);
    }
  }
}
```

---

## 4️⃣ **LiveKit Video Integration**

### Client Setup

```typescript
// FRONTEND: apps/meeting/src/hooks/useLiveKit.ts
import { Room, RoomEvent } from 'livekit-client';
import { useEffect, useState } from 'react';

export function useLiveKit(meetingId: string) {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function connect() {
      // Step 1: Get token from API
      const { token, url } = await trpc.livekit.getToken.mutate({
        meetingId,
        role: 'guest',
      });

      // Step 2: Connect to LiveKit
      await room.connect(url, token);
      setIsConnected(true);

      // Step 3: Publish local tracks
      await room.localParticipant.enableCameraAndMicrophone();
    }

    connect();

    return () => {
      room.disconnect();
    };
  }, [meetingId]);

  return { room, isConnected };
}
```

### Token Generation

```typescript
// BACKEND: packages/api-contract/src/routers/livekit.ts
import { LiveKitTokenService } from '@platform/shared/services/livekit-tokens';

const tokenService = new LiveKitTokenService(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export const livekitRouter = router({
  getToken: protectedProcedure
    .input(z.object({ meetingId: z.string().uuid(), role: z.enum(['host', 'guest']) }))
    .mutation(async ({ ctx, input }) => {
      // Step 1: Verify meeting exists
      const meeting = await ctx.tenantDb.query.meetings.findFirst({
        where: (meetings, { eq }) => eq(meetings.id, input.meetingId),
      });

      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Step 2: Generate token
      const token = tokenService.generateParticipantToken(
        ctx.user.id,
        input.meetingId,
        ctx.user.name || ctx.user.email,
        input.role
      );

      return {
        token,
        url: process.env.LIVEKIT_URL!,
        expiresIn: 3600, // 1 hour
      };
    }),
});
```

### Token Renewal

```typescript
// FRONTEND: apps/meeting/src/hooks/useLiveKitTokenRenewal.ts
export function useLiveKitTokenRenewal(room: Room, meetingId: string) {
  useEffect(() => {
    // Schedule renewal 5 minutes before expiry
    const timer = setTimeout(
      async () => {
        const { token } = await trpc.livekit.renewToken.mutate({ meetingId });
        await room.setToken(token);
      },
      55 * 60 * 1000
    ); // 55 minutes

    return () => clearTimeout(timer);
  }, [room, meetingId]);
}
```

---

## 5️⃣ **AI Service Integration**

### Chat with AI

```typescript
// FRONTEND: Using SSE chat hook
const { messages, sendMessage } = useSSEChat(sessionId);

// Send message
await sendMessage('What is the capital of France?');

// Messages update in real-time via SSE
```

```typescript
// BACKEND: AI response generation
import { chatRouter } from './routers/chat';
import { AIService } from '@platform/ai-core';

// In chat.sendMessage mutation (continued from earlier)
const userMessage = await ctx.tenantDb.insert.message({
  sessionId: input.sessionId,
  userId: ctx.user.id,
  role: 'user',
  content: input.content,
});

// Generate AI response
const aiService = new AIService();
const response = await aiService.chat({
  messages: [{ role: 'user', content: input.content }],
  model: 'gpt-4', // Or use router.selectModel(complexity)
});

// Save AI response
const aiMessage = await ctx.tenantDb.insert.message({
  sessionId: input.sessionId,
  role: 'assistant',
  content: response.content,
});

// Broadcast AI response
await ctx.fastify.sse.broadcast(input.sessionId, {
  sessionId: input.sessionId,
  role: 'assistant',
  content: response.content,
  timestamp: aiMessage.createdAt.toISOString(),
});
```

### Vision Analysis

```typescript
// FRONTEND: Upload screenshot
const analyzeScreen = trpc.ai.analyzeVision.useMutation();

const handleScreenshot = async (imageData: string) => {
  const result = await analyzeScreen.mutateAsync({
    sessionId,
    image: imageData,
    prompt: 'Analyze this screen and provide insights',
  });

  console.log(result.analysis);
};
```

```typescript
// BACKEND: Vision analysis
import { VisionService } from '@platform/ai-core/services/vision';

export const aiRouter = router({
  analyzeVision: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        image: z.string(),
        prompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const visionService = new VisionService();

      // Smart frame selection (95% cost savings)
      const analysis = await visionService.analyzeImage({
        image: Buffer.from(input.image, 'base64'),
        prompt: input.prompt,
        maxTokens: 500,
      });

      // Track cost
      await ctx.db.insert(costEvents).values({
        tenantId: ctx.tenantId,
        service: 'vision',
        provider: analysis.provider,
        tokensUsed: analysis.tokensUsed,
        costUsd: analysis.costUsd,
      });

      return analysis;
    }),
});
```

### Knowledge Search (RAG)

```typescript
// FRONTEND: Search knowledge base
const searchKnowledge = trpc.knowledge.search.useQuery({
  query: 'How to integrate payment gateway?',
  limit: 5,
});
```

```typescript
// BACKEND: Hybrid retrieval
import { KnowledgeService } from '@platform/knowledge';

export const knowledgeRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const knowledgeService = new KnowledgeService();

      // Hybrid search: semantic + keyword + rerank
      const results = await knowledgeService.search({
        tenantId: ctx.tenantId,
        query: input.query,
        limit: input.limit,
      });

      return results;
    }),
});
```

---

## 6️⃣ **Real-Time Communication Architecture**

### Technology Stack

The platform uses a **cost-optimized real-time stack**:

1. **SSE (Server-Sent Events)** - Text chat and notifications (covered in Section 3)
2. **LiveKit** - Video/audio meetings and screen sharing (covered in Section 4)

### WebSocket NOT Required for MVP

**Why SSE + LiveKit**:
- ✅ Simpler than WebSocket libraries
- ✅ Native browser support (EventSource API)
- ✅ Auto-reconnect built-in
- ✅ HTTP/2 compatible
- ✅ No sticky sessions needed
- ✅ 90% cost savings vs always-on connections

**Optional future enhancements** (if bidirectional communication needed):
- Typing indicators
- Read receipts
- Online presence tracking
- Live admin dashboard updates

**Current Implementation**: All real-time features use SSE (Section 3) for text and LiveKit (Section 4) for meetings.

---

## 7️⃣ **Database → API → Frontend Flow**

### Complete CRUD Example

```typescript
// DATABASE: packages/db/src/schema/widgets.ts
export const widgets = pgTable('widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

```typescript
// API CONTRACT: packages/api-contract/src/routers/widgets.ts
export const widgetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Auto-filtered by tenant_id
    return ctx.tenantDb.query.widgets.findMany();
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), config: z.record(z.any()).optional() }))
    .mutation(async ({ ctx, input }) => {
      // tenant_id automatically added
      const [widget] = await ctx.tenantDb.insert.widget({
        name: input.name,
        config: input.config ?? {},
      });

      return widget;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Only updates if widget belongs to tenant
      const [widget] = await ctx.tenantDb.update.widget(id, data);

      if (!widget) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return widget;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only deletes if widget belongs to tenant
      const [widget] = await ctx.tenantDb.delete.widget(input.id);

      if (!widget) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return { success: true };
    }),
});
```

```typescript
// FRONTEND: apps/dashboard/src/pages/widgets.tsx
function WidgetsPage() {
  // List (auto-refetches on mount)
  const { data: widgets } = trpc.widgets.list.useQuery();

  // Create mutation
  const createWidget = trpc.widgets.create.useMutation({
    onSuccess: () => {
      trpc.useContext().widgets.list.invalidate();
    },
  });

  // Update mutation
  const updateWidget = trpc.widgets.update.useMutation({
    onSuccess: () => {
      trpc.useContext().widgets.list.invalidate();
    },
  });

  // Delete mutation
  const deleteWidget = trpc.widgets.delete.useMutation({
    onSuccess: () => {
      trpc.useContext().widgets.list.invalidate();
    },
  });

  return (
    <div>
      <button onClick={() => createWidget.mutate({ name: 'New Widget' })}>
        Create Widget
      </button>

      {widgets?.map((widget) => (
        <div key={widget.id}>
          <span>{widget.name}</span>
          <button onClick={() => updateWidget.mutate({ id: widget.id, name: 'Updated' })}>
            Edit
          </button>
          <button onClick={() => deleteWidget.mutate({ id: widget.id })}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔐 **Multi-Tenancy Data Isolation**

### Automatic Tenant Filtering

```typescript
// All queries automatically filtered by tenant_id
const widgets = await ctx.tenantDb.query.widgets.findMany();
// SQL: SELECT * FROM widgets WHERE tenant_id = '...'

const sessions = await ctx.tenantDb.query.sessions.findMany();
// SQL: SELECT * FROM sessions WHERE tenant_id = '...'

// Inserts automatically add tenant_id
await ctx.tenantDb.insert.widget({ name: 'Widget' });
// SQL: INSERT INTO widgets (tenant_id, name) VALUES ('...', 'Widget')

// Updates only affect tenant's data
await ctx.tenantDb.update.widget(widgetId, { name: 'Updated' });
// SQL: UPDATE widgets SET name = 'Updated' WHERE id = '...' AND tenant_id = '...'

// Deletes only affect tenant's data
await ctx.tenantDb.delete.widget(widgetId);
// SQL: DELETE FROM widgets WHERE id = '...' AND tenant_id = '...'
```

---

## 📊 **Cost Tracking Integration**

```typescript
// Every AI request automatically tracked
const response = await aiService.chat({ messages });

// Cost event created
await db.insert(costEvents).values({
  tenantId,
  service: 'chat',
  provider: 'openai',
  model: 'gpt-4',
  tokensUsed: response.tokensUsed,
  costUsd: response.costUsd,
  sessionId,
});

// Frontend can query costs
const costs = trpc.analytics.getCostMetrics.useQuery({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});
```

---

## ✅ **Integration Validation**

To verify all integrations are working:

1. **Authentication**: Register → Login → Session Cookie → Protected Routes ✅
2. **tRPC**: Frontend Query → API Procedure → Database → Response ✅
3. **SSE**: Connect → Send Message → Redis Pub/Sub → Receive ✅
4. **LiveKit**: Get Token → Connect → Video Stream ✅
5. **AI**: Send Prompt → Provider → Response → Cost Tracking ✅
6. **Multi-Tenancy**: All queries filtered by tenant_id ✅

---

**This guide shows how every component integrates. Use it to understand the complete system architecture!** 🚀
