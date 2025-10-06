# Development Workflow with SPARC Methodology

**Purpose**: Task-driven development workflow using `.specify/` directory and Claude Code integration.

---

## Table of Contents

1. [SPARC Methodology](#sparc-methodology)
2. [.specify/ Directory Structure](#specify-directory-structure)
3. [Task-Driven Development](#task-driven-development)
4. [Claude Code Integration](#claude-code-integration)
5. [Testing Strategy](#testing-strategy)
6. [Quality Gates](#quality-gates)
7. [Example Workflows](#example-workflows)

---

## SPARC Methodology

**SPARC** = Specification → Pseudocode → Architecture → Refinement → Completion

### 1. Specification
- Write detailed requirements in `.specify/requirements/`
- Define acceptance criteria (measurable, testable)
- Identify dependencies on other tasks/phases
- Reference architecture docs for context

### 2. Pseudocode
- Outline algorithm/logic in task specification
- Break complex operations into steps
- Document edge cases and error handling
- No actual code yet—just logic flow

### 3. Architecture
- Reference `docs/architecture/system-design.md`
- Define component interactions
- Specify interfaces and types (TypeScript)
- Document integration points with other packages

### 4. Refinement
- **Test-Driven Development**: Write tests BEFORE implementation
- Implement to make tests pass
- Iterate based on test results
- Code review against specification

### 5. Completion
- All acceptance criteria checked off
- Tests pass with ≥80% coverage
- Type checking passes: `pnpm typecheck`
- Linting passes: `pnpm lint`
- Documentation updated
- PR approved and merged

---

## .specify/ Directory Structure

```
.specify/
├── README.md              # How to use this directory
├── requirements/          # High-level phase requirements
│   ├── phase-2-database.md
│   ├── phase-3-backend.md
│   ├── phase-4-frontend.md
│   ├── phase-5-ai.md
│   ├── phase-6-realtime.md
│   └── phase-7-widget.md
├── tasks/                 # Granular implementation tasks
│   ├── 2.1-database-schema.md
│   ├── 2.2-lucia-auth.md
│   ├── 3.1-trpc-routers.md
│   └── [phase].[task]-[name].md
└── templates/             # Templates for new specs
    ├── requirement-template.md
    └── task-template.md
```

### Requirements vs Tasks

**Requirements** (`.specify/requirements/`):
- High-level phase goals
- Multiple tasks per requirement
- Timeline: days to weeks
- Example: "Phase 2: Database & Authentication"

**Tasks** (`.specify/tasks/`):
- Atomic, completable in 1-4 hours
- Single focused objective
- Clear acceptance criteria
- Example: "Task 2.1: Database schema definition"

---

## Task-Driven Development

### Creating a New Task

```bash
# 1. Copy template
cp .specify/templates/task-template.md .specify/tasks/3.5-rag-query-endpoint.md

# 2. Fill in specification
# - Overview and dependencies
# - Technical specification with pseudocode
# - Acceptance criteria (checkboxes)
# - Test cases

# 3. Commit specification
git add .specify/tasks/3.5-rag-query-endpoint.md
git commit -m "spec: Add RAG query endpoint task specification"
```

### Task Structure

Every task file includes:

1. **Status** - ⏳ Pending | 🔄 In Progress | ✅ Complete | 🚫 Blocked
2. **Dependencies** - What must be done first
3. **Location** - Where code lives in monorepo
4. **Technical Specification** - Pseudocode/algorithm
5. **Acceptance Criteria** - Checklist of requirements
6. **Test Cases** - Unit, integration, edge cases
7. **Implementation Workflow** - Step-by-step commands

### Task Workflow

```bash
# 1. Read task specification
cat .specify/tasks/3.5-rag-query-endpoint.md

# 2. Create feature branch
git checkout -b feature/rag-query-endpoint

# 3. Write tests FIRST (TDD)
# packages/knowledge/src/query.test.ts

# 4. Run tests (should fail)
pnpm test

# 5. Implement to make tests pass
# packages/knowledge/src/query.ts

# 6. Iterate until all tests pass
pnpm test

# 7. Verify acceptance criteria
# Check off items in .specify/tasks/3.5-rag-query-endpoint.md

# 8. Quality checks
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# 9. Create PR
gh pr create --title "feat: RAG query endpoint" \
  --body "Implements .specify/tasks/3.5-rag-query-endpoint.md"
```

---

## Claude Code Integration

### How Claude Code Uses .specify/

Claude Code reads `.specify/` files to understand:
- **What to build**: Requirements and task specifications
- **How to build it**: Pseudocode and architecture references
- **When it's done**: Acceptance criteria checklists

### Example Prompts

**Starting a new task**:
```
Read .specify/tasks/3.1-trpc-routers.md and implement the authentication router
following the acceptance criteria. Write tests first using TDD.
```

**Implementing with context**:
```
Read .specify/requirements/phase-3-backend.md and .specify/tasks/3.5-rag-query-endpoint.md.
Implement the RAG query endpoint in packages/knowledge/src/query.ts.
Follow the pseudocode and ensure all acceptance criteria are met.
```

**Fixing a bug**:
```
Read .specify/tasks/3.5-rag-query-endpoint.md. There's a bug where queries with
special characters fail. Add a test case that reproduces this, then fix it.
```

### Claude Code Workflow Integration

Claude Code automatically:
1. Reads task specification before implementing
2. Follows pseudocode and architecture guidelines
3. Writes tests first (TDD approach)
4. Validates against acceptance criteria
5. Runs quality checks before marking complete

---

## Testing Strategy

### Test-Driven Development (TDD)

**Workflow**:
```typescript
// 1. Write failing test
describe('vectorSearch', () => {
  it('should return top 5 similar documents', async () => {
    const results = await vectorSearch(tenantId, embedding, 5);
    expect(results).toHaveLength(5);
  });
});

// 2. Run test (fails)
// pnpm test

// 3. Implement minimal code to pass
export async function vectorSearch(
  tenantId: string,
  embedding: number[],
  limit: number
) {
  return db.select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.tenantId, tenantId))
    .limit(limit);
}

// 4. Run test (passes)
// pnpm test

// 5. Refactor and add edge cases
```

### Coverage Requirements

- **Minimum**: 80% code coverage
- **Target**: 90%+ for critical paths
- **Enforce in CI**: Builds fail if coverage drops below 80%

```bash
# Check coverage
pnpm test -- --coverage

# View HTML report
open coverage/index.html
```

### Test Categories

**Unit Tests**:
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (<100ms per test)

**Integration Tests**:
- Test component interactions
- Real database connections (test database)
- Moderate execution (<1s per test)

**End-to-End Tests**:
- Test complete user workflows
- Real services (LiveKit, AI providers in test mode)
- Slower execution (1-5s per test)

---

## Quality Gates

Every task must pass these gates before completion:

### Gate 1: Type Safety
```bash
pnpm typecheck
# Must pass with zero errors
```

### Gate 2: Linting
```bash
pnpm lint
# Must pass with zero warnings
```

### Gate 3: Tests
```bash
pnpm test
# Must pass with ≥80% coverage
```

### Gate 4: Build
```bash
pnpm build
# Must build successfully
```

### Gate 5: Acceptance Criteria
- All checkboxes in `.specify/tasks/` marked complete
- Manual verification of functional requirements

### Gate 6: Code Review
- PR approved by reviewer
- No unresolved comments
- Specification reference in PR description

---

## Example Workflows

### Example 1: Implementing Database Schema (Phase 2)

**Step 1: Read Specification**
```bash
cat .specify/requirements/phase-2-database.md
cat .specify/tasks/2.1-database-schema.md
```

**Step 2: Create Branch**
```bash
git checkout -b feature/database-schema
```

**Step 3: Write Tests First**
```typescript
// packages/db/src/schema/tenants.test.ts
import { expect, test } from 'vitest';
import { db } from '../index';
import { tenants } from './tenants';

test('should create tenant with all required fields', async () => {
  const tenant = await db.insert(tenants).values({
    id: 'test-tenant',
    name: 'Test Tenant',
    apiKey: 'test-key',
  }).returning();

  expect(tenant).toHaveProperty('id');
  expect(tenant).toHaveProperty('createdAt');
});
```

**Step 4: Implement Schema**
```typescript
// packages/db/src/schema/tenants.ts
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Step 5: Run Tests**
```bash
pnpm test
```

**Step 6: Check Acceptance Criteria**
- [x] Tenants table defined
- [x] All fields have correct types
- [x] Tests pass
- [x] Type checking passes

**Step 7: Create PR**
```bash
gh pr create --title "feat: Database schema for tenants" \
  --body "Implements .specify/tasks/2.1-database-schema.md

- Defines tenants table with Drizzle ORM
- Tests validate schema structure
- Coverage: 95%"
```

### Example 2: Implementing tRPC Router (Phase 3)

**Claude Code Prompt**:
```
Read .specify/tasks/3.1-trpc-routers.md and implement the authentication router
in packages/api-contract/src/routers/auth.ts. Write tests first following TDD.
```

**Claude Code automatically**:
1. Reads task specification
2. Creates test file with test cases from spec
3. Implements router to pass tests
4. Validates acceptance criteria
5. Runs quality checks

**User reviews and approves PR**

---

## Best Practices

### DO
✅ Write specifications before coding
✅ Break large tasks into atomic pieces
✅ Write tests first (TDD)
✅ Reference architecture docs
✅ Use templates for consistency
✅ Check off acceptance criteria
✅ Run quality gates before PR

### DON'T
❌ Start coding without a specification
❌ Skip writing tests
❌ Merge without meeting acceptance criteria
❌ Ignore type errors or linting warnings
❌ Create tasks that take >4 hours
❌ Forget to update documentation

---

## Summary

**Workflow in 5 Steps**:

1. **Specify**: Write detailed task in `.specify/tasks/`
2. **Test**: Write tests first (TDD)
3. **Implement**: Code to pass tests
4. **Validate**: Check acceptance criteria + quality gates
5. **Review**: PR with specification reference

This ensures:
- Clear requirements before implementation
- Test coverage ≥80%
- Type-safe, lint-free code
- Consistent code quality
- Easy progress tracking
