# Production Alerting and Monitoring

**Critical Alert Configuration** - 9 production alerts for operational health monitoring

## Overview

This platform implements **9 critical alerts** across infrastructure, application, and security domains. All alerts integrate with Google Cloud Monitoring through OpenTelemetry metrics.

**Alert Categories**:
- **Infrastructure** (4 alerts): Backups, disk space, database
- **Application** (3 alerts): API errors, response time, connection pool
- **External Dependencies** (1 alert): AI providers
- **Security** (1 alert): RLS policy violations

**Integration**: Google Cloud Monitoring → Notification channels (Email, Slack, PagerDuty)

---

## Alert Definitions

### 1. Backup Age Alert (CRITICAL)

**Condition**: Latest PostgreSQL backup older than 24 hours
**Severity**: CRITICAL
**Threshold**: 24 hours
**Check Interval**: Every 1 hour

**Impact**: Data loss risk increases with backup age. RTO/RPO targets cannot be met.

**Metric Query** (Bash check):
```bash
find /var/backups/postgresql -name "backup_*" -type d -mtime -1 | wc -l
# Alert if result = 0 (no backups in last 24 hours)
```

**Resolution**:
1. Check backup cron job: `sudo scripts/backup-cron.sh status`
2. Check backup logs: `tail -100 /var/backups/postgresql/backup.log`
3. Verify PostgreSQL connectivity and permissions
4. Run manual backup: `sudo -u postgres scripts/backup-postgres.sh base`

**Runbook**: See `docs/operations/backup-restore-procedures.md` → Troubleshooting

---

### 2. WAL Archive Lag Alert (HIGH)

**Condition**: WAL archiving delayed >10 minutes
**Severity**: HIGH
**Threshold**: 10 minutes
**Check Interval**: Every 1 minute

**Impact**: PITR capability degraded. Potential data loss if database crashes.

**Metric Query** (PostgreSQL):
```sql
SELECT EXTRACT(EPOCH FROM (now() - last_archived_time)) / 60 AS lag_minutes
FROM pg_stat_archiver;
-- Alert if lag_minutes > 10
```

**Resolution**:
1. Check WAL archive directory: `ls -lh /var/backups/postgresql/wal_archive/`
2. Check archive script logs: `tail -100 /var/backups/postgresql/wal_archive/archive.log`
3. Verify disk space: `df -h /var/backups/postgresql`
4. Check PostgreSQL logs: `sudo tail -100 /var/log/postgresql/postgresql-16-main.log | grep archive`

**Runbook**: See `docs/operations/backup-restore-procedures.md` → Archive Command Failing

---

### 3. Disk Space Alert (CRITICAL)

**Condition**: Disk usage >85% on backup volume
**Severity**: CRITICAL
**Threshold**: 85%
**Check Interval**: Every 5 minutes

**Impact**: Backups fail, WAL archiving stops, database crash risk.

**Metric Query** (Bash):
```bash
df -h /var/backups/postgresql | awk 'NR==2 {print $5}' | grep -o '[0-9]*'
# Alert if result > 85
```

**Resolution**:
1. Emergency cleanup: `RETENTION_DAYS=3 sudo -u postgres scripts/backup-postgres.sh cleanup`
2. Remove old WAL files: `find /var/backups/postgresql/wal_archive -mtime +3 -delete`
3. Check disk usage: `du -sh /var/backups/postgresql/*`
4. Consider volume expansion or offload to S3

**Runbook**: See `docs/operations/backup-restore-procedures.md` → Disk Space Exhaustion

---

### 4. Backup Failure Alert (CRITICAL)

**Condition**: Backup operation fails
**Severity**: CRITICAL
**Threshold**: Any failure
**Check Interval**: Every 1 minute (log monitoring)

**Impact**: No new recovery points. RTO/RPO targets at risk.

**Metric Query** (Log monitoring):
```bash
tail -100 /var/backups/postgresql/backup.log | grep ERROR
# Alert on any ERROR entries
```

**Resolution**:
1. Check backup logs: `sudo tail -200 /var/backups/postgresql/backup.log`
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Check disk space and permissions
4. Test manual backup: `sudo -u postgres scripts/backup-postgres.sh base`

**Code Integration**:
```typescript
import { AlertChecks } from '@platform/shared';

try {
  await performBackup();
} catch (error) {
  const alert = AlertChecks.recordBackupFailure(error);
  // Alert automatically sent via OpenTelemetry metrics
}
```

---

### 5. API Error Rate Alert (HIGH)

**Condition**: API error rate >5% over 5-minute window
**Severity**: HIGH
**Threshold**: 5%
**Check Interval**: Every 1 minute

**Impact**: User experience degradation. Potential service outage.

**Metric Query** (OpenTelemetry):
```
rate(api_errors_total[5m]) / rate(api_requests_total[5m]) > 0.05
```

**Resolution**:
1. Check API logs: `tail -100 /var/log/platform/api.log`
2. Check error breakdown by endpoint: Query Google Cloud Trace
3. Verify database connectivity: `psql -U platform -d platform -c "SELECT 1;"`
4. Check external dependencies (Redis, LiveKit)
5. Review recent deployments for regressions

**Code Integration**:
```typescript
import { AlertChecks, telemetryMetrics } from '@platform/shared';

// Record successful request
telemetryMetrics.recordCounter('api.requests', 1, { endpoint, status: 'success' });

// Record error
try {
  await handler();
} catch (error) {
  AlertChecks.recordAPIError(endpoint, error);
  telemetryMetrics.recordCounter('api.requests', 1, { endpoint, status: 'error' });
  throw error;
}
```

---

### 6. Database Connection Pool Alert (HIGH)

**Condition**: Connection pool usage >90%
**Severity**: HIGH
**Threshold**: 90%
**Check Interval**: Every 1 minute

**Impact**: New requests fail. Database deadlocks possible.

**Metric Query** (Application):
```typescript
const activeConnections = pool.totalCount;
const maxConnections = 50;
const usagePercent = (activeConnections / maxConnections) * 100;
// Alert if usagePercent > 90
```

**Resolution**:
1. Check active connections: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`
2. Identify long-running queries: `SELECT pid, query FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';`
3. Check for connection leaks in application code
4. Consider increasing pool size (with caution - PostgreSQL memory impact)
5. Implement connection timeout and retry logic

**Code Integration**:
```typescript
import { AlertChecks } from '@platform/shared';

// Monitor connection pool
setInterval(() => {
  const alert = AlertChecks.recordConnectionPoolUsage(
    pool.totalCount,
    pool.options.max
  );
  if (alert?.triggered) {
    logger.error({ alert }, 'Connection pool exhaustion');
  }
}, 60000); // Check every minute
```

---

### 7. Response Time Alert (MEDIUM)

**Condition**: API p95 response time >500ms
**Severity**: MEDIUM
**Threshold**: 500ms
**Check Interval**: Every 1 minute

**Impact**: User experience degradation. SLA risk.

**Metric Query** (OpenTelemetry):
```
histogram_quantile(0.95, rate(api_request_duration_ms_bucket[5m])) > 500
```

**Resolution**:
1. Check slow queries: Query Google Cloud Trace for slowest spans
2. Check database query performance: `SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
3. Verify cache hit rate: Check Redis metrics
4. Check AI provider latency: Review provider-specific metrics
5. Review database indexes and query plans

**Code Integration**:
```typescript
import { telemetryMetrics } from '@platform/shared';

const startTime = Date.now();

try {
  const result = await handler();
  const duration = Date.now() - startTime;

  telemetryMetrics.recordLatency(endpoint, duration, {
    tenant: ctx.tenant.id,
    status: 'success',
  });

  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  telemetryMetrics.recordLatency(endpoint, duration, {
    tenant: ctx.tenant.id,
    status: 'error',
  });
  throw error;
}
```

---

### 8. AI Provider Failure Alert (HIGH)

**Condition**: AI provider error rate >10%
**Severity**: HIGH
**Threshold**: 10%
**Check Interval**: Every 1 minute

**Impact**: AI features unavailable. User requests failing.

**Metric Query** (OpenTelemetry):
```
rate(ai_provider_errors_total[5m]) / rate(ai_provider_requests_total[5m]) > 0.10
```

**Resolution**:
1. Check provider status pages:
   - OpenAI: https://status.openai.com/
   - Anthropic: https://status.anthropic.com/
   - Google: https://status.cloud.google.com/
2. Verify API keys and quotas
3. Check rate limiting: Review 429 errors
4. Fallback to alternative provider if configured
5. Check network connectivity and DNS resolution

**Code Integration**:
```typescript
import { AlertChecks } from '@platform/shared';

try {
  const response = await openai.chat.completions.create({...});
  return response;
} catch (error) {
  const alert = AlertChecks.recordAIProviderFailure('openai', error);
  // Alert automatically sent
  throw error;
}
```

---

### 9. RLS Policy Violation Alert (CRITICAL)

**Condition**: Cross-tenant access attempt detected
**Severity**: CRITICAL
**Threshold**: Any violation
**Check Interval**: Real-time (event-driven)

**Impact**: Security breach. Data leak potential.

**Detection**: PostgreSQL RLS policy rejection + application-level detection

**Resolution**:
1. **IMMEDIATE**: Lock affected user account
2. Review audit logs: `SELECT * FROM audit_logs WHERE user_id = '...' ORDER BY created_at DESC LIMIT 100;`
3. Check for compromised credentials
4. Review application logs for attack patterns
5. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = '...';`
6. Incident response: Follow security incident runbook

**Code Integration**:
```typescript
import { AlertChecks } from '@platform/shared';

// Detect RLS violation attempt
const userTenant = ctx.tenant.id;
const resourceTenantId = resource.tenantId;

if (userTenant !== resourceTenantId) {
  const alert = AlertChecks.recordRLSViolation(
    ctx.user.id,
    userTenant,
    resourceTenantId,
    'users'
  );

  logger.error({ alert }, 'RLS violation detected');

  // Block request
  throw forbidden('Access denied: Cross-tenant access not allowed');
}
```

---

## Google Cloud Monitoring Setup

### 1. Create Notification Channels

```bash
# Email notification
gcloud alpha monitoring channels create \
  --display-name="Platform Ops Team" \
  --type=email \
  --channel-labels=email_address=ops@platform.com

# Slack notification
gcloud alpha monitoring channels create \
  --display-name="Platform Slack #alerts" \
  --type=slack \
  --channel-labels=url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty notification (for CRITICAL alerts)
gcloud alpha monitoring channels create \
  --display-name="Platform PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=YOUR_PAGERDUTY_KEY
```

### 2. Create Alert Policies

**Example: Backup Age Alert**

```yaml
# alert-policy-backup-age.yaml
displayName: "Backup Age Exceeded"
documentation:
  content: "PostgreSQL backup older than 24 hours. See runbook: docs/operations/backup-restore-procedures.md"
  mimeType: "text/markdown"
conditions:
  - displayName: "No recent backups"
    conditionThreshold:
      filter: 'metric.type="custom.googleapis.com/backup/age_hours" AND resource.type="global"'
      comparison: COMPARISON_GT
      thresholdValue: 24
      duration: 0s
      aggregations:
        - alignmentPeriod: 3600s
          perSeriesAligner: ALIGN_MAX
alertStrategy:
  autoClose: 86400s
combiner: OR
enabled: true
notificationChannels:
  - projects/YOUR_PROJECT/notificationChannels/PAGERDUTY_CHANNEL_ID
severity: CRITICAL
```

Apply policy:
```bash
gcloud alpha monitoring policies create --policy-from-file=alert-policy-backup-age.yaml
```

**Example: API Error Rate Alert**

```yaml
# alert-policy-api-errors.yaml
displayName: "API Error Rate High"
documentation:
  content: "API error rate >5% over 5min. Check logs and recent deployments."
  mimeType: "text/markdown"
conditions:
  - displayName: "Error rate threshold"
    conditionThreshold:
      filter: 'metric.type="workload.googleapis.com/api.errors" AND resource.type="k8s_container"'
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_SUM
alertStrategy:
  autoClose: 1800s
combiner: OR
enabled: true
notificationChannels:
  - projects/YOUR_PROJECT/notificationChannels/SLACK_CHANNEL_ID
  - projects/YOUR_PROJECT/notificationChannels/EMAIL_CHANNEL_ID
severity: HIGH
```

### 3. Custom Metrics Export

Ensure OpenTelemetry metrics are exported to Google Cloud Monitoring:

```typescript
// Already configured in packages/shared/src/telemetry/index.ts
import { initTelemetry } from '@platform/shared';

await initTelemetry({
  serviceName: 'platform-api',
  environment: 'production',
  gcpProjectId: process.env.GCP_PROJECT_ID, // Required for metrics export
});
```

---

## Alert Response Playbook

### CRITICAL Alerts (Immediate Response)

**Backup Age, Disk Space, Backup Failure, RLS Violation**

1. **Acknowledge** within 5 minutes
2. **Triage** severity and impact
3. **Mitigate** immediate risk
4. **Investigate** root cause
5. **Resolve** underlying issue
6. **Document** incident in postmortem

### HIGH Alerts (Response within 1 hour)

**WAL Lag, API Error Rate, Database Pool, AI Provider Failure**

1. **Acknowledge** within 15 minutes
2. **Assess** impact and degradation
3. **Investigate** logs and metrics
4. **Implement** temporary workaround if needed
5. **Resolve** root cause
6. **Monitor** recovery

### MEDIUM Alerts (Response within 4 hours)

**Response Time Degradation**

1. **Acknowledge** within 1 hour
2. **Analyze** performance metrics
3. **Identify** bottlenecks
4. **Optimize** slow components
5. **Verify** improvement

---

## Alert Testing

### Test Backup Age Alert

```bash
# Temporarily rename latest backup to simulate age
sudo mv /var/backups/postgresql/latest /var/backups/postgresql/latest.old

# Check alert condition
sudo -u postgres node -e "
const { AlertChecks } = require('@platform/shared');
AlertChecks.checkBackupAge().then(alert => {
  console.log('Alert:', alert);
  if (alert.triggered) console.log('✅ Alert triggered correctly');
});
"

# Restore backup
sudo mv /var/backups/postgresql/latest.old /var/backups/postgresql/latest
```

### Test API Error Alert

```typescript
import { AlertChecks } from '@platform/shared';

// Simulate API error
AlertChecks.recordAPIError('/api/test', new Error('Test error'));

// Check metrics in Google Cloud Monitoring after 1 minute
```

### Test RLS Violation Alert

```typescript
import { AlertChecks } from '@platform/shared';

// Simulate RLS violation
const alert = AlertChecks.recordRLSViolation(
  'test-user-id',
  'tenant-a',
  'tenant-b',
  'users'
);

console.log('Alert:', alert);
// Should trigger CRITICAL alert
```

---

## Monitoring Dashboards

### Google Cloud Monitoring Dashboard

Create custom dashboard with panels for:

1. **Backup Health**
   - Backup age (hours)
   - WAL archive lag (minutes)
   - Disk space usage (%)

2. **Application Performance**
   - API request rate (req/s)
   - API error rate (%)
   - Response time percentiles (p50, p95, p99)

3. **Database Metrics**
   - Connection pool usage (%)
   - Active connections (count)
   - Query duration (ms)

4. **External Dependencies**
   - AI provider request rate (req/s)
   - AI provider error rate (%)
   - AI provider latency (ms)

5. **Security**
   - RLS violations (count)
   - Authentication failures (count)
   - Suspicious activity (count)

**Import Dashboard**: See `scripts/monitoring/gcp-dashboard.json` (to be created)

---

## Alert Tuning

### Adjusting Thresholds

Edit alert conditions in code:

```typescript
// packages/shared/src/alerting/index.ts
export const ALERT_CONDITIONS: Record<AlertType, AlertCondition> = {
  [AlertType.API_ERROR_RATE]: {
    threshold: 5, // Change from 5% to 3%
    // ...
  },
};
```

### Disabling Alerts

```typescript
// Temporarily disable alert
export const ALERT_CONDITIONS: Record<AlertType, AlertCondition> = {
  [AlertType.RESPONSE_TIME_P95]: {
    enabled: false, // Disable during known maintenance
    // ...
  },
};
```

### Alert Fatigue Prevention

- **Deduplicate**: Auto-close alerts after issue resolved
- **Group**: Combine related alerts (e.g., multiple API errors)
- **Silence**: Temporary mute during planned maintenance
- **Escalate**: Only page for CRITICAL severity

---

## Incident Response Integration

### PagerDuty Integration

```bash
# Configure PagerDuty service integration
PAGERDUTY_SERVICE_KEY=your_key_here

gcloud alpha monitoring channels create \
  --display-name="Platform PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=$PAGERDUTY_SERVICE_KEY

# Link to CRITICAL alerts only
```

### Slack Integration

```bash
# Configure Slack webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

gcloud alpha monitoring channels create \
  --display-name="Platform Slack" \
  --type=slack \
  --channel-labels=url=$SLACK_WEBHOOK_URL

# Link to HIGH and CRITICAL alerts
```

---

## Validation Checklist

- [x] All 9 alerts defined in code
- [x] Alert severity levels assigned
- [x] Check intervals configured
- [x] OpenTelemetry metrics integrated
- [ ] Google Cloud Monitoring policies created
- [ ] Notification channels configured
- [ ] Alert testing completed
- [ ] Runbooks linked
- [ ] Incident response procedures documented
- [ ] On-call rotation established

---

## Next Steps

1. ✅ Configure OpenTelemetry metrics export
2. ⏳ Create Google Cloud Monitoring alert policies (9 total)
3. ⏳ Configure notification channels (email, Slack, PagerDuty)
4. ⏳ Create monitoring dashboard
5. ⏳ Test each alert condition
6. ⏳ Document incident response procedures
7. ⏳ Establish on-call rotation

---

**Last Updated**: 2025-01-08
**Status**: Alert definitions complete, Google Cloud setup pending
**Next Review**: Before production deployment
