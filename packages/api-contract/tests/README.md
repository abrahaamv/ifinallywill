# API Contract Test Suite

Comprehensive test suite for tRPC API routers with **5,086+ lines** of test code and **219+ test cases** achieving **36%+ test coverage** (target: 80%).

---

## Quick Start

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test auth.test.ts

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode
pnpm test --watch
```

---

## Test Structure

```
tests/
├── utils/
│   ├── fixtures.ts       # UUID fixtures and mock data factories
│   ├── context.ts        # tRPC context and database mock helpers
│   └── README.md         # This file
├── auth.test.ts          # Auth router tests (1,340 lines, 51 tests)
├── users.test.ts         # Users router tests (628 lines, 45 tests)
├── sessions.test.ts      # Sessions router tests (1,084 lines, 39 tests)
├── knowledge.test.ts     # Knowledge router tests (1,087 lines, 48 tests)
├── widgets.test.ts       # Widgets router tests (947 lines, 36 tests)
├── health.test.ts        # Health check tests
├── rls-integration.test.ts  # RLS policy integration tests
└── setup.ts              # Global test setup
```

---

## Writing Tests

### 1. Import Utilities

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initTRPC } from '@trpc/server';
import type { Context } from '../src/context';

// Import test utilities
import { mockUUIDs, mockUser, mockWidget } from './utils/fixtures';
import { createMockContext, createMockDb, setupMockQueryResult } from './utils/context';

// Import router to test
import { widgetsRouter } from '../src/routers/widgets';
```

### 2. Setup Mock Dependencies

```typescript
// Mock external dependencies BEFORE imports
vi.mock('@platform/db', () => ({
  serviceDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  schema: {
    widgets: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import mocked modules AFTER vi.mock() calls
const { serviceDb, eq } = await import('@platform/db');
```

### 3. Create Test Caller

```typescript
const createCaller = (role: 'member' | 'admin' | 'owner' = 'member') => {
  const t = initTRPC.context<Context>().create();
  const mockDb = createMockDb();
  const ctx = createMockContext({ role, db: mockDb });

  const caller = t.router(widgetsRouter).createCaller(ctx);

  return { caller, mockDb, ctx };
};
```

### 4. Write Tests

```typescript
describe('Widget Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list - List Widgets', () => {
    it('should list widgets with pagination', async () => {
      const { caller, mockDb } = createCaller('member');

      // Setup mock data
      const mockWidgets = [
        mockWidget({ id: mockUUIDs.widget.default }),
      ];

      // Setup mock query result
      setupMockQueryResult(mockDb, mockWidgets, { count: 1 });

      // Call procedure
      const result = await caller.list({});

      // Assertions
      expect(result.widgets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
```

---

## Test Utilities

### UUID Fixtures (`utils/fixtures.ts`)

Provides valid UUID v4 fixtures for all entities to prevent validation errors.

```typescript
import { mockUUIDs, mockUser, mockWidget } from './utils/fixtures';

// Use predefined UUIDs
const userId = mockUUIDs.user.default;
const adminId = mockUUIDs.user.admin;
const tenantId = mockUUIDs.tenant.default;

// Use factory functions
const user = mockUser({ id: userId, email: 'custom@example.com' });
const widget = mockWidget({ name: 'Custom Widget' });

// Generate multiple objects
import { generateMockUsers, generateMockWidgets } from './utils/fixtures';
const users = generateMockUsers(10); // Creates 10 users with sequential UUIDs
```

**Available Fixtures**:
- `mockUUIDs` - UUID fixtures for all entities
- `mockUser()` - User factory
- `mockTenant()` - Tenant factory
- `mockSession()` - Session factory
- `mockMessage()` - Message factory
- `mockWidget()` - Widget factory
- `mockDocument()` - Knowledge document factory
- `mockChunk()` - Knowledge chunk factory
- `mockPersonality()` - AI personality factory
- `mockAuthToken()` - Auth token factory

### Context Helpers (`utils/context.ts`)

Standardized context and database mock creation.

```typescript
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockDb,
  setupMockQueryResult,
  setupMockInsertResult,
  setupMockUpdateResult,
  setupMockDeleteResult,
  setupMockExecuteResult
} from './utils/context';

// Create authenticated context
const ctx = createMockContext({ role: 'admin' });

// Create unauthenticated context
const unauthedCtx = createUnauthenticatedContext();

// Create custom context
const customCtx = createMockContext({
  role: 'owner',
  userId: mockUUIDs.user.owner,
  email: 'owner@example.com',
});

// Setup query mocks
const mockDb = createMockDb();
setupMockQueryResult(mockDb, [mockWidget()], { count: 1 });
```

---

## Mock Patterns

### Database Query Mocking

#### SELECT Queries
```typescript
// Simple select
mockDb.select.mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockWidget()]),
    }),
  }),
});

// With pagination
setupMockQueryResult(mockDb, [mockWidget()], { count: 10 });
```

#### INSERT Queries
```typescript
// Simple insert
setupMockInsertResult(mockDb, [mockWidget()]);

// Manual setup
mockDb.insert.mockReturnValue({
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([mockWidget()]),
  }),
});
```

#### UPDATE Queries
```typescript
// With existing record check
setupMockUpdateResult(
  mockDb,
  [mockWidget()],
  {
    checkExisting: true,
    existingRecord: mockWidget(),
  }
);
```

#### DELETE Queries
```typescript
// Simple delete
setupMockDeleteResult(mockDb, [{ id: mockUUIDs.widget.default }]);
```

#### Raw SQL Queries (pgvector, etc.)
```typescript
// Execute mock for vector search
setupMockExecuteResult(mockDb, {
  rows: [
    {
      id: mockUUIDs.chunk.default,
      content: 'Chunk content',
      similarity_score: 0.95,
    },
  ],
});
```

### Transaction Mocking

Transactions are automatically mocked in `createMockDb()`:

```typescript
const mockDb = createMockDb();

// Transaction callback receives mock db
await mockDb.transaction(async (tx) => {
  // tx === mockDb (for testing purposes)
  await tx.insert(...);
});
```

### AI Integration Mocking

```typescript
vi.mock('@platform/ai-core', () => ({
  AIRouter: vi.fn().mockImplementation(() => ({
    routeCompletion: vi.fn().mockResolvedValue({
      content: 'AI response',
      provider: 'openai',
      model: 'gpt-4o',
      cost: 0.05,
    }),
  })),
}));
```

### RAG System Mocking

```typescript
vi.mock('@platform/knowledge', () => ({
  executeRAGQuery: vi.fn().mockResolvedValue({
    chunks: [
      {
        content: 'Relevant chunk',
        score: 0.95,
        documentTitle: 'Test Doc',
      },
    ],
  }),
  buildRAGPrompt: vi.fn().mockReturnValue('Enhanced prompt with context'),
  chunkDocument: vi.fn().mockReturnValue([
    { content: 'Chunk 1', position: 0 },
    { content: 'Chunk 2', position: 1 },
  ]),
  VoyageEmbeddingProvider: vi.fn().mockImplementation(() => ({
    embedBatch: vi.fn().mockResolvedValue([
      Array(1024).fill(0.1),
      Array(1024).fill(0.2),
    ]),
    estimateCost: vi.fn().mockReturnValue(0.001),
  })),
}));
```

---

## Testing Patterns

### Test Organization

```typescript
describe('Router Name', () => {
  describe('Procedure Group', () => {
    describe('procedure - Description', () => {
      it('should handle success case', async () => { /* ... */ });
      it('should validate input', async () => { /* ... */ });
      it('should handle errors', async () => { /* ... */ });
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow member to list', async () => { /* ... */ });
    it('should require admin to create', async () => { /* ... */ });
  });
});
```

### Test Categories

1. **Success Path Tests** (40% of tests)
   - Happy path with valid inputs
   - Expected output verification

2. **Validation Tests** (35% of tests)
   - Input validation (required, length, format)
   - Boundary conditions
   - Type validation

3. **Error Handling Tests** (19% of tests)
   - Database errors
   - Not found errors
   - Permission errors

4. **RBAC Tests** (6% of tests)
   - Role restrictions
   - Access control verification

### Assertion Patterns

```typescript
// Success assertions
expect(result).toMatchObject({ id: mockUUIDs.widget.default });
expect(result.widgets).toHaveLength(10);
expect(result.hasMore).toBe(true);

// Error assertions
await expect(caller.create({ name: '' })).rejects.toThrow('Name is required');
await expect(caller.get({ id: 'invalid' })).rejects.toThrow('Invalid widget ID');

// Mock call assertions
expect(mockDb.insert).toHaveBeenCalled();
expect(mockDb.insert).toHaveBeenCalledTimes(1);
```

---

## Common Issues and Solutions

### Issue 1: UUID Validation Errors

**Problem**: Tests using string IDs like "widget_test_123" fail UUID validation

**Solution**: Use UUID fixtures from `utils/fixtures.ts`

```typescript
// ❌ Wrong
const widgetId = 'widget_test_123';

// ✅ Correct
const widgetId = mockUUIDs.widget.default;
```

### Issue 2: Authentication Required Errors

**Problem**: Tests fail with "Authentication required" even with mock context

**Solution**: Ensure top-level `userId` and `role` in context (not just in `session`)

```typescript
// ❌ Wrong
const ctx = {
  session: { userId, role },
  db: mockDb,
  tenantId,
};

// ✅ Correct
const ctx = {
  session: { userId, role },
  db: mockDb,
  tenantId,
  userId,  // Top-level for middleware
  role,    // Top-level for middleware
};

// Or use helper
const ctx = createMockContext({ role: 'admin' });
```

### Issue 3: Module Resolution Errors

**Problem**: `Cannot find module '@platform/shared'` in tests

**Solution**: Check `vitest.config.ts` has proper alias resolution

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@platform/shared': path.resolve(__dirname, '../shared/src'),
      '@platform/db': path.resolve(__dirname, '../db/src'),
      // ... other packages
    },
  },
});
```

### Issue 4: Mock Hoisting Issues

**Problem**: `Cannot access 'mockVar' before initialization` with vi.mock

**Solution**: Define mocks inline in factory function (vi.mock is hoisted)

```typescript
// ❌ Wrong
const mockDb = { select: vi.fn() };
vi.mock('@platform/db', () => ({ serviceDb: mockDb }));

// ✅ Correct
vi.mock('@platform/db', () => ({
  serviceDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));
```

### Issue 5: Transaction Mock Missing

**Problem**: `ctx.db.transaction is not a function`

**Solution**: Use `createMockDb()` which includes transaction support

```typescript
// ✅ Correct
const mockDb = createMockDb(); // Includes transaction mock

// Or manual setup
const mockTransaction = vi.fn((callback) => callback(mockDb));
mockDb.transaction = mockTransaction;
```

---

## Test Coverage Goals

### Current Status (Week 3 Complete)

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| **Overall Coverage** | 80% | 36% | 🟡 45% progress |
| **Router Coverage** | 75% avg | 77% avg | ✅ Exceeded |
| **Pass Rate** | 80% | 62.5% | ⚠️ Improving |
| **Test Files** | ~66 | 16 | 🟡 24% complete |

### Coverage by Router

| Router | Lines | Tests | Pass Rate | Coverage |
|--------|-------|-------|-----------|----------|
| **auth** | 624 | 51 | 100% | ~78% |
| **users** | 401 | 45 | 100% | ~83% |
| **sessions** | 626 | 39 | 28% | ~75% |
| **knowledge** | 634 | 48 | 45.8% | ~70% |
| **widgets** | 304 | 36 | 38.9% | ~80% |

---

## Best Practices

### DO ✅

1. **Use UUID Fixtures**: Always use `mockUUIDs` for all entity IDs
2. **Use Context Helpers**: Use `createMockContext()` for standardized setup
3. **Mock External Dependencies**: Mock all external packages before imports
4. **Clear Mocks**: Use `beforeEach(() => vi.clearAllMocks())`
5. **Test All Paths**: Success, validation, errors, RBAC
6. **Descriptive Names**: Clear test descriptions (should + action + expectation)
7. **Factory Functions**: Use mock factories (`mockUser()`, `mockWidget()`)
8. **Helper Functions**: Use query setup helpers (`setupMockQueryResult()`)

### DON'T ❌

1. **String IDs**: Don't use "test_id_123" - use proper UUIDs
2. **Hardcoded Data**: Don't hardcode test data - use fixtures
3. **External Variables in vi.mock**: Don't reference variables in mock factories
4. **Skip Authentication**: Don't forget top-level `userId`/`role` in context
5. **Ignore Errors**: Don't skip error path testing
6. **Large Test Files**: Keep test files focused and organized
7. **Mock Everything**: Don't mock what you're testing
8. **Forget Cleanup**: Always clear mocks in `beforeEach()`

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test auth.test.ts

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# Update snapshots
pnpm test -- -u
```

### CI/CD

```bash
# Run with coverage and fail on threshold
pnpm test --coverage --run

# Generate coverage report
pnpm test --coverage --reporter=json --reporter=html
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

---

## Resources

- **Week 3 Progress Reports**: `docs/audit/2025-10-25/WEEK_3_DAY_*_PROGRESS.md`
- **Week 3 Summary**: `docs/audit/2025-10-25/WEEK_3_COMPLETE_SUMMARY.md`
- **Vitest Docs**: https://vitest.dev/
- **tRPC Testing**: https://trpc.io/docs/server/testing

---

## Contributing

### Adding New Tests

1. Create test file: `tests/router-name.test.ts`
2. Import utilities: `fixtures.ts`, `context.ts`
3. Mock dependencies with `vi.mock()`
4. Use `createCaller()` pattern
5. Organize with nested `describe()` blocks
6. Test success, validation, errors, RBAC
7. Run tests: `pnpm test router-name.test.ts`
8. Verify coverage: `pnpm test --coverage`

### Test File Template

```typescript
/**
 * Router Name Test Suite
 *
 * Comprehensive tests for [router description].
 *
 * Test Coverage:
 * - [Category 1] ([X] tests)
 * - [Category 2] ([Y] tests)
 * - Role-Based Access Control ([Z] tests)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initTRPC } from '@trpc/server';
import type { Context } from '../src/context';
import { mockUUIDs } from './utils/fixtures';
import { createMockContext, createMockDb } from './utils/context';

// Mock dependencies
vi.mock('@platform/db', () => ({ /* ... */ }));

// Import mocked modules
const { serviceDb } = await import('@platform/db');

// Import router
import { myRouter } from '../src/routers/my-router';

// Create caller helper
const createCaller = (role = 'member') => {
  const t = initTRPC.context<Context>().create();
  const mockDb = createMockDb();
  const ctx = createMockContext({ role, db: mockDb });
  const caller = t.router(myRouter).createCaller(ctx);
  return { caller, mockDb, ctx };
};

// Test suite
describe('My Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('procedure - Description', () => {
    it('should handle success case', async () => {
      // Test implementation
    });
  });
});
```

---

**Last Updated**: 2025-10-27 (Week 4 Day 1)
**Test Coverage**: 36% (target: 80%)
**Total Tests**: 219 test cases
**Total Lines**: 5,086 lines
