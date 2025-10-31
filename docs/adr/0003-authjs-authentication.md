# ADR-0003: Use Auth.js (NextAuth.js) for Authentication

**Status**: Accepted
**Date**: 2025-01-06
**Deciders**: Platform Engineering Team, Security Team
**Related Phases**: [Phase 2 Implementation](../phases/phase-2-security-database-auth.md)

---

## Context

The platform requires enterprise-grade authentication supporting:
- OAuth providers (Google, Microsoft)
- Session management with secure cookies
- Database session storage for horizontal scalability
- Integration with multi-tenant architecture
- SOC 2 compliance requirements

**Problem**: Which authentication framework provides the best balance of security, developer experience, and ecosystem maturity?

**Requirements**:
- OAuth 2.0 / OpenID Connect support
- Database session storage (not JWT-only)
- Drizzle ORM integration
- Active maintenance and security updates
- Strong community and documentation

---

## Decision

Adopt **Auth.js (NextAuth.js v5)** as the authentication framework.

**Rationale**:
- **Industry Standard**: 3.8M weekly downloads, SOC 2 certified
- **Security First**: OAuth PKCE flow, secure cookie handling
- **Database Sessions**: Drizzle adapter for session storage
- **Actively Maintained**: Regular security updates
- **Comprehensive**: Built-in support for 50+ OAuth providers
- **Framework Agnostic**: Works with Fastify, not just Next.js

**Configuration**:
```typescript
// packages/auth/src/lib/auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { ... }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    Microsoft({ ... })
  ],
  session: {
    strategy: "database",  // Not JWT
    maxAge: 30 * 24 * 60 * 60  // 30 days
  },
  callbacks: {
    session: async ({ session, user }) => {
      // Inject tenant_id for RLS
      session.user.tenantId = user.tenantId;
      return session;
    }
  }
});
```

---

## Alternatives Considered

### Alternative 1: Lucia Auth v3
**Description**: Lightweight authentication library for TypeScript.

**Pros**:
- Minimal abstraction over database
- Full control over auth flow
- TypeScript-first design
- Good Drizzle integration

**Cons**:
- ❌ **DEPRECATED**: Lucia v4 cancelled, converted to "learning resource only"
- ❌ No npm package after March 2025
- ❌ Must implement OAuth providers manually
- ❌ No security audit or certifications
- ❌ Small community (1 maintainer)

**Why Rejected**: **Project discontinued**. Cannot use deprecated library for enterprise production system.

---

### Alternative 2: Passport.js
**Description**: Authentication middleware for Node.js with 500+ strategies.

**Pros**:
- Mature (10+ years old)
- Huge ecosystem of strategies
- Framework agnostic
- Well-documented

**Cons**:
- ❌ No built-in session management
- ❌ No database adapter system
- ❌ Requires custom integration code
- ❌ OAuth setup more complex
- ❌ Not TypeScript-first

**Why Rejected**: Lower-level library requiring significant custom code. Auth.js provides better out-of-box experience.

---

### Alternative 3: Custom OAuth Implementation
**Description**: Build OAuth flow using oauth4webapi directly.

**Pros**:
- Full control and flexibility
- No framework dependencies
- Minimal bundle size
- Learn OAuth internals

**Cons**:
- ❌ **SIGNIFICANT SECURITY RISK**: Easy to implement incorrectly
- ❌ Must implement PKCE, state validation, token refresh
- ❌ No SOC 2 certification
- ❌ Months of development time
- ❌ Ongoing maintenance burden

**Why Rejected**: **Unacceptable security risk**. OAuth is complex with many security pitfalls. Use battle-tested library.

---

### Alternative 4: Clerk
**Description**: SaaS authentication service with React components.

**Pros**:
- Fully managed (no server-side code)
- Beautiful UI components
- Built-in user management dashboard
- MFA included

**Cons**:
- ❌ **Vendor lock-in**: Cannot self-host
- ❌ **Cost**: $25/month base + $0.02/MAU (expensive at scale)
- ❌ **Data residency**: User data on Clerk's servers
- ❌ No control over session storage
- ❌ SOC 2 compliance depends on Clerk

**Why Rejected**: Vendor lock-in and cost unacceptable for enterprise platform. Need control over authentication infrastructure.

---

## Consequences

### Positive
- ✅ **SOC 2 Certified**: Meets enterprise compliance requirements
- ✅ **Security Updates**: Active maintenance with regular patches
- ✅ **Database Sessions**: Horizontal scalability with session table
- ✅ **OAuth PKCE**: Industry-standard secure flow
- ✅ **Developer Experience**: 50+ providers with minimal configuration
- ✅ **Drizzle Integration**: Official adapter for session storage
- ✅ **Community Support**: 3.8M weekly downloads, active Discord

### Negative
- ⚠️ **TypeScript Types**: Required explicit type annotations workaround (resolved in Phase 2)
- ⚠️ **Bundle Size**: ~150KB (acceptable for auth)
- ⚠️ **Learning Curve**: Auth.js concepts (adapters, callbacks, providers)

### Neutral
- ℹ️ **Framework Coupling**: Uses Auth.js conventions and patterns
- ℹ️ **Database Schema**: Must use Auth.js adapter schema (3 tables: accounts, sessions, verification_tokens)

---

## Implementation Notes

**Database Schema** (Migration 007):
```sql
-- Auth.js requires these tables
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  -- OAuth tokens...
);

CREATE TABLE auth_sessions (
  session_token VARCHAR(255) PRIMARY KEY,  -- Note: Not 'id'
  user_id UUID REFERENCES users(id),
  expires TIMESTAMP NOT NULL
);

CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

**Middleware Integration**:
```typescript
// packages/api-contract/src/trpc.ts
import { auth } from "@platform/auth";

export const createContext = async ({ req, res }) => {
  const session = await auth(req, res);
  return {
    session,
    tenantId: session?.user?.tenantId,
    db: /* tenant-scoped db */
  };
};
```

**Security Configuration**:
- Secure cookie: `__Secure-authjs.session-token`
- SameSite: Strict
- HttpOnly: true
- Session rotation on each request

---

## References

- [Phase 2 Implementation](../phases/phase-2-security-database-auth.md) - Auth.js setup
- [Auth.js Documentation](https://authjs.dev/)
- [Auth.js Drizzle Adapter](https://authjs.dev/getting-started/adapters/drizzle)
- [OAuth 2.0 PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Migration 007](../../packages/db/migrations/007_authjs_schema.sql) - Auth.js schema

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-06 | Platform Team | Initial decision and implementation |
| 2025-01-10 | Platform Team | Converted to ADR format |
