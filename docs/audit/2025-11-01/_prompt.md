# Comprehensive Codebase Audit Prompt for LLM-Generated Code

## Context
This codebase was generated entirely by Claude AI. Perform a rigorous, production-readiness audit to identify hallucinations, incomplete implementations, placeholder code, and any issues that could prevent safe deployment.

## Phase Status
- **Phases 1-8**: Completed (full audit required)
- **Phase 9**: Started but incomplete (identify gaps and completion status)
- **Phases 10-12**: Planned but not implemented (review planning docs for feasibility and alignment)

---

## I. DISCOVERY & INVENTORY PHASE

### 1. Complete Codebase Mapping
```
Scan and catalog ALL files in the project:
├── Source code (all languages/frameworks)
├── Configuration files (package.json, tsconfig, webpack, vite, etc.)
├── Environment files (.env templates, configs)
├── Build scripts & CI/CD pipelines
├── Database schemas & migration files
├── API route definitions & controllers
├── Tests (unit, integration, e2e)
├── Documentation files (all formats: .md, .txt, inline comments)
├── Docker/containerization files
├── Infrastructure as Code (if applicable)
└── Any other project-related files
```

**Deliverable**: Create `docs/audit/00-inventory.md` with complete file tree and purpose of each major component.

---

## II. LLM-SPECIFIC HALLUCINATION DETECTION

### 2. Critical Hallucination Patterns
Search exhaustively for common LLM code generation errors:

#### A. Non-Existent APIs & Libraries
- [ ] Verify EVERY import statement resolves to actual installed packages
- [ ] Check for fictional method names on real libraries (e.g., `axios.getJson()` instead of `axios.get()`)
- [ ] Validate API endpoints actually exist in the codebase
- [ ] Confirm third-party service integrations use correct SDK methods
- [ ] Check for deprecated or removed API calls

#### B. Placeholder & Mock Code
- [ ] Search for: `TODO`, `FIXME`, `HACK`, `XXX`, `PLACEHOLDER`, `MOCK`, `TEMP`
- [ ] Find: `console.log`, `console.error` (should use proper logging)
- [ ] Identify: `setTimeout()` used as quick fixes
- [ ] Locate: hardcoded values that should be configurable
- [ ] Detect: disabled tests or `it.skip()`, `test.skip()`
- [ ] Find: `any` types in TypeScript (should be properly typed)
- [ ] Spot: empty catch blocks or generic error handling
- [ ] Identify: fake/mock data in production code paths

#### C. Incomplete Implementations
- [ ] Functions that return empty objects/arrays without logic
- [ ] Routes that respond with static success messages
- [ ] Database queries that aren't actually executed
- [ ] Authentication checks that always return true
- [ ] Validation functions that don't validate
- [ ] Error handlers that swallow errors silently
- [ ] Async functions missing await keywords
- [ ] Promises without proper error handling

#### D. Copy-Paste Artifacts
- [ ] Duplicate code blocks with identical logic
- [ ] Functions with mismatched names/purposes in comments
- [ ] Example code from documentation not adapted to actual use
- [ ] Test names not matching what they actually test
- [ ] Comments describing different functionality than code implements

**Deliverable**: `docs/audit/01-hallucinations.md` with severity-ranked findings (Critical/High/Medium/Low)

---

## III. DOCUMENTATION ACCURACY VERIFICATION

### 3. Docs vs. Reality Cross-Check
For EVERY documentation file:

```
Read: docs/[filename].md
Then: Verify EVERY claim, example, and instruction against actual code

Check:
- [ ] API endpoints match actual routes
- [ ] Function signatures match implementations
- [ ] Configuration examples work as documented
- [ ] Installation steps are complete and accurate
- [ ] Environment variables listed match actual usage
- [ ] Architecture diagrams reflect current structure
- [ ] Database schema docs match actual migrations
- [ ] Authentication flow matches implementation
- [ ] Error codes/messages documented match thrown errors
- [ ] Examples execute without modification
```

**Test Method**: For each code example in docs, copy-paste and attempt to run. Document any that fail.

**Deliverable**: `docs/audit/02-documentation-gaps.md` listing all inaccuracies with proposed corrections

---

## IV. IMPLEMENTATION QUALITY AUDIT

### 4. Functional Correctness
```
For each module/feature:

A. Core Logic Verification
- [ ] Business logic correctly implements requirements
- [ ] Edge cases are handled (null, undefined, empty arrays, etc.)
- [ ] Mathematical calculations are accurate
- [ ] Date/time handling accounts for timezones
- [ ] String operations handle special characters
- [ ] Array operations handle empty/single-item cases
- [ ] Loops have proper termination conditions
- [ ] Recursion has base cases

B. Data Flow Integrity
- [ ] Data transformations preserve required fields
- [ ] Type conversions are safe and explicit
- [ ] Database transactions are properly scoped
- [ ] State updates are atomic and consistent
- [ ] Cache invalidation happens correctly
- [ ] Event handlers complete full workflows

C. Integration Points
- [ ] External API calls handle all response types
- [ ] Database operations match schema constraints
- [ ] Message queue producers/consumers are paired
- [ ] Webhook handlers validate signatures
- [ ] Third-party SDK usage follows official docs
```

**Deliverable**: `docs/audit/03-functional-errors.md`

### 5. Security Audit (OWASP Top 10 + Modern Threats)

#### A. Authentication & Authorization
- [ ] Password hashing uses bcrypt/argon2 (not MD5/SHA1)
- [ ] JWT tokens have expiration and proper signing
- [ ] Session management is secure (httpOnly, secure, sameSite)
- [ ] API keys stored in secrets manager (not env files in repo)
- [ ] OAuth implementation follows spec (PKCE, state parameter)
- [ ] Role-based access control (RBAC) enforced consistently
- [ ] Multi-factor authentication (if implemented) is secure
- [ ] Password reset flows prevent enumeration attacks

#### B. Input Validation & Injection
- [ ] SQL injection: All queries use parameterized statements
- [ ] NoSQL injection: MongoDB queries sanitize input
- [ ] XSS: All user input sanitized before rendering
- [ ] Command injection: No shell commands with user input
- [ ] Path traversal: File operations validate paths
- [ ] LDAP injection: Directory queries parameterized
- [ ] XML/XXE: XML parsers configured securely
- [ ] SSRF: URL validation before server-side requests

#### C. Data Protection
- [ ] Sensitive data encrypted at rest (PII, credentials)
- [ ] TLS/HTTPS enforced for all connections
- [ ] Secrets not committed to repository (check git history)
- [ ] Database credentials rotated and secured
- [ ] API keys have appropriate scopes (principle of least privilege)
- [ ] File uploads validate type, size, content
- [ ] Personal data handling complies with GDPR/CCPA
- [ ] Audit logs for sensitive operations

#### D. API Security
- [ ] Rate limiting on all endpoints
- [ ] CORS configured restrictively (not `*`)
- [ ] CSRF protection for state-changing operations
- [ ] Request size limits prevent DoS
- [ ] API versioning implemented
- [ ] Error messages don't leak sensitive info
- [ ] GraphQL query depth/complexity limits (if used)

#### E. Dependencies & Supply Chain
- [ ] Run `npm audit` / `pip check` / equivalent
- [ ] Check for dependencies with known CVEs
- [ ] Verify no malicious packages (typosquatting)
- [ ] Lock files present and up-to-date
- [ ] Deprecated dependencies identified
- [ ] License compliance checked

**Deliverable**: `docs/audit/04-security-vulnerabilities.md` (Critical/High/Medium/Low severity)

### 6. Performance & Scalability

#### A. Performance Anti-Patterns
- [ ] N+1 database query problems
- [ ] Unindexed database queries on large tables
- [ ] Synchronous operations blocking event loop
- [ ] Large file operations in memory (should stream)
- [ ] Inefficient sorting/searching algorithms (O(n²) when O(n log n) possible)
- [ ] Memory leaks (unclosed connections, event listener accumulation)
- [ ] CPU-intensive operations without worker threads
- [ ] Unnecessary re-renders in frontend (React/Vue)
- [ ] Large bundle sizes (analyze with webpack-bundle-analyzer)

#### B. Scalability Concerns
- [ ] Stateful operations that break horizontal scaling
- [ ] Global variables causing race conditions
- [ ] Database connection pool sizing
- [ ] Cache stampede protection
- [ ] Rate limiting per user, not globally
- [ ] Background job processing capabilities
- [ ] Graceful degradation under load
- [ ] Circuit breaker patterns for external services

**Deliverable**: `docs/audit/05-performance-issues.md` with estimated impact

### 7. Code Quality & Maintainability

#### A. Code Smells
- [ ] Functions longer than 50 lines (should be split)
- [ ] Files longer than 500 lines (should be modularized)
- [ ] Cyclomatic complexity > 10 (overly complex logic)
- [ ] Duplicate code (DRY violations)
- [ ] Magic numbers without constants
- [ ] God objects/classes with too many responsibilities
- [ ] Deep nesting (> 4 levels of indentation)
- [ ] Long parameter lists (> 5 parameters)
- [ ] Inconsistent naming conventions
- [ ] Comments explaining "what" instead of "why"

#### B. Architecture Issues
- [ ] Tight coupling between modules
- [ ] Circular dependencies
- [ ] Lack of separation of concerns
- [ ] Business logic in controllers/routes
- [ ] Database access outside data layer
- [ ] Hardcoded configuration
- [ ] Missing abstraction layers
- [ ] Violates SOLID principles (identify specifics)

#### C. Testing Gaps
- [ ] Critical paths without tests
- [ ] Test coverage < 80% (run coverage report)
- [ ] Tests that don't test anything meaningful
- [ ] Flaky tests that randomly fail
- [ ] Missing integration tests
- [ ] No end-to-end tests for critical flows
- [ ] Test data not isolated (shared state)
- [ ] Mocked dependencies that should be real

**Deliverable**: `docs/audit/06-code-quality.md`

### 8. Error Handling & Resilience

```
For each failure point:
- [ ] Try/catch blocks present and specific
- [ ] Error messages are helpful (not "error occurred")
- [ ] Errors logged with context (user ID, request ID, stack trace)
- [ ] User-facing errors don't expose internals
- [ ] Retry logic for transient failures
- [ ] Fallback behaviors defined
- [ ] Graceful degradation when services unavailable
- [ ] Dead letter queues for failed messages
- [ ] Health check endpoints implemented
- [ ] Monitoring/alerting integration
```

**Deliverable**: `docs/audit/07-error-handling.md`

---

## V. PHASE-SPECIFIC DEEP DIVE

### 9. Phase Implementation Review

For each phase (1-8 completed, 9 in-progress):

```
Step 1: Read docs/phases/phase-[N].md
Step 2: List all planned features/changes
Step 3: Verify each was implemented:
  ✅ Fully implemented and working
  ⚠️ Partially implemented (specify missing parts)
  ❌ Not implemented
  🐛 Implemented but buggy
  📝 Implementation differs from plan (explain how)

Step 4: Test implementation against acceptance criteria
Step 5: Rate foundation quality (1-5 scale):
  - Correctness: Does it work as intended?
  - Robustness: Does it handle edge cases?
  - Scalability: Will it work at 10x load?
  - Maintainability: Is code clean and documented?
  - Testability: Can it be easily tested?
```

**For Phase 9 (Incomplete)**:
- [ ] Identify exactly what was started
- [ ] List what remains (with effort estimates)
- [ ] Note any partial implementations that need completion
- [ ] Flag any half-finished features that could cause issues

**For Phases 10-12 (Planned)**:
- [ ] Review plan feasibility with current architecture
- [ ] Identify prerequisite work needed
- [ ] Flag any conflicts with existing implementation
- [ ] Suggest optimizations to plan based on learnings

**Deliverable**: `docs/audit/08-phase-analysis.md` with detailed breakdown per phase

---

## VI. PRODUCTION READINESS CHECKLIST

### 10. Deployment Prerequisites
- [ ] Environment variables documented and templated
- [ ] Database migrations tested (up and down)
- [ ] Backup/restore procedures documented
- [ ] Monitoring and logging configured
- [ ] Health checks returning accurate status
- [ ] Graceful shutdown handlers implemented
- [ ] Zero-downtime deployment possible
- [ ] Rollback procedure documented
- [ ] Load testing completed
- [ ] Disaster recovery plan exists

### 11. Operational Concerns
- [ ] How to add new features without breaking existing?
- [ ] How to debug issues in production?
- [ ] How to scale each component?
- [ ] What are single points of failure?
- [ ] Are there any time bombs (rate limits, quotas)?
- [ ] How to handle data migrations?
- [ ] What needs monitoring/alerting?
- [ ] Are there any manual processes that should be automated?

**Deliverable**: `docs/audit/09-production-readiness.md`

---

## VII. SYNTHESIS & REPORTING

### 12. Generate Comprehensive Audit Report

Create `docs/audit-report.md` with:

```markdown
# Codebase Audit Report
**Date**: [Current Date]
**Auditor**: Claude AI
**Codebase Version**: [Git commit hash]
**Audit Scope**: Complete production-readiness assessment

## Executive Summary
- Overall health score: [X/10]
- Critical issues found: [#]
- Production readiness: [READY / NOT READY / READY WITH CONDITIONS]
- Recommended timeline to production: [estimate]

### Key Findings
1. [Most critical finding]
2. [Second most critical]
3. [Third most critical]

### Risk Assessment
- **CRITICAL (Production blocker)**: [count] issues
- **HIGH (Must fix before launch)**: [count] issues
- **MEDIUM (Should fix soon)**: [count] issues
- **LOW (Nice to have)**: [count] issues

---

## Detailed Findings by Category

### 1. LLM Hallucinations & Code Accuracy
[List all instances of non-existent APIs, placeholder code, incomplete implementations]

**Impact**: [Description]
**Evidence**: [Code snippets, file locations]
**Recommendation**: [Specific fix]
**Priority**: [Critical/High/Medium/Low]
**Effort**: [Hours/Days estimate]

### 2. Documentation Accuracy
[All discrepancies between docs and code]

### 3. Security Vulnerabilities
[OWASP findings with CVE references where applicable]

### 4. Performance Issues
[Bottlenecks with estimated impact]

### 5. Code Quality Issues
[Maintainability concerns]

### 6. Phase Implementation Gaps
[Per-phase analysis]

---

## Actionable Recommendations

### Immediate Actions (Before Production)
1. [Fix critical security vulnerability X]
   - Files affected: [list]
   - Proposed solution: [describe]
   - Test plan: [describe]

### Short-term Improvements (First 30 days)
[Ordered by impact]

### Long-term Enhancements
[Technical debt and optimization opportunities]

---

## Testing Recommendations
- [ ] Tests that must be added before production
- [ ] Scenarios that need additional test coverage
- [ ] Load testing requirements
- [ ] Security penetration testing scope

---

## Monitoring & Observability Needs
- Metrics to track: [list]
- Alerts to configure: [list]
- Dashboard requirements: [describe]
- Log analysis patterns: [list]

---

## Appendices
- A. Complete file inventory
- B. Dependency audit results
- C. Test coverage report
- D. Performance profiling data
- E. Security scan outputs
```

---

## EXECUTION GUIDELINES

### Priority Order
1. **Critical**: Execute steps 2 (Hallucinations) and 5 (Security) first
2. **High**: Steps 3 (Docs), 4 (Functional), 9 (Phases)
3. **Medium**: Steps 6 (Performance), 7 (Code Quality), 8 (Error Handling)
4. **Continuous**: Step 1 (Inventory) throughout

### Evidence Requirements
- **Every finding must include**:
  - File path and line numbers
  - Code snippet showing the issue
  - Explanation of why it's a problem
  - Concrete example of impact
  - Specific fix recommendation

### False Positive Prevention
- **Verify before reporting**: Don't flag intentional design choices as errors
- **Context matters**: Some patterns acceptable in certain situations
- **Ask when unsure**: If something seems wrong but could be intentional, note it as "Review Required"

### Output Quality
- Use markdown tables for structured data
- Include code blocks with syntax highlighting
- Link related findings together
- Provide severity justification
- Be specific, not vague

---

## FINAL DELIVERABLES

```
docs/
├── audit-report.md (main comprehensive report)
└── audit/
    ├── 00-inventory.md
    ├── 01-hallucinations.md
    ├── 02-documentation-gaps.md
    ├── 03-functional-errors.md
    ├── 04-security-vulnerabilities.md
    ├── 05-performance-issues.md
    ├── 06-code-quality.md
    ├── 07-error-handling.md
    ├── 08-phase-analysis.md
    └── 09-production-readiness.md
```

---

## SUCCESS CRITERIA

This audit is complete when:
- ✅ Every file in codebase has been examined
- ✅ All documentation verified against implementation
- ✅ Zero uncertainty about what code actually does
- ✅ Clear production go/no-go recommendation
- ✅ Prioritized action plan with effort estimates
- ✅ Stakeholders can make informed deployment decision

**Remember**: This codebase was LLM-generated. Be extra skeptical. Assume nothing works until proven otherwise. Trust but verify every single claim, import, and function call.