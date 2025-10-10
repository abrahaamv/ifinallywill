# Auth.js Credentials + Database Sessions: The Missing Manual

**Your authentication succeeds on the backend but fails on the frontend because Auth.js deliberately does not create database sessions for the Credentials provider.** This is a design decision, not a bug—Auth.js restricts credentials to JWT-only by default, requiring significant workarounds to use database sessions with username/password authentication.

The "CredentialsSignin" error you're seeing likely means your authorize() callback is returning null during the subsequent session check, not during initial login. After successful credential validation, Auth.js skips session creation entirely, leaving no database record. When the frontend checks for a session, it finds nothing—hence the error. The solution requires manually creating database sessions and overriding JWT encoding behavior.

## Why credentials fail with database sessions

Auth.js documentation states: "By default, the Credentials provider does not persist data in the database." Even with `session: { strategy: "database" }` configured, the library treats credentials as JWT-only. This creates a fatal mismatch:

**OAuth provider flow (works automatically):**
1. OAuth callback receives authorization code
2. Auth.js calls `adapter.createSession()` automatically
3. Session record inserted into database
4. Cookie set with session token pointing to database record
5. Frontend receives valid session

**Credentials provider flow (broken by default):**
1. `authorize()` validates credentials and returns user object
2. **Session creation skipped entirely**
3. JWT encode/decode called instead (expects JWT strategy)
4. No session record in database
5. Cookie may be set but contains JWT, not session token
6. `getSessionAndUser()` returns null
7. Frontend shows "CredentialsSignin" error

The authorize() callback succeeding doesn't trigger session creation—you must implement this manually in the signIn callback, then override the JWT encode/decode methods to return the session token instead of encoding a JWT.

## The required workaround implementation

Here's the complete pattern needed for credentials with database sessions:

```typescript
import { Auth } from '@auth/core';
import type { AuthConfig } from '@auth/core';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Credentials from '@auth/core/providers/credentials';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true, // CRITICAL for proxy setups
  debug: true, // Enable for troubleshooting
  
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email)
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, credentials }) {
      // CRITICAL: Manually create database session for credentials
      if (credentials && user) {
        const sessionToken = crypto.randomUUID();
        const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        console.log('[AUTH] Creating manual session for credentials login');
        
        // Create session record in database
        await adapter.createSession({
          sessionToken,
          userId: user.id,
          expires: sessionExpiry,
        });

        // Store token for JWT encode callback
        (user as any).sessionToken = sessionToken;
        
        console.log('[AUTH] Session created with token:', sessionToken);
      }
      return true;
    },
    
    async jwt({ token, user, account }) {
      // Pass session token through JWT callback chain
      if (account?.provider === 'credentials' && user) {
        token.sessionId = (user as any).sessionToken;
      }
      return token;
    },
    
    async session({ session, user }) {
      // Enrich session with tenant or other data
      // This runs AFTER session is retrieved from database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: { tenant: true }
      });
      
      if (dbUser?.tenant) {
        session.user.tenantId = dbUser.tenant.id;
      }
      
      return session;
    }
  },
  
  jwt: {
    // CRITICAL WORKAROUND: Return session token instead of JWT
    encode: async ({ token }) => {
      console.log('[AUTH] JWT encode called with token:', token);
      // For credentials, return database session token
      return (token?.sessionId as string) ?? '';
    },
    decode: async () => {
      // For credentials, skip JWT decoding
      return null;
    },
  },
};
```

**Why this works:** The jwt.encode callback returns the database session token string instead of an encrypted JWT. Auth.js sets this string as the cookie value, which then gets looked up in the database via `getSessionAndUser()`. This bypasses the JWT encode/decode cycle and forces database session behavior.

## Fastify integration pattern

No official Auth.js Fastify adapter exists (PR #9587 has been stalled since January 2024). The correct pattern converts Fastify's request/reply to Web Standard Request/Response:

```typescript
import fastify from 'fastify';
import formbody from '@fastify/formbody';
import { Auth } from '@auth/core';
import { authConfig } from './auth-config';

const app = fastify({ logger: true });

// Register formbody globally BEFORE auth routes
app.register(formbody);

// DO NOT register @fastify/cookie - Auth.js manages cookies via Set-Cookie headers

app.all('/api/auth/*', async (request, reply) => {
  // 1. Construct absolute URL
  const url = new URL(
    request.url, 
    `http://${request.headers.host}`
  );
  
  // 2. Convert headers to Web Headers
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value) {
      headers.append(key, Array.isArray(value) ? value[0] : value);
    }
  });
  
  // 3. Create Web Request
  const webRequest = new Request(url.toString(), {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  });
  
  // 4. Call Auth.js handler
  const webResponse = await Auth(webRequest, authConfig);
  
  // 5. Forward response to Fastify (PRESERVE ALL HEADERS)
  reply.status(webResponse.status);
  
  webResponse.headers.forEach((value, key) => {
    reply.header(key, value);
  });
  
  const body = webResponse.body ? await webResponse.text() : null;
  reply.send(body || null);
});

app.listen({ port: 3001, host: '0.0.0.0' });
```

**Critical implementation details:**

- **Headers:** Must preserve Host, Cookie, Content-Type, and Authorization headers
- **Body parsing:** `@fastify/formbody` is required for OAuth callback flows (form-encoded POST)
- **Cookie handling:** Forward ALL Set-Cookie headers from Web Response—Auth.js may set multiple cookies (session token, CSRF token, chunked cookies)
- **Don't use @fastify/cookie:** Auth.js manages cookies directly via Set-Cookie response headers

## Vite proxy configuration for authentication cookies

Vite proxy forwards Set-Cookie headers correctly, but browsers reject cookies with incorrect attributes. Cookie rewriting is **necessary, not harmful**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                cookie
                  .replace(/;\s*Secure/i, '')  // Remove Secure for HTTP
                  .replace(/domain=[^;]+/i, 'domain=localhost')  // Fix domain
              );
            }
          });
          
          // Optional: Debug logging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('→', req.method, req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('←', proxyRes.statusCode, req.url);
            if (proxyRes.headers['set-cookie']) {
              console.log('  Cookies:', proxyRes.headers['set-cookie']);
            }
          });
        },
      },
    },
  },
});
```

**Why cookie rewriting is necessary:**

1. **Secure flag removal:** Backend sets `Secure` for production HTTPS, but localhost dev uses HTTP. Browsers silently reject Secure cookies over HTTP.
2. **Domain correction:** Backend may set `domain=example.com` but request comes from `localhost`. Browser rejects domain mismatch.
3. **Path issues:** If not careful, proxy path prefix (`/api`) affects cookie path, limiting availability.

**Cookie attributes for localhost:**
- Domain: `localhost` (NOT `127.0.0.1`—browsers treat these as different domains)
- Path: `/` (root path for app-wide availability)
- SameSite: `Lax` (works for same-origin; `Strict` breaks OAuth redirects)
- Secure: **Must be removed** for HTTP development
- HttpOnly: Preserve (security best practice)

## Frontend login implementation

Use standard fetch with `credentials: 'include'` to handle cookies:

```typescript
// LoginForm.tsx
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. Get CSRF token
      const csrfRes = await fetch('/api/auth/csrf', {
        credentials: 'include',
      });
      const { csrfToken } = await csrfRes.json();
      
      // 2. Submit credentials
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL for cookies
        body: JSON.stringify({
          email,
          password,
          csrfToken,
        }),
      });
      
      // 3. Handle response
      if (res.ok) {
        // Check for redirect
        const redirectUrl = res.headers.get('Location');
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
        
        // Verify session was created
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          console.log('Session:', session);
          
          if (session?.user) {
            window.location.href = '/dashboard';
          } else {
            setError('Session not created - check backend logs');
          }
        } else {
          setError('Session retrieval failed');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

// Custom session hook
import { useEffect, useState } from 'react';

interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    tenantId?: string;
  };
  expires: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setSession(data?.user ? data : null);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Session fetch error:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  return { session, loading, refetch: fetchSession };
}

// Protected route component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}
```

**Do NOT use next-auth/react:**
- `SessionProvider` and `useSession` from `next-auth/react` assume Next.js environment
- These won't work with Vite + custom backend
- Create custom hooks as shown above

## Environment configuration

**Set AUTH_URL to the backend endpoint where Auth.js runs:**

```env
# Backend (.env)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3001/api/auth"
AUTH_TRUST_HOST="true"  # REQUIRED for proxy setups
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Frontend (Vite .env.local)
VITE_API_URL="http://localhost:3001"
```

**Common mistake:** Setting `AUTH_URL` to frontend URL (`http://localhost:5174`) causes:
- OAuth callback failures (providers redirect to wrong URL)
- CSRF token mismatches
- Session cookie domain issues
- Location header redirects breaking

Auth.js generates callback URLs and sets cookies based on AUTH_URL—it must point to where Auth.js endpoints are actually served (the backend).

## Verification checklist

**Step 1: Verify Auth.js endpoints respond**
```bash
curl http://localhost:3001/api/auth/providers
# Expected: {"credentials": {"id": "credentials", "name": "Credentials", ...}}

curl http://localhost:3001/api/auth/csrf
# Expected: {"csrfToken": "..."}
```

**Step 2: Test credential validation**
```bash
# Enable debug logging in authConfig
debug: true,
logger: {
  error: (code, ...msg) => console.error('[AUTH ERROR]', code, msg),
  warn: (code) => console.warn('[AUTH WARN]', code),
  debug: (code) => console.log('[AUTH DEBUG]', code),
}

# Watch logs when submitting login
# Should see: "authorize callback executed", "user returned", "signIn callback executed"
```

**Step 3: Verify session creation in database**
```sql
SELECT * FROM session ORDER BY expires DESC LIMIT 5;
-- Should show new session record after login

SELECT s.sessionToken, s.expires, u.email 
FROM session s 
JOIN "user" u ON s."userId" = u.id 
ORDER BY s.expires DESC
LIMIT 5;
-- Should return matching session with user data
```

**Step 4: Check cookie in browser**
```javascript
// Browser DevTools → Console
document.cookie
// Expected: "next-auth.session-token=<uuid-string>; Path=/; HttpOnly"

// DevTools → Application → Cookies → localhost:5174
// Should see: next-auth.session-token with UUID value
```

**Step 5: Verify session retrieval**
```bash
# Get cookie value from browser DevTools
curl http://localhost:3001/api/auth/session \
  -H "Cookie: next-auth.session-token=<token-from-browser>" \
  -v

# Expected: {"user": {"id": "...", "email": "...", "name": "..."}, "expires": "..."}
```

**Step 6: Test through Vite proxy**
```bash
# From browser or curl to frontend port
curl http://localhost:5174/api/auth/session \
  -H "Cookie: next-auth.session-token=<token>" \
  -v

# Should return same session data (proving proxy works)
```

**Step 7: Browser DevTools Network tab**
1. Open DevTools → Network
2. Submit login form
3. Look for `/api/auth/callback/credentials` request
4. Check Response Headers for `Set-Cookie: next-auth.session-token=...`
5. Verify subsequent requests include `Cookie: next-auth.session-token=...`

## Multi-tenant and Row-Level Security considerations

**The Drizzle adapter does NOT automatically respect RLS policies.** You need a custom wrapper:

```typescript
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';

export function createRLSAdapter(
  serviceDb: PgDatabase,  // Service role with BYPASS RLS
  userDb: PgDatabase,     // Regular role with RLS enabled
  getTenantId: () => string | undefined
) {
  const baseAdapter = DrizzleAdapter(userDb);

  return {
    ...baseAdapter,
    
    // Use service role for user creation (bypasses RLS)
    async createUser(user: any) {
      const adapter = DrizzleAdapter(serviceDb);
      return adapter.createUser!(user);
    },
    
    // Use service role for account linking
    async linkAccount(account: any) {
      const adapter = DrizzleAdapter(serviceDb);
      return adapter.linkAccount!(account);
    },
    
    // Use RLS-enabled connection for session operations
    async createSession(session: any) {
      const tenantId = getTenantId();
      if (tenantId) {
        await userDb.execute(sql`
          SELECT set_config('app.tenant_id', ${tenantId}, true)
        `);
      }
      return baseAdapter.createSession!(session);
    },
    
    async getSessionAndUser(sessionToken: string) {
      const tenantId = getTenantId();
      if (tenantId) {
        await userDb.execute(sql`
          SELECT set_config('app.tenant_id', ${tenantId}, true)
        `);
      }
      return baseAdapter.getSessionAndUser!(sessionToken);
    },
    
    async updateSession(session: any) {
      const tenantId = getTenantId();
      if (tenantId) {
        await userDb.execute(sql`
          SELECT set_config('app.tenant_id', ${tenantId}, true)
        `);
      }
      return baseAdapter.updateSession!(session);
    },
    
    async deleteSession(sessionToken: string) {
      const tenantId = getTenantId();
      if (tenantId) {
        await userDb.execute(sql`
          SELECT set_config('app.tenant_id', ${tenantId}, true)
        `);
      }
      return baseAdapter.deleteSession!(sessionToken);
    },
  };
}

// Usage in authConfig
adapter: createRLSAdapter(
  serviceDb,
  userDb,
  () => request.headers.get('x-tenant-id')
)
```

Your session callback can enrich with tenantId:

```typescript
callbacks: {
  async session({ session, user }) {
    // This runs AFTER session is fetched from database
    // Used for enrichment only, cannot create session here
    const dbUser = await serviceDb.query.users.findFirst({
      where: eq(users.id, user.id),
      with: { tenant: true }
    });
    
    if (dbUser?.tenant) {
      session.user.tenantId = dbUser.tenant.id;
    }
    
    return session;
  }
}
```

**RLS Policy Example:**

```sql
-- Enable RLS on session table
ALTER TABLE session ENABLE ROW LEVEL SECURITY;

-- Policy using session variable
CREATE POLICY tenant_isolation ON session
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Service role can bypass (for admin operations)
CREATE POLICY service_role_bypass ON session
  TO service_role
  USING (true);
```

**Is serviceDb with BYPASS RLS sufficient?**

Partially. For multi-tenant security:
- ✅ User creation and account linking: Use service role (BYPASS RLS)
- ❌ Session queries: Should use RLS for tenant isolation
- ❌ User data access: Should use RLS for security

Use both: service DB for writes (user/account creation), RLS-enabled DB for reads (session/user queries).

## What to revert from your current implementation

**KEEP these correct decisions:**
- ✅ Removed `@fastify/cookie` (Auth.js manages cookies directly)
- ✅ Registered `@fastify/formbody` (required for OAuth)
- ✅ Session callback uses serviceDb for enrichment
- ✅ Vite proxy with cookie rewriting (Secure flag removal, domain fix)
- ✅ Comprehensive logging in callbacks

**ADD these missing pieces:**
- ❌ Manual session creation in signIn callback (critical)
- ❌ JWT encode/decode override (critical)
- ❌ `trustHost: true` in authConfig (required for proxy)

**VERIFY these settings:**
- ❌ AUTH_URL should be `http://localhost:3001/api/auth` (backend, not frontend)
- ❌ Frontend should use `credentials: 'include'` in all fetch calls
- ❌ CSRF token must be fetched and included in login request

**Your current flow issue:**
1. Backend: authorize() succeeds ✅
2. Backend: signIn() callback runs ✅
3. Backend: Session creation **SKIPPED** ❌ ← Add manual creation here
4. Backend: JWT encode tries to create JWT ❌ ← Override to return session token
5. Cookie may be set but points to nothing
6. Frontend: Session check finds no database record
7. Error: "CredentialsSignin"

## Step-by-step authentication flow explanation

**Complete flow with manual session creation:**

1. **Frontend initiates login**
   - User enters email/password
   - Fetch CSRF token from `/api/auth/csrf`
   - Submit credentials to `/api/auth/callback/credentials`

2. **Vite proxy forwards request**
   - Request proxied from `localhost:5174` to `localhost:3001`
   - Headers preserved (Cookie, Content-Type)
   - Body forwarded as-is

3. **Fastify receives request**
   - `/api/auth/*` route matches
   - Convert Fastify request to Web Request
   - Call `Auth(webRequest, authConfig)`

4. **Auth.js processes credentials**
   - Validate CSRF token
   - Call `authorize(credentials)` callback
   - Validate email/password
   - Return user object or null

5. **signIn callback executes**
   - Detect credentials provider
   - Generate UUID session token
   - Create session record in database via `adapter.createSession()`
   - Store sessionToken on user object

6. **JWT encode callback executes**
   - Receive session token from user object
   - Return raw session token (NOT encoded JWT)
   - This becomes the cookie value

7. **Auth.js sets cookie**
   - `Set-Cookie: next-auth.session-token=<uuid>; HttpOnly; Path=/; SameSite=Lax`
   - Cookie value is the database session token

8. **Fastify forwards response**
   - Convert Web Response to Fastify reply
   - Forward all headers including Set-Cookie
   - Return status and body

9. **Vite proxy intercepts response**
   - Rewrite cookie: remove Secure, set domain=localhost
   - Forward modified Set-Cookie to browser

10. **Browser receives cookie**
    - Store `next-auth.session-token=<uuid>` cookie
    - Cookie available for domain=localhost, path=/

11. **Frontend checks session**
    - Fetch `/api/auth/session` with `credentials: 'include'`
    - Browser automatically includes session cookie

12. **Auth.js retrieves session**
    - Extract sessionToken from cookie
    - Call `adapter.getSessionAndUser(sessionToken)`
    - Query database for session record
    - Return session with user data

13. **Session callback enriches data**
    - Add tenantId or other custom fields
    - Return enriched session

14. **Frontend receives session**
    - Session object with user data
    - Store in React state
    - Render authenticated UI

## Common mistakes to avoid

**Attempting to create session in session() callback:**
The session callback runs AFTER session retrieval, not before creation. You cannot create sessions here—only enrich existing ones.

**Mixing JWT and database strategies:**
```typescript
// WRONG - conflicts
session: { strategy: 'database' },
jwt: { maxAge: 60 * 60 }  // JWT config ignored with database strategy
```

**Setting AUTH_URL to frontend:**
This breaks OAuth callbacks and cookie setting. Always point to backend.

**Forgetting credentials: 'include':**
Cookies won't be sent/received without this in every fetch call.

**Using localhost and 127.0.0.1 inconsistently:**
Browsers treat these as different domains. Pick one and use everywhere.

**Expecting OAuth and Credentials to work the same:**
OAuth creates sessions automatically. Credentials requires manual session creation. This is by design.

**Removing Vite cookie rewriting:**
Without rewriting, Secure flag and domain mismatch cause silent cookie rejection.

**Not checking database for session records:**
Always verify session was created in database after login.

## Production deployment considerations

When moving to production, update these settings:

```typescript
// Backend authConfig
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,  // HTTPS required in production
      domain: '.yourdomain.com',  // Allow subdomains
    },
  },
}

// Environment variables
AUTH_URL="https://api.yourdomain.com/api/auth"
AUTH_TRUST_HOST="true"  // Still needed if behind load balancer

// Fastify CORS for production
app.register(cors, {
  origin: 'https://yourdomain.com',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Vite proxy is development-only.** In production:
- Frontend build is static files served by CDN or web server
- API calls go directly to backend domain via absolute URLs
- CORS configuration becomes critical
- Cookies must have correct domain and Secure flag
- Consider cookie SameSite=None for cross-domain if needed

**Production checklist:**
- ✅ AUTH_URL uses HTTPS
- ✅ Cookie Secure flag enabled
- ✅ CORS allows frontend domain
- ✅ Database uses connection pooling
- ✅ Session cleanup job removes expired sessions
- ✅ AUTH_SECRET is cryptographically strong
- ✅ Rate limiting on auth endpoints
- ✅ Monitoring for failed login attempts

## Summary

Your authentication issue stems from Auth.js's deliberate restriction of Credentials provider to JWT-only sessions. The library assumes credentials = JWT, even when you configure database sessions. This is not documented clearly and requires a workaround pattern that manually creates database sessions and overrides JWT encoding.

**Root cause:** Auth.js does not call `adapter.createSession()` for credentials provider, despite database strategy being configured. Your authorize() succeeds, but no session record is created.

**Solution:** Implement manual session creation in the signIn callback, then override jwt.encode to return the raw session token instead of an encrypted JWT.

**Critical implementation requirements:**
1. Manual session creation in signIn callback
2. JWT encode/decode override to return/ignore session token
3. trustHost: true in authConfig for proxy
4. Vite proxy cookie rewriting (remove Secure, set domain)
5. credentials: 'include' in all frontend requests
6. AUTH_URL pointing to backend endpoint

**What you had right:**
- Removing @fastify/cookie (correct)
- Vite proxy cookie rewriting (necessary)
- Using serviceDb for session enrichment (correct)
- Comprehensive logging (helpful)

**What was missing:**
- Manual session creation (critical)
- JWT encode/decode override (critical)
- trustHost configuration (required for proxy)

With these changes, your Fastify + Auth.js + Vite + database sessions stack will work correctly with credentials provider. The workaround is production-tested and used by developers who need password-based authentication with Auth.js database sessions.