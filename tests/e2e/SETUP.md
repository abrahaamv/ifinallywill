# E2E Test Setup - Known Issues

## Vitest/Playwright Conflict

**Issue**: Cannot run Playwright tests in same process as Vitest due to expect symbol redefinition.

**Error**: `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`

## Workarounds

### Option 1: Run in Separate Process (Recommended)
```bash
# Kill any running processes first
pkill -f "vite|turbo|playwright"

# Run E2E tests in clean environment
NODE_OPTIONS="--no-warnings" pnpm exec playwright test
```

### Option 2: Temporary Vitest Removal
```bash
# Only for E2E test runs, restore afterward
pnpm remove -D vitest @vitest/ui @vitest/expect
pnpm test:e2e
pnpm add -D vitest @vitest/ui @vitest/expect
```

### Option 3: Separate E2E Package (Future)
Move E2E tests to `packages/e2e-tests` with own dependencies, isolated from Vitest.

## Resolution Plan

1. **Short-term**: Use Option 1 for manual testing
2. **Medium-term**: CI/CD runs E2E in isolated job
3. **Long-term**: Migrate to separate E2E package or switch to single testing framework

## Test Status

✅ **Created**: 34 E2E tests across 6 files
✅ **Configured**: Playwright config with browser setup
⚠️ **Blocked**: Runtime conflict with Vitest
✅ **Documented**: Workarounds provided above

## CI/CD Integration

For GitHub Actions, use separate jobs:

```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test  # Vitest unit tests

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: npx playwright install --with-deps chromium
      - run: pnpm test:e2e  # Playwright E2E tests (isolated)
```

This ensures tests run in separate processes without conflicts.
