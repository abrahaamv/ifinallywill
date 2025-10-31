# Production Deployment Guide

**Platform**: Google Cloud Platform (GCP)
**Strategy**: High-Availability Hybrid Architecture
**Setup Time**: 8-12 hours (including testing)
**Monthly Cost**: $650-900 (optimized with CUDs)

---

## Production Requirements

### Differences from Staging

```yaml
High Availability:
  - Multiple Cloud Run instances (min 2-3)
  - Database read replicas
  - Redis High Availability tier
  - Multi-zone deployment

Security:
  - Custom domains with SSL/TLS
  - IP whitelisting for admin access
  - Enhanced monitoring and alerting
  - Automated backups (daily + PITR)

Performance:
  - Higher resource allocations
  - CDN edge caching
  - Committed Use Discounts
  - Connection pooling (PgBouncer)

Compliance:
  - Audit logging enabled
  - Data encryption at rest and in transit
  - GDPR compliance features
  - Regular security scans
```

---

## Pre-Production Checklist

### Security

- [ ] SSL/TLS certificates for all domains
- [ ] OAuth credentials for production domains
- [ ] Rotate all secrets and API keys
- [ ] Enable audit logging
- [ ] Configure IP whitelisting
- [ ] Review firewall rules
- [ ] Enable Cloud Armor (DDoS protection)

### Reliability

- [ ] Configure automated backups
- [ ] Test backup restoration
- [ ] Setup monitoring dashboards
- [ ] Configure alerting (email + Slack)
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Runbook created

### Compliance

- [ ] Data retention policies configured
- [ ] GDPR features enabled
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Security audit completed

---

## Production Deployment

### Step 1: Infrastructure Setup

```bash
cd infrastructure/production

# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy infrastructure
./deploy.sh --skip-backend --skip-frontend

# This creates:
# - Production VPC (platform-prod-vpc)
# - Multi-zone subnets
# - Firewall rules with IP whitelisting
# - Load balancer with SSL
# - VPC connectors (multiple zones)
```

### Step 2: Database Setup (High Availability)

```bash
# Deploy production database
./deploy.sh --skip-infrastructure --skip-backend --skip-frontend

# This creates:
# - Cloud SQL PostgreSQL 16 (db-n1-standard-4)
# - Read replica (same spec)
# - Automated daily backups
# - Point-in-time recovery (7 days)
# - MemoryStore Redis (5GB HA tier)
```

**Manual Post-Setup**:

```bash
# Configure PgBouncer connection pooling
gcloud sql instances patch platform-prod-db \
  --database-flags=cloudsql.enable_pgbouncer=on

# Test failover
gcloud sql instances failover platform-prod-db
```

### Step 3: LiveKit Cluster (Production)

For production, deploy 3 LiveKit instances across availability zones:

```bash
# Deploy primary LiveKit instance
./deploy.sh --skip-infrastructure --skip-database --skip-backend --skip-frontend

# Deploy additional instances (manual)
for zone in b c; do
  gcloud compute instances create livekit-server-$zone \
    --machine-type=n2-standard-4 \
    --zone=us-central1-$zone \
    --network-interface=subnet=platform-prod-subnet-$zone \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --tags=livekit-server \
    --metadata-from-file=startup-script=livekit-startup.sh
done

# Configure load balancer for LiveKit
gcloud compute backend-services create livekit-backend \
  --protocol=TCP \
  --port=7880 \
  --health-checks=livekit-health-check \
  --global
```

### Step 4: Backend Deployment (Blue-Green)

```bash
# Deploy new version with blue-green strategy
./deploy.sh --skip-infrastructure --skip-database --skip-frontend --blue-green

# This creates:
# - New Cloud Run revisions
# - Routes 0% traffic initially
# - Runs health checks
# - Gradually shifts traffic (0% → 5% → 25% → 50% → 100%)
# - Automatic rollback on error rate >0.5%
```

**Manual Traffic Control**:

```bash
# List revisions
gcloud run revisions list --service=api-prod-service --region=us-central1

# Gradual rollout
gcloud run services update-traffic api-prod-service \
  --region=us-central1 \
  --to-revisions=NEW_REVISION=5,OLD_REVISION=95

# Monitor error rate, then continue
gcloud run services update-traffic api-prod-service \
  --region=us-central1 \
  --to-revisions=NEW_REVISION=50,OLD_REVISION=50

# Complete rollout
gcloud run services update-traffic api-prod-service \
  --region=us-central1 \
  --to-revisions=NEW_REVISION=100
```

### Step 5: Frontend Deployment (CDN)

```bash
# Deploy frontend with CDN
./deploy.sh --skip-infrastructure --skip-database --skip-backend

# This creates:
# - Cloud Storage buckets (multi-region)
# - Cloud CDN with edge caching
# - SSL certificates
# - Custom domain mappings
```

**CDN Configuration**:

```bash
# Set cache TTL
gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://platform-prod-landing/assets/**"

# Invalidate cache
gcloud compute url-maps invalidate-cdn-cache platform-prod-lb \
  --path="/*" \
  --async
```

---

## Production Configuration

### Resource Specifications

```yaml
API Server (Cloud Run):
  Min Instances: 2
  Max Instances: 20
  CPU: 2 cores
  Memory: 4Gi
  Timeout: 300s
  Concurrency: 80

WebSocket Server (Cloud Run):
  Min Instances: 2
  Max Instances: 10
  CPU: 2 cores
  Memory: 4Gi
  Timeout: 3600s
  Concurrency: 1000

Python Agent (Cloud Run):
  Min Instances: 2
  Max Instances: 10
  CPU: 4 cores
  Memory: 8Gi
  Timeout: 3600s
  Concurrency: 10

LiveKit Servers (3x GCE):
  Machine Type: n2-standard-4
  CPU: 4 cores per instance
  Memory: 16GB per instance
  Disk: 50GB SSD per instance
  Zones: us-central1-a, us-central1-b, us-central1-c

Database (Cloud SQL):
  Primary: db-n1-standard-4 (4 vCPU, 15GB RAM)
  Replica: db-n1-standard-4 (4 vCPU, 15GB RAM)
  Storage: 500GB SSD
  Backups: Daily at 2 AM UTC + PITR

Redis (MemoryStore):
  Tier: High Availability
  Memory: 5GB
  Version: 7.4
  Zones: us-central1-a, us-central1-b
```

### Environment Variables

```bash
# Production-specific settings
NODE_ENV=production
LOG_LEVEL=warn  # Less verbose than staging
ENABLE_DEBUG_LOGGING=false
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true

# Stricter limits
API_RATE_LIMIT=100  # requests per minute
WEBSOCKET_MAX_CONNECTIONS=10000
TENANT_AI_COST_LIMIT_USD=500

# Monitoring
SENTRY_DSN=<production-sentry-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

---

## Monitoring & Alerting

### Google Cloud Monitoring

```bash
# Create uptime checks
gcloud monitoring uptime-check-configs create api-uptime \
  --display-name="API Uptime" \
  --http-check="https://api.platform.com/health" \
  --period=60 \
  --timeout=10

# Create alert policies
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="High Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-display-name="Error rate > 5%"
```

### Key Metrics to Monitor

```yaml
Availability:
  - API uptime (target: 99.9%)
  - Database connections (alert if >80%)
  - Redis memory usage (alert if >90%)

Performance:
  - API response time (P95 < 200ms)
  - Database query time (P95 < 100ms)
  - LiveKit packet loss (<1%)

Cost:
  - Daily spend vs budget
  - Per-tenant AI costs
  - Unusual usage spikes

Security:
  - Failed authentication attempts
  - Rate limit violations
  - Suspicious IP patterns
```

### Alerting Channels

```bash
# Email notifications
gcloud alpha monitoring channels create \
  --display-name="Engineering Team" \
  --type=email \
  --channel-labels=email_address=eng@platform.com

# Slack notifications
gcloud alpha monitoring channels create \
  --display-name="Slack #alerts" \
  --type=slack \
  --channel-labels=url=<SLACK_WEBHOOK_URL>

# PagerDuty (critical alerts)
gcloud alpha monitoring channels create \
  --display-name="PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=<PAGERDUTY_KEY>
```

---

## Scaling Strategy

### Auto-Scaling Configuration

```bash
# Cloud Run auto-scaling (already configured)
# Scales based on:
# - Request rate
# - CPU utilization (target: 80%)
# - Memory utilization (target: 80%)
# - Custom metrics (queue depth)

# LiveKit manual scaling
# When to scale up:
# - CPU >70% sustained
# - Packet loss >1%
# - Connection count >80% capacity
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xz

# Run load test
k6 run --vus 100 --duration 5m load-test.js

# Monitor during test
watch -n 1 'gcloud run services describe api-prod-service --region=us-central1 --format="get(status.traffic[0].percent)"'
```

Example `load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  let res = http.get('https://api.platform.com/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

---

## Disaster Recovery

### Backup Strategy

```yaml
Database:
  Daily Backups: 2 AM UTC (retained 30 days)
  Point-in-Time Recovery: 7 days
  Cross-Region Replica: Optional for geo-redundancy

Configuration:
  Infrastructure as Code: Stored in git
  Environment Variables: Stored in Secret Manager
  Deployment Scripts: Versioned in git

Application State:
  User Data: Backed up with database
  File Uploads: Cloud Storage with versioning
  Session Data: Redis (ephemeral, can be rebuilt)
```

### Recovery Procedures

**Database Failure**:

```bash
# Failover to read replica
gcloud sql instances failover platform-prod-db

# Or restore from backup
gcloud sql backups restore <BACKUP_ID> \
  --backup-instance=platform-prod-db \
  --backup-instance=platform-prod-db
```

**Service Failure**:

```bash
# Rollback Cloud Run service
gcloud run services update-traffic api-prod-service \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100

# Restart LiveKit instances
gcloud compute instances reset livekit-server-a --zone=us-central1-a
```

**Complete Outage**:

```bash
# Deploy to backup region (requires regional setup)
./deploy.sh --region=us-west1 --production

# Update DNS to point to new region
# Traffic should recover within 5-10 minutes
```

### RTO and RPO Targets

```yaml
Recovery Time Objective (RTO):
  Critical Services: <30 minutes
  Database: <15 minutes (failover)
  Full System: <2 hours

Recovery Point Objective (RPO):
  Database: <15 minutes (PITR)
  User Data: 0 (synchronous replication)
  Configuration: 0 (version controlled)
```

---

## Security Hardening

### SSL/TLS Configuration

```bash
# Managed SSL certificates
gcloud compute ssl-certificates create platform-prod-cert \
  --domains=platform.com,api.platform.com,meet.platform.com,dashboard.platform.com

# Enable HTTPS redirect
gcloud compute url-maps import platform-prod-lb \
  --source=<URL_MAP_CONFIG> \
  --global
```

### IP Whitelisting

```bash
# Restrict admin access
gcloud compute firewall-rules create platform-admin-whitelist \
  --network=platform-prod-vpc \
  --allow=tcp:443 \
  --source-ranges=<OFFICE_IP>/32,<VPN_IP>/32 \
  --target-tags=admin-access
```

### Secret Management

```bash
# Store secrets in Secret Manager
echo -n "$DATABASE_PASSWORD" | gcloud secrets create db-password \
  --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:<SERVICE_ACCOUNT>" \
  --role="roles/secretmanager.secretAccessor"

# Use in Cloud Run
gcloud run services update api-prod-service \
  --region=us-central1 \
  --set-secrets="DATABASE_PASSWORD=db-password:latest"
```

---

## Compliance & Audit

### Audit Logging

```bash
# Enable audit logs
gcloud projects set-iam-policy $PROJECT_ID policy.yaml

# Query audit logs
gcloud logging read "protoPayload.serviceName=cloudrun.googleapis.com" \
  --limit=100 \
  --format=json
```

### GDPR Compliance

```bash
# Enable data export for user requests
# Implemented in packages/api/src/routers/users.ts

# Test data export
curl -X POST https://api.platform.com/api/users/export \
  -H "Authorization: Bearer $TOKEN"

# Test data deletion
curl -X DELETE https://api.platform.com/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Cost Management

### Committed Use Discounts

```bash
# 1-year commitment (30% savings)
gcloud compute commitments create prod-compute-commitment \
  --plan=12-month \
  --resources=vcpu=20,memory=80GB \
  --region=us-central1

# Expected savings: $3,600-6,000/year
```

### Budget Alerts

```bash
# Create budget
gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="Production Monthly Budget" \
  --budget-amount=2000USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100
```

---

## Maintenance Windows

### Recommended Schedule

```yaml
Database Maintenance:
  Day: Sunday
  Time: 3-5 AM UTC
  Frequency: Weekly (automatic patches)

Application Updates:
  Day: Wednesday
  Time: 10 PM UTC
  Frequency: Bi-weekly (planned releases)

Security Updates:
  Schedule: As needed (within 7 days of CVE)
  Process: Blue-green deployment with rollback plan
```

### Maintenance Procedure

1. **Announce Maintenance**: Email users 24-48 hours ahead
2. **Pre-Deployment Checks**: Run tests, verify rollback procedure
3. **Deploy**: Use blue-green strategy
4. **Monitor**: Watch metrics for 1 hour post-deployment
5. **Rollback**: If error rate >0.5% or latency >2x baseline

---

## Production Checklist

### Before Go-Live

- [ ] All services deployed and healthy
- [ ] Load testing completed (500+ concurrent users)
- [ ] SSL certificates installed and verified
- [ ] Monitoring dashboards configured
- [ ] Alerting tested (trigger test alert)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Security audit completed (95+ score)
- [ ] Performance benchmarks met (P95 <200ms)
- [ ] Cost monitoring configured
- [ ] Team trained on runbook

### Day 1 Operations

- [ ] Monitor dashboards continuously
- [ ] Check error logs every hour
- [ ] Verify backup completion
- [ ] Review cost metrics
- [ ] Update status page
- [ ] Post-launch retrospective scheduled

---

## Support & Escalation

### On-Call Rotation

```yaml
Primary On-Call:
  Slack: @oncall
  Phone: Use PagerDuty
  Response Time: 15 minutes

Secondary On-Call:
  Slack: @oncall-secondary
  Response Time: 30 minutes

Escalation:
  Engineering Lead: After 1 hour
  CTO: After 2 hours or customer-facing outage
```

### Incident Response

1. **Acknowledge**: Within 15 minutes
2. **Assess**: Determine severity (P0-P4)
3. **Mitigate**: Immediate fixes (rollback, scaling)
4. **Communicate**: Update status page every 30 minutes
5. **Resolve**: Root cause fix
6. **Document**: Post-mortem within 48 hours

---

## Next Steps

1. ✅ Complete production deployment
2. ⏳ Run 7-day burn-in period
3. ⏳ Conduct load testing
4. ⏳ Enable all monitoring alerts
5. ⏳ Train team on runbook
6. ⏳ Schedule first maintenance window
7. ⏳ Document lessons learned

---

## Resources

- **Runbook**: `/docs/operations/runbook.md`
- **Troubleshooting**: `/docs/operations/troubleshooting.md`
- **Cost Optimization**: `/docs/operations/cost-optimization.md`
- **GCP Console**: https://console.cloud.google.com/
- **Status Page**: https://status.platform.com/
