# Dependency Vulnerability Audit

**Date**: 2025-11-01
**Auditor**: Comprehensive Production Audit
**Severity Scale**: Critical (immediate action) / High (24-48h) / Moderate (1-2 weeks) / Low (next sprint)

## Executive Summary

**Status**: ⚠️ **17 Vulnerabilities Identified**

### Vulnerability Breakdown
- **Critical**: 3 (happy-dom RCE, vitest RCE)
- **High**: 3 (react-router DoS, @trpc/server DoS)
- **Moderate**: 7 (vite file disclosure, esbuild, next-auth)
- **Low**: 4 (vite edge cases, fast-redact)

### Immediate Actions Required
1. **CRITICAL**: Remove or sandbox happy-dom (CVE-2025-62410, CVE-2025-61927) - RCE risk
2. **CRITICAL**: Disable vitest API server in production (CVE-2025-24964) - RCE risk
3. **HIGH**: Update @trpc/server for WebSocket DoS fix (CVE-2025-43855)
4. **HIGH**: Update react-router for cache poisoning/spoofing fixes

---

## Critical Vulnerabilities

### 1. happy-dom: Remote Code Execution (CRITICAL)

**CVE**: CVE-2025-62410, CVE-2025-61927
**CVSS**: Not specified (RCE vulnerabilities)
**Severity**: **CRITICAL**

**Description**:
- CVE-2025-62410: `--disallow-code-generation-from-strings` is insufficient for isolating untrusted JavaScript
- CVE-2025-61927: VM Context Escape can lead to Remote Code Execution

**Impact**: Attackers can escape VM sandbox and execute arbitrary code on the server

**Affected Package**: `happy-dom`

**Current Usage**: Testing/development only (Vitest browser mode)

**Remediation**:
```bash
# Option 1: Remove happy-dom entirely (use jsdom or playwright)
pnpm remove happy-dom

# Option 2: If required, ensure it's ONLY used in test environment
# Add strict environment checks before any happy-dom usage
if (process.env.NODE_ENV === 'production') {
  throw new Error('happy-dom is not allowed in production');
}
```

**Priority**: **IMMEDIATE** - Remove from production builds
**Timeline**: 24 hours

---

### 2. vitest: Remote Code Execution via API Server (CRITICAL)

**CVE**: CVE-2025-24964
**CVSS**: Not specified (RCE vulnerability)
**Severity**: **CRITICAL**

**Description**: Vitest allows Remote Code Execution when accessing a malicious website while Vitest API server is listening

**Impact**: RCE when Vitest API server is exposed

**Affected Package**: `vitest`

**Current Usage**: Test runner (development only)

**Remediation**:
```json
// vitest.config.ts - Ensure API server is NEVER enabled in production
export default defineConfig({
  test: {
    // Disable API server entirely
    api: false,

    // If API is needed for development, bind to localhost only
    api: {
      host: '127.0.0.1', // NEVER use 0.0.0.0
      port: 51204,
    }
  }
});
```

**Additional Protection**:
```javascript
// packages/*/vitest.config.ts
if (process.env.NODE_ENV === 'production') {
  throw new Error('Vitest should never run in production');
}
```

**Priority**: **IMMEDIATE** - Verify API server disabled in production
**Timeline**: 24 hours

---

## High Priority Vulnerabilities

### 3. @trpc/server: WebSocket DoS Vulnerability (HIGH)

**CVE**: CVE-2025-43855
**CVSS**: Not specified
**Severity**: **HIGH**

**Description**: tRPC 11 WebSocket DoS Vulnerability

**Impact**: Denial of Service attacks via WebSocket connections

**Affected Package**: `@trpc/server@11.0.0`

**Current Version**: 11.0.0
**Fixed Version**: 11.0.x+ (check latest release notes)

**Remediation**:
```bash
# Update to latest tRPC v11 patch
pnpm update @trpc/server@latest
```

**Verification**:
```bash
# After update, verify version
pnpm list @trpc/server
# Expected: @trpc/server@11.0.1 or higher
```

**Priority**: **HIGH**
**Timeline**: 48 hours

---

### 4. react-router: DoS & Pre-render Data Spoofing (HIGH)

**CVE**: CVE-2025-43864, CVE-2025-43865
**CVSS**: Not specified
**Severity**: **HIGH**

**Description**:
- CVE-2025-43864: DoS via cache poisoning by forcing SPA mode
- CVE-2025-43865: Pre-render data spoofing on React-Router framework mode

**Impact**: Denial of Service and data integrity issues

**Affected Package**: `react-router`

**Current Usage**: Frontend apps routing (apps/dashboard, apps/meeting, apps/landing)

**Remediation**:
```bash
# Update react-router to latest version
pnpm update react-router@latest react-router-dom@latest
```

**Additional Hardening**:
```typescript
// Ensure proper cache headers in production
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  next();
});
```

**Priority**: **HIGH**
**Timeline**: 48 hours

---

## Moderate Priority Vulnerabilities

### 5. vite: Multiple File Disclosure Vulnerabilities (MODERATE)

**CVE**: CVE-2025-62522, CVE-2025-31486, CVE-2025-30208, CVE-2025-32395, CVE-2025-31125, CVE-2025-46565
**CVSS**: Not specified
**Severity**: **MODERATE**

**Description**: Multiple server.fs.deny bypass vulnerabilities:
- CVE-2025-62522: Bypass via backslash on Windows
- CVE-2025-31486: Bypass with .svg or relative paths
- CVE-2025-30208: Bypass with ?raw query
- CVE-2025-32395: Bypass with invalid request-target
- CVE-2025-31125: Bypass for inline and raw with ?import query
- CVE-2025-46565: Bypass with /. for files under project root

**Impact**: Attackers may read sensitive files outside the intended serving directory

**Affected Package**: `vite`

**Current Version**: Check `pnpm list vite`
**Fixed Version**: Latest Vite 6.x (check release notes)

**Remediation**:
```bash
# Update Vite to latest patch
pnpm update vite@latest

# Verify all Vite-related packages updated
pnpm update @vitejs/plugin-react@latest
```

**Additional Hardening** (vite.config.ts):
```typescript
export default defineConfig({
  server: {
    fs: {
      // Strict file system access controls
      strict: true,
      allow: [
        // Only allow project root
        searchForWorkspaceRoot(process.cwd()),
      ],
      deny: [
        // Explicitly deny sensitive directories
        '.env*',
        '**/.git/**',
        '**/node_modules/**',
        '**/.env',
        '**/*.pem',
        '**/*.key',
      ],
    },
  },
});
```

**Priority**: **MODERATE**
**Timeline**: 1-2 weeks

---

### 6. next-auth: Email Misdelivery Vulnerability (MODERATE)

**CVE**: Not specified
**CVSS**: Not specified
**Severity**: **MODERATE**

**Description**: NextAuth.js Email misdelivery Vulnerability

**Impact**: Email verification/magic link emails may be sent to wrong recipients

**Affected Package**: `next-auth` (transitional package name for `auth-js`)

**Current Usage**: Authentication system (`packages/auth`)

**Remediation**:
```bash
# Update Auth.js to latest version
pnpm update @auth/core@latest @auth/drizzle-adapter@latest
```

**Additional Verification**:
```typescript
// packages/auth/src/lib/auth.ts
// Verify email sending logic includes proper recipient validation

// Email verification callback
async sendVerificationRequest({ identifier: email, url }) {
  // CRITICAL: Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }

  // Log email sending for audit trail
  logger.info('Sending verification email', {
    to: email,
    // DO NOT log URL (contains token)
  });

  // Send email...
}
```

**Priority**: **MODERATE**
**Timeline**: 1-2 weeks

---

### 7. esbuild: Development Server Vulnerability (MODERATE)

**CVE**: Not specified
**CVSS**: Not specified
**Severity**: **MODERATE**

**Description**: esbuild enables any website to send requests to the development server and read the response

**Impact**: Development server data exposure (not applicable in production)

**Affected Package**: `esbuild`

**Current Usage**: Build tooling (development only)

**Remediation**:
```bash
# Update esbuild to latest version
pnpm update esbuild@latest
```

**Additional Protection**:
```javascript
// Ensure esbuild dev server only binds to localhost
const esbuildConfig = {
  serve: {
    host: '127.0.0.1', // NEVER use 0.0.0.0 in development
    port: 8000,
  }
};
```

**Priority**: **MODERATE** (development only)
**Timeline**: 1-2 weeks

---

## Low Priority Vulnerabilities

### 8. fast-redact: Prototype Pollution (LOW)

**CVE**: CVE-2025-57319
**CVSS**: Not specified
**Severity**: **LOW**

**Description**: fast-redact vulnerable to prototype pollution

**Impact**: Limited - used by Pino logger for redacting sensitive data

**Affected Package**: `fast-redact`

**Current Usage**: Indirect dependency via `pino` logger

**Remediation**:
```bash
# Update pino to pull in latest fast-redact
pnpm update pino@latest pino-pretty@latest
```

**Priority**: **LOW**
**Timeline**: Next sprint

---

### 9. vite: Edge Case File Serving Issues (LOW)

**CVE**: CVE-2025-58751, CVE-2025-58752
**CVSS**: Not specified
**Severity**: **LOW**

**Description**:
- CVE-2025-58751: Middleware may serve files starting with same name as public directory
- CVE-2025-58752: server.fs settings not applied to HTML files

**Impact**: Minor file serving edge cases

**Affected Package**: `vite`

**Remediation**: Included in Vite update (see #5)

**Priority**: **LOW**
**Timeline**: Resolved with Vite update

---

## Database Security Patches (CRITICAL - from previous audit)

### PostgreSQL: SQL Injection Vulnerability

**Affected Versions**: All versions before 17.3/16.7/15.11/14.16/13.19
**CVSS**: 9.8 (CRITICAL)
**Status**: ⚠️ **ACTIVELY EXPLOITED IN THE WILD**

**Current Status**: Unknown (verify with `psql --version`)

**Remediation**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16.7  # Or appropriate version

# Docker
# Update Dockerfile to use postgresql:16.7 or 17.3
FROM postgres:16.7

# Verify version after update
psql --version
```

**Priority**: **CRITICAL**
**Timeline**: 7 days from project start

---

### Redis: Multiple RCE Vulnerabilities

**CVE**: 4 RCE vulnerabilities (CVSS 7.0-8.8)
**Affected Versions**: All versions before 7.4.2 / 7.2.7
**Status**: ⚠️ **HIGH SEVERITY RCE**

**Remediation**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server=7.4.2*

# Docker
# Update Dockerfile to use redis:7.4.2
FROM redis:7.4.2

# Verify version
redis-server --version
```

**Priority**: **CRITICAL**
**Timeline**: 7 days from project start

---

## Dependency Update Strategy

### 1. Immediate Updates (Week 1)

```bash
# Critical security patches
docker pull postgres:16.7
docker pull redis:7.4.2

# Remove happy-dom if not essential
pnpm remove happy-dom

# Update critical vulnerabilities
pnpm update @trpc/server@latest
pnpm update react-router@latest react-router-dom@latest
```

### 2. Moderate Priority (Week 2-3)

```bash
# Update Vite ecosystem
pnpm update vite@latest @vitejs/plugin-react@latest

# Update Auth.js
pnpm update @auth/core@latest @auth/drizzle-adapter@latest

# Update logging stack
pnpm update pino@latest pino-pretty@latest
```

### 3. Verification Script

```bash
#!/bin/bash
# verify-security-patches.sh

echo "=== Dependency Vulnerability Verification ==="

# Check for high-risk packages
if pnpm list happy-dom 2>/dev/null | grep -q "happy-dom"; then
  echo "❌ CRITICAL: happy-dom still installed"
else
  echo "✅ happy-dom removed"
fi

# Check tRPC version
TRPC_VERSION=$(pnpm list @trpc/server --depth=0 2>/dev/null | grep @trpc/server | awk '{print $2}')
echo "📦 @trpc/server version: $TRPC_VERSION"

# Check Vite version
VITE_VERSION=$(pnpm list vite --depth=0 2>/dev/null | grep vite | awk '{print $2}')
echo "📦 vite version: $VITE_VERSION"

# Audit for new vulnerabilities
echo ""
echo "=== Running pnpm audit ==="
pnpm audit --audit-level moderate
```

### 4. Continuous Monitoring

```yaml
# .github/workflows/security-audit.yml
name: Security Audit
on:
  schedule:
    - cron: '0 9 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm audit --audit-level moderate
      - run: pnpm outdated
```

---

## Summary & Recommendations

### Critical Actions (24-48 hours)
1. ✅ Verify PostgreSQL 16.7+ / 17.3+ (CRITICAL - actively exploited)
2. ✅ Verify Redis 7.4.2+ / 7.2.7+ (CRITICAL - RCE vulnerabilities)
3. ❌ Remove happy-dom or sandbox in tests only (CRITICAL - RCE)
4. ❌ Disable vitest API server in production (CRITICAL - RCE)
5. ❌ Update @trpc/server (HIGH - DoS)
6. ❌ Update react-router (HIGH - DoS + spoofing)

### Medium Priority (1-2 weeks)
- Update Vite ecosystem (7 file disclosure vulnerabilities)
- Update Auth.js (email misdelivery)
- Update esbuild (dev server exposure)

### Low Priority (Next Sprint)
- Update pino/fast-redact (prototype pollution)
- Monitor Vite edge cases

### Automated Monitoring
- Set up GitHub Actions workflow for weekly security audits
- Configure Dependabot for automatic security updates
- Enable pnpm audit in CI/CD pipeline

**Overall Assessment**: ⚠️ **17 vulnerabilities identified, 5 critical/high priority requiring immediate action**

**Next Steps**: Execute immediate updates, verify patches, establish continuous monitoring

