# Task [N.X]: [Task Name]

**Status**: ⏳ Pending | 🔄 In Progress | ✅ Complete | 🚫 Blocked
**Phase**: Phase [N] - [Phase Name]
**Estimated Time**: [X] hours
**Assigned**: Unassigned | [Developer Name]

---

## Overview

Brief description of what this task accomplishes.

## Dependencies

**Prerequisite Tasks**:
- [ ] Task [N.X-1] - [Task name] must be complete
- [ ] Task [N.X-2] - [Task name] must be complete

**Required Knowledge**:
- Understanding of [concept/technology]
- Familiarity with [relevant documentation]

## Location

**Files to Create/Modify**:
```
packages/[package-name]/
├── src/
│   ├── [feature]/
│   │   ├── [file].ts
│   │   └── [file].test.ts
└── ...
```

**Related Packages**:
- `@platform/[package-1]` - [purpose]
- `@platform/[package-2]` - [purpose]

## Technical Specification

### Pseudocode/Algorithm

```
1. Step 1: [High-level action]
   - Substep a
   - Substep b

2. Step 2: [High-level action]
   - Substep a
   - Substep b

3. Step 3: [High-level action]
```

### Interfaces/Types

```typescript
// Define expected types and interfaces
interface [InterfaceName] {
  field1: type;
  field2: type;
}

type [TypeName] = {
  // ...
};
```

### API Endpoints (if applicable)

```typescript
// tRPC router structure
export const [routerName] = router({
  [procedureName]: protectedProcedure
    .input(z.object({
      // input schema
    }))
    .mutation(async ({ ctx, input }) => {
      // implementation outline
    }),
});
```

### Database Changes (if applicable)

```typescript
// Schema additions/modifications
export const [tableName] = pgTable('[table_name]', {
  id: text('id').primaryKey(),
  // fields...
});
```

## Acceptance Criteria

**Functional Requirements**:
- [ ] Feature X works as specified
- [ ] Edge case Y handled correctly
- [ ] Error case Z returns appropriate message

**Non-Functional Requirements**:
- [ ] Response time <[X]ms for [operation]
- [ ] Memory usage <[X]MB
- [ ] TypeScript strict mode passes
- [ ] No ESLint/Biome warnings

**Testing Requirements**:
- [ ] Unit tests written for all functions
- [ ] Integration tests for API endpoints
- [ ] Edge cases covered
- [ ] Test coverage ≥80%
- [ ] All tests pass: `pnpm test`

**Code Quality**:
- [ ] TypeScript types properly defined
- [ ] Code formatted: `pnpm lint`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] No hardcoded values (use env vars)
- [ ] Error handling implemented

**Documentation**:
- [ ] JSDoc comments on public functions
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] CHANGELOG.md entry added

## Test Cases

### Test Case 1: [Happy Path]
```typescript
describe('[functionality]', () => {
  it('should [expected behavior]', async () => {
    // Arrange
    const input = { /* ... */ };

    // Act
    const result = await functionUnderTest(input);

    // Assert
    expect(result).toEqual({ /* expected output */ });
  });
});
```

### Test Case 2: [Edge Case]
```typescript
it('should handle [edge case]', async () => {
  // Test implementation
});
```

### Test Case 3: [Error Case]
```typescript
it('should throw error when [invalid input]', async () => {
  // Test implementation
});
```

## Implementation Workflow

```bash
# 1. Create feature branch
git checkout -b feature/[task-name]

# 2. Install any new dependencies
pnpm install

# 3. Write tests first (TDD)
# Create test file: [package]/src/[feature]/[file].test.ts

# 4. Run tests (should fail initially)
pnpm test

# 5. Implement functionality
# Create implementation: [package]/src/[feature]/[file].ts

# 6. Run tests until all pass
pnpm test

# 7. Verify acceptance criteria
# Go through checklist above

# 8. Run full quality checks
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# 9. Commit with reference to task
git commit -m "feat: [description]

Implements task [N.X] from .specify/tasks/

- Acceptance criterion 1
- Acceptance criterion 2
- Test coverage: [X]%"

# 10. Create PR
gh pr create --title "feat: [Task name]" \
  --body "Implements .specify/tasks/[N.X]-[task-name].md

## Changes
- Change 1
- Change 2

## Testing
- [X] All acceptance criteria met
- [X] Tests pass with [X]% coverage
- [X] Type checking passes"
```

## References

- `.specify/requirements/phase-[N]-[name].md` - Phase overview
- `docs/architecture/system-design.md` - Architecture context
- `docs/reference/api.md` - API conventions
- Related task files

## Notes

- Additional context or considerations
- Known limitations or trade-offs
- Future enhancement opportunities
