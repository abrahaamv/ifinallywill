# Production Runbook - Phase 3 Backend API

**Version**: 1.0.0
**Last Updated**: 2025-10-06

## Overview

This runbook provides troubleshooting procedures for common production issues with the Phase 3 backend API infrastructure.

## Table of Contents

1. [Health Check Failures](#health-check-failures)
2. [Database Connection Issues](#database-connection-issues)
3. [RLS Policy Violations](#rls-policy-violations)
4. [Authentication Failures](#authentication-failures)
5. [Performance Degradation](#performance-degradation)
6. [Memory Leaks](#memory-leaks)
7. [Connection Pool Exhaustion](#connection-pool-exhaustion)

---

## Health Check Failures

### Symptom
Health check endpoint returns `unhealthy` or `degraded` status.

### Diagnosis

```bash
# Check health endpoint
curl https://api.platform.com/trpc/health.check | jq

# Check specific component
curl https://api.platform.com/trpc/health.check | jq '.checks.database'
```

### Resolution

**If database check fails**:
```bash
# 1. Check database connectivity
psql -U platform -d platform -c "SELECT 1;"

# 2. Check connection pool
psql -U platform -d platform -c "
  SELECT COUNT(*) as active_connections
  FROM pg_stat_activity
  WHERE datname = 'platform';
"

# 3. Restart API if needed
pm2 restart platform-api
```

**If RLS function missing**:
```bash
# Verify RLS function exists
psql -U platform -d platform -c "
  SELECT proname FROM pg_proc WHERE proname = 'get_current_tenant_id';
"

# If missing, run migration
cd /app && pnpm db:push
```

### Escalation
If health checks fail after 3 attempts, page on-call engineer.

---

## Database Connection Issues

### Symptom
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Diagnosis

```bash
# 1. Check PostgreSQL status
sudo systemctl status postgresql

# 2. Check if PostgreSQL is listening
sudo netstat -tulpn | grep 5432

# 3. Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Resolution

**If PostgreSQL is down**:
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Verify it started
sudo systemctl status postgresql
```

**If PostgreSQL is refusing connections**:
```bash
# Check pg_hba.conf
sudo cat /etc/postgresql/16/main/pg_hba.conf

# Should include:
# host    platform    platform    127.0.0.1/32    md5
# host    platform    platform    ::1/128         md5

# Reload configuration
sudo systemctl reload postgresql
```

**If connection limit reached**:
```bash
# Check max_connections
psql -U postgres -c "SHOW max_connections;"

# Check current connections
psql -U postgres -c "
  SELECT COUNT(*) FROM pg_stat_activity;
"

# Kill idle connections
psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
"
```

### Prevention
- Use PgBouncer for connection pooling
- Set `max_connections = 100` in postgresql.conf
- Monitor connection pool usage

---

## RLS Policy Violations

### Symptom
```
Error: new row violates row-level security policy for table "users"
```

### Diagnosis

```bash
# Check if RLS is enabled on table
psql -U platform -d platform -c "
  SELECT tablename, relrowsecurity
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE tablename = 'users';
"

# Check RLS policies
psql -U platform -d platform -c "\d users" | grep -A 10 "Policies"

# Check current tenant context
psql -U platform -d platform -c "
  SELECT current_setting('app.current_tenant_id', true);
"
```

### Resolution

**If tenant context not set**:
- **Root Cause**: Auth middleware not setting tenant context
- **Fix**: Ensure `authMiddleware` is called before all database operations

```typescript
// In API handler
const authContext = await authMiddleware(req);
await sql.unsafe(`SELECT set_config('app.current_tenant_id', '${authContext.tenantId}', true)`);
```

**If RLS policies are missing**:
```bash
# Re-run migrations
cd /app && pnpm db:push

# Verify policies exist
psql -U platform -d platform -c "
  SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
"
# Expected: 30+ policies
```

### Prevention
- Always call `authMiddleware` at start of request
- Use transaction wrappers for multi-query operations (Phase 4)
- Monitor RLS violations in metrics

---

## Authentication Failures

### Symptom
```
Error: No active session - please sign in
```

### Diagnosis

```bash
# Check Auth.js configuration
cat .env | grep AUTH_

# Check database sessions
psql -U platform -d platform -c "
  SELECT COUNT(*) FROM auth_sessions
  WHERE expires > NOW();
"

# Check OAuth provider status
curl -I https://accounts.google.com/.well-known/openid-configuration
```

### Resolution

**If AUTH_SECRET is invalid**:
```bash
# Generate new AUTH_SECRET
openssl rand -base64 32

# Update .env
echo "AUTH_SECRET=<new-secret>" >> .env

# Restart API
pm2 restart platform-api
```

**If OAuth credentials are invalid**:
```bash
# Verify OAuth credentials in Google/Microsoft console
# Update .env with correct credentials
# Restart API
pm2 restart platform-api
```

**If sessions are expired**:
```bash
# Clean up expired sessions
psql -U platform -d platform -c "
  DELETE FROM auth_sessions WHERE expires < NOW();
"

# User must sign in again
```

### Prevention
- Rotate AUTH_SECRET quarterly
- Monitor OAuth provider status
- Set reasonable session expiry (30 days default)

---

## Performance Degradation

### Symptom
API response times > 500ms (threshold: < 200ms for most endpoints).

### Diagnosis

```bash
# Check metrics endpoint
curl https://api.platform.com/trpc/health.metrics | jq '.metrics | to_entries[] | select(.key | contains("duration"))'

# Check database query performance
psql -U platform -d platform -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check CPU and memory
pm2 monit
```

### Resolution

**If database queries are slow**:
```bash
# Check for missing indexes
psql -U platform -d platform -c "
  SELECT schemaname, tablename, attname
  FROM pg_stats
  WHERE schemaname = 'public'
  AND n_distinct > 100
  AND attname NOT IN (
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  );
"

# Analyze tables
psql -U platform -d platform -c "ANALYZE;"
```

**If RLS context setting is slow**:
- **Known Issue**: `set_config` in connection pools can be slow
- **Phase 4 Fix**: Implement transaction wrappers

**If memory usage is high**:
```bash
# Restart API with memory limit
pm2 restart platform-api --max-memory-restart 500M
```

### Prevention
- Monitor query performance with pg_stat_statements
- Set up alerts for response times > 500ms
- Enable query logging for slow queries (> 1000ms)

---

## Memory Leaks

### Symptom
PM2 shows increasing memory usage, eventually hitting max_memory_restart limit.

### Diagnosis

```bash
# Check memory usage
pm2 list

# Check heap usage
pm2 logs platform-api --lines 100 | grep "Heap"

# Enable Node.js heap profiling
node --heap-prof packages/api/dist/index.js
```

### Resolution

**If metrics registry is growing unbounded**:
```typescript
// In packages/shared/src/monitoring/metrics.ts
// Histogram keeps only last 1000 values (already implemented)
if (metric.values.length > 1000) {
  metric.values.shift();
}
```

**If database connection pool is leaking**:
```bash
# Check for unclosed connections
psql -U platform -d platform -c "
  SELECT COUNT(*), state
  FROM pg_stat_activity
  WHERE datname = 'platform'
  GROUP BY state;
"

# Should see mostly 'idle' connections, not 'active'
```

### Prevention
- Set max_memory_restart in PM2 config
- Monitor memory usage metrics
- Use heap snapshots to identify leaks

---

## Connection Pool Exhaustion

### Symptom
```
Error: Connection pool is full
```

### Diagnosis

```bash
# Check active connections
psql -U platform -d platform -c "
  SELECT COUNT(*) as connections, state
  FROM pg_stat_activity
  WHERE datname = 'platform'
  GROUP BY state;
"

# Check PgBouncer status (if configured)
psql -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"
```

### Resolution

**Immediate**:
```bash
# Kill idle connections
psql -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'platform'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
"
```

**Long-term**:
```bash
# Install and configure PgBouncer
sudo apt-get install pgbouncer

# Configure pool size
# /etc/pgbouncer/pgbouncer.ini
# default_pool_size = 25
# max_client_conn = 100
# pool_mode = transaction

sudo systemctl restart pgbouncer

# Update DATABASE_URL to use PgBouncer
# DATABASE_URL="postgresql://platform:password@localhost:6432/platform"
```

### Prevention
- Use PgBouncer from the start
- Set reasonable connection limits
- Monitor pool usage metrics
- Close connections after use

---

## Monitoring and Alerts

### Critical Alerts (Page immediately)

1. **Health check fails** for > 3 consecutive checks
2. **Database unavailable** for > 1 minute
3. **Error rate** > 5% over 5 minutes
4. **Response time P95** > 1000ms over 5 minutes

### Warning Alerts (Notify via Slack)

1. **Health check degraded** status
2. **Database response time** > 100ms
3. **Connection pool** > 80% utilization
4. **Memory usage** > 80%
5. **RLS violations** > 10/minute

### Metrics to Track

```bash
# Key metrics from /trpc/health.metrics
- api_requests_total
- api_request_duration_seconds
- api_request_errors_total
- db_query_duration_ms
- db_connections_active
- rls_violations_total
- error_total
```

---

## Escalation Contacts

**Level 1 - On-Call Engineer**
- Initial response: 15 minutes
- Resolution target: 1 hour

**Level 2 - Senior Engineering**
- For database corruption, RLS breaches
- Response: 30 minutes

**Level 3 - CTO/Security**
- For security incidents, data breaches
- Response: Immediate

---

## Useful Commands Reference

```bash
# Health checks
curl https://api.platform.com/trpc/health.check
curl https://api.platform.com/trpc/health.liveness
curl https://api.platform.com/trpc/health.readiness
curl https://api.platform.com/trpc/health.metrics

# PM2 management
pm2 list
pm2 logs platform-api
pm2 restart platform-api
pm2 monit

# Database diagnostics
psql -U platform -d platform -c "SELECT COUNT(*) FROM pg_stat_activity;"
psql -U platform -d platform -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
psql -U platform -d platform -c "SELECT * FROM pg_stat_database WHERE datname = 'platform';"

# RLS verification
psql -U platform -d platform -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (SELECT tablename FROM pg_policies);"
```

---

## Version History

- **1.0.0** (2025-10-06): Initial Phase 3 runbook
