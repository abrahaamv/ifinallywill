# Testing Guide - Phase 2 Task 2.2

## Overview

This document provides comprehensive testing guidelines for the AI Assistant Platform. We use **Vitest** as our primary testing framework across all packages.

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in specific package
pnpm --filter @platform/api test

# Run tests in watch mode
pnpm --filter @platform/api test --watch
```

## Testing Stack

- **Test Framework**: Vitest 2.1.8
- **Coverage**: @vitest/coverage-v8
- **React Testing**: jsdom (for UI package)
- **Mocking**: Vitest built-in mocking (vi)

## Project Structure

```
packages/
├── shared/
│   └── src/__tests__/
│       ├── utils/
│       │   └── test-helpers.ts      # Shared test utilities
│       └── logger.test.ts           # Example tests
├── db/
│   └── src/__tests__/
│       ├── utils/
│       │   └── db-helpers.ts        # Database test helpers
│       └── connection.test.ts       # Example tests
├── auth/
│   └── src/__tests__/
│       └── mocks/
│           └── session.mock.ts      # Auth mocks
├── api-contract/
│   └── src/__tests__/
│       └── mocks/
│           └── trpc.mock.ts         # tRPC mocks
└── api/
    └── src/__tests__/
        └── mocks/
            └── fastify.mock.ts      # Fastify mocks
```

## Coverage Thresholds

All packages must maintain **80%+ coverage** across:
- Lines
- Functions
- Branches
- Statements

Configured in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

## Test Utilities

### Shared Utilities (`packages/shared/src/__tests__/utils/test-helpers.ts`)

```typescript
import { wait, createMockLogger, suppressConsole } from '@platform/shared/__tests__/utils/test-helpers';

// Wait for async operations
await wait(100);

// Mock logger
const logger = createMockLogger();
logger.info('test');
expect(logger.info).toHaveBeenCalledWith('test');

// Suppress console in tests
describe('MyTests', () => {
  suppressConsole();

  it('should not pollute output', () => {
    console.log('This will not show in test output');
  });
});
```

### Database Helpers (`packages/db/src/__tests__/utils/db-helpers.ts`)

```typescript
import { createMockDb, createMockTenantContext } from '@platform/db/__tests__/utils/db-helpers';

// Mock database
const db = createMockDb();
await db.select().from(users).where(eq(users.id, '123'));

// Mock tenant context
const context = createMockTenantContext({
  tenantId: 'custom-tenant',
  role: 'admin',
});
```

### Auth Mocks (`packages/auth/src/__tests__/mocks/session.mock.ts`)

```typescript
import { createMockSession, createMockUser } from '@platform/auth/__tests__/mocks/session.mock';

// Mock user
const user = createMockUser({
  email: 'custom@example.com',
  name: 'Custom User',
});

// Mock session
const session = createMockSession({
  userId: 'user-123',
  user: user,
});
```

### tRPC Mocks (`packages/api-contract/src/__tests__/mocks/trpc.mock.ts`)

```typescript
import {
  createAuthenticatedContext,
  createUnauthenticatedContext
} from '@platform/api-contract/__tests__/mocks/trpc.mock';

// Authenticated context
const ctx = createAuthenticatedContext({
  userId: 'user-123',
  tenantId: 'tenant-123',
  role: 'admin',
});

// Unauthenticated context
const anonCtx = createUnauthenticatedContext();
```

### Fastify Mocks (`packages/api/src/__tests__/mocks/fastify.mock.ts`)

```typescript
import { createMockRequest, createMockReply } from '@platform/api/__tests__/mocks/fastify.mock';

// Mock request
const request = createMockRequest({
  method: 'POST',
  body: { key: 'value' },
  headers: { 'content-type': 'application/json' },
});

// Mock reply
const reply = createMockReply();
reply.code(200).send({ success: true });
expect(reply.code).toHaveBeenCalledWith(200);
```

## Testing Patterns

### Unit Tests

```typescript
import { describe, expect, it } from 'vitest';

describe('MyFunction', () => {
  it('should return expected value', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  it('should handle errors', () => {
    expect(() => myFunction(invalidInput)).toThrow('Error message');
  });
});
```

### Async Tests

```typescript
import { describe, expect, it } from 'vitest';

describe('AsyncFunction', () => {
  it('should resolve with data', async () => {
    const result = await asyncFunction();
    expect(result).toEqual({ success: true });
  });

  it('should reject with error', async () => {
    await expect(asyncFunction()).rejects.toThrow('Error');
  });
});
```

### Mocking

```typescript
import { describe, expect, it, vi } from 'vitest';

describe('FunctionWithDependency', () => {
  it('should call dependency', () => {
    const mockDep = vi.fn().mockReturnValue('result');
    const result = functionWithDep(mockDep);

    expect(mockDep).toHaveBeenCalledWith('arg');
    expect(result).toBe('result');
  });
});
```

### Database Tests

```typescript
import { describe, expect, it } from 'vitest';
import { createMockDb } from '@platform/db/__tests__/utils/db-helpers';

describe('DatabaseOperation', () => {
  it('should query database', async () => {
    const db = createMockDb();
    const mockData = [{ id: '1', name: 'Test' }];
    vi.mocked(db.execute).mockResolvedValue(mockData);

    const result = await queryUsers(db);
    expect(result).toEqual(mockData);
  });
});
```

### tRPC Tests

```typescript
import { describe, expect, it } from 'vitest';
import { createAuthenticatedContext } from '@platform/api-contract/__tests__/mocks/trpc.mock';

describe('tRPC Router', () => {
  it('should require authentication', async () => {
    const ctx = createAuthenticatedContext();
    const result = await router.protectedProcedure(ctx);
    expect(result).toBeDefined();
  });
});
```

## Best Practices

### 1. Test Organization
- One test file per source file (`src/module.ts` → `src/__tests__/module.test.ts`)
- Group related tests with `describe` blocks
- Use descriptive test names: "should [expected behavior] when [condition]"

### 2. Test Independence
- Each test should be independent and isolated
- Use `beforeEach`/`afterEach` for setup/cleanup
- Don't rely on test execution order

### 3. Mock Strategy
- Mock external dependencies (APIs, databases, file system)
- Use real implementations for unit logic
- Prefer dependency injection for easier mocking

### 4. Coverage Goals
- Aim for 80%+ coverage (required)
- Focus on critical paths and edge cases
- Don't test third-party libraries

### 5. Performance
- Keep tests fast (<100ms per test)
- Use mocks instead of real I/O operations
- Run expensive tests selectively

## Running Tests

### Local Development

```bash
# All tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test --watch

# Coverage report
pnpm test:coverage

# Specific package
pnpm --filter @platform/api test

# Specific test file
pnpm test src/__tests__/module.test.ts
```

### CI/CD

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

CI configuration in `.github/workflows/test.yml`

## Debugging Tests

### VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### CLI

```bash
# Run with debugging
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Verbose output
pnpm test --reporter=verbose

# Show detailed errors
pnpm test --reporter=verbose --bail
```

## Common Issues

### Issue: Tests fail with "Cannot find module"
**Solution**: Ensure package is built before running tests
```bash
pnpm build && pnpm test
```

### Issue: Coverage below threshold
**Solution**: Add tests for uncovered lines
```bash
pnpm test:coverage
# Open coverage/index.html to see uncovered lines
```

### Issue: Async tests timeout
**Solution**: Increase timeout or fix hanging promises
```typescript
it('should complete', async () => {
  // ...
}, { timeout: 10000 }); // 10 second timeout
```

### Issue: Mocks not working
**Solution**: Ensure vi.mock is called before imports
```typescript
vi.mock('./module', () => ({
  myFunction: vi.fn(),
}));

import { myFunction } from './module';
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Next Steps

1. Write tests for new features **before** implementation (TDD)
2. Maintain 80%+ coverage across all packages
3. Run tests before committing code
4. Review coverage reports regularly
5. Update this guide as patterns evolve
