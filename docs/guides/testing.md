# Testing Strategy - Comprehensive Quality Assurance

## 🎯 Testing Philosophy

**Principles**:
1. **Test-driven development** - Write tests before implementation
2. **Test pyramid** - Many unit tests, fewer integration tests, minimal E2E tests
3. **Fast feedback** - Unit tests run in <1s, full suite in <5min
4. **Confidence over coverage** - Test behavior, not implementation
5. **Production parity** - Test environments mirror production

**Coverage Targets**:
- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical paths covered
- **E2E tests**: Key user journeys validated
- **Performance tests**: All APIs under target latency

---

## 🏗️ Testing Stack

### Unit Testing
```yaml
Framework: Vitest (Vite-native, faster than Jest)
Assertions: expect (built-in)
Mocking: vi.mock() (built-in)
Coverage: v8 (built-in)
```

### Integration Testing
```yaml
API Testing: Vitest + Supertest
Database: PostgreSQL test instance (Docker)
Redis: Redis test instance (Docker)
Fixtures: Factory pattern with Drizzle
```

### E2E Testing
```yaml
Framework: Playwright
Browsers: Chromium, Firefox, WebKit
Recording: Screenshots + videos on failure
Parallelization: 4 workers by default
```

### Visual Regression
```yaml
Tool: Playwright screenshots
Comparison: Percy or Lost Pixel
Threshold: 0.1% pixel difference
```

---

## 🧪 Unit Testing Patterns

### tRPC Procedure Testing

```typescript
// packages/api-contract/src/routers/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { authRouter } from '../auth';
import { createMockContext } from '../../test-utils/context';
import { db } from '@platform/database';

describe('authRouter', () => {
  const createCaller = createCallerFactory(authRouter);

  beforeEach(async () => {
    // Clear database before each test
    await db.delete(schema.users);
    await db.delete(schema.tenants);
  });

  describe('register', () => {
    it('should create tenant and user successfully', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.register({
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Test Corp',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.sessionToken).toBeDefined();

      // Verify tenant was created
      const tenant = await db.query.tenants.findFirst({
        where: (tenants, { eq }) => eq(tenants.id, result.user.tenantId),
      });
      expect(tenant).toBeDefined();
      expect(tenant!.name).toBe('Test Corp');
    });

    it('should reject duplicate email', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.register({
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Test Corp',
      });

      await expect(
        caller.register({
          email: 'test@example.com',
          password: 'password456',
          tenantName: 'Another Corp',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should hash password securely', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.register({
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Test Corp',
      });

      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, 'test@example.com'),
      });

      expect(user!.passwordHash).not.toBe('password123');
      expect(user!.passwordHash).toContain('$argon2id$');
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Register user
      await caller.register({
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Test Corp',
      });

      // Login
      const result = await caller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.sessionToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.register({
        email: 'test@example.com',
        password: 'password123',
        tenantName: 'Test Corp',
      });

      await expect(
        caller.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
```

### Test Utilities

```typescript
// packages/api-contract/src/test-utils/context.ts
import type { Context } from '../context';
import { db } from '@platform/database';

export function createMockContext(overrides?: Partial<Context>): Context {
  return {
    session: null,
    user: null,
    tenantId: null,
    db,
    req: new Request('http://localhost:3001'),
    userAgent: 'test-agent',
    ip: '127.0.0.1',
    ...overrides,
  };
}

export function createAuthenticatedContext(
  userId: string,
  tenantId: string
): Context {
  return createMockContext({
    session: {
      id: 'test-session-id',
      userId,
      expiresAt: new Date(Date.now() + 86400000),
      fresh: true,
    },
    user: {
      id: userId,
      email: 'test@example.com',
      tenantId,
      role: 'admin',
    } as any,
    tenantId,
  });
}
```

### Factory Pattern for Test Data

```typescript
// packages/database/src/test-utils/factories.ts
import { faker } from '@faker-js/faker';
import { db } from '../client';
import * as schema from '../schema';
import { Argon2id } from 'oslo/password';

export class TenantFactory {
  static async create(overrides?: Partial<typeof schema.tenants.$inferInsert>) {
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: faker.company.name(),
        apiKey: `pk_test_${faker.string.alphanumeric(32)}`,
        plan: 'starter',
        ...overrides,
      })
      .returning();

    return tenant;
  }
}

export class UserFactory {
  static async create(
    tenantId: string,
    overrides?: Partial<typeof schema.users.$inferInsert>
  ) {
    const password = 'password123';
    const hashedPassword = await new Argon2id().hash(password);

    const [user] = await db
      .insert(schema.users)
      .values({
        tenantId,
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: 'member',
        name: faker.person.fullName(),
        ...overrides,
      })
      .returning();

    return { user, password };
  }
}

export class WidgetFactory {
  static async create(
    tenantId: string,
    overrides?: Partial<typeof schema.widgets.$inferInsert>
  ) {
    const [widget] = await db
      .insert(schema.widgets)
      .values({
        tenantId,
        name: faker.commerce.productName(),
        domainWhitelist: [faker.internet.url()],
        settings: {
          theme: 'auto',
          position: 'bottom-right',
        },
        ...overrides,
      })
      .returning();

    return widget;
  }
}

// Usage in tests:
const tenant = await TenantFactory.create();
const { user, password } = await UserFactory.create(tenant.id);
const widget = await WidgetFactory.create(tenant.id);
```

---

## 🔗 Integration Testing

### API Integration Tests

```typescript
// packages/api/src/__tests__/integration/chat.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server';
import type { FastifyInstance } from 'fastify';
import { TenantFactory, UserFactory, WidgetFactory } from '@platform/database/test-utils';

describe('Chat API Integration', () => {
  let server: FastifyInstance;
  let tenant: any;
  let user: any;
  let widget: any;
  let sessionToken: string;

  beforeAll(async () => {
    // Start test server
    server = await createServer({ logger: false });
    await server.listen({ port: 0 }); // Random port

    // Create test data
    tenant = await TenantFactory.create();
    const userResult = await UserFactory.create(tenant.id);
    user = userResult.user;

    widget = await WidgetFactory.create(tenant.id);

    // Login to get session token
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/trpc/auth.login',
      payload: {
        email: user.email,
        password: userResult.password,
      },
    });

    sessionToken = JSON.parse(loginResponse.body).result.data.sessionToken;
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /trpc/chat.createSession', () => {
    it('should create chat session with valid widget', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/trpc/chat.createSession',
        headers: {
          'X-API-Key': tenant.apiKey,
        },
        payload: {
          widgetId: widget.id,
          mode: 'text',
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body).result.data;
      expect(data.sessionId).toBeDefined();
      expect(data.mode).toBe('text');
    });

    it('should reject invalid widget', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/trpc/chat.createSession',
        headers: {
          'X-API-Key': tenant.apiKey,
        },
        payload: {
          widgetId: 'invalid-uuid',
          mode: 'text',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject missing API key', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/trpc/chat.createSession',
        payload: {
          widgetId: widget.id,
          mode: 'text',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('SSE Stream', () => {
    it('should establish SSE connection', async (done) => {
      // Create session first
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/trpc/chat.createSession',
        headers: {
          'X-API-Key': tenant.apiKey,
        },
        payload: {
          widgetId: widget.id,
          mode: 'text',
        },
      });

      const { sessionId } = JSON.parse(sessionResponse.body).result.data;

      // Connect to SSE stream
      const response = await server.inject({
        method: 'GET',
        url: `/api/chat/stream/${sessionId}`,
        headers: {
          'X-API-Key': tenant.apiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');
      done();
    });
  });
});
```

### Database Integration Tests

```typescript
// packages/database/src/__tests__/queries.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../client';
import * as schema from '../schema';
import { sql } from 'drizzle-orm';
import { TenantFactory, UserFactory } from '../test-utils/factories';

describe('Database Queries', () => {
  let tenant: any;

  beforeEach(async () => {
    // Clean database
    await db.delete(schema.users);
    await db.delete(schema.tenants);

    tenant = await TenantFactory.create();
  });

  describe('Multi-tenancy', () => {
    it('should isolate data between tenants', async () => {
      const tenant1 = await TenantFactory.create();
      const tenant2 = await TenantFactory.create();

      await UserFactory.create(tenant1.id);
      await UserFactory.create(tenant2.id);

      // Query tenant1 users
      const tenant1Users = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.tenantId, tenant1.id),
      });

      expect(tenant1Users).toHaveLength(1);
      expect(tenant1Users[0].tenantId).toBe(tenant1.id);
    });
  });

  describe('Vector Search', () => {
    it('should perform similarity search', async () => {
      const embedding = Array(1024).fill(0.1);

      // Insert test document
      await db.insert(schema.knowledgeDocuments).values({
        tenantId: tenant.id,
        title: 'Test Document',
        content: 'This is a test document for vector search',
        embedding,
      });

      // Search
      const results = await db.execute(sql`
        SELECT
          id,
          title,
          1 - (embedding <=> ${embedding}::vector) AS similarity
        FROM knowledge_documents
        WHERE tenant_id = ${tenant.id}
        ORDER BY embedding <=> ${embedding}::vector
        LIMIT 1
      `);

      expect(results.rows).toHaveLength(1);
      expect(results.rows[0].similarity).toBeGreaterThan(0.99);
    });
  });
});
```

---

## 🌐 E2E Testing with Playwright

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### E2E Test Examples

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register new tenant', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="tenantName"]', 'Test Company');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify welcome message
    await expect(page.locator('text=Welcome, Test Company')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    // Assume user exists (from seed data)
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@acme.com');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@acme.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });
});
```

```typescript
// e2e/widget.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Widget Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@acme.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create new widget', async ({ page }) => {
    await page.goto('/widgets');

    // Click create button
    await page.click('text=Create Widget');

    // Fill widget form
    await page.fill('input[name="name"]', 'Customer Support Widget');
    await page.fill('input[name="domain"]', 'https://example.com');
    await page.selectOption('select[name="theme"]', 'dark');

    // Submit
    await page.click('button[type="submit"]');

    // Verify widget appears in list
    await expect(page.locator('text=Customer Support Widget')).toBeVisible();
  });

  test('should test widget in preview', async ({ page, context }) => {
    await page.goto('/widgets');

    // Click preview button on first widget
    await page.click('[data-testid="widget-preview-button"]:first-child');

    // Wait for preview iframe to load
    const iframe = page.frameLocator('iframe[data-testid="widget-preview"]');

    // Interact with widget
    await iframe.locator('[data-testid="chat-button"]').click();

    // Type message
    await iframe.locator('textarea[placeholder*="message"]').fill('Hello!');
    await iframe.locator('button[type="submit"]').click();

    // Verify message appears
    await expect(iframe.locator('text=Hello!')).toBeVisible();

    // Wait for AI response
    await iframe.locator('[data-role="assistant"]').waitFor({ timeout: 10000 });

    // Verify AI responded
    const aiMessages = await iframe.locator('[data-role="assistant"]').count();
    expect(aiMessages).toBeGreaterThan(0);
  });
});
```

```typescript
// e2e/meeting.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Meeting Functionality', () => {
  test('should create and join meeting', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@acme.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Create meeting
    await page.goto('/meetings');
    await page.click('text=Create Meeting');

    await page.fill('input[name="title"]', 'Test Meeting');
    await page.click('button[type="submit"]');

    // Get meeting link
    const meetingLink = await page.locator('[data-testid="meeting-link"]').textContent();

    // Open meeting in new tab
    const meetingPage = await context.newPage();
    await meetingPage.goto(meetingLink!);

    // Grant permissions (in real browser)
    // This part requires special handling in CI

    // Verify meeting room loaded
    await expect(meetingPage.locator('text=Test Meeting')).toBeVisible();

    // Verify video controls
    await expect(meetingPage.locator('[data-testid="mic-button"]')).toBeVisible();
    await expect(meetingPage.locator('[data-testid="camera-button"]')).toBeVisible();
    await expect(meetingPage.locator('[data-testid="screen-share-button"]')).toBeVisible();
  });
});
```

### Visual Regression Testing

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard layout', async ({ page }) => {
    await page.goto('/dashboard');

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      threshold: 0.1, // 0.1% difference allowed
    });
  });

  test('widget appearance - light theme', async ({ page }) => {
    await page.goto('/widget-preview?theme=light');

    await expect(page).toHaveScreenshot('widget-light.png');
  });

  test('widget appearance - dark theme', async ({ page }) => {
    await page.goto('/widget-preview?theme=dark');

    await expect(page).toHaveScreenshot('widget-dark.png');
  });
});
```

---

## ⚡ Performance Testing

### API Performance Tests

```typescript
// packages/api-contract/src/__tests__/performance.test.ts
import { describe, it, expect } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { chatRouter } from '../routers/chat';
import { createAuthenticatedContext } from '../test-utils/context';

describe('API Performance', () => {
  const createCaller = createCallerFactory(chatRouter);

  it('should respond within 200ms (p95)', async () => {
    const ctx = createAuthenticatedContext('user-id', 'tenant-id');
    const caller = createCaller(ctx);

    const times: number[] = [];

    // Run 100 requests
    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      await caller.createSession({
        widgetId: 'test-widget-id',
        mode: 'text',
      });

      times.push(performance.now() - start);
    }

    // Calculate p95
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];

    expect(p95).toBeLessThan(200);
  });
});
```

### Load Testing with k6

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'], // <1% errors
  },
};

export default function () {
  // Test chat session creation
  const res = http.post(
    'http://localhost:3001/trpc/chat.createSession',
    JSON.stringify({
      widgetId: 'test-widget-id',
      mode: 'text',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'pk_test_...',
      },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time <200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

---

## 🔒 Security Testing

### SQL Injection Tests

```typescript
// packages/database/src/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '../client';
import * as schema from '../schema';
import { TenantFactory } from '../test-utils/factories';

describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in email field', async () => {
    const tenant = await TenantFactory.create();

    const maliciousEmail = "admin@example.com' OR '1'='1";

    // This should NOT return any users
    const users = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.email, maliciousEmail),
    });

    expect(users).toHaveLength(0);
  });

  it('should prevent SQL injection in search queries', async () => {
    const tenant = await TenantFactory.create();

    const maliciousQuery = "'; DROP TABLE users; --";

    // Should not execute DROP TABLE
    await expect(async () => {
      await db.query.knowledgeDocuments.findMany({
        where: (docs, { eq, like }) =>
          like(docs.content, `%${maliciousQuery}%`),
      });
    }).not.toThrow();

    // Verify users table still exists
    const users = await db.query.users.findMany();
    expect(users).toBeDefined();
  });
});
```

### XSS Prevention Tests

```typescript
// apps/dashboard/src/__tests__/security.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../components/MessageBubble';

describe('XSS Prevention', () => {
  it('should escape HTML in messages', () => {
    const maliciousContent = '<script>alert("XSS")</script>';

    render(<MessageBubble content={maliciousContent} role="user" />);

    // Script should be rendered as text, not executed
    expect(screen.getByText(maliciousContent)).toBeInTheDocument();

    // No script tag should exist in DOM
    expect(document.querySelector('script')).toBeNull();
  });

  it('should escape HTML attributes', () => {
    const maliciousContent = '" onload="alert(\'XSS\')"';

    render(<MessageBubble content={maliciousContent} role="user" />);

    // Should not execute onload
    const element = screen.getByText(maliciousContent);
    expect(element.getAttribute('onload')).toBeNull();
  });
});
```

---

## 📊 Test Coverage

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test-utils/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### Generate Coverage Report

```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/index.html

# View terminal summary
pnpm test:coverage --reporter=text
```

---

## 🚀 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: platform
          POSTGRES_PASSWORD: platform_test
          POSTGRES_DB: platform_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup database
        run: pnpm db:push
        env:
          DATABASE_URL: postgresql://platform:platform_test@localhost:5432/platform_test

      - name: Run unit tests
        run: pnpm test:unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Start services
        run: |
          docker-compose up -d
          pnpm db:push
          pnpm db:seed

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## ✅ Testing Checklist

### Before Commit
- [ ] All unit tests pass
- [ ] Type-check succeeds
- [ ] Linting passes
- [ ] Coverage threshold met (80%+)

### Before PR
- [ ] Integration tests pass
- [ ] E2E tests pass (critical paths)
- [ ] No new security vulnerabilities
- [ ] Performance benchmarks met

### Before Production
- [ ] Full E2E test suite passes
- [ ] Load tests completed successfully
- [ ] Visual regression tests reviewed
- [ ] Security audit completed

---

## 🎯 Test Maintenance

### Keep Tests Fast
- Mock external services (AI APIs, LiveKit)
- Use in-memory database for unit tests when possible
- Parallelize E2E tests
- Skip slow tests in development with `.skip()`

### Keep Tests Reliable
- Avoid hardcoded delays (`sleep()`)
- Use `waitFor()` utilities
- Clean up database between tests
- Isolate test data by tenant

### Keep Tests Readable
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Extract common setup to `beforeEach`
- Use test utilities and factories

---

**Next**: See `07-COMPONENT-PATTERNS.md` for frontend testing patterns.
