# End-to-End Testing Suite - Playwright

Comprehensive E2E test suite for the Enterprise AI Assistant Platform using [Playwright](https://playwright.dev/).

## 📋 Overview

This suite validates critical user flows across multiple browsers and devices:
- **Authentication**: Register, login, logout, password reset
- **Chat**: Real-time messaging, AI responses
- **Widget**: Embedding, initialization, interactions
- **Knowledge Base**: Document search, RAG queries
- **Dashboard**: Admin operations, settings, analytics

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd tests/e2e
pnpm install

# Install browsers (Chromium, Firefox, WebKit)
pnpm run install
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.test

# Configure test environment
# Edit .env.test with your test URLs:
# - BASE_URL=http://localhost:5174 (dashboard)
# - API_URL=http://localhost:3001 (API)
# - WIDGET_URL=http://localhost:5176 (widget)
# - TEST_EMAIL=e2e-test@example.com
# - TEST_PASSWORD=E2ETest123!@#
```

### Running Tests

```bash
# Run all tests (headless)
pnpm test

# Run with UI (interactive mode)
pnpm test:ui

# Run in headed mode (see browser)
pnpm test:headed

# Debug mode (step through tests)
pnpm test:debug

# Run specific test suite
pnpm test:auth         # Authentication tests
pnpm test:chat         # Chat/messaging tests
pnpm test:widget       # Widget embedding tests
pnpm test:knowledge    # Knowledge base tests
pnpm test:dashboard    # Dashboard tests

# Run on specific browser
pnpm test:chromium     # Chrome/Edge
pnpm test:firefox      # Firefox
pnpm test:webkit       # Safari

# Run mobile tests
pnpm test:mobile       # iOS + Android

# View HTML report
pnpm report
```

## 📂 Test Structure

```
tests/e2e/
├── tests/                    # Test specifications
│   ├── auth.spec.ts         # Authentication flows
│   ├── chat.spec.ts         # Chat messaging
│   ├── widget.spec.ts       # Widget embedding
│   ├── knowledge.spec.ts    # Knowledge base search
│   └── dashboard.spec.ts    # Dashboard operations
├── pages/                    # Page Object Models
│   ├── LoginPage.ts         # Login page POM
│   ├── DashboardPage.ts     # Dashboard POM
│   ├── ChatPage.ts          # Chat interface POM
│   └── WidgetPage.ts        # Widget POM
├── fixtures/                 # Test fixtures
│   ├── auth.fixture.ts      # Auth test data
│   └── chat.fixture.ts      # Chat test data
├── utils/                    # Helper utilities
│   ├── global-setup.ts      # Global test setup
│   ├── global-teardown.ts   # Global test cleanup
│   └── helpers.ts           # Shared test helpers
└── playwright.config.ts     # Playwright configuration
```

## 🧪 Test Suites

### 1. Authentication Tests (`auth.spec.ts`)

**Critical Flows**:
- ✅ User registration with validation
- ✅ Login with email/password
- ✅ MFA authentication (TOTP)
- ✅ Password reset flow
- ✅ Session persistence
- ✅ Logout and session cleanup

**Test Scenarios**:
```typescript
test('should register new user', async ({ page }) => {
  // Validates registration form, email verification
});

test('should login with valid credentials', async ({ page }) => {
  // Tests authentication flow, session creation
});

test('should handle MFA verification', async ({ page }) => {
  // Tests TOTP code entry, backup codes
});
```

### 2. Chat Tests (`chat.spec.ts`)

**Critical Flows**:
- ✅ Start new chat session
- ✅ Send user message
- ✅ Receive AI response
- ✅ Real-time WebSocket messaging
- ✅ Message history persistence
- ✅ Session management

**Test Scenarios**:
```typescript
test('should send and receive messages', async ({ page }) => {
  // Tests bidirectional messaging, AI responses
});

test('should maintain message history', async ({ page }) => {
  // Tests session persistence, message ordering
});
```

### 3. Widget Tests (`widget.spec.ts`)

**Critical Flows**:
- ✅ Widget script loading
- ✅ Widget initialization
- ✅ Chat window opening/closing
- ✅ Message sending from widget
- ✅ AI responses in widget
- ✅ Cross-origin communication

**Test Scenarios**:
```typescript
test('should load widget on page', async ({ page }) => {
  // Tests script loading, shadow DOM creation
});

test('should handle widget interactions', async ({ page }) => {
  // Tests click events, message sending
});
```

### 4. Knowledge Base Tests (`knowledge.spec.ts`)

**Critical Flows**:
- ✅ Document upload
- ✅ Semantic search
- ✅ RAG query processing
- ✅ Result relevance
- ✅ Citation display

**Test Scenarios**:
```typescript
test('should search knowledge base', async ({ page }) => {
  // Tests search functionality, result ranking
});

test('should display relevant results', async ({ page }) => {
  // Tests RAG retrieval, citation formatting
});
```

### 5. Dashboard Tests (`dashboard.spec.ts`)

**Critical Flows**:
- ✅ Dashboard navigation
- ✅ Settings management
- ✅ Team member management
- ✅ Analytics viewing
- ✅ API key generation

**Test Scenarios**:
```typescript
test('should navigate dashboard sections', async ({ page }) => {
  // Tests routing, access control
});

test('should manage team members', async ({ page }) => {
  // Tests CRUD operations for users
});
```

## 🎯 Page Object Models

### LoginPage.ts
```typescript
export class LoginPage {
  async login(email: string, password: string): Promise<void>;
  async expectLoggedIn(): Promise<void>;
}
```

### ChatPage.ts
```typescript
export class ChatPage {
  async sendMessage(message: string): Promise<void>;
  async waitForAIResponse(): Promise<string>;
  async getMessageHistory(): Promise<Message[]>;
}
```

### WidgetPage.ts
```typescript
export class WidgetPage {
  async openWidget(): Promise<void>;
  async closeWidget(): Promise<void>;
  async sendMessage(message: string): Promise<void>;
}
```

## 🔍 Test Data Management

### Fixtures (`fixtures/`)

Test data is managed through fixtures for consistency:

```typescript
// auth.fixture.ts
export const validUser = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
  name: 'Test User',
};

export const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'WrongPassword',
};
```

## 🛠️ Configuration

### Browser Testing

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
]
```

### Parallel Execution

```typescript
// Run tests in parallel for faster execution
fullyParallel: true,
workers: process.env.CI ? 1 : undefined,
```

### Retries and Timeouts

```typescript
// Retry failed tests in CI
retries: process.env.CI ? 2 : 0,

// Test timeout
timeout: 30 * 1000,
actionTimeout: 10 * 1000,
```

## 📊 Reporting

Test results are available in multiple formats:

### HTML Report
```bash
pnpm report
# Opens interactive HTML report in browser
```

### JSON Results
```bash
cat test-results/results.json
# Machine-readable test results
```

### JUnit XML
```bash
cat test-results/junit.xml
# CI/CD integration format
```

## 🐛 Debugging

### Interactive Mode
```bash
pnpm test:ui
# Opens Playwright Test UI with time-travel debugging
```

### Debug Mode
```bash
pnpm test:debug
# Runs tests with debugger attached
```

### Trace Viewer
```bash
playwright show-trace test-results/trace.zip
# View detailed execution trace
```

### Screenshots and Videos
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

## 🔗 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: cd tests/e2e && pnpm install

- name: Install Playwright browsers
  run: cd tests/e2e && pnpm run install

- name: Run E2E tests
  run: cd tests/e2e && pnpm test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: tests/e2e/test-results/
```

## 📝 Best Practices

### 1. Test Isolation
- Each test runs independently
- Clean state before/after tests
- No shared state between tests

### 2. Page Object Model
- Encapsulate page interactions
- Reusable page methods
- Maintainable test code

### 3. Waiting Strategies
- Use built-in auto-waiting
- Avoid arbitrary waits
- Wait for specific conditions

### 4. Assertions
- Use Playwright assertions
- Descriptive error messages
- Check multiple conditions

### 5. Test Data
- Use fixtures for consistency
- Generate unique test data
- Clean up after tests

## 🚨 Troubleshooting

### Browser Installation Issues
```bash
# Reinstall browsers
pnpm run install --force

# Install system dependencies (Linux)
pnpm run install --with-deps
```

### Test Failures
```bash
# Run in headed mode to see what's happening
pnpm test:headed

# Debug specific test
pnpm test:debug tests/auth.spec.ts
```

### Flaky Tests
```bash
# Increase timeouts
timeout: 60 * 1000

# Add retries
retries: 2

# Use more specific selectors
```

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## 📦 Dependencies

- `@playwright/test`: 1.49.1 (test runner + assertions)
- `typescript`: 5.7.2 (TypeScript support)

## 🎯 Coverage Goals

- **Critical Paths**: 100% coverage
- **Authentication**: All flows tested
- **Chat**: Real-time messaging validated
- **Widget**: Cross-browser compatibility
- **Knowledge**: RAG functionality verified
- **Dashboard**: Admin operations tested
