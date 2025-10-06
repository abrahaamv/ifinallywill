# Security & Compliance Guide

## 🎯 Security Philosophy

**Zero-Trust Architecture**: Verify everything, trust nothing. Every request authenticated, every query tenant-filtered, every input validated.

**Defense in Depth**: Multiple security layers - network → application → data → code

> **🚨 SECURITY CRITICAL**: All critical vulnerabilities MUST be patched within 7-day window
> - **Redis 7.4.2+**: 4 RCE vulnerabilities (CVSS 7.0-8.8)
> - **PostgreSQL 16.7+**: SQL injection actively exploited
> - **Fastify 5.3.2+**: Content-type parsing bypass
> - **Row-Level Security**: MANDATORY for multi-tenant data isolation

---

## 🚨 Critical Security Vulnerabilities

### Redis RCE Vulnerabilities (CRITICAL)

**Affected Versions**: < 7.4.2 (or < 7.2.7)

**CVEs**:
- **CVE-2024-55656** (RedisBloom): CVSS 8.8 - Remote Code Execution
- **CVE-2024-46981** (Lua scripting): CVSS 7.0 - RCE via malicious Lua scripts
- **CVE-2024-51737**, **CVE-2024-51480**: Additional RCE vectors

**Mitigation**:
```bash
# Update Docker Compose to use Redis 7.4.2+
# infrastructure/docker/docker-compose.yml
services:
  redis:
    image: redis:7.4.2-alpine  # MINIMUM 7.4.2 or 7.2.7
```

**Verification**:
```bash
docker run redis:latest redis-server --version
# Should output: Redis server v=7.4.2 or higher
```

### PostgreSQL SQL Injection (CRITICAL)

**Affected Versions**: < 17.3 / < 16.7 / < 15.11 / < 14.16 / < 13.19

**CVE-2025-1094**: SQL injection actively exploited in the wild

**Mitigation**:
```bash
# Update Docker Compose to use PostgreSQL 16.7+
services:
  postgres:
    image: postgres:16.7-alpine  # MINIMUM 16.7 (or 17.3/15.11/14.16/13.19)
```

**Additional Patch** (after database starts):
```bash
psql $DATABASE_URL -f fix-CVE-2024-4317.sql
```

**Verification**:
```bash
psql $DATABASE_URL -c "SELECT version()"
# Should output: PostgreSQL 16.7 or higher
```

### Fastify Content-Type Parsing Bypass

**Affected Versions**: < 5.3.2

**CVE-2025-32442**: Content-type parsing bypass allowing malicious payloads

**Mitigation**:
```json
// packages/api/package.json
{
  "dependencies": {
    "fastify": "5.3.2"  // MINIMUM 5.3.2
  }
}
```

**Verification**:
```bash
cat packages/api/package.json | grep fastify
# Should show: "fastify": "5.3.2" or higher
```

### Security Patching Timeline

**7-Day Patch Window** from project start:
- **Day 1-2**: Identify affected versions
- **Day 3-4**: Update all dependencies and Docker images
- **Day 5**: Run full test suite and validation
- **Day 6**: Deploy to staging and verify
- **Day 7**: Production deployment

**Automated Monitoring**:
```bash
# Weekly dependency audit
pnpm audit

# GitHub Dependabot alerts (automatic)
# Snyk integration for real-time monitoring
```

---

## 🔐 Authentication & Authorization

### Auth.js (NextAuth.js) Implementation

**Why Auth.js**: Lucia v4 deprecated March 2025. Auth.js is SOC 2 certified, 3.8M weekly downloads, industry standard.

```typescript
// packages/auth/src/auth-config.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth-js/drizzle-adapter";
import { db } from "@platform/db";
import { accounts, sessions, users, verificationTokens } from "@platform/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    // Microsoft OAuth can be added for enterprise customers
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Add tenant context to session
      const tenant = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, user.id),
        columns: { tenantId: true, role: true },
      });

      if (tenant) {
        session.user.tenantId = tenant.tenantId;
        session.user.role = tenant.role;
      }

      return session;
    },
  },
});
```

**tRPC Context Integration**:
```typescript
// packages/api/src/context.ts
import { auth } from "@platform/auth";

export async function createContext({ req, res }: FetchCreateContextFnOptions) {
  const session = await auth();

  return {
    session,
    tenantId: session?.user?.tenantId,
    userId: session?.user?.id,
    db,
  };
}
```

### API Key Management

```typescript
// Secure API key generation
import crypto from 'crypto';

export function generateApiKey(): string {
  const prefix = 'pk_live';
  const random = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${random}`;
}

// API key validation middleware
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const hashedKey = await hashApiKey(apiKey);

  const tenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.apiKeyHash, hashedKey),
  });

  return !!tenant;
}
```

---

## 🛡️ OWASP Top 10 Mitigation

### 1. Injection Prevention

```typescript
// ✅ GOOD: Drizzle ORM (parameterized queries)
await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, userInput),
});

// ❌ BAD: Raw SQL with concatenation
await db.execute(sql`SELECT * FROM users WHERE email = '${userInput}'`);
```

### 2. Broken Authentication

```typescript
// Rate limiting on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
});

// Password requirements
const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');
```

### 3. Sensitive Data Exposure

```typescript
// Encrypt sensitive data at rest
import { createCipheriv, createDecipheriv } from 'crypto';

export function encryptField(data: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Never log sensitive data
logger.info('User login', {
  email: maskEmail(user.email), // user@example.com → u***@example.com
  // password: NEVER LOG THIS
});
```

### 4. XML External Entities (XXE)

```typescript
// Not applicable - we don't parse XML
// If needed, use secure parsers with XXE disabled
```

### 5. Broken Access Control

**⚠️ CRITICAL**: Drizzle ORM has NO automatic tenant filtering - catastrophic data leakage risk!

**MANDATORY**: Implement PostgreSQL Row-Level Security (RLS) policies for multi-tenant isolation.

```sql
-- packages/db/migrations/001_enable_rls.sql

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (PostgreSQL superusers)
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE meetings FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE cost_events FORCE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON widgets
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON meetings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Repeat for all tenant-scoped tables...
```

**Tenant Context Middleware** (REQUIRED for all requests):
```typescript
// packages/api/src/middleware/tenant-context.ts
import { db } from "@platform/db";

export async function setTenantContext(tenantId: string) {
  // Set PostgreSQL session variable for RLS policies
  await db.execute(
    sql`SET LOCAL app.current_tenant_id = ${tenantId}`
  );
}

// Apply to all tRPC procedures
export const protectedProcedure = publicProcedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user?.tenantId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // CRITICAL: Set tenant context before ANY database query
    await setTenantContext(ctx.session.user.tenantId);

    return next({
      ctx: {
        ...ctx,
        tenantId: ctx.session.user.tenantId,
      },
    });
  });
```

**Connection Pooling with PgBouncer**:
```ini
# infrastructure/pgbouncer/pgbouncer.ini
[databases]
platform = host=postgres port=5432 dbname=platform

[pgbouncer]
pool_mode = transaction  # CRITICAL: transaction mode for RLS session variables
max_client_conn = 1000
default_pool_size = 50
reserve_pool_size = 25
```

**Alternative: Tenant Wrapper** (if RLS not used):
```typescript
// packages/db/src/tenant-wrapper.ts
export function createTenantContext(tenantId: string) {
  return {
    query: {
      async findMany(table: any, where?: any) {
        return db.query[table].findMany({
          where: (t, { eq, and }) => and(
            eq(t.tenantId, tenantId),
            where ? where(t, { eq, and }) : undefined
          ),
        });
      },
    },
  };
}
```

### 6. Security Misconfiguration

```typescript
// Secure HTTP headers
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.platform.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

### 7. XSS (Cross-Site Scripting)

```typescript
// React auto-escapes by default
<div>{userInput}</div> // Safe

// Dangerous (avoid):
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // UNSAFE!

// If HTML needed, sanitize:
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

### 8. Insecure Deserialization

```typescript
// Validate all inputs with Zod
const userInputSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100),
});

// Parse and validate
const validated = userInputSchema.parse(req.body);
```

### 9. Using Components with Known Vulnerabilities

```bash
# Automated dependency scanning
pnpm audit

# GitHub Dependabot (automatic)
# Snyk integration (recommended)
```

### 10. Insufficient Logging & Monitoring

```typescript
// Structured logging
logger.warn('Failed login attempt', {
  email: maskEmail(email),
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

// Security events
logger.error('Unauthorized access attempt', {
  tenantId,
  resource: 'widgets',
  attemptedAction: 'delete',
});
```

---

## 📜 GDPR Compliance

### Data Subject Rights

```typescript
// Right to Access
export async function exportUserData(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const sessions = await db.query.sessions.findMany({ where: eq(sessions.userId, userId) });
  const messages = await db.query.messages.findMany({
    where: eq(messages.userId, userId),
  });

  return {
    user,
    sessions,
    messages,
    exportedAt: new Date().toISOString(),
  };
}

// Right to Erasure
export async function deleteUserData(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(messages).where(eq(messages.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.update(users)
      .set({
        email: `deleted_${userId}@example.com`,
        passwordHash: 'DELETED',
        deletedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}
```

### Privacy by Design

```typescript
// Data minimization
const userSchema = z.object({
  email: z.string().email(),
  name: z.string(), // Only collect what's needed
  // Don't collect: birthdate, address, phone (unless required)
});

// Purpose limitation
await logDataAccess({
  userId,
  dataType: 'messages',
  purpose: 'support_ticket_review',
  accessedBy: adminId,
});
```

---

## 🔒 Secrets Management

### Environment Variables

```bash
# .env (NEVER commit to git)
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
SESSION_SECRET="$(openssl rand -base64 32)"

# Use environment-specific files
.env.development
.env.staging
.env.production
```

### Secrets Rotation

```typescript
// API key rotation strategy
export async function rotateApiKey(tenantId: string) {
  const newKey = generateApiKey();
  const hashedKey = await hashApiKey(newKey);

  await db.transaction(async (tx) => {
    // Store old key temporarily
    await tx.update(tenants)
      .set({
        apiKeyOld: tenants.apiKey,
        apiKey: hashedKey,
        apiKeyRotatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  });

  return newKey; // Return once, then never show again
}
```

---

## 🔐 Content Security Policy

```typescript
// Strict CSP headers
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    // Only allow specific CDNs
    'https://cdn.platform.com',
  ],
  styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: [
    "'self'",
    'https://api.platform.com',
    'wss://api.platform.com', // WebSocket real-time chat
    'https://livekit.cloud', // LiveKit WebRTC
    'wss://livekit.cloud', // LiveKit WebRTC signaling
  ],
  fontSrc: ["'self'", 'data:'],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"], // Prevent clickjacking
  baseUri: ["'self'"],
  upgradeInsecureRequests: [],
};
```

---

## 📊 Security Monitoring

### Audit Logging

```typescript
// Audit trail
export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Log all sensitive actions
await createAuditLog({
  tenantId,
  userId,
  action: 'widget.delete',
  resource: 'widgets',
  resourceId: widgetId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### Anomaly Detection

```typescript
// Detect unusual patterns
export async function detectAnomalies(tenantId: string) {
  const recentCosts = await getCostEvents(tenantId, last24Hours);

  const avgCost = calculateAverage(recentCosts);
  const stdDev = calculateStdDev(recentCosts);

  // Alert if cost spike > 3 standard deviations
  if (latestCost > avgCost + 3 * stdDev) {
    await sendAlert({
      type: 'cost_anomaly',
      tenantId,
      message: `Unusual cost spike detected: $${latestCost}`,
    });
  }
}
```

---

## ✅ Security Checklist

### Pre-Launch (MANDATORY)
**Critical Vulnerabilities** (7-day patch window):
- [ ] Redis 7.4.2+ deployed (RCE vulnerabilities patched)
- [ ] PostgreSQL 16.7+ deployed (SQL injection patched)
- [ ] Fastify 5.3.2+ installed (content-type bypass patched)
- [ ] All dependency audits passing (pnpm audit)

**Multi-Tenant Security**:
- [ ] PostgreSQL RLS policies enabled on all tenant-scoped tables
- [ ] RLS FORCE applied (even for superusers)
- [ ] Tenant context middleware implemented
- [ ] PgBouncer configured with transaction mode
- [ ] Multi-tenant isolation tested (negative testing)
- [ ] Cross-tenant data leakage tests passed

**Authentication & Authorization**:
- [ ] Auth.js configured with OAuth providers
- [ ] All API endpoints require authentication
- [ ] Session security configured (httpOnly, sameSite, secure)
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented (login, API calls)

**Application Security**:
- [ ] SQL injection testing passed (Drizzle ORM used)
- [ ] XSS prevention verified (React auto-escaping)
- [ ] Input validation with Zod schemas
- [ ] Secrets in environment variables (never hardcoded)
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

### Production (Ongoing)
**Monitoring & Response**:
- [ ] Regular security audits scheduled (quarterly)
- [ ] Automated dependency scanning (weekly pnpm audit)
- [ ] Intrusion detection system active
- [ ] Log monitoring and alerts configured
- [ ] Incident response plan documented
- [ ] Security incident communication plan

**Data Protection**:
- [ ] Data backup strategy tested (daily backups, 30-day retention)
- [ ] Disaster recovery tested (quarterly)
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enforced (TLS 1.3+)
- [ ] GDPR compliance verified (data subject rights)

**Validation & Testing**:
- [ ] Penetration testing completed (annually)
- [ ] Vulnerability scanning automated (CI/CD)
- [ ] Security regression tests in CI pipeline
- [ ] Load testing with security scenarios

---

**Next**: See `11-OBSERVABILITY.md` for monitoring and debugging.
