# Contributing to AI Assistant Platform

Thank you for your interest in contributing to the AI Assistant Platform! This document provides guidelines and standards for contributing to this enterprise-grade project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)

---

## Code of Conduct

### Our Standards

- **Professional Communication**: Maintain respectful, constructive dialogue
- **Quality Focus**: Prioritize code quality, security, and performance
- **Documentation**: Keep documentation accurate and comprehensive
- **Collaboration**: Work together to achieve project goals

### Unacceptable Behavior

- Harassment, discrimination, or unprofessional conduct
- Committing secrets, credentials, or sensitive data
- Bypassing security measures or quality standards
- Introducing technical debt without justification

---

## Development Setup

### Prerequisites

- **Node.js**: ≥20.0.0
- **pnpm**: ≥9.0.0
- **Docker**: Latest version
- **Git**: Latest version

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd platform

# Install dependencies
pnpm install

# Start development databases
pnpm db:up

# Configure environment
cp .env.example .env
# Edit .env with appropriate values

# Start development servers
pnpm dev
```

### Verify Setup

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

---

## Project Structure

This is a Turborepo monorepo with pnpm workspaces:

```
platform/
├── apps/                   # Frontend applications
│   ├── landing/           # Public marketing site
│   ├── dashboard/         # Admin portal
│   ├── meeting/           # Meeting rooms
│   └── widget-sdk/        # Embeddable widget
├── packages/              # Shared packages
│   ├── ui/                # Shared UI components
│   ├── api/               # Backend API server
│   ├── db/                # Database schemas
│   └── ...                # Other shared packages
├── infrastructure/        # Docker and deployment configs
└── docs/                  # Documentation
```

---

## 🚨 Critical Dependency Management Rule

### Static Version Pinning (MANDATORY)

**ALL dependencies MUST use exact versions - NO `^` or `~` ranges allowed.**

```json
// ✅ CORRECT - Static versions
{
  "dependencies": {
    "react": "18.3.1",
    "typescript": "5.7.2",
    "@trpc/server": "11.0.0"
  }
}

// ❌ WRONG - Version ranges (PR will be rejected)
{
  "dependencies": {
    "react": "^18.3.1",      // NO! Caret not allowed
    "typescript": "~5.7.2",   // NO! Tilde not allowed
    "@trpc/server": "^11.0.0" // NO! Any range not allowed
  }
}
```

### Why Static Versions?

1. **Deterministic Builds**: Identical builds across all environments (dev, staging, prod)
2. **No Surprise Updates**: Prevents automatic breaking changes from minor/patch updates
3. **Reproducible Deployments**: CI/CD always produces same results
4. **Easier Debugging**: Know exactly which dependency versions are in use
5. **Security Control**: Explicit approval required for all dependency changes

### How to Update Dependencies

```bash
# 1. Research the update
npm view <package> versions        # Check available versions
# Read changelog and breaking changes

# 2. Edit package.json manually
# Change: "react": "18.3.1"
# To:     "react": "18.3.2"

# 3. Install
pnpm install

# 4. Validate thoroughly
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# 5. Commit with context
git commit -m "chore(deps): update react 18.3.1 -> 18.3.2

- Fixes memory leak in useEffect
- See: https://github.com/facebook/react/releases/tag/v18.3.2"
```

### Pre-Commit Validation

**Before every commit, verify no version ranges exist**:

```bash
grep -r "[\^~]" package.json apps/*/package.json packages/*/package.json
# Must return ZERO results
```

This check will be enforced in CI/CD. PRs with version ranges will be automatically rejected.

---

## Development Workflow

### Branch Naming

- **Feature**: `feature/description` (e.g., `feature/add-auth`)
- **Bug Fix**: `fix/description` (e.g., `fix/login-validation`)
- **Documentation**: `docs/description` (e.g., `docs/update-readme`)
- **Refactor**: `refactor/description` (e.g., `refactor/api-structure`)

### Commit Messages

Follow Conventional Commits specification:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:
```
feat(auth): implement Lucia session management

fix(api): resolve CORS configuration issue

docs(readme): update installation instructions
```

### Development Cycle

1. **Create Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Follow code standards and best practices
3. **Test Locally**: Run type checking, linting, and tests
4. **Commit**: Use conventional commit messages
5. **Push**: `git push origin feature/your-feature`
6. **Pull Request**: Create PR with description and context

---

## Code Standards

### TypeScript Guidelines

- **Strict Mode**: Always enabled, no `any` without justification
- **Type Safety**: Explicit types for function parameters and returns
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, and components
  - `UPPER_SNAKE_CASE` for constants

**Example**:
```typescript
// Good
interface UserSession {
  userId: string;
  tenantId: string;
  expiresAt: Date;
}

function createSession(userId: string, tenantId: string): UserSession {
  return {
    userId,
    tenantId,
    expiresAt: new Date(Date.now() + 86400000),
  };
}

// Bad
function createSession(userId, tenantId) {  // Missing types
  return {
    userId: userId,  // Redundant
    tenantId,
    expiresAt: new Date(Date.now() + 86400000),
  };
}
```

### React Component Standards

- **Functional Components**: Use function components with hooks
- **TypeScript**: Explicit prop types using interfaces
- **File Organization**: One component per file
- **Naming**: Component files use PascalCase (e.g., `UserProfile.tsx`)

**Example**:
```tsx
interface UserProfileProps {
  userId: string;
  onUpdate?: (userId: string) => void;
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  // Component implementation
}
```

### File Size Limits

- **General Files**: Keep under 500 lines
- **React Components**: Prefer under 300 lines
- **Utility Functions**: Keep under 200 lines

If a file exceeds these limits, consider refactoring into smaller modules.

### Biome Configuration

We use Biome for linting and formatting:

```bash
# Format and fix issues
pnpm lint

# Check without fixing
pnpm lint --check
```

**Configuration**: See `biome.json` for rules

---

## Testing Requirements

### Test Coverage Standards

- **Unit Tests**: ≥80% coverage for business logic
- **Integration Tests**: ≥70% coverage for API endpoints
- **E2E Tests**: Critical user flows must be tested

### Testing Frameworks

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **React**: React Testing Library

### Writing Tests

**Example Unit Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { createSession } from './auth';

describe('createSession', () => {
  it('should create valid session with expiry', () => {
    const session = createSession('user-1', 'tenant-1');

    expect(session.userId).toBe('user-1');
    expect(session.tenantId).toBe('tenant-1');
    expect(session.expiresAt).toBeInstanceOf(Date);
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @platform/auth test

# Watch mode
pnpm test --watch
```

---

## Documentation Standards

### Code Documentation

- **JSDoc Comments**: For all exported functions and classes
- **Complex Logic**: Add inline comments explaining "why"
- **README Files**: Every package must have a README

**Example**:
```typescript
/**
 * Creates a new user session with tenant isolation
 *
 * @param userId - Unique identifier for the user
 * @param tenantId - Tenant context for multi-tenancy
 * @returns Session object with expiration timestamp
 *
 * @throws {Error} If userId or tenantId is invalid
 */
export function createSession(userId: string, tenantId: string): UserSession {
  // Implementation
}
```

### Markdown Documentation

- **Clear Headings**: Use hierarchical structure
- **Code Examples**: Provide working examples
- **Accuracy**: Keep documentation synchronized with code
- **Comprehensive**: Cover setup, usage, and edge cases

---

## Pull Request Process

### Before Submitting

1. **Sync with main**: `git pull origin main`
2. **Run validation**:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
3. **Update documentation**: If adding features or changing APIs
4. **Test locally**: Verify changes work as expected

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Biome checks pass
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one approval required
3. **Documentation Review**: Verify docs are accurate
4. **Testing**: Confirm test coverage is adequate
5. **Merge**: Squash and merge after approval

---

## Security Guidelines

### Never Commit

- API keys, secrets, or credentials
- `.env` files with real values
- Personal or sensitive data
- SSH keys or certificates

### Always Use

- Environment variables for configuration
- `.env.example` for templates
- Secrets management tools for production
- HTTPS for all external communications

### Security Checklist

- [ ] No hardcoded secrets
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (use Drizzle ORM)
- [ ] XSS prevention (sanitize outputs)
- [ ] CSRF protection for state-changing operations
- [ ] Rate limiting on public endpoints
- [ ] Authentication on protected routes

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Contact the security team directly at: security@platform.com (or appropriate contact)

---

## Additional Guidelines

### Performance Considerations

- **Lazy Loading**: Use code splitting for large components
- **Memoization**: Cache expensive computations
- **Database Queries**: Optimize N+1 queries
- **Bundle Size**: Monitor and minimize bundle sizes

### Accessibility

- **WCAG 2.1 AA**: Minimum compliance standard
- **Semantic HTML**: Use proper HTML elements
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Readers**: Test with screen reader software

### Multi-Tenancy

- **Tenant Isolation**: Always scope queries by tenant
- **Context Propagation**: Maintain tenant context through request lifecycle
- **Testing**: Test tenant isolation thoroughly

---

## Questions?

- **Documentation**: Check `docs/` directory
- **Architecture**: See `docs/architecture/system-design.md`
- **Roadmap**: See `docs/guides/roadmap.md`

---

**Thank you for contributing to the AI Assistant Platform!**
