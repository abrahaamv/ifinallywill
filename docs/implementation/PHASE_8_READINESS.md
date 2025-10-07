# PHASE 8 READINESS - Production Security Hardening

**Status**: READY TO START
**Timeline**: 21 days (3 weeks)
**Priority**: CRITICAL - BLOCKS PRODUCTION DEPLOYMENT

---

## Executive Summary

Phase 8 implements **production-grade security** to resolve 3 critical blockers and 12 high-priority security gaps identified during post-Phase 7 authentication testing. This phase is **mandatory before production deployment** to prevent data leaks, meet enterprise security standards, and achieve SOC 2 Type II compliance.

**Critical Blockers**:
1. **Auth.js + Fastify Integration** - 500 errors on credential login (missing `@fastify/formbody`)
2. **Multi-Tenant Data Leakage** - Drizzle ORM has ZERO automatic tenant filtering
3. **Security Standards Violations** - 30-day sessions, bcrypt cost 10, no MFA

**Deliverables**:
- ✅ Auth.js integration working with credentials + OAuth
- ✅ PostgreSQL Row-Level Security with FORCE policies
- ✅ Argon2id password hashing (or bcrypt 12+)
- ✅ 8-hour session limit + 30-minute inactivity timeout
- ✅ MFA support (TOTP authenticator apps)
- ✅ Redis-backed rate limiting (5 login attempts per 15 min)
- ✅ GDPR compliance (data export/deletion)
- ✅ SOC 2 Type II gap analysis complete
- ✅ Security testing (SAST/DAST/penetration test)

---

## Background: Security Research Findings

**Research Document**: `docs/research/10-07-2025/research-10-07-2025.md` (1,490 lines)

Post-Phase 7 authentication testing revealed critical security vulnerabilities that **block production deployment**. The comprehensive security research provides:

- Complete Auth.js + Fastify integration code
- PostgreSQL RLS implementation with transaction-based context
- Argon2id password upgrade path with bcrypt migration
- NIST-compliant session management (8 hours + 30min inactivity)
- Redis rate limiting configuration
- GDPR data export/deletion implementation
- SOC 2 Type II requirements and timeline
- 21-day implementation plan with daily tasks

**Reference this document** for all implementation details, code examples, and security best practices.

---

## Week 1: Critical Authentication & Multi-Tenant Security (Days 1-7)

### Day 1-2: Fix Auth.js + Fastify Integration

**Current Issue**: 500 errors on `/api/auth/callback/credentials` - Fastify refuses to parse `application/x-www-form-urlencoded` bodies.

**Solution**: Install `@fastify/formbody` before Auth.js routes and use `@auth/core` directly.

**Implementation Checklist**:

- [ ] Install dependencies
  ```bash
  pnpm add @fastify/formbody @auth/core
  ```

- [ ] Create Auth.js handler (`packages/api/src/auth-handler.ts`)
  - Use `@auth/core` Auth() function
  - Convert Fastify Request → Web API Request
  - Parse form data correctly
  - Handle redirects to frontend (not API server)

- [ ] Update Fastify server (`packages/api/src/server.ts`)
  - Register `@fastify/formbody` BEFORE Auth.js routes
  - Add CORS configuration with credentials: true
  - Register `/api/auth/*` route handler
  - Configure cookie domain (`.yourdomain.com`)

- [ ] Configure Auth.js (`packages/auth/src/config.ts`)
  - Add Credentials provider with bcrypt verification
  - Set `trustHost: true` (with validation)
  - Configure `pages.signIn` to frontend URL (port 5174)
  - Add JWT/session callbacks for user data

- [ ] Test authentication flow
  - Manual: Login with email/password → Should succeed
  - Manual: Check cookie set correctly (HttpOnly, Secure)
  - Manual: Session endpoint returns user data
  - Manual: OAuth Google login → Should work

**Reference**: Section 1 (lines 20-191) in research document

---

### Day 3-4: Implement PostgreSQL Row-Level Security

**Current Issue**: Drizzle ORM provides **ZERO** automatic tenant filtering - catastrophic data leakage risk.

**Solution**: PostgreSQL RLS with `FORCE ROW LEVEL SECURITY` + transaction-based tenant context.

**Implementation Checklist**:

- [ ] Create non-superuser app role
  ```sql
  CREATE ROLE app_user LOGIN PASSWORD 'secure_password';
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
  ```

- [ ] Enable RLS on all tenant tables
  ```sql
  -- For each table: users, sessions, messages, knowledge_chunks, etc.
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
  ```

- [ ] Create tenant isolation policies
  ```sql
  CREATE POLICY tenant_isolation ON table_name
    FOR ALL TO app_user
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);
  ```

- [ ] Add tenant_id indexes (performance critical)
  ```sql
  CREATE INDEX idx_table_name_tenant_id ON table_name(tenant_id);
  ```

- [ ] Create tenant context manager (`packages/db/src/tenant-context.ts`)
  - Implement `withTenant<T>()` transaction wrapper
  - Use `SET LOCAL app.current_tenant_id` for scoped context
  - Ensure automatic cleanup on transaction end

- [ ] Update database client (`packages/db/src/client.ts`)
  - Change connection user from owner → `app_user`
  - Add environment variable for app role credentials

- [ ] Create automated isolation tests (`packages/db/src/__tests__/tenant-isolation.test.ts`)
  - Test: Tenant A cannot read Tenant B data (MUST return 0 rows)
  - Test: INSERT with wrong tenant_id fails (RLS blocks)
  - Test: Admin access requires explicit audit logging
  - Run: `pnpm test` to verify isolation

**Reference**: Section 2 (lines 193-326) in research document

---

### Day 5-6: Upgrade Password Security (Argon2id)

**Current Issue**: Bcrypt cost 10 = 3,300 hashes/sec (TOO FAST for 2025 standards).

**Solution**: Upgrade to Argon2id (OWASP 2025 recommendation) with migration path.

**Implementation Checklist**:

- [ ] Install Argon2id
  ```bash
  pnpm add argon2
  ```

- [ ] Create password service (`packages/auth/src/services/password.service.ts`)
  - Implement `hashPassword()` with Argon2id (19MB memory, timeCost 2)
  - Implement `verifyAndUpgrade()` for bcrypt→Argon2id migration
  - Detect algorithm from hash prefix ($2 = bcrypt, $argon2id = Argon2id)

- [ ] Add passwordAlgorithm column to users table
  ```sql
  ALTER TABLE users ADD COLUMN password_algorithm VARCHAR(20) DEFAULT 'bcrypt';
  ```

- [ ] Update auth credential provider
  - Call `passwordService.verifyAndUpgrade()` on login
  - Automatically upgrade bcrypt hashes to Argon2id
  - Update password_algorithm field after upgrade

- [ ] Create password validator (`packages/auth/src/services/password-validation.service.ts`)
  - Length check: 8-64 characters (NIST guideline)
  - Strength check: zxcvbn score ≥2
  - Breach check: HaveIBeenPwned API integration
  - NO composition rules (NIST prohibits mandatory complexity)

- [ ] Test password security
  - Unit test: Argon2id hashing takes ≥100ms (security threshold)
  - Unit test: Bcrypt hashes auto-upgrade on login
  - Manual: Submit breached password → Should reject
  - Manual: Password hint feature disabled (NIST prohibited)

**Reference**: Section 3 (lines 328-488) in research document

---

### Day 7: Session Management & MFA Setup

**Current Issue**: 30-day session duration violates NIST enterprise standards (8 hours max).

**Solution**: Implement NIST AAL2 session limits + TOTP MFA.

**Implementation Checklist**:

**Session Timeouts**:
- [ ] Update Auth.js configuration
  - Set `session.maxAge = 8 * 60 * 60` (8 hours absolute)
  - Set `session.updateAge = 60 * 60` (refresh every hour)
  - Add JWT callback for session validation

- [ ] Create session timeout middleware (`packages/api/src/middleware/session-timeout.ts`)
  - Track lastActivity timestamp in session
  - Enforce 30-minute inactivity timeout
  - Return 401 with reason (absolute_timeout vs inactivity_timeout)

- [ ] Add frontend session monitoring
  - Detect session expiration from 401 responses
  - Auto-redirect to login with expiration reason
  - Show countdown timer before timeout

**Multi-Factor Authentication (MFA)**:
- [ ] Install TOTP library
  ```bash
  pnpm add otplib qrcode
  ```

- [ ] Add MFA fields to users table
  ```sql
  ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN mfa_secret TEXT;
  ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT[];
  ```

- [ ] Create MFA service (`packages/auth/src/services/mfa.service.ts`)
  - Generate TOTP secret
  - Generate QR code for authenticator apps
  - Verify TOTP codes (6-digit)
  - Generate/verify backup codes (8 codes, single-use)

- [ ] Update authentication flow
  - After password validation, check `mfa_enabled`
  - If MFA required, prompt for TOTP code
  - Verify code before creating session
  - Allow backup code fallback

- [ ] Create MFA setup UI components
  - QR code display for initial setup
  - Backup codes generation and download
  - MFA enforcement toggle in settings

**Testing**:
- [ ] Test session expiration (8 hours absolute)
- [ ] Test inactivity timeout (30 minutes)
- [ ] Test MFA enrollment flow (QR code → verify)
- [ ] Test MFA login flow (password + TOTP)
- [ ] Test backup codes (single-use validation)

**Reference**: Section 3 (lines 328-488) in research document

---

## Week 2: API Security & Data Protection (Days 8-14)

### Day 8-9: Redis Rate Limiting

**Implementation Checklist**:

- [ ] Install rate limiting library
  ```bash
  pnpm add @fastify/rate-limit ioredis
  ```

- [ ] Configure Redis connection (`packages/api/src/config/redis.ts`)
  - Connect to existing Redis instance (port 6379)
  - Add connection pooling
  - Handle reconnection logic

- [ ] Register rate limiting plugin (`packages/api/src/config/rate-limit.config.ts`)
  - Global: 100 requests/minute per IP
  - Login: 5 attempts/15 minutes per username+IP
  - AI chat: Tier-based (enterprise: 300/hour, pro: 60/hour, free: 10/hour)
  - API endpoints: 60 requests/minute per API key

- [ ] Add rate limit headers
  - X-RateLimit-Limit: Maximum requests allowed
  - X-RateLimit-Remaining: Remaining requests
  - X-RateLimit-Reset: Time until reset (Unix timestamp)
  - Retry-After: Seconds until retry allowed (429 responses)

- [ ] Test rate limiting
  - Unit test: 6th login attempt within 15 min → 429 error
  - Integration test: Tier-based limits enforced correctly
  - Load test: Rate limiter handles 1000 req/sec

**Reference**: Section 4 (lines 490-547) in research document

---

### Day 10-11: API Key Authentication for Widgets

**Implementation Checklist**:

- [ ] Create API keys table
  ```sql
  CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- First 14 chars for display
    type TEXT NOT NULL CHECK (type IN ('publishable', 'secret')),
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
  );
  CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
  CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
  ```

- [ ] Create API key service (`packages/api/src/services/api-key.service.ts`)
  - Generate keys: `pk_live_*` (publishable), `sk_live_*` (secret)
  - Hash keys with HMAC-SHA256 before storing
  - Validate keys by comparing hashes
  - Check expiration and revocation status

- [ ] Add API key middleware (`packages/api/src/middleware/api-key-auth.ts`)
  - Extract key from Authorization header or X-Api-Key
  - Validate and load user context
  - Enforce permissions (read, write, admin)
  - Track last_used_at timestamp

- [ ] Create widget domain whitelist
  ```sql
  CREATE TABLE widget_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_widget_domains_user_id ON widget_domains(user_id);
  ```

- [ ] Validate widget requests by Origin header
  - Match origin against whitelist (exact + wildcard)
  - Reject requests from non-whitelisted domains
  - Log validation failures for security monitoring

**Reference**: Section 4 (lines 549-596) in research document

---

### Day 12-13: Input Validation & XSS Prevention

**Implementation Checklist**:

- [ ] Install validation libraries
  ```bash
  pnpm add zod isomorphic-dompurify
  ```

- [ ] Create validation schemas (`packages/api-contract/src/schemas/`)
  - User profile: name (max 100), bio (max 500), email
  - File upload: filename validation, MIME type, size limits
  - Message content: XSS sanitization, length limits

- [ ] Create sanitization service (`packages/shared/src/services/sanitization.service.ts`)
  - Strict mode: Only <p>, <br>, <strong>, <em> tags
  - Medium mode: Add <a>, <ul>, <ol>, <li> with href validation
  - Strip all JavaScript event handlers
  - Remove dangerous attributes (onclick, onerror, etc.)

- [ ] Implement file upload security (`packages/api/src/services/file-upload.service.ts`)
  - Validate file extension against allowlist
  - Validate MIME type (Content-Type header)
  - Validate magic bytes (first 4-8 bytes of file)
  - Generate random filenames (prevent path traversal)
  - Set restrictive file permissions (0o444 read-only)

- [ ] Add XSS protection headers
  - Content-Security-Policy: strict directives
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN

**Reference**: Section 8 (lines 930-1043) in research document

---

### Day 14: Encryption & Secrets Management

**Implementation Checklist**:

- [ ] Setup AWS Secrets Manager (or alternative)
  - Store: Database passwords, API keys, JWT secrets
  - Implement 5-minute caching to reduce API calls
  - Add automatic rotation for database credentials

- [ ] Create secrets service (`packages/api/src/services/secrets.service.ts`)
  - Fetch secrets from AWS Secrets Manager
  - Cache with TTL (5 minutes default)
  - Handle failures gracefully (use cached values)

- [ ] Implement field-level encryption (`packages/db/src/services/tenant-encryption.service.ts`)
  - Use AWS KMS for key management
  - AES-256-GCM encryption for PII fields
  - Tenant-specific encryption keys
  - Include IV and auth tag in ciphertext

- [ ] Encrypt sensitive database fields
  - SSN, credit card numbers (if applicable)
  - API keys, OAuth tokens
  - Personal health information

- [ ] Update .env.example with Secrets Manager configuration
  - Document AWS region, KMS key ID
  - Add fallback for local development

**Reference**: Section 5 (lines 625-716) in research document

---

## Week 3: Compliance, Testing & Deployment (Days 15-21)

### Day 15-16: GDPR Compliance Implementation

**Implementation Checklist**:

- [ ] Create GDPR service (`packages/api/src/services/gdpr-compliance.service.ts`)
  - Data export: JSON export of all user data
  - Data deletion: Anonymize instead of hard delete (legal holds)
  - Consent management: Track consent types and timestamps

- [ ] Add GDPR tables
  ```sql
  CREATE TABLE legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ
  );

  CREATE TABLE deletion_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    deleted_by UUID REFERENCES users(id),
    reason TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

- [ ] Implement data export endpoint
  - Export: user, profile, messages, sessions, activity logs
  - Format: JSON with human-readable structure
  - Delivery: Download link with 7-day expiration

- [ ] Implement data deletion endpoint
  - Check for legal holds before deletion
  - Anonymize: Replace email with `deleted_<id>@anonymized.invalid`
  - Log deletion in deletion_records table
  - Cascade: Delete or anonymize related records

- [ ] Create privacy policy page
  - Document data collection practices
  - Explain data retention periods
  - Provide contact for privacy requests

- [ ] Test GDPR workflows
  - Export user data → Verify complete
  - Delete user with legal hold → Should reject
  - Delete user without hold → Should anonymize

**Reference**: Section 11 (lines 1207-1248) in research document

---

### Day 17-18: Security Testing (SAST, DAST, Penetration Test)

**Implementation Checklist**:

- [ ] Setup SAST (Static Application Security Testing)
  - Install Semgrep: `npm install -g @semgrep/cli`
  - Run security audit: `semgrep --config p/security-audit`
  - Fix critical/high findings (CVSS 7.0+)
  - Add to CI/CD pipeline

- [ ] Setup DAST (Dynamic Application Security Testing)
  - Install OWASP ZAP or Burp Suite Community
  - Configure authenticated scanning (valid session)
  - Scan all API endpoints for vulnerabilities
  - Test: SQL injection, XSS, CSRF, authentication bypass

- [ ] Run dependency security audit
  - Run: `pnpm audit --audit-level=high`
  - Run: `npx snyk test` (requires account)
  - Update vulnerable dependencies
  - Document accepted risks (with justification)

- [ ] Conduct penetration testing
  - Hire external security firm (recommended) OR
  - Conduct internal testing with checklist:
    - [ ] Authentication bypass attempts
    - [ ] Authorization boundary testing (tenant isolation)
    - [ ] Session hijacking attempts
    - [ ] Rate limit evasion
    - [ ] Input validation bypass (SQLi, XSS, XXE)
    - [ ] File upload attacks (webshell, path traversal)
    - [ ] API abuse (mass assignment, IDOR)

- [ ] Create security findings report
  - Prioritize: Critical → High → Medium → Low
  - Document: CVE IDs, CVSS scores, reproduction steps
  - Track remediation status in GitHub Issues

- [ ] Fix all critical and high findings
  - Timeline: Critical within 24 hours, High within 7 days
  - Verify fixes with re-testing
  - Update security documentation

**Reference**: Section 12 (lines 1267-1309) in research document

---

### Day 19: SOC 2 Type II Gap Analysis

**Implementation Checklist**:

- [ ] Document Trust Services Criteria (TSC) compliance
  - **CC1 - Control Environment**: Board oversight, code of ethics
  - **CC2 - Communication**: Document all policies and procedures
  - **CC3 - Risk Assessment**: Annual risk assessment process
  - **CC4 - Monitoring**: Continuous monitoring systems
  - **CC5 - Control Activities**: Access controls, MFA enforcement
  - **CC6 - Access**: RBAC, quarterly access reviews
  - **CC7 - System Operations**: Automated backups, patching cadence
  - **CC8 - Change Management**: Approval workflows, testing gates
  - **CC9 - Risk Mitigation**: Vendor management, disaster recovery

- [ ] Create security policies documentation
  - Information Security Policy (ISP)
  - Access Control Policy
  - Incident Response Plan
  - Business Continuity Plan
  - Data Retention and Disposal Policy
  - Third-Party Risk Management Policy

- [ ] Setup compliance monitoring
  - Access review process (quarterly)
  - Security training program (annual)
  - Vulnerability scanning (weekly)
  - Penetration testing (quarterly)
  - Policy review cycle (annual)

- [ ] Prepare for SOC 2 audit
  - Select audit firm (Big 4 or specialized)
  - Timeline: 3-12 months operating period required
  - Cost: $15K-50K for Type II audit
  - Deliverable: SOC 2 Type II report

**Reference**: Section 11 (lines 1250-1263) in research document

---

### Day 20: Production Deployment with Monitoring

**Implementation Checklist**:

**Pre-Deployment Validation**:
- [ ] Run full test suite: `pnpm test`
- [ ] Run typecheck: `pnpm typecheck`
- [ ] Run security scans (SAST, dependency audit)
- [ ] Verify all environment variables configured
- [ ] Test database migrations on staging
- [ ] Verify RLS policies enforced (run isolation tests)

**Infrastructure Setup**:
- [ ] Configure production database
  - PostgreSQL 17.3+ with RLS enabled
  - Connection pooling (PgBouncer 50-100 connections)
  - Automated backups (30-day retention, encrypted)
  - Point-in-time recovery enabled

- [ ] Configure production Redis
  - Redis 7.4.2+ with persistence (AOF + RDB)
  - Memory limit with eviction policy (allkeys-lru)
  - Sentinel for high availability (3 nodes minimum)

- [ ] Setup monitoring and logging
  - Application logs: Centralized (CloudWatch, Datadog, etc.)
  - Database logs: Query performance, slow queries >1s
  - Security logs: Failed logins, rate limit hits, authorization failures
  - Uptime monitoring: Pingdom, UptimeRobot, or StatusCake

**Deployment**:
- [ ] Deploy database migrations
  - Run: `pnpm db:push` on production
  - Verify: All tables have RLS enabled
  - Seed: Create initial admin user

- [ ] Deploy backend API
  - Build: `pnpm build`
  - Start with PM2: `pm2 start dist/index.js`
  - Verify: Health check endpoint returns 200
  - Test: Authentication flow works

- [ ] Deploy frontend apps
  - Build: `pnpm build` (all apps)
  - Upload to CDN or static hosting
  - Configure custom domains
  - Verify: Apps load and connect to API

**Post-Deployment Validation**:
- [ ] Create test tenant and user
- [ ] Test complete auth flow (signup, login, MFA)
- [ ] Test tenant isolation (create data, verify separation)
- [ ] Test rate limiting (trigger 429 responses)
- [ ] Monitor error rates (should be <0.1%)
- [ ] Monitor response times (API <200ms, frontend <2s)

**Reference**: Section 13 (lines 1358-1410) in research document

---

### Day 21: Post-Launch Security Review & Documentation

**Implementation Checklist**:

**Security Validation**:
- [ ] Verify all checklist items completed
  - [ ] Auth.js integration working (credentials + OAuth)
  - [ ] PostgreSQL RLS enforced on all tables
  - [ ] Argon2id password hashing live
  - [ ] Session timeouts (8 hours + 30 min inactivity)
  - [ ] MFA enabled and tested
  - [ ] Rate limiting active (Redis-backed)
  - [ ] API keys working for widgets
  - [ ] Input validation on all endpoints
  - [ ] GDPR export/deletion functional
  - [ ] Security testing complete (no critical/high findings)
  - [ ] Monitoring and alerting configured

**Documentation Updates**:
- [ ] Update README.md
  - Add Phase 8 completion status
  - Document security features
  - Link to security policies

- [ ] Create runbooks
  - Incident response procedures (P0-P3 classification)
  - Access provisioning workflow
  - Database backup/restore procedure
  - Secret rotation procedure

- [ ] Create Phase 8 implementation document
  - All achievements and metrics
  - Known issues and limitations
  - Lessons learned
  - Production readiness checklist

**Team Training**:
- [ ] Security awareness training for all team members
- [ ] Incident response tabletop exercise
- [ ] Runbook walkthroughs
- [ ] On-call rotation setup

**Ongoing Security**:
- [ ] Schedule monthly limited penetration testing
- [ ] Schedule quarterly full security audits
- [ ] Schedule quarterly access reviews
- [ ] Schedule annual policy reviews
- [ ] Schedule annual SOC 2 Type II audit

**Reference**: Section 13 (lines 1431-1464) in research document

---

## Production Deployment Checklist

**Critical Security Controls** (All MUST be ✅ before production):

### Authentication & Authorization
- [ ] Auth.js v5 integrated with Fastify (`@fastify/formbody` installed)
- [ ] Credentials provider working (email/password login)
- [ ] OAuth providers configured (Google minimum)
- [ ] MFA enabled for all users (TOTP authenticator apps)
- [ ] Session timeout: 8 hours absolute, 30 min inactivity
- [ ] Password hashing: Argon2id (or bcrypt 12+)
- [ ] HTTPS enforced, HSTS enabled

### Multi-Tenant Security
- [ ] PostgreSQL RLS enabled on all tenant tables
- [ ] FORCE ROW LEVEL SECURITY set (prevents owner bypass)
- [ ] App connects as non-superuser role (`app_user`)
- [ ] Tenant context uses `SET LOCAL` in transactions
- [ ] Automated isolation tests passing (0 cross-tenant leaks)
- [ ] `tenant_id` columns indexed on all tables

### API Security
- [ ] Rate limiting active (Redis-backed)
- [ ] CORS configured with explicit origins (no wildcards)
- [ ] CSRF protection enabled
- [ ] API key authentication for widgets (publishable + secret keys)
- [ ] Input validation with Zod on all endpoints
- [ ] XSS protection headers (CSP, X-Content-Type-Options)

### Data Protection
- [ ] TLS 1.2+ for all connections
- [ ] Secrets in AWS Secrets Manager (or equivalent)
- [ ] Database encryption at rest
- [ ] Field-level encryption for PII (SSN, credit cards)
- [ ] Automated encrypted backups (30-day retention)

### Monitoring & Logging
- [ ] Centralized logging (1-year retention minimum)
- [ ] pgAudit configured (logs all write operations)
- [ ] Security event alerting (failed logins, rate limit hits)
- [ ] Failed login monitoring (alert on 10+ failures/hour)
- [ ] Anomaly detection active (unusual access patterns)

### Compliance
- [ ] GDPR data deletion working (anonymization + legal holds)
- [ ] GDPR data export functionality (JSON format, 7-day link)
- [ ] Consent management active (track consent types)
- [ ] Privacy policy published (accessible URL)
- [ ] Incident response plan documented (P0-P3 classification)

### Testing
- [ ] SAST/DAST scans complete (Semgrep, OWASP ZAP)
- [ ] Penetration test findings remediated (no critical/high)
- [ ] Tenant isolation tests passing (automated suite)
- [ ] No critical/high vulnerabilities (CVSS <7.0)
- [ ] Security regression tests in CI/CD

---

## Implementation Resources

### Code Templates & Examples

All implementation code is available in **`docs/research/10-07-2025/research-10-07-2025.md`**:

- **Auth.js + Fastify**: Lines 20-191 (complete working integration)
- **PostgreSQL RLS**: Lines 193-326 (policies, context manager, tests)
- **Argon2id Migration**: Lines 328-488 (password service, validator)
- **Rate Limiting**: Lines 490-547 (Redis config, endpoint limits)
- **API Keys**: Lines 549-596 (generation, validation, domain whitelist)
- **WebSocket Security**: Lines 718-803 (authentication, heartbeat, rate limits)
- **LiveKit Security**: Lines 805-853 (token generation, webhook validation)
- **Input Validation**: Lines 930-1043 (Zod schemas, XSS prevention, file upload)
- **Encryption**: Lines 625-716 (AWS KMS, field-level encryption)
- **GDPR**: Lines 1207-1248 (export, deletion, legal holds)

### Security Standards References

- **OWASP Top 10 2024**: https://owasp.org/www-project-top-ten/
- **NIST SP 800-63B** (Authentication): https://pages.nist.gov/800-63-3/sp800-63b.html
- **SOC 2 Trust Services Criteria**: https://www.aicpa.org/soc
- **GDPR Compliance Guide**: https://gdpr.eu/

### Tools & Libraries

**Required Dependencies**:
```bash
# Authentication
pnpm add @fastify/formbody @auth/core argon2 otplib qrcode

# API Security
pnpm add @fastify/rate-limit ioredis zod isomorphic-dompurify

# Encryption
pnpm add @aws-sdk/client-secrets-manager @aws-sdk/client-kms
```

**Security Testing Tools**:
- SAST: Semgrep (`npm install -g @semgrep/cli`)
- DAST: OWASP ZAP (https://www.zaproxy.org/)
- Dependency Audit: Snyk (https://snyk.io/)
- Password Strength: zxcvbn library
- Breach Check: HaveIBeenPwned API

---

## Success Criteria

**Phase 8 is COMPLETE when**:

1. ✅ **Authentication Works**
   - Email/password login succeeds (no 500 errors)
   - OAuth Google login succeeds
   - MFA enrollment and login flow works
   - Session expires after 8 hours or 30 min inactivity

2. ✅ **Multi-Tenant Isolation Verified**
   - Automated tests show 0 cross-tenant data leaks
   - Manual testing confirms tenant A cannot access tenant B data
   - Admin access requires explicit audit logging

3. ✅ **Security Standards Met**
   - Argon2id password hashing (or bcrypt 12+)
   - Rate limiting blocks brute force (5 attempts/15 min)
   - GDPR export/deletion functional
   - No critical/high security findings

4. ✅ **Production Deployed**
   - Backend API running with monitoring
   - Frontend apps accessible
   - All health checks passing
   - Error rate <0.1%

5. ✅ **Documentation Complete**
   - Phase 8 implementation doc created
   - Security runbooks written
   - README updated
   - Team trained on security procedures

---

## Timeline & Milestones

**Week 1 Milestone** (Day 7):
- ✅ Authentication working (credentials + OAuth + MFA)
- ✅ PostgreSQL RLS enforced with tests passing
- ✅ Password security upgraded to Argon2id
- **Validation**: Login flow works, tenant isolation tests pass

**Week 2 Milestone** (Day 14):
- ✅ Rate limiting active (Redis-backed)
- ✅ API key authentication for widgets
- ✅ Input validation and XSS prevention
- ✅ Secrets management configured
- **Validation**: Rate limits enforced, widget API keys work

**Week 3 Milestone** (Day 21):
- ✅ GDPR compliance implemented
- ✅ Security testing complete (no critical/high findings)
- ✅ Production deployed with monitoring
- ✅ Documentation and training complete
- **Validation**: Production deployment checklist 100% complete

---

## Risk Mitigation

**High-Risk Areas**:

1. **PostgreSQL RLS Configuration**
   - Risk: Incorrectly configured policies allow data leaks
   - Mitigation: Automated tests MUST pass before production
   - Validation: Manual testing with multiple tenants

2. **Auth.js Integration**
   - Risk: Cookie domain mismatches prevent authentication
   - Mitigation: Test on staging with production-like domains
   - Validation: OAuth and credentials both work

3. **Session Timeout Implementation**
   - Risk: Aggressive timeouts hurt UX
   - Mitigation: 8 hours is generous, 30 min inactivity is standard
   - Validation: User testing for acceptable UX

4. **Security Testing Scope**
   - Risk: Penetration test misses critical vulnerabilities
   - Mitigation: Use professional security firm (recommended)
   - Validation: Re-test after remediation

**Contingency Plans**:

- **If RLS tests fail**: Do NOT deploy to production, fix policies first
- **If auth integration fails**: Revert to research document code examples
- **If penetration test finds critical issues**: Delay production launch until fixed
- **If timeline slips**: Prioritize blockers (auth, RLS) over nice-to-haves (MFA optional)

---

## Phase 8 Completion Criteria

**Phase 8 is READY FOR PRODUCTION when**:

- [ ] All 56 checklist items completed (100%)
- [ ] Production deployment checklist: 100% complete
- [ ] Security testing: No critical/high findings
- [ ] Tenant isolation tests: 0 leaks detected
- [ ] Authentication: Credentials + OAuth + MFA working
- [ ] Monitoring: Logs centralized, alerts configured
- [ ] Documentation: Implementation doc + runbooks complete
- [ ] Team training: Security procedures reviewed

**Phase 8 Implementation Document** will document:
- All security implementations with code references
- Security testing results and remediation
- Production deployment timeline and issues
- Lessons learned and best practices
- Ongoing security maintenance procedures

---

## Questions & Support

**Implementation Questions**:
- Reference: `docs/research/10-07-2025/research-10-07-2025.md` (1,490 lines)
- All code examples are production-tested and ready to use

**Security Guidance**:
- OWASP Top 10 2024 guidelines
- NIST SP 800-63B authentication standards
- SOC 2 Type II Trust Services Criteria

**Technical Support**:
- Auth.js documentation: https://authjs.dev/
- Drizzle ORM + RLS: https://orm.drizzle.team/
- PostgreSQL RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

**Phase 8 Status**: READY TO START
**Next Action**: Begin Day 1 - Fix Auth.js + Fastify Integration
**Estimated Completion**: 21 days from start date
**Production Deployment**: After 100% checklist completion
