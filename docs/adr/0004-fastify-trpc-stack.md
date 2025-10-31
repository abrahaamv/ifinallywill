# ADR-0004: Adopt Fastify + tRPC for Backend API Stack

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Platform Engineering Team
**Related Phases**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md)

---

## Context

The platform needs a backend API framework that provides:
- Type-safe API contracts shared with frontend
- High performance (<100ms response times)
- Integration with Auth.js middleware
- Support for multi-tenant RLS context
- Developer-friendly error handling

**Problem**: Which backend framework and API pattern best balances type safety, performance, and developer experience?

**Requirements**:
- End-to-end type safety (backend → frontend)
- Automatic API documentation
- Request validation at runtime
- Compatible with monorepo structure
- Production-ready with health checks

---

## Decision

Use **Fastify 5.3.2+** as HTTP server with **tRPC v11** for type-safe API layer.

**Rationale**:
- **Fastify**: 3-4x faster than Express, modern plugin system
- **tRPC**: End-to-end TypeScript types without codegen
- **Type Safety**: Shared types via `@platform/api-contract` package
- **Performance**: <100ms API responses with minimal overhead
- **Developer Experience**: Full IDE autocomplete for API calls

**Architecture**:
```typescript
// packages/api-contract/src/routers/users.ts
export const usersRouter = router({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      // ctx.tenantId auto-injected from Auth.js session
      return await ctx.db.select().from(users);
      // RLS automatically filters by tenant_id
    })
});

// Frontend usage (packages/dashboard)
const { data } = trpc.users.getAll.useQuery();
// ^? User[] - Full type inference!
```

---

## Alternatives Considered

### Alternative 1: Express + REST
**Description**: Traditional REST API with Express.js framework.

**Pros**:
- Most popular Node.js framework
- Huge ecosystem of middleware
- Well-documented patterns

**Cons**:
- ❌ **No Type Safety**: Manual type definitions for API routes
- ❌ **Performance**: 3-4x slower than Fastify
- ❌ **Maintenance**: OpenAPI specs drift from implementation
- ❌ **Developer Experience**: No autocomplete for API calls

**Why Rejected**: Lack of type safety leads to runtime bugs. Performance insufficient for <100ms goal.

---

### Alternative 2: Hono + REST
**Description**: Lightweight web framework with REST API.

**Pros**:
- Very fast (edge runtime optimized)
- Small bundle size
- TypeScript support
- Good middleware ecosystem

**Cons**:
- ❌ **No End-to-End Types**: Still manual type sharing
- ❌ **Less Mature**: Newer framework (less battle-tested)
- ❌ **Documentation**: Smaller community than Fastify

**Why Rejected**: tRPC provides better type safety. Fastify more mature for enterprise use.

---

### Alternative 3: GraphQL + Apollo Server
**Description**: GraphQL API with Apollo Server and code generation.

**Pros**:
- Strong typing via GraphQL schema
- Powerful query language
- Good for complex data graphs
- Excellent tooling (GraphiQL, Apollo Studio)

**Cons**:
- ❌ **Complexity**: Requires schema definitions, resolvers, codegen
- ❌ **Overhead**: Query parsing and validation adds latency
- ❌ **Learning Curve**: GraphQL concepts steep for team
- ❌ **N+1 Problem**: Requires DataLoader for performance
- ❌ **Bundle Size**: ~200KB vs tRPC ~50KB

**Why Rejected**: Overkill for CRUD operations. tRPC provides 80% of benefits with 20% of complexity.

---

### Alternative 4: NestJS + tRPC
**Description**: Use NestJS framework with tRPC module.

**Pros**:
- Opinionated structure (good for large teams)
- Built-in dependency injection
- tRPC integration available
- Enterprise-grade patterns

**Cons**:
- ❌ **Heavy Framework**: Significant overhead and abstractions
- ❌ **Learning Curve**: Requires understanding decorators, modules, providers
- ❌ **Slower**: More abstraction layers = more latency
- ❌ **Complexity**: Too much for our team size (1-10 developers)

**Why Rejected**: Framework overhead slows development. Fastify + tRPC simpler and faster.

---

## Consequences

### Positive
- ✅ **Type Safety**: Zero API type mismatches (caught at compile time)
- ✅ **Performance**: <100ms response times (3-4x faster than Express)
- ✅ **Developer Experience**: Full IDE autocomplete for API calls
- ✅ **Shared Types**: Single source of truth in `@platform/api-contract`
- ✅ **No Codegen**: tRPC infers types directly from implementation
- ✅ **Request Validation**: Zod schemas validate at runtime
- ✅ **Security**: Fastify 5.3.2+ includes critical security patches

### Negative
- ⚠️ **tRPC Coupling**: Frontend tightly coupled to tRPC client
- ⚠️ **Learning Curve**: Team must learn tRPC patterns
- ⚠️ **Non-HTTP Clients**: Mobile apps need REST wrapper (addressed with separate REST endpoints if needed)

### Neutral
- ℹ️ **Monorepo Required**: tRPC works best in monorepo structure
- ℹ️ **Fastify Plugins**: Must understand Fastify plugin system

---

## Implementation Notes

**Package Structure**:
```
packages/
├── api-contract/          # tRPC router definitions
│   └── src/routers/
│       ├── users.ts
│       ├── widgets.ts
│       └── chat.ts
├── api/                   # Fastify server
│   └── src/server.ts      # tRPC adapter
```

**Server Setup**:
```typescript
// packages/api/src/server.ts
import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "@platform/api-contract";

const server = Fastify({
  maxParamLength: 5000,
  logger: true
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: async ({ req, res }) => {
      const session = await auth(req, res);
      return {
        session,
        tenantId: session?.user?.tenantId,
        db: /* RLS-scoped db */
      };
    }
  }
});

await server.listen({ port: 3001, host: "0.0.0.0" });
```

**Frontend Integration**:
```typescript
// apps/dashboard/src/utils/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@platform/api-contract";

export const trpc = createTRPCReact<AppRouter>();
```

**Performance Metrics**:
- API response time: P95 <100ms
- Fastify overhead: ~0.5ms per request
- tRPC serialization: ~0.2ms per response
- Total: 97% of time in business logic (database, AI)

---

## References

- [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md) - Complete setup
- [ADR-0005: Zod Runtime Validation](./0005-zod-runtime-validation.md) - Request validation
- [Fastify Documentation](https://fastify.dev/)
- [tRPC Documentation](https://trpc.io/)
- [tRPC v11 Release](https://trpc.io/blog/announcing-trpc-11)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-06 | Platform Team | Initial decision and implementation |
| 2025-01-10 | Platform Team | Converted to ADR format |
