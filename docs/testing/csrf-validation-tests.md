# CSRF Validation Tests

**Status**: Ready for Implementation
**Phase**: 9 - Production Deployment
**Date**: 2025-01-10

## Overview

Comprehensive test suite to validate CSRF protection across all 4 frontend applications. Tests cover token fetching, validation, expiry, refresh, and error handling.

## Test Categories

### 1. Token Fetching Tests
### 2. Request Validation Tests
### 3. Token Refresh Tests
### 4. Error Handling Tests
### 5. Integration Tests

## 1. Token Fetching Tests

### Test 1.1: Successful Token Fetch

**Description**: Verify CSRF token can be fetched from Auth.js endpoint

**Steps**:
1. Call `CSRFService.getToken()`
2. Verify response contains token and expiresAt
3. Verify token is a valid string (32-128 characters)
4. Verify expiresAt is in the future

**Expected Result**: Token fetched successfully with valid expiry

**Test Code**:
```typescript
import { describe, it, expect } from 'vitest';
import { CSRFService } from '@platform/auth';

describe('CSRF Token Fetching', () => {
  it('should fetch CSRF token successfully', async () => {
    const { token, expiresAt } = await CSRFService.getToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token.length).toBeLessThanOrEqual(128);
    expect(expiresAt).toBeGreaterThan(Date.now());
  });
});
```

### Test 1.2: Token Format Validation

**Description**: Verify token format is valid (alphanumeric + hyphens/underscores)

**Steps**:
1. Fetch CSRF token
2. Validate format using `CSRFService.validateTokenFormat()`
3. Test with invalid tokens (empty, too short, too long, invalid characters)

**Expected Result**: Valid tokens pass, invalid tokens fail

**Test Code**:
```typescript
it('should validate CSRF token format', () => {
  const validToken = 'abc123-def456_ghi789';
  const invalidTokens = [
    '',  // Empty
    'abc',  // Too short
    'a'.repeat(200),  // Too long
    'token with spaces',  // Spaces
    'token@#$%',  // Special characters
  ];

  expect(CSRFService.validateTokenFormat(validToken)).toBe(true);
  invalidTokens.forEach(token => {
    expect(CSRFService.validateTokenFormat(token)).toBe(false);
  });
});
```

### Test 1.3: Cookie Persistence

**Description**: Verify CSRF cookie is set with correct attributes

**Steps**:
1. Navigate to application
2. Check `document.cookie` for CSRF token
3. Verify cookie attributes (httpOnly not accessible via JS)
4. Use browser DevTools to inspect cookie

**Expected Result**:
- Production: `__Host-next-auth.csrf-token` cookie exists
- Development: `next-auth.csrf-token` cookie exists
- Cookie attributes: httpOnly, sameSite=lax, secure (production)

**Manual Test** (Browser DevTools):
```javascript
// Open DevTools → Application → Cookies
// Verify cookie exists with correct attributes:
// - Name: __Host-next-auth.csrf-token (production) or next-auth.csrf-token (dev)
// - HttpOnly: ✓
// - Secure: ✓ (production only)
// - SameSite: Lax
// - Path: /
```

## 2. Request Validation Tests

### Test 2.1: POST Request with CSRF Token

**Description**: Verify POST request succeeds with valid CSRF token

**Steps**:
1. Fetch CSRF token
2. Make POST request with `X-CSRF-Token` header
3. Include `credentials: 'include'`
4. Verify request succeeds (200 OK)

**Expected Result**: Request succeeds with 200 status

**Test Code**:
```typescript
it('should allow POST request with valid CSRF token', async () => {
  const { token } = await CSRFService.getToken();

  const response = await fetch('/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
    },
    credentials: 'include',
    body: JSON.stringify({ test: 'data' }),
  });

  expect(response.status).toBe(200);
});
```

### Test 2.2: POST Request without CSRF Token

**Description**: Verify POST request fails without CSRF token

**Steps**:
1. Make POST request without `X-CSRF-Token` header
2. Verify request fails (403 Forbidden)

**Expected Result**: Request rejected with 403 status

**Test Code**:
```typescript
it('should reject POST request without CSRF token', async () => {
  const response = await fetch('/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ test: 'data' }),
  });

  expect(response.status).toBe(403);
});
```

### Test 2.3: GET Request Without CSRF Token

**Description**: Verify GET requests don't require CSRF token

**Steps**:
1. Make GET request without `X-CSRF-Token` header
2. Verify request succeeds (200 OK)

**Expected Result**: Request succeeds (GET requests are idempotent)

**Test Code**:
```typescript
it('should allow GET request without CSRF token', async () => {
  const response = await fetch('/api/test', {
    method: 'GET',
    credentials: 'include',
  });

  expect(response.status).toBe(200);
});
```

### Test 2.4: Cross-Origin Request Rejection

**Description**: Verify cross-origin requests are rejected

**Steps**:
1. Make POST request from different origin
2. Verify request fails due to SameSite cookie policy

**Expected Result**: Request rejected (CSRF token cookie not sent)

**Manual Test** (Browser Console):
```javascript
// From https://evil.com, try to make request to https://app.platform.com
fetch('https://app.platform.com/api/test', {
  method: 'POST',
  credentials: 'include',  // Won't work due to SameSite=lax
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ malicious: 'data' }),
});
// Expected: Network error or 403 Forbidden
```

## 3. Token Refresh Tests

### Test 3.1: Auto-Refresh Before Expiry

**Description**: Verify token auto-refreshes before expiry

**Steps**:
1. Use `useCSRF()` hook in test component
2. Mock `Date.now()` to simulate time passing
3. Verify token is refreshed 5 minutes before expiry
4. Verify new token is different from old token

**Expected Result**: Token refreshed automatically

**Test Code**:
```typescript
import { renderHook, waitFor } from '@testing/library/react';
import { useCSRF } from '@platform/auth';
import { vi } from 'vitest';

it('should auto-refresh CSRF token before expiry', async () => {
  const { result } = renderHook(() => useCSRF());

  // Wait for initial token
  await waitFor(() => expect(result.current.token).toBeDefined());
  const initialToken = result.current.token;

  // Fast-forward time to 5 minutes before expiry
  vi.useFakeTimers();
  vi.advanceTimersByTime(55 * 60 * 1000);  // 55 minutes (1 hour - 5 min buffer)

  // Wait for token refresh
  await waitFor(() => expect(result.current.token).not.toBe(initialToken));

  vi.useRealTimers();
});
```

### Test 3.2: Manual Refetch

**Description**: Verify manual token refetch works

**Steps**:
1. Fetch initial token using `useCSRF()`
2. Call `refetch()` method
3. Verify new token is returned
4. Verify loading state updates correctly

**Expected Result**: Token refetched successfully

**Test Code**:
```typescript
it('should manually refetch CSRF token', async () => {
  const { result } = renderHook(() => useCSRF());

  // Wait for initial token
  await waitFor(() => expect(result.current.token).toBeDefined());
  const initialToken = result.current.token;

  // Manually refetch
  await result.current.refetch();

  // Verify new token
  await waitFor(() => expect(result.current.token).not.toBe(initialToken));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe(null);
});
```

### Test 3.3: Concurrent Request Deduplication (Widget SDK)

**Description**: Verify concurrent token requests are deduplicated

**Steps**:
1. Make multiple simultaneous calls to `widgetFetch()`
2. Verify only one token request is made
3. Verify all calls receive the same token

**Expected Result**: Single token request, all callers receive same token

**Test Code**:
```typescript
import { widgetFetch } from '../apps/widget-sdk/src/utils/csrf';

it('should deduplicate concurrent token requests', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  // Make 5 concurrent requests
  const promises = Array.from({ length: 5 }, () =>
    widgetFetch('/api/test', { method: 'POST' })
  );

  await Promise.all(promises);

  // Verify only one CSRF token request was made
  const csrfRequests = fetchSpy.mock.calls.filter(
    ([url]) => url.includes('/api/auth/csrf')
  );
  expect(csrfRequests.length).toBe(1);

  fetchSpy.mockRestore();
});
```

## 4. Error Handling Tests

### Test 4.1: Network Error During Token Fetch

**Description**: Verify graceful error handling when token fetch fails

**Steps**:
1. Mock fetch to throw network error
2. Attempt to fetch CSRF token
3. Verify error is caught and logged
4. Verify error state is set correctly

**Expected Result**: Error handled gracefully, user notified

**Test Code**:
```typescript
it('should handle network error during token fetch', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
    new Error('Network error')
  );

  const { result } = renderHook(() => useCSRF());

  await waitFor(() => {
    expect(result.current.error).toBe('Failed to fetch CSRF token');
    expect(result.current.token).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  fetchSpy.mockRestore();
});
```

### Test 4.2: Invalid Token Response

**Description**: Verify error handling when server returns invalid token

**Steps**:
1. Mock fetch to return malformed response
2. Attempt to fetch CSRF token
3. Verify error is caught
4. Verify fallback behavior (retry or manual refetch)

**Expected Result**: Invalid response handled, error logged

**Test Code**:
```typescript
it('should handle invalid token response', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ invalid: 'response' }),  // Missing csrfToken field
  } as Response);

  await expect(CSRFService.getToken()).rejects.toThrow();

  fetchSpy.mockRestore();
});
```

### Test 4.3: Expired Token Handling

**Description**: Verify expired token is detected and refreshed

**Steps**:
1. Set token with past expiry date
2. Make API request
3. Verify token is automatically refreshed
4. Verify request retried with new token

**Expected Result**: Expired token detected, refreshed, request succeeds

**Test Code**:
```typescript
it('should detect and refresh expired token', async () => {
  // Mock expired token
  const expiredToken = {
    token: 'expired-token',
    expiresAt: Date.now() - 1000,  // Expired 1 second ago
  };

  vi.spyOn(CSRFService, 'getToken')
    .mockResolvedValueOnce(expiredToken)
    .mockResolvedValueOnce({
      token: 'fresh-token',
      expiresAt: Date.now() + 3600000,
    });

  const { fetch } = await CSRFService.createAuthenticatedFetch();
  const response = await fetch('/api/test', { method: 'POST' });

  expect(response.ok).toBe(true);
});
```

## 5. Integration Tests

### Test 5.1: Dashboard tRPC Integration

**Description**: Verify CSRF tokens work with tRPC mutations

**Steps**:
1. Render Dashboard app with TRPCProvider
2. Execute tRPC mutation (e.g., upload document)
3. Verify CSRF token automatically included in request
4. Verify mutation succeeds

**Expected Result**: tRPC mutation succeeds with automatic CSRF protection

**Test Code**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../apps/dashboard/src/App';

it('should include CSRF token in tRPC mutations', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  render(<App />);

  // Trigger tRPC mutation (e.g., upload document button)
  const uploadButton = await screen.findByRole('button', { name: /upload/i });
  await userEvent.click(uploadButton);

  // Verify CSRF token in request
  await waitFor(() => {
    const tRPCCalls = fetchSpy.mock.calls.filter(
      ([url]) => url.includes('/trpc')
    );
    expect(tRPCCalls.length).toBeGreaterThan(0);

    const lastCall = tRPCCalls[tRPCCalls.length - 1];
    const headers = lastCall[1]?.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBeDefined();
  });

  fetchSpy.mockRestore();
});
```

### Test 5.2: Meeting App LiveKit Integration

**Description**: Verify CSRF protection in LiveKit meeting creation

**Steps**:
1. Render Meeting app with CSRFProvider
2. Create new meeting room
3. Verify `createMeetingWithCSRF()` includes token
4. Verify meeting created successfully

**Expected Result**: Meeting created with CSRF protection

**Test Code**:
```typescript
import { render, screen } from '@testing-library/react';
import { App } from '../apps/meeting/src/App';
import { createMeetingWithCSRF } from '../apps/meeting/src/utils/csrf';

it('should create meeting with CSRF protection', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  await createMeetingWithCSRF('test-room', 'John Doe');

  // Verify CSRF token in request
  const meetingCalls = fetchSpy.mock.calls.filter(
    ([url]) => url.includes('/api/livekit/join-room')
  );
  expect(meetingCalls.length).toBe(1);

  const headers = meetingCalls[0][1]?.headers as Record<string, string>;
  expect(headers['X-CSRF-Token']).toBeDefined();
  expect(headers['X-CSRF-Token']).toMatch(/^[a-zA-Z0-9_-]+$/);

  fetchSpy.mockRestore();
});
```

### Test 5.3: Widget SDK Message Sending

**Description**: Verify CSRF protection in widget message API calls

**Steps**:
1. Initialize widget with PlatformWidget
2. Send message using `sendWidgetMessage()`
3. Verify CSRF token included in request
4. Verify singleton manager works correctly

**Expected Result**: Message sent with CSRF protection

**Test Code**:
```typescript
import { sendWidgetMessage } from '../apps/widget-sdk/src/utils/csrf';

it('should send widget message with CSRF protection', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  await sendWidgetMessage('Hello', 'tenant-123', 'api-key-456');

  // Verify CSRF token in request
  const messageCalls = fetchSpy.mock.calls.filter(
    ([url]) => url.includes('/api/widget/message')
  );
  expect(messageCalls.length).toBe(1);

  const headers = messageCalls[0][1]?.headers as Record<string, string>;
  expect(headers['X-CSRF-Token']).toBeDefined();

  fetchSpy.mockRestore();
});
```

### Test 5.4: Landing Page Form Submission

**Description**: Verify CSRF protection in contact form

**Steps**:
1. Render Landing page
2. Fill and submit contact form
3. Verify `submitFormWithCSRF()` includes token
4. Verify submission succeeds

**Expected Result**: Form submitted with CSRF protection

**Test Code**:
```typescript
import { submitFormWithCSRF } from '../apps/landing/src/utils/csrf';

it('should submit contact form with CSRF protection', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  await submitFormWithCSRF('/api/contact', {
    email: 'test@example.com',
    message: 'Hello',
  });

  // Verify CSRF token in request
  expect(fetchSpy).toHaveBeenCalledWith(
    '/api/contact',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-CSRF-Token': expect.stringMatching(/^[a-zA-Z0-9_-]+$/),
      }),
    })
  );

  fetchSpy.mockRestore();
});
```

## Test Execution

### Running Tests

```bash
# Run all CSRF tests
pnpm test csrf

# Run tests for specific app
pnpm --filter @platform/dashboard test
pnpm --filter @platform/meeting test
pnpm --filter @platform/widget-sdk test

# Run with coverage
pnpm test --coverage
```

### Coverage Requirements

- **Unit Tests**: ≥90% coverage for CSRF service and hooks
- **Integration Tests**: All 4 apps have CSRF integration tests
- **Manual Tests**: Cookie attributes verified in browser DevTools

### Test Environment Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/auth/src/services/csrf.service.ts',
        'packages/auth/src/hooks/useCSRF.ts',
        'apps/*/src/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },
});
```

## Success Criteria

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] Coverage ≥90% for CSRF service and hooks
- [ ] Manual cookie verification complete
- [ ] Cross-origin protection verified
- [ ] Token refresh mechanism working
- [ ] Error handling tested and working
- [ ] All 4 apps tested individually

## Next Steps

1. Implement automated tests in `packages/auth/tests/csrf.test.ts`
2. Run full test suite with coverage report
3. Perform manual browser testing with DevTools
4. Document any issues found during testing
5. Proceed to comprehensive application testing
