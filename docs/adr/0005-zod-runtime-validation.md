# ADR-0005: Use Zod for Runtime Validation

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Platform Engineering Team
**Related Phases**: [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md)

---

## Context

TypeScript provides compile-time type safety, but cannot validate data at runtime (API requests, environment variables, external data). The platform needs runtime validation for:

- tRPC API inputs from untrusted clients
- Environment configuration (missing/invalid values)
- Database query results (external data)
- Third-party API responses

**Problem**: Which runtime validation library best integrates with TypeScript + tRPC while maintaining performance and developer experience?

**Requirements**:
- TypeScript inference (types derived from schemas)
- tRPC integration
- Clear error messages for debugging
- Minimal performance overhead
- Ecosystem maturity

---

## Decision

Adopt **Zod** as the runtime validation library across all packages.

**Rationale**:
- **TypeScript-First**: Types inferred directly from schemas (no duplication)
- **tRPC Native**: tRPC v11 uses Zod by default
- **Developer Experience**: Fluent API with excellent error messages
- **Performance**: <1ms validation for typical requests
- **Composable**: Schemas can be reused and extended

**Example**:
```typescript
// Define schema (single source of truth)
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  tenantId: z.string().uuid()
});

// Infer TypeScript type
type CreateUser = z.infer<typeof CreateUserSchema>;
// ^? { email: string; password: string; tenantId: string }

// tRPC usage
export const usersRouter = router({
  create: protectedProcedure
    .input(CreateUserSchema)  // Validates at runtime
    .mutation(async ({ input, ctx }) => {
      // input is fully typed and validated
      return await ctx.db.insert(users).values(input);
    })
});
```

---

## Alternatives Considered

### Alternative 1: Joi
**Description**: Popular validation library for Node.js.

**Pros**:
- Mature (10+ years old)
- Rich validation rules
- Good error messages
- Large ecosystem

**Cons**:
- ❌ **No TypeScript Inference**: Must manually define types separately
- ❌ **Performance**: Slower than Zod (~2-3x overhead)
- ❌ **Bundle Size**: 150KB vs Zod 50KB
- ❌ **Not TypeScript-First**: Designed for JavaScript

**Why Rejected**: Lack of TypeScript inference creates type/schema drift. Zod modern replacement.

---

### Alternative 2: Yup
**Description**: JavaScript schema validation library inspired by Joi.

**Pros**:
- Popular in React ecosystem (Formik integration)
- Similar API to Joi
- Good documentation

**Cons**:
- ❌ **TypeScript Support**: Added as afterthought, not native
- ❌ **Performance**: Similar to Joi (slower than Zod)
- ❌ **Type Inference**: Limited compared to Zod
- ❌ **Maintenance**: Less active development

**Why Rejected**: Zod provides better TypeScript integration and performance.

---

### Alternative 3: io-ts
**Description**: TypeScript runtime type checking using fp-ts.

**Pros**:
- Functional programming approach
- Strong theoretical foundation
- Excellent type inference

**Cons**:
- ❌ **Learning Curve**: Requires fp-ts knowledge
- ❌ **Verbosity**: More code for same validation
- ❌ **Error Messages**: Less user-friendly than Zod
- ❌ **Ecosystem**: Smaller community

**Why Rejected**: Too complex for team. Zod provides same type safety with better DX.

---

### Alternative 4: ArkType
**Description**: Next-generation TypeScript validation (1:1 with TS syntax).

**Pros**:
- Extremely fast (10x faster than Zod)
- 1:1 syntax with TypeScript
- Innovative approach
- Tiny bundle size

**Cons**:
- ❌ **Immature**: Very new library (v1 released 2024)
- ❌ **Ecosystem**: No tRPC integration yet
- ❌ **Breaking Changes**: Likely in early versions
- ❌ **Community**: Small user base

**Why Rejected**: Too new for enterprise production. Revisit in 2026 when mature.

---

### Alternative 5: TypeBox
**Description**: JSON Schema Type Builder with TypeScript inference.

**Pros**:
- Fast performance
- JSON Schema output (OpenAPI compatible)
- Good TypeScript support

**Cons**:
- ❌ **API Verbosity**: More verbose than Zod
- ❌ **tRPC Integration**: Not as seamless as Zod
- ❌ **Ecosystem**: Smaller than Zod
- ❌ **Error Messages**: Less developer-friendly

**Why Rejected**: Zod better developer experience and tRPC native support.

---

## Consequences

### Positive
- ✅ **Type Safety**: Runtime validation + compile-time types from single schema
- ✅ **No Duplication**: Schema is source of truth (types inferred)
- ✅ **Clear Errors**: Zod provides detailed validation error paths
- ✅ **Performance**: <1ms validation overhead for typical requests
- ✅ **tRPC Native**: Zero configuration for tRPC integration
- ✅ **Composable**: Can extend and reuse schemas across packages
- ✅ **Environment Validation**: Safe env var parsing with clear errors

### Negative
- ⚠️ **Bundle Size**: 50KB (acceptable for validation library)
- ⚠️ **Learning Curve**: Team must learn Zod API patterns

### Neutral
- ℹ️ **Schema-First**: Must think in terms of schemas, not just types
- ℹ️ **Error Handling**: Zod errors need formatting for user-friendly messages

---

## Implementation Notes

**tRPC Integration**:
```typescript
// packages/api-contract/src/routers/widgets.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

const WidgetSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()),
  tenantId: z.string().uuid()
});

export const widgetsRouter = router({
  create: protectedProcedure
    .input(WidgetSchema)
    .mutation(async ({ input, ctx }) => {
      // input is validated and typed
      return await ctx.db.insert(widgets).values(input);
    })
});
```

**Environment Validation**:
```typescript
// packages/shared/src/config.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "staging", "production"])
});

export const env = envSchema.parse(process.env);
// Throws with clear error if env invalid
```

**Performance Impact**:
- Simple validation: 0.1-0.5ms
- Complex nested objects: 1-2ms
- Negligible compared to database queries (10-50ms)

**Test Coverage**:
- 85% of API routes use Zod input validation
- All environment variables validated at startup
- Schema reuse across 11 tRPC routers

---

## References

- [Phase 3 Implementation](../phases/phase-3-backend-api-infrastructure.md) - Zod usage patterns
- [ADR-0004: Fastify + tRPC Stack](./0004-fastify-trpc-stack.md) - API integration
- [Zod Documentation](https://zod.dev/)
- [tRPC + Zod Guide](https://trpc.io/docs/server/validators)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-06 | Platform Team | Initial decision and implementation |
| 2025-01-10 | Platform Team | Converted to ADR format |
