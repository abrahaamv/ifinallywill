# Cost Optimization Guide

Complete guide to minimizing GCP costs while maintaining performance and reliability.

---

## Current Cost Breakdown

### Staging Environment: $225-280/month

```
Compute Services:
  Cloud Run (API):              $25-35/month
  Cloud Run (WebSocket):        $30-40/month
  Cloud Run (Python Agent):     $20-30/month
  GCE (LiveKit):                $120-150/month
  VPC Connector:                $8/month
  Subtotal:                     $203-263/month

Data Services:
  Cloud SQL (PostgreSQL):       $85/month
  MemoryStore (Redis):          $35/month
  Subtotal:                     $120/month

Storage & Network:
  Cloud Storage:                $2-5/month
  Cloud CDN:                    $10-20/month
  Bandwidth:                    $5-10/month
  Subtotal:                     $17-35/month

Monitoring & Logging:          Free tier (sufficient)

Total Monthly:                  $225-280/month
Total Annual:                   $2,700-3,360/year
```

### Production Environment: $650-900/month (Optimized)

```
Compute Services:
  Cloud Run (API, 3-5 instances):     $80-120/month
  Cloud Run (WebSocket, 2-4 inst):    $100-150/month
  Cloud Run (Python Agent, 2-5 inst): $80-120/month
  GCE (LiveKit, n2-standard-4):       $150-200/month
  VPC Connector:                      $15/month
  Subtotal:                           $425-605/month

Data Services:
  Cloud SQL (db-n1-standard-4):       $280/month
  Cloud SQL (Read Replica):           $280/month (optional)
  MemoryStore (Redis, 5GB HA):        $180/month
  Subtotal:                           $460-740/month

Storage & Network:
  Cloud Storage:                      $10-20/month
  Cloud CDN:                          $50-80/month
  Bandwidth (5-10TB):                 $600-800/month
  Subtotal:                           $660-900/month

Monitoring & Logging:                 $20-30/month

Total Monthly:                        $1,565-2,275/month
Total Annual (with discounts):        $12,780-18,900/year

With Committed Use Discounts (30%):   $8,946-13,230/year
```

---

## Optimization Strategies

### 1. Committed Use Discounts (CUDs)

**Save 30-57% on compute resources**

```bash
# 1-year commitment (30% savings)
gcloud compute commitments create staging-compute-commitment \
  --plan=12-month \
  --resources=vcpu=4,memory=16GB \
  --region=us-central1

# 3-year commitment (57% savings)
gcloud compute commitments create prod-compute-commitment \
  --plan=36-month \
  --resources=vcpu=16,memory=64GB \
  --region=us-central1

# Check savings
gcloud compute commitments list
```

**When to Use**:
- ✅ Production workloads with predictable usage
- ✅ Running 24/7 services (LiveKit, databases)
- ❌ Development/staging (usage varies)
- ❌ Short-lived projects (<1 year)

**Estimated Savings**:
- Staging: $50-70/month (not recommended due to variable usage)
- Production: $300-500/month (recommended for 24/7 services)
- Annual: $3,600-6,000/year savings

### 2. Sustained Use Discounts (SUDs)

**Automatic 20-30% savings** (no commitment required)

```yaml
How it Works:
  - Automatically applied by GCP
  - Based on usage within a month
  - >25% of month: 20% discount
  - >50% of month: 30% discount
  - >75% of month: 40% discount

What Qualifies:
  - Compute Engine instances
  - Cloud SQL instances
  - MemoryStore Redis

What Doesn't:
  - Cloud Run (uses different pricing)
  - Storage
  - Bandwidth
```

**No Action Required** - Automatically applied!

**Check Your Discounts**:
```bash
# View in billing reports
echo "https://console.cloud.google.com/billing/reports?project=$PROJECT_ID"

# Filter for "Sustained use discount"
```

### 3. Cloud Run Cost Optimization

**Save 40-60% on serverless costs**

**A. Minimum Instances Strategy**

```bash
# Staging: Allow scaling to zero (save on idle time)
gcloud run services update api-service \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=10

# Production: Set minimum based on traffic patterns
# Morning (8 AM - 6 PM): 3 instances
# Evening (6 PM - 12 AM): 2 instances
# Night (12 AM - 8 AM): 1 instance

# Use Cloud Scheduler to adjust dynamically
```

**B. Concurrency Tuning**

```bash
# Increase concurrency = fewer instances needed
gcloud run services update api-service \
  --region=us-central1 \
  --concurrency=100  # Up from default 80

# Monitor CPU/memory before increasing further
```

**C. Request Timeout Optimization**

```bash
# Reduce timeout for fast operations
gcloud run services update api-service \
  --region=us-central1 \
  --timeout=60s  # Down from 300s

# Longer timeout only for specific endpoints
```

**D. Regional Selection**

```bash
# Cheapest GCP regions (as of 2025):
# us-central1 (Iowa)          - Baseline
# us-east1 (South Carolina)   - Baseline
# us-west1 (Oregon)           - Baseline

# Avoid expensive regions:
# europe-west1                - +10%
# asia-northeast1             - +15%
# australia-southeast1        - +20%
```

**Estimated Savings**:
- Min instances optimization: $50-100/month
- Concurrency tuning: $20-40/month
- Regional selection: $10-30/month

### 4. Database Cost Optimization

**Save 30-50% on Cloud SQL costs**

**A. Right-Sizing**

```bash
# Check actual CPU usage
gcloud sql instances describe platform-db \
  --format="get(settings.tier)"

# If CPU < 30% consistently, downgrade
gcloud sql instances patch platform-db \
  --tier=db-n1-standard-1  # Half the cost of standard-2

# Monitor for 1 week before committing
```

**B. Storage Optimization**

```bash
# Check current storage usage
gcloud sql instances describe platform-db \
  --format="get(settings.dataDiskSizeGb)"

# Enable automatic storage increase
gcloud sql instances patch platform-db \
  --storage-auto-increase \
  --storage-auto-increase-limit=100

# Start with smaller disk (saves $5-10/month)
gcloud sql instances patch platform-db \
  --storage-size=20GB  # Minimum
```

**C. Backup Retention**

```bash
# Reduce backup retention (default: 7 days)
gcloud sql instances patch platform-db \
  --backup-start-time=02:00 \
  --retained-backups-count=3  # Keep only 3 backups

# For staging: 1 backup is often enough
gcloud sql instances patch platform-db \
  --retained-backups-count=1
```

**D. High Availability (Production Only)**

```bash
# Staging: Disable HA (50% savings)
gcloud sql instances patch platform-db \
  --no-availability-type

# Production: Enable HA only when needed
gcloud sql instances patch platform-db \
  --availability-type=REGIONAL
```

**Estimated Savings**:
- Right-sizing: $40-80/month
- Storage optimization: $5-15/month
- Backup reduction: $10-20/month
- Disable HA (staging): $85/month

### 5. Redis Cost Optimization

**Save 30-50% on MemoryStore costs**

```bash
# Staging: Use Basic tier (no HA)
gcloud redis instances update platform-cache \
  --region=us-central1 \
  --tier=BASIC \
  --size=1

# Production: Use Standard tier with smaller size
gcloud redis instances update platform-cache \
  --region=us-central1 \
  --tier=STANDARD_HA \
  --size=3  # Start small, scale up if needed

# Monitor memory usage
gcloud redis instances describe platform-cache \
  --region=us-central1 \
  --format="get(memorySizeGb,currentLocationId)"
```

**Alternative: Use Cloud Run with Redis Container**

For development only:
```yaml
# Much cheaper for low-traffic staging ($0/month with free tier)
services:
  redis:
    image: redis:7.4.2-alpine
    # Deploy as Cloud Run service with persistent disk
```

**Estimated Savings**:
- Basic tier vs Standard: $50-100/month
- Right-sizing: $20-40/month

### 6. Storage & CDN Optimization

**Save 40-70% on storage/bandwidth costs**

**A. Storage Class Selection**

```bash
# For infrequently accessed files (backups)
gsutil lifecycle set - gs://platform-backups << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

# Storage costs:
# Standard:  $0.020/GB/month
# Nearline:  $0.010/GB/month (50% savings)
# Coldline:  $0.004/GB/month (80% savings)
```

**B. CDN Caching**

```bash
# Maximize cache hit rate = reduce origin requests
gsutil -m setmeta \
  -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://platform-staging-landing/assets/**"

# Check cache hit rate
# Target: >95% cache hit rate
# Each 1% improvement = ~$5/month savings at scale
```

**C. Compression**

```bash
# Gzip compression (automatic on Cloud Storage)
# Reduces bandwidth by 60-80%

# Verify
curl -H "Accept-Encoding: gzip" \
  -I https://storage.googleapis.com/platform-staging-landing/main.js

# Should see: content-encoding: gzip
```

**Estimated Savings**:
- Storage lifecycle: $10-30/month
- CDN caching: $50-150/month (at scale)
- Compression: $30-100/month (at scale)

### 7. AI Provider Cost Optimization

**Save 85% on AI costs (already implemented!)**

Your three-tier routing already saves massive costs:

```yaml
Current Implementation:
  Tier 1 (60%): Gemini Flash-Lite 8B  → $0.06/resolution
  Tier 2 (25%): Gemini Flash          → $0.08/resolution
  Tier 3 (15%): Claude Sonnet 4.5     → $0.40/resolution

  Average cost per resolution: $0.11
  vs Claude-only: $0.70/resolution
  Savings: 84% ($0.59 per resolution)

Annual Savings at 1K Users:
  ~$765K/year on text
  ~$420K/year on vision
  Total: ~$1.185M/year
```

**Additional Optimization**:

```bash
# Use Vertex AI for Gemini (eliminates egress fees)
export ENABLE_VERTEX_AI=true
export VERTEX_AI_PROJECT=platform-staging
export VERTEX_AI_LOCATION=us-central1

# Savings: ~$120/month at production scale (no egress)
```

### 8. LiveKit Self-Hosting (Already Doing!)

**Save 95-97% vs LiveKit Enterprise**

```yaml
Current: Self-hosted on GCE
  Cost: $150-200/month

vs LiveKit Enterprise:
  Cost: $5,000-10,000/month

Savings: $4,800-9,800/month ($58K-118K/year)
Already implemented! ✅
```

---

## Monitoring & Budget Alerts

### Set Up Budget Alerts

```bash
# Create budget for staging
gcloud beta billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Platform Staging Budget" \
  --budget-amount=300 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# Email notifications automatically sent
```

### Cost Anomaly Detection

```bash
# Enable cost anomaly detection
# Go to: https://console.cloud.google.com/billing/anomalies

# Automatic alerts for:
# - 20% cost increase day-over-day
# - Unusual resource usage patterns
# - New service usage
```

### Daily Cost Reports

```bash
# Create Cloud Function for daily reports
# Send to Slack/Email with:
# - Yesterday's spend
# - Week-over-week comparison
# - Top 5 services by cost
# - Budget % used
```

---

## Cost Optimization Checklist

### Immediate Actions (0 cost, 0 setup time)

- ✅ Enable sustained use discounts (automatic)
- ✅ Set up budget alerts ($300/month threshold)
- ✅ Review billing dashboard weekly
- ✅ Enable cost anomaly detection

### Quick Wins (1-2 hours, save $50-150/month)

- ✅ Set Cloud Run min instances to 0 (staging)
- ✅ Reduce database backup retention (staging: 1 day)
- ✅ Disable database HA (staging)
- ✅ Use Basic tier Redis (staging)
- ✅ Review and delete unused resources
- ✅ Enable storage lifecycle policies

### Medium-Term (1 week, save $100-300/month)

- ⏳ Right-size database instances
- ⏳ Optimize Cloud Run concurrency
- ⏳ Implement regional failover (production)
- ⏳ Set up scheduled scaling
- ⏳ Review and optimize queries

### Long-Term (1 month+, save $300-600/month)

- ⏳ Purchase 1-year committed use discounts (production)
- ⏳ Implement caching strategies
- ⏳ Optimize AI model selection further
- ⏳ Consider multi-region setup
- ⏳ Implement auto-shutdown for dev environments

---

## Cost Scenarios

### Scenario 1: Development Team (5 engineers)

**Usage Pattern**:
- Active 40 hours/week
- Idle 128 hours/week
- Low AI usage

**Optimizations**:
```bash
# Auto-shutdown after hours
gcloud compute instances add-metadata livekit-server \
  --zone=us-central1-a \
  --metadata=shutdown-schedule="0 18 * * 1-5"

# Scale to zero Cloud Run
gcloud run services update api-service \
  --min-instances=0

# Use smallest database
gcloud sql instances patch platform-db \
  --tier=db-f1-micro
```

**Monthly Cost**: $80-120 (was $225-280)
**Savings**: 57%

### Scenario 2: Beta Testing (100 users)

**Usage Pattern**:
- Active business hours only
- Moderate AI usage
- No SLA requirements

**Optimizations**:
```bash
# Schedule-based scaling
# Morning: Scale up
# Evening: Scale down
# Use Cloud Scheduler

# Smaller instances
# db-n1-standard-1 instead of standard-2
# n2-standard-2 instead of standard-4 for LiveKit
```

**Monthly Cost**: $180-250 (was $225-280)
**Savings**: 20-30%

### Scenario 3: Production (1K users)

**Usage Pattern**:
- 24/7 availability
- High AI usage
- SLA requirements

**Optimizations**:
```bash
# 1-year CUDs for compute
# Read replica for database (optional)
# Standard HA Redis
# Vertex AI for Gemini (no egress)
# Aggressive caching

# Committed use discount
gcloud compute commitments create prod-commitment \
  --plan=12-month \
  --resources=vcpu=16,memory=64GB
```

**Monthly Cost**: $650-900 (was $1,500-2,200)
**Savings**: 40-60% with optimizations
**Annual Savings**: $7,200-15,600

---

## Cost Reporting & Analysis

### Weekly Review

```bash
# Check this week's spend
gcloud billing accounts get-iam-policy BILLING_ACCOUNT_ID

# Top 5 services by cost
# Via Cloud Console:
echo "https://console.cloud.google.com/billing/$PROJECT_ID/reports"

# Look for:
# - Unexpected spikes
# - New services
# - Resource waste
```

### Monthly Optimization

```bash
# 1. Review all resources
gcloud projects list --format="table(projectId,lifecycleState)"

# 2. Identify unused resources
gcloud compute instances list --filter="status:TERMINATED"
gcloud sql instances list --filter="state:RUNNABLE"

# 3. Right-size based on metrics
# Check CPU/memory usage for past 30 days

# 4. Apply optimizations
# Document changes and savings
```

### Quarterly Planning

```bash
# Review cost trends
# Project next quarter spend
# Adjust budgets and alerts
# Consider CUD purchases
# Plan capacity increases
```

---

## Cost Allocation Tags

```bash
# Tag resources for cost tracking
gcloud compute instances update livekit-server \
  --zone=us-central1-a \
  --labels=environment=staging,team=platform,cost-center=engineering

gcloud run services update api-service \
  --region=us-central1 \
  --labels=environment=staging,team=platform

# Filter costs by labels
gcloud billing accounts list --filter="labels.environment=staging"
```

---

## Emergency Cost Reduction

If costs spike unexpectedly:

```bash
# 1. Identify spike source
# Check billing dashboard

# 2. Stop non-essential services immediately
gcloud compute instances stop livekit-server --zone=us-central1-a

# 3. Scale down Cloud Run
gcloud run services update api-service \
  --region=us-central1 \
  --max-instances=2

# 4. Reduce database tier
gcloud sql instances patch platform-db \
  --tier=db-f1-micro

# 5. Investigate root cause
gcloud logging read \
  "resource.type=cloud_run_revision" \
  --limit=100 \
  --format=json

# 6. Fix and restore services gradually
```

---

## Cost Optimization ROI

### Initial Setup Time: 4-6 hours
### Monthly Monitoring: 1-2 hours
### Savings: $50-600/month depending on environment

**Staging**:
- Time investment: 4 hours
- Monthly savings: $50-100
- Payback: 2-3 months
- Annual ROI: 150-300%

**Production**:
- Time investment: 8 hours (includes CUD research)
- Monthly savings: $300-600
- Payback: 1-2 months
- Annual ROI: 400-900%

---

## Tools & Resources

**Cost Management Tools**:
- Cloud Billing Reports: https://console.cloud.google.com/billing/reports
- Pricing Calculator: https://cloud.google.com/products/calculator
- Cost Optimization Guide: https://cloud.google.com/architecture/cost-optimization

**Monitoring**:
- Budget Alerts: https://console.cloud.google.com/billing/budgets
- Anomaly Detection: https://console.cloud.google.com/billing/anomalies
- Recommendations: https://console.cloud.google.com/home/recommendations

**Scripts**:
- `./scripts/cost-report.sh` - Daily cost summary
- `./scripts/optimize-resources.sh` - Apply optimizations
- `./scripts/right-size-analysis.sh` - Resource sizing recommendations

---

**Last Updated**: 2025-01-27
**Next Review**: 2025-02-27
**Target Savings**: $1,500-3,000/year (staging) | $7,000-16,000/year (production)
