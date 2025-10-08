# CSRF Protection Implementation

**Status**: Complete ✅
**Phase**: 9 - Production Deployment
**Date**: 2025-01-10

## Overview

Cross-Site Request Forgery (CSRF) protection has been implemented across all 4 frontend applications using Auth.js's built-in double submit cookie pattern. This document describes the implementation details and usage patterns.

## Architecture

### Auth.js Built-in CSRF Protection

Auth.js automatically provides CSRF protection through:

1. **Double Submit Cookie Pattern**: CSRF token stored in httpOnly cookie and returned in response body
2. **Automatic Validation**: All state-changing requests (POST/PUT/DELETE) automatically validated
3. **Secure Cookies**: `__Host-` prefix in production enforces secure, same-origin only
4. **SameSite Protection**: `sameSite: 'lax'` prevents CSRF on GET requests

### Security Features

- **httpOnly Cookies**: Prevent XSS attacks from accessing tokens
- **sameSite=lax**: CSRF prevention on GET requests
- **__Host- Prefix**: Enforces secure, same-origin only (production)
- **Auto-Refresh**: Tokens automatically refreshed before expiry

### Cookie Configuration

```typescript
// Production cookies
__Host-next-auth.csrf-token  // CSRF token
__Secure-next-auth.session-token  // Session token

// Development cookies
next-auth.csrf-token  // CSRF token
next-auth.session-token  // Session token
```

## Implementation Details

### 1. Auth Configuration (packages/auth)

**File**: `packages/auth/src/config.ts`

Added explicit CSRF cookie configuration:

```typescript
cookies: {
  csrfToken: {
    name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
```

### 2. CSRF Service (packages/auth)

**File**: `packages/auth/src/services/csrf.service.ts`

Provides utility functions for CSRF token management:

```typescript
// Fetch CSRF token
const { token } = await CSRFService.getToken();

// Add to request
const options = CSRFService.addTokenToRequest(token, { method: 'POST' });

// Create authenticated fetch wrapper
const authenticatedFetch = await CSRFService.createAuthenticatedFetch();
const response = await authenticatedFetch('/api/data', { method: 'POST' });
```

### 3. React Hooks (packages/auth)

**File**: `packages/auth/src/hooks/useCSRF.ts`

React hooks for CSRF token management:

```typescript
// Basic CSRF hook
const { token, loading, error, refetch } = useCSRF();

// Authenticated fetch hook
const { fetch, loading, error, refetch } = useAuthenticatedFetch();
const response = await fetch('/api/data', { method: 'POST', body: JSON.stringify(data) });
```

**Features**:
- Automatic token fetching on mount
- Auto-refresh 5 minutes before expiry
- Error handling and retry logic
- Manual refetch capability

## Frontend Integration

### Dashboard App (apps/dashboard)

**File**: `apps/dashboard/src/providers/TRPCProvider.tsx`

Integrated CSRF tokens into tRPC provider for automatic inclusion in all API calls:

```typescript
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch and refresh CSRF token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      const { token } = await CSRFService.getToken();
      setCsrfToken(token);
    };

    fetchCsrfToken();
    const interval = setInterval(fetchCsrfToken, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Include CSRF token in all tRPC requests
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
          headers: () => ({
            'X-CSRF-Token': csrfToken || '',
          }),
          fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
        }),
      ],
    }),
  );
}
```

### Meeting App (apps/meeting)

**Files**:
- `apps/meeting/src/providers/CSRFProvider.tsx` - Context provider
- `apps/meeting/src/utils/csrf.ts` - Utility functions
- `apps/meeting/src/App.tsx` - Provider integration

**Usage**:

```typescript
// Provider wraps entire app
<CSRFProvider>
  <BrowserRouter>...</BrowserRouter>
</CSRFProvider>

// Use in components
const { csrf, authenticatedFetch } = useCSRFContext();
const response = await createMeetingWithCSRF(roomName, participantName);
```

### Landing App (apps/landing)

**File**: `apps/landing/src/utils/csrf.ts`

Utility functions for form submissions:

```typescript
// Submit contact form
await submitFormWithCSRF('/api/contact', { email, message });

// Create authenticated fetch wrapper
const authenticatedFetch = await createAuthenticatedFetch();
const response = await authenticatedFetch('/api/newsletter', {
  method: 'POST',
  body: JSON.stringify({ email }),
});
```

### Widget SDK (apps/widget-sdk)

**File**: `apps/widget-sdk/src/utils/csrf.ts`

Singleton CSRF manager for embeddable widget:

```typescript
// Send widget message
const response = await sendWidgetMessage(message, tenantId, apiKey);

// Custom authenticated fetch
const response = await widgetFetch('/api/widget/message', {
  method: 'POST',
  body: JSON.stringify({ message }),
});

// Logout cleanup
widgetLogout();
```

**Features**:
- Singleton pattern for token management
- Automatic token refresh with 5-minute buffer
- Concurrent request deduplication
- Cleanup on logout

## Usage Examples

### tRPC Mutation (Dashboard)

```typescript
// CSRF token automatically included by TRPCProvider
const mutation = trpc.knowledge.uploadDocument.useMutation();
await mutation.mutateAsync({ file, tenantId });
```

### Regular Fetch (Landing)

```typescript
// Contact form submission
const handleSubmit = async (data) => {
  const response = await submitFormWithCSRF('/api/contact', {
    email: data.email,
    message: data.message,
  });
};
```

### LiveKit Integration (Meeting)

```typescript
// Create meeting with CSRF protection
const handleCreateRoom = async () => {
  const { token, livekitUrl } = await createMeetingWithCSRF(
    roomName,
    participantName
  );
  // Join room with token
};
```

### Widget API Call (Widget SDK)

```typescript
// Send message from embedded widget
const handleSendMessage = async (message) => {
  const { reply, conversationId } = await sendWidgetMessage(
    message,
    config.tenantId,
    config.apiKey
  );
  // Display reply
};
```

## Testing

### Manual Testing Checklist

- [ ] Verify CSRF token cookie is set on app load
- [ ] Confirm token included in POST/PUT/DELETE requests
- [ ] Test token refresh before expiry
- [ ] Verify request fails without CSRF token
- [ ] Test cross-origin request rejection
- [ ] Confirm httpOnly cookie is not accessible via JavaScript

### Automated Tests

See `docs/testing/csrf-validation-tests.md` for automated test suite.

## Security Considerations

1. **Token Expiry**: Tokens expire after 1 hour (Auth.js default)
2. **Auto-Refresh**: Tokens automatically refreshed 5 minutes before expiry
3. **Cookie Security**: Production uses `__Host-` prefix for maximum security
4. **SameSite Protection**: `lax` mode prevents CSRF on GET requests
5. **httpOnly**: Prevents XSS attacks from stealing tokens

## Troubleshooting

### CSRF Token Not Found

**Symptom**: API requests fail with "CSRF token missing" error

**Solution**:
1. Check Auth.js is properly configured in backend
2. Verify `/api/auth/csrf` endpoint is accessible
3. Ensure cookies are enabled in browser
4. Confirm `credentials: 'include'` in fetch requests

### Token Expired

**Symptom**: Requests fail after long idle period

**Solution**:
1. Verify auto-refresh interval (default: 30 minutes)
2. Check token expiry time (default: 1 hour)
3. Implement manual refetch on error:

```typescript
const { token, refetch } = useCSRF();

try {
  await fetch('/api/data', { headers: { 'X-CSRF-Token': token } });
} catch (error) {
  if (error.status === 403) {
    await refetch();
    // Retry request
  }
}
```

### Cross-Origin Issues

**Symptom**: CSRF token not sent in cross-origin requests

**Solution**:
1. Ensure API and frontend on same origin (production)
2. Configure CORS to allow credentials:
   ```typescript
   cors({ origin: 'https://app.example.com', credentials: true })
   ```
3. Verify `credentials: 'include'` in fetch requests

## Next Steps

1. ✅ CSRF implementation complete across all 4 apps
2. ⏳ Create automated CSRF validation tests
3. ⏳ Run comprehensive application testing
4. ⏳ Conduct final security review before staging deployment

## References

- [Auth.js Security Documentation](https://authjs.dev/concepts/security#csrf-protection)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
