# @platform/auth - Authentication Package

**Status**: ⚠️ Blocked - NextAuth v5 beta TypeScript inference issue

## Overview

Auth.js (NextAuth.js) OAuth authentication with Google and Microsoft providers. Industry-standard, SOC 2 certified authentication replacing deprecated Lucia v4.

## Current Implementation

✅ **Complete**:
- OAuth provider configuration (Google, Microsoft)
- JWT session strategy
- Tenant context extraction utilities
- Type-safe session management

⚠️ **Blocked**:
- Drizzle adapter integration (requires schema updates - see migration 007 TODO)
- TypeScript build (NextAuth v5 beta inference issue with Next.js peer dependencies)

## Known Issues

### 1. TypeScript Inference Error (Blocking Build)

**Error**: `TS2742: The inferred type of 'handlers'/'auth'/'signIn'/'signOut' cannot be named without a reference to Next.js`

**Root Cause**: NextAuth v5 beta has type inference issues with Next.js peer dependencies
**Tracking**: https://github.com/nextauthjs/next-auth/issues/7658
**Resolution**: Will be fixed in NextAuth v5 stable release

**Workaround Options**:
1. Wait for NextAuth v5 stable (recommended for production)
2. Use explicit type annotations (requires importing internal types)
3. Skip type checking for this package (`skipLibCheck: true`)

### 2. Drizzle Adapter Schema Mismatch

**Issue**: Current schema doesn't match Auth.js Drizzle adapter expectations

**Required Changes** (migration 007 - Phase 3):
- `users` table: Add `emailVerified` timestamp and `image` text columns
- `auth_sessions` table: Make `sessionToken` the primary key (currently `id` is PK)
- `accounts` table: Use snake_case column names (refresh_token, access_token, etc.)

**Reference**: https://authjs.dev/reference/adapter/drizzle#postgres

**Workaround**: Currently using JWT strategy instead of database sessions

## Usage (Phase 3)

### OAuth Configuration

```typescript
// Environment variables required:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=common  // or your Azure AD tenant ID
```

### Tenant Context Extraction

```typescript
import { auth, extractTenantFromSession } from '@platform/auth';
import { sql } from '@platform/db';

export async function handler(req: Request) {
  const session = await auth();
  const tenantId = extractTenantFromSession(session);

  if (!tenantId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Set tenant context for RLS policies
  await sql.unsafe(`SET app.current_tenant_id = '${tenantId}'`);

  // All subsequent queries automatically filtered by tenant_id
  const users = await sql`SELECT * FROM users`;
}
```

### Tenant Context Utilities

```typescript
import {
  extractTenantFromSession,
  extractRoleFromSession,
  hasRole,
  isValidTenantId,
  createTenantContextSql,
  clearTenantContextSql,
} from '@platform/auth';

// Extract tenant ID
const tenantId = extractTenantFromSession(session);

// Validate tenant ID format (prevents SQL injection)
if (!tenantId || !isValidTenantId(tenantId)) {
  throw new Error('Invalid tenant ID');
}

// Role-based authorization
const role = extractRoleFromSession(session);
if (!hasRole(session, 'admin')) {
  return new Response('Forbidden', { status: 403 });
}

// Safe SQL statement generation
const setTenantSql = createTenantContextSql(tenantId);
await sql.unsafe(setTenantSql);

// Clear context at end of request
await sql.unsafe(clearTenantContextSql());
```

## OAuth Provider Setup

### Google OAuth 2.0

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
3. Enable Google+ API
4. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### Microsoft OAuth 2.0 (Azure AD)

1. Register app in [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps) (App Registrations)
2. Add redirect URI: `https://your-domain.com/api/auth/callback/microsoft-entra-id`
3. Enable "ID tokens" in Authentication settings
4. Add API permissions: User.Read, email, profile, openid
5. Set environment variables:
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_TENANT_ID` (or use 'common' for multi-tenant)

## Phase 3 TODO

1. **Unblock TypeScript Build**:
   - Wait for NextAuth v5 stable release
   - OR use explicit type annotations
   - OR switch to alternative auth solution

2. **Schema Migration (007)**:
   - Add `emailVerified` and `image` columns to users table
   - Make `sessionToken` primary key in auth_sessions table
   - Rename accounts table columns to snake_case
   - Enable Drizzle adapter

3. **Middleware Implementation**:
   - Create request-scoped middleware to set tenant context
   - Integrate with tRPC context
   - Add session refresh logic
   - Implement logout cleanup

4. **Testing**:
   - OAuth provider integration tests
   - Tenant context extraction tests
   - RLS integration tests with auth middleware
   - Session management tests

## Security Features

- **PKCE Flow**: Enhanced security for OAuth 2.0
- **Secure Cookies**: Enabled in production
- **Session Management**: 30-day expiration with 24-hour refresh
- **Tenant Isolation**: UUID validation prevents SQL injection
- **Role-Based Access**: Owner > Admin > Member hierarchy

## Performance Considerations

- JWT strategy avoids database queries for session validation
- Tenant context set once per request (minimal overhead)
- Session refresh only every 24 hours (reduces DB writes)
- Cookie-based sessions (stateless, scales horizontally)

## References

- [Auth.js Documentation](https://authjs.dev/)
- [Drizzle Adapter](https://authjs.dev/reference/adapter/drizzle)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth Setup](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
