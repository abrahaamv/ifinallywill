# ADR-0001: Adopt Turborepo Monorepo with pnpm Workspaces

**Status**: Accepted
**Date**: 2024-12-XX
**Deciders**: Platform Engineering Team
**Related Phases**: [Phase 1 Implementation](../phases/phase-1-project-scaffolding.md)

---

## Context

We need to structure an enterprise AI assistant platform with multiple applications (landing, dashboard, meeting, widget) and shared packages (API, database, authentication, UI components). The codebase must support:

- Multiple frontend applications with shared components
- Backend services sharing business logic
- Consistent TypeScript configuration across all packages
- Fast incremental builds during development
- Type-safe imports between packages

**Problem**: How do we structure the codebase to maximize code reuse, maintain consistency, and optimize build performance?

**Constraints**:
- Must support TypeScript strict mode
- Need hot module replacement for frontend development
- Backend changes should trigger dependent app rebuilds
- Want to avoid code duplication across apps

---

## Decision

Adopt **Turborepo** as the monorepo build system with **pnpm** workspaces for dependency management.

**Rationale**:
- **Performance**: Turborepo provides intelligent caching and parallel execution
- **Simplicity**: Less complex than Nx or Bazel for our use case
- **Flexibility**: Works with existing build tools (Vite, tsc)
- **Developer Experience**: Fast incremental builds (<100ms hot reload)
- **Type Safety**: Full TypeScript support across packages

**Structure**:
```
platform/
├── apps/               # 4 applications
│   ├── landing/        # Public marketing
│   ├── dashboard/      # Admin portal
│   ├── meeting/        # Meeting rooms
│   └── widget-sdk/     # Embeddable widget
├── packages/           # 9 shared packages
│   ├── api/            # Backend API
│   ├── realtime/       # WebSocket server
│   ├── db/             # Database schemas
│   ├── auth/           # Authentication
│   ├── api-contract/   # tRPC contracts
│   ├── ai-core/        # AI providers
│   ├── knowledge/      # RAG system
│   ├── shared/         # Utilities
│   └── ui/             # Shared components
└── turbo.json          # Build orchestration
```

---

## Alternatives Considered

### Alternative 1: Nx Monorepo
**Description**: Use Nx for monorepo management with code generation and enforced module boundaries.

**Pros**:
- More features (code generation, affected tests, dep graph)
- Better for very large organizations (1000+ developers)
- Built-in project constraints

**Cons**:
- More complex setup and configuration
- Steeper learning curve
- Overkill for our team size (1-10 developers initially)
- Slower than Turborepo for our use case

**Why Rejected**: Unnecessary complexity for our scale. Turborepo provides 95% of benefits with 50% of the complexity.

---

### Alternative 2: Lerna + Yarn Workspaces
**Description**: Use Lerna for versioning and Yarn workspaces for linking.

**Pros**:
- Mature ecosystem
- Good for npm package publishing
- Familiar to many developers

**Cons**:
- Slower build times (no intelligent caching)
- No parallel execution optimization
- Lerna development has slowed significantly
- No TypeScript-first design

**Why Rejected**: Turborepo is the spiritual successor to Lerna, with better performance and active development.

---

### Alternative 3: Multiple Separate Repositories
**Description**: Keep each app and package in separate Git repositories.

**Pros**:
- Simple Git workflows
- Independent versioning
- Clear ownership boundaries

**Cons**:
- No shared code reuse
- Duplicate dependencies and configuration
- Difficult to coordinate changes across repos
- No type safety between packages
- Significantly slower development velocity

**Why Rejected**: Code duplication and coordination overhead outweigh benefits. Monorepo enables atomic changes across multiple packages.

---

## Consequences

### Positive
- ✅ **100x faster incremental builds** - Turborepo caching reduces rebuild time from 20s to <200ms
- ✅ **Type-safe cross-package imports** - TypeScript validates all package boundaries
- ✅ **Simplified dependency management** - pnpm deduplicates dependencies, saving disk space
- ✅ **Atomic commits** - Changes across multiple packages in single commit
- ✅ **Consistent tooling** - Single TypeScript/ESLint/Biome config for all packages
- ✅ **Developer experience** - Hot reload works across package boundaries

### Negative
- ⚠️ **Larger Git repository** - All code in one repo (mitigated by Git LFS if needed)
- ⚠️ **Learning curve** - Team needs to understand monorepo concepts
- ⚠️ **CI/CD complexity** - Need smart change detection for deployments (addressed with Turborepo filters)

### Neutral
- ℹ️ **Build orchestration** - turbo.json requires maintenance as packages grow
- ℹ️ **Dependency versions** - Must coordinate major version upgrades across packages

---

## Implementation Notes

**Key Configuration**:
- `turbo.json`: Task dependencies and caching rules
- `pnpm-workspace.yaml`: Package locations
- `tsconfig.json` (root): Shared TypeScript configuration
- Package aliases: `@platform/*` for internal packages

**Build Pipeline**:
```bash
# Incremental builds with caching
pnpm build       # Turborepo builds only changed packages

# Development with hot reload
pnpm dev         # Parallel dev servers with <100ms HMR
```

**Performance Metrics**:
- Cold build: ~30s for all packages
- Incremental build: <1s for changed packages
- Hot reload: <100ms for frontend changes

---

## References

- [Phase 1 Implementation](../phases/phase-1-project-scaffolding.md) - Complete setup details
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-XX | Platform Team | Initial decision |
| 2025-01-10 | Platform Team | Converted to ADR format |
