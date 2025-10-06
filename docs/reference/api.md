# API Design - Complete tRPC Specification

## 🎯 API Philosophy

**Principles**:
1. **Type-safe end-to-end** - Zero runtime type errors with tRPC + Zod
2. **Self-documenting** - TypeScript types serve as documentation
3. **Consistent patterns** - Uniform error handling, pagination, filtering
4. **Multi-tenant first** - Every query filtered by tenant context
5. **Performance** - Sub-200ms p95 latency target

**Generic Code Name**: `platform` (used throughout codebase)

---

## 🏗️ tRPC Router Structure

### Root Router Organization

```typescript
import { router } from './trpc';
import { authRouter } from './routers/auth';
import { chatRouter } from './routers/chat';
import { livekitRouter } from './routers/livekit';
import { widgetsRouter } from './routers/widgets';
import { meetingsRouter } from './routers/meetings';
import { knowledgeRouter } from './routers/knowledge';
import { analyticsRouter } from './routers/analytics';
import { tenantsRouter } from './routers/tenants';

export const appRouter = router({
  auth: authRouter,
  chat: chatRouter,
  livekit: livekitRouter,
  widgets: widgetsRouter,
  meetings: meetingsRouter,
  knowledge: knowledgeRouter,
  analytics: analyticsRouter,
  tenants: tenantsRouter,
});

export type AppRouter = typeof appRouter;
```

### Context Definition

```typescript
// packages/api-contract/src/context.ts
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Session, User } from 'lucia';
import { lucia } from '@platform/auth';
import { db } from '@platform/database';

export interface Context {
  // Authentication
  session: Session | null;
  user: User | null;

  // Multi-tenancy
  tenantId: string | null;

  // Database
  db: typeof db;

  // Request metadata
  req: Request;
  userAgent: string | null;
  ip: string | null;
}

export async function createContext({
  req,
}: FetchCreateContextFnOptions): Promise<Context> {
  const sessionId = lucia.readSessionCookie(req.headers.get('Cookie') ?? '');

  let session: Session | null = null;
  let user: User | null = null;

  if (sessionId) {
    const result = await lucia.validateSession(sessionId);
    session = result.session;
    user = result.user;
  }

  // Extract tenant from user or API key
  let tenantId: string | null = null;
  if (user) {
    tenantId = user.tenantId;
  } else {
    // Check for API key in header
    const apiKey = req.headers.get('X-API-Key');
    if (apiKey) {
      const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.apiKey, apiKey),
      });
      tenantId = tenant?.id ?? null;
    }
  }

  return {
    session,
    user,
    tenantId,
    db,
    req,
    userAgent: req.headers.get('User-Agent'),
    ip: req.headers.get('CF-Connecting-IP') ?? req.headers.get('X-Forwarded-For'),
  };
}
```

### Base Procedures

```typescript
// packages/api-contract/src/trpc.ts
import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Authenticated procedure (requires user session)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

// Tenant procedure (requires tenant context - API key or session)
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Tenant context required. Provide API key or valid session.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  });
});
```

---

## 🔐 Authentication Router

### Schema Definitions

```typescript
// packages/api-contract/src/routers/auth.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { lucia } from '@platform/auth';
import { Argon2id } from 'oslo/password';

// Input schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  tenantName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Output schemas
const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    tenantId: z.string(),
  }),
  sessionToken: z.string(),
});

export const authRouter = router({
  // Register new tenant + user
  register: publicProcedure
    .input(registerSchema)
    .output(authResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, tenantName } = input;

      // Check if user exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }

      // Create tenant
      const [tenant] = await ctx.db.insert(schema.tenants).values({
        name: tenantName,
        apiKey: generateApiKey(), // Custom function
        plan: 'starter',
      }).returning();

      // Hash password
      const hashedPassword = await new Argon2id().hash(password);

      // Create user
      const [user] = await ctx.db.insert(schema.users).values({
        email,
        passwordHash: hashedPassword,
        tenantId: tenant.id,
        role: 'owner',
      }).returning();

      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          tenantId: tenant.id,
        },
        sessionToken: session.id,
      };
    }),

  // Login
  login: publicProcedure
    .input(loginSchema)
    .output(authResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const validPassword = await new Argon2id().verify(
        user.passwordHash,
        password
      );

      if (!validPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const session = await lucia.createSession(user.id, {});

      return {
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
        },
        sessionToken: session.id,
      };
    }),

  // Logout
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      await lucia.invalidateSession(ctx.session.id);
      return { success: true };
    }),

  // Get current user
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        tenantId: ctx.user.tenantId,
        role: ctx.user.role,
      };
    }),
});
```

---

## 💬 Chat Router (SSE Text Chat)

### Schema Definitions

```typescript
// packages/api-contract/src/routers/chat.ts
import { z } from 'zod';
import { router, tenantProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const createSessionSchema = z.object({
  widgetId: z.string().uuid().optional(),
  mode: z.enum(['text', 'meeting']).default('text'),
  metadata: z.record(z.any()).optional(),
});

const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file']),
    url: z.string().url(),
  })).optional(),
});

export const chatRouter = router({
  // Create chat session
  createSession: tenantProcedure
    .input(createSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const { widgetId, mode, metadata } = input;

      // Verify widget belongs to tenant
      if (widgetId) {
        const widget = await ctx.db.query.widgets.findFirst({
          where: (widgets, { eq, and }) => and(
            eq(widgets.id, widgetId),
            eq(widgets.tenantId, ctx.tenantId!)
          ),
        });

        if (!widget) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Widget not found',
          });
        }
      }

      // Create session
      const [session] = await ctx.db.insert(schema.sessions).values({
        tenantId: ctx.tenantId!,
        widgetId,
        mode,
        metadata,
      }).returning();

      return {
        sessionId: session.id,
        mode: session.mode,
        createdAt: session.createdAt,
      };
    }),

  // Send message (triggers AI response)
  sendMessage: tenantProcedure
    .input(sendMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const { sessionId, content, attachments } = input;

      // Verify session belongs to tenant
      const session = await ctx.db.query.sessions.findFirst({
        where: (sessions, { eq, and }) => and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, ctx.tenantId!)
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Store user message
      const [message] = await ctx.db.insert(schema.messages).values({
        sessionId,
        role: 'user',
        content,
        attachments,
      }).returning();

      // Publish to Redis for SSE broadcast
      await redis.publish(`chat:${sessionId}`, {
        type: 'user-message',
        message: {
          id: message.id,
          role: 'user',
          content: message.content,
          timestamp: message.timestamp,
        },
      });

      // Trigger AI response (async, will publish to Redis when ready)
      triggerAIResponse(sessionId, content, attachments);

      return {
        messageId: message.id,
        timestamp: message.timestamp,
      };
    }),

  // Get chat history
  getHistory: tenantProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { sessionId, limit, cursor } = input;

      // Verify session
      const session = await ctx.db.query.sessions.findFirst({
        where: (sessions, { eq, and }) => and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, ctx.tenantId!)
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Fetch messages with pagination
      const messages = await ctx.db.query.messages.findMany({
        where: (messages, { eq, and, lt }) => {
          const conditions = [eq(messages.sessionId, sessionId)];
          if (cursor) {
            conditions.push(lt(messages.id, cursor));
          }
          return and(...conditions);
        },
        orderBy: (messages, { desc }) => [desc(messages.timestamp)],
        limit: limit + 1,
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),
});
```

### SSE Stream Endpoint (Non-tRPC)

**Note**: SSE endpoints are handled outside tRPC due to streaming nature.

```typescript
// packages/api/src/sse/chat-stream.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '@platform/database/redis';

export async function chatStreamHandler(
  request: FastifyRequest<{
    Params: { sessionId: string };
  }>,
  reply: FastifyReply
) {
  const { sessionId } = request.params;

  // Verify session (implement auth check)
  // ...

  // Set SSE headers
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  // Subscribe to Redis channel
  const subscriber = redis.duplicate();
  await subscriber.connect();
  await subscriber.subscribe(`chat:${sessionId}`, (message) => {
    const data = JSON.parse(message);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    reply.raw.write(': keep-alive\n\n');
  }, 30000);

  // Cleanup on disconnect
  request.raw.on('close', () => {
    clearInterval(heartbeat);
    subscriber.disconnect();
  });
}
```

---

## 🎥 LiveKit Router

```typescript
// packages/api-contract/src/routers/livekit.ts
import { z } from 'zod';
import { router, tenantProcedure } from '../trpc';
import { AccessToken } from 'livekit-server-sdk';
import { env } from '../env';

const createTokenSchema = z.object({
  sessionId: z.string().uuid(),
  participantName: z.string().min(1).max(100),
  metadata: z.record(z.any()).optional(),
});

export const livekitRouter = router({
  // Generate LiveKit access token
  createToken: tenantProcedure
    .input(createTokenSchema)
    .mutation(async ({ input, ctx }) => {
      const { sessionId, participantName, metadata } = input;

      // Verify session
      const session = await ctx.db.query.sessions.findFirst({
        where: (sessions, { eq, and }) => and(
          eq(sessions.id, sessionId),
          eq(sessions.tenantId, ctx.tenantId!)
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Update session mode to 'meeting'
      await ctx.db.update(schema.sessions)
        .set({ mode: 'meeting' })
        .where(eq(schema.sessions.id, sessionId));

      // Generate LiveKit token
      const at = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        {
          identity: `${ctx.tenantId}:${participantName}`,
          ttl: '24h',
        }
      );

      at.addGrant({
        room: sessionId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      if (metadata) {
        at.metadata = JSON.stringify(metadata);
      }

      const token = await at.toJwt();

      return {
        token,
        url: env.LIVEKIT_WS_URL,
        roomName: sessionId,
      };
    }),

  // Get active participants
  getParticipants: tenantProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Implement via LiveKit API
      // ...
      return {
        participants: [],
      };
    }),
});
```

---

## 🔧 Widgets Router

```typescript
// packages/api-contract/src/routers/widgets.ts
import { z } from 'zod';
import { router, tenantProcedure } from '../trpc';

const createWidgetSchema = z.object({
  name: z.string().min(1).max(100),
  domainWhitelist: z.array(z.string().url()).min(1),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
    greeting: z.string().max(500).optional(),
  }),
});

export const widgetsRouter = router({
  // Create widget
  create: tenantProcedure
    .input(createWidgetSchema)
    .mutation(async ({ input, ctx }) => {
      const [widget] = await ctx.db.insert(schema.widgets).values({
        ...input,
        tenantId: ctx.tenantId!,
      }).returning();

      return widget;
    }),

  // List widgets
  list: tenantProcedure
    .query(async ({ ctx }) => {
      const widgets = await ctx.db.query.widgets.findMany({
        where: (widgets, { eq }) => eq(widgets.tenantId, ctx.tenantId!),
      });

      return widgets;
    }),

  // Update widget
  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: createWidgetSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      const [updated] = await ctx.db.update(schema.widgets)
        .set(data)
        .where(and(
          eq(schema.widgets.id, id),
          eq(schema.widgets.tenantId, ctx.tenantId!)
        ))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Widget not found',
        });
      }

      return updated;
    }),

  // Delete widget
  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(schema.widgets)
        .where(and(
          eq(schema.widgets.id, input.id),
          eq(schema.widgets.tenantId, ctx.tenantId!)
        ));

      return { success: true };
    }),
});
```

---

## 📚 Knowledge Router (RAG System)

```typescript
// packages/api-contract/src/routers/knowledge.ts
import { z } from 'zod';
import { router, tenantProcedure } from '../trpc';
import { embedDocument, searchKnowledge } from '@platform/rag';

const uploadDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(10),
  category: z.string().optional(),
});

export const knowledgeRouter = router({
  // Upload document
  upload: tenantProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const { title, content, category, metadata } = input;

      // Generate embedding
      const embedding = await embedDocument(content);

      // Store document
      const [document] = await ctx.db.insert(schema.knowledgeDocuments).values({
        tenantId: ctx.tenantId!,
        title,
        content,
        category,
        embedding,
        metadata,
      }).returning();

      // Chunk and embed (async processing)
      processDocumentChunks(document.id, content);

      return document;
    }),

  // Search knowledge base
  search: tenantProcedure
    .input(searchSchema)
    .query(async ({ input, ctx }) => {
      const { query, limit, category } = input;

      const results = await searchKnowledge({
        query,
        tenantId: ctx.tenantId!,
        limit,
        category,
      });

      return {
        results: results.map(r => ({
          documentId: r.id,
          title: r.title,
          content: r.content,
          score: r.score,
          category: r.category,
        })),
      };
    }),

  // List documents
  list: tenantProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const { category, limit } = input;

      const documents = await ctx.db.query.knowledgeDocuments.findMany({
        where: (docs, { eq, and }) => {
          const conditions = [eq(docs.tenantId, ctx.tenantId!)];
          if (category) {
            conditions.push(eq(docs.category, category));
          }
          return and(...conditions);
        },
        limit,
        orderBy: (docs, { desc }) => [desc(docs.createdAt)],
      });

      return documents;
    }),
});
```

---

## 📊 Analytics Router

```typescript
// packages/api-contract/src/routers/analytics.ts
import { z } from 'zod';
import { router, tenantProcedure } from '../trpc';

export const analyticsRouter = router({
  // Get session metrics
  getSessionMetrics: tenantProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;

      const metrics = await ctx.db.query.sessions.aggregate({
        where: (sessions, { eq, and, between }) => and(
          eq(sessions.tenantId, ctx.tenantId!),
          between(sessions.createdAt, startDate, endDate)
        ),
        _count: true,
        _sum: {
          costUsd: true,
        },
      });

      return {
        totalSessions: metrics._count,
        totalCost: metrics._sum.costUsd ?? 0,
        avgCostPerSession: metrics._sum.costUsd
          ? metrics._sum.costUsd / metrics._count
          : 0,
      };
    }),

  // Get cost breakdown
  getCostBreakdown: tenantProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      // Implement cost breakdown by service (Vision, Voice, etc.)
      // ...
      return {
        vision: { cost: 0, percentage: 0 },
        voice: { cost: 0, percentage: 0 },
        llm: { cost: 0, percentage: 0 },
      };
    }),
});
```

---

## 🚨 Error Handling Patterns

### Standard Error Codes

```typescript
// Standard tRPC error codes:
// - BAD_REQUEST (400)
// - UNAUTHORIZED (401)
// - FORBIDDEN (403)
// - NOT_FOUND (404)
// - TIMEOUT (408)
// - CONFLICT (409)
// - PRECONDITION_FAILED (412)
// - PAYLOAD_TOO_LARGE (413)
// - TOO_MANY_REQUESTS (429)
// - INTERNAL_SERVER_ERROR (500)

// Usage example:
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Resource not found',
  cause: originalError, // Optional
});
```

### Client-Side Error Handling

```typescript
// apps/dashboard/src/hooks/useChat.ts
import { trpc } from '@/lib/trpc';

export function useChat() {
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onError: (error) => {
      if (error.data?.code === 'UNAUTHORIZED') {
        // Redirect to login
      } else if (error.data?.code === 'TOO_MANY_REQUESTS') {
        // Show rate limit message
      } else {
        // Show generic error
        toast.error(error.message);
      }
    },
  });

  return { sendMessage };
}
```

---

## 📏 Rate Limiting

### Implementation with Redis

```typescript
// packages/api-contract/src/middleware/rate-limit.ts
import { redis } from '@platform/database/redis';
import { TRPCError } from '@trpc/server';

export async function checkRateLimit(
  key: string,
  limit: number,
  window: number // seconds
): Promise<void> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  if (current > limit) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
}

// Usage in procedure:
export const sendMessage = tenantProcedure
  .use(async ({ ctx, next }) => {
    await checkRateLimit(
      `rate:${ctx.tenantId}:messages`,
      100, // 100 messages
      60   // per minute
    );
    return next();
  })
  .input(sendMessageSchema)
  .mutation(async ({ input, ctx }) => {
    // ...
  });
```

---

## 🔒 Security Best Practices

### Input Validation

```typescript
// Always use Zod schemas for validation
const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/[0-9]/, 'Password must contain number'),
});
```

### SQL Injection Prevention

```typescript
// ✅ GOOD: Using Drizzle ORM (parameterized queries)
await ctx.db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, email),
});

// ❌ BAD: Raw SQL without parameters
await ctx.db.execute(sql`SELECT * FROM users WHERE email = '${email}'`);
```

### CORS Configuration

```typescript
// packages/api/src/server.ts
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow dashboard domains
    const allowedOrigins = [
      'https://dashboard.platform.com',
      'http://localhost:5173',
    ];

    // Allow widget domains (check against tenant whitelist)
    // ...

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

---

## 📝 API Documentation

### Auto-Generated OpenAPI

```typescript
// Generate OpenAPI spec from tRPC router
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Platform API',
  version: '1.0.0',
  baseUrl: 'https://api.platform.com',
  tags: ['auth', 'chat', 'livekit', 'widgets', 'knowledge'],
});

// Serve at /api/openapi.json
fastify.get('/api/openapi.json', async () => {
  return openApiDocument;
});
```

---

## 🎯 Performance Targets

```yaml
API Endpoints:
  p50 Latency: < 50ms
  p95 Latency: < 200ms
  p99 Latency: < 500ms
  Error Rate: < 0.1%

SSE Connections:
  Time to First Message: < 100ms
  Heartbeat Interval: 30s
  Reconnection Strategy: Exponential backoff

Rate Limits:
  Messages per Minute: 100
  Documents per Hour: 50
  API Calls per Minute: 1000
```

---

**Next**: See `04-DATABASE-SCHEMA.md` for complete database design.
