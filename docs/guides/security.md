# Security & Compliance Guide

## 🎯 Security Philosophy

**Zero-Trust Architecture**: Verify everything, trust nothing. Every request authenticated, every query tenant-filtered, every input validated.

**Defense in Depth**: Multiple security layers - network → application → data → code

---

## 🔐 Authentication & Authorization

### Lucia Auth Implementation

```typescript
// packages/auth/src/lucia.ts
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '@platform/database';
import * as schema from '@platform/database/schema';

const adapter = new DrizzlePostgreSQLAdapter(db, schema.luciaSessions, schema.users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: true,
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      tenantId: attributes.tenantId,
      role: attributes.role,
    };
  },
});
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

```typescript
// Multi-tenancy enforcement
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
    'wss://api.platform.com', // LiveKit WebSocket
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

### Pre-Launch
- [ ] All API endpoints require authentication
- [ ] Multi-tenant isolation tested
- [ ] SQL injection testing passed
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Secrets in environment variables
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Dependency vulnerabilities resolved

### Production
- [ ] Regular security audits scheduled
- [ ] Automated dependency scanning
- [ ] Intrusion detection system
- [ ] Log monitoring and alerts
- [ ] Incident response plan
- [ ] Data backup strategy
- [ ] Disaster recovery tested
- [ ] Penetration testing completed

---

**Next**: See `11-OBSERVABILITY.md` for monitoring and debugging.
