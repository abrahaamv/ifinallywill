# Staging Deployment Guide

**Platform**: Google Cloud Platform (GCP)
**Strategy**: Hybrid Docker Architecture (Cloud Run + GCE + Managed Services)
**Setup Time**: 6-8 hours
**Monthly Cost**: $225-280

---

## Quick Start

```bash
# Navigate to infrastructure directory
cd infrastructure/staging

# Copy and configure environment
cp .env.example .env
# Edit .env with your GCP project details and API keys

# Run automated deployment
./deploy.sh

# Or skip specific phases
./deploy.sh --skip-frontend  # Skip frontend deployment
./deploy.sh --verify-only    # Only verify existing deployment
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stateless Services (Cloud Run - Auto-scaling)               │
│  ├── API Server (packages/api)          → Cloud Run         │
│  ├── WebSocket (packages/realtime)      → Cloud Run         │
│  └── Python Agent (livekit-agent)       → Cloud Run         │
│                                                              │
│  Stateful Services (GCE + Docker Compose)                    │
│  └── LiveKit Server                     → GCE VM + Docker   │
│                                                              │
│  Managed Services (Zero Maintenance)                         │
│  ├── PostgreSQL                         → Cloud SQL         │
│  ├── Redis                              → MemoryStore       │
│  └── Frontend Apps                      → Storage + CDN     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init
gcloud auth login

# Docker
curl -fsSL https://get.docker.com | sh

# Node.js & pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### GCP Project Setup

1. **Create Project**: https://console.cloud.google.com/projectcreate
2. **Enable Billing**: https://console.cloud.google.com/billing
3. **Set Project ID**:
   ```bash
   export PROJECT_ID=platform-staging
   gcloud config set project $PROJECT_ID
   ```

### Required API Keys

Get these API keys before deployment:

- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Anthropic Claude**: https://console.anthropic.com/
- **Deepgram**: https://console.deepgram.com/
- **ElevenLabs**: https://elevenlabs.io/
- **Voyage AI**: https://www.voyageai.com/
- **LiveKit**: Self-hosted (generated during setup)

---

## Deployment Phases

### Phase 1: Infrastructure Setup (30-45 minutes)

Creates VPC, subnets, firewall rules, and VPC connector.

```bash
./deploy.sh --skip-database --skip-backend --skip-frontend
```

**What's Created**:
- VPC network (`platform-vpc`)
- Subnet (`platform-subnet` - 10.0.0.0/24)
- Firewall rules (SSH, internal, LiveKit ports)
- Static IP for LiveKit
- VPC connector for Cloud Run

### Phase 2: Database Setup (15-20 minutes)

Sets up managed PostgreSQL and Redis.

```bash
./deploy.sh --skip-infrastructure --skip-backend --skip-frontend
```

**What's Created**:
- Cloud SQL PostgreSQL 16 (db-n1-standard-1)
- MemoryStore Redis 7.4 (1GB Basic tier)
- Database users and schema migrations

### Phase 3: LiveKit Server (10-15 minutes)

Deploys self-hosted LiveKit on GCE VM.

```bash
./deploy.sh --skip-infrastructure --skip-database --skip-backend --skip-frontend
```

**What's Created**:
- GCE VM (n2-standard-4)
- Docker + Docker Compose
- LiveKit server container
- Automated health checks

See [livekit-deployment.md](livekit-deployment.md) for detailed LiveKit setup.

### Phase 4: Backend Deployment (20-30 minutes)

Builds and deploys backend services to Cloud Run.

```bash
./deploy.sh --skip-infrastructure --skip-database --skip-frontend
```

**What's Deployed**:
- API Server → Cloud Run (0-10 instances)
- WebSocket Server → Cloud Run (1-10 instances)
- Python Agent → Cloud Run (1-5 instances)

### Phase 5: Frontend Deployment (10-15 minutes)

Builds and uploads frontend apps to Cloud Storage + CDN.

```bash
./deploy.sh --skip-infrastructure --skip-database --skip-backend
```

**What's Deployed**:
- Landing page → Cloud Storage + CDN
- Dashboard → Cloud Storage + CDN
- Meeting app → Cloud Storage + CDN
- Widget SDK → Cloud Storage + CDN

### Phase 6: Verification (5 minutes)

Automated health checks for all services.

```bash
./deploy.sh --verify-only
```

**Checks**:
- API health endpoint
- WebSocket connectivity
- LiveKit server status
- Database connectivity
- Redis connectivity

---

## Service Endpoints

After deployment, your services will be available at:

```yaml
API:         https://<PROJECT_ID>-api-<hash>.run.app
WebSocket:   wss://<PROJECT_ID>-websocket-<hash>.run.app
LiveKit:     ws://<LIVEKIT_IP>:7880

Frontend Apps:
  Landing:   https://storage.googleapis.com/<PROJECT_ID>-landing/index.html
  Dashboard: https://storage.googleapis.com/<PROJECT_ID>-dashboard/index.html
  Meeting:   https://storage.googleapis.com/<PROJECT_ID>-meeting/index.html
  Widget:    https://storage.googleapis.com/<PROJECT_ID>-widget/index.html
```

---

## Custom Domains (Optional)

### Map Custom Domains

1. **Cloud Run Services**:
   ```bash
   gcloud run domain-mappings create \
     --service=api-service \
     --domain=api-staging.platform.com \
     --region=us-central1
   ```

2. **Cloud Storage (Frontend)**:
   ```bash
   gcloud compute backend-buckets create platform-staging-landing \
     --gcs-bucket-name=$PROJECT_ID-landing

   gcloud compute url-maps create platform-staging-lb \
     --default-backend-bucket=platform-staging-landing
   ```

3. **Update DNS**:
   - Add A record pointing to Cloud Run/Load Balancer IP
   - Add CNAME record for www subdomain

---

## Monitoring & Alerts

### View Logs

```bash
# API logs
gcloud run services logs read api-service --region=us-central1 --limit=100

# WebSocket logs
gcloud run services logs read websocket-service --region=us-central1 --limit=100

# LiveKit logs
gcloud compute ssh livekit-server --zone=us-central1-a
docker logs livekit-livekit-1
```

### Health Check URLs

```bash
# API
curl https://<API_URL>/health

# WebSocket
curl https://<WS_URL>/health

# LiveKit
curl http://<LIVEKIT_IP>:7881/
```

### Cost Monitoring

```bash
# View current month costs
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Set budget alerts
# Go to: https://console.cloud.google.com/billing/budgets
```

---

## Maintenance

### Update Services

```bash
# Rebuild and redeploy API
cd infrastructure/staging
docker build -t gcr.io/$PROJECT_ID/api:latest -f ../../packages/api/Dockerfile ../..
docker push gcr.io/$PROJECT_ID/api:latest
gcloud run deploy api-service --image=gcr.io/$PROJECT_ID/api:latest --region=us-central1

# Similar for websocket and agent
```

### Database Migrations

```bash
# Run migrations
cd /path/to/project
pnpm db:push

# Rollback (manual)
# Use Cloud SQL backups: https://console.cloud.google.com/sql/instances
```

### Scale Services

```bash
# Scale API instances
gcloud run services update api-service \
  --region=us-central1 \
  --min-instances=2 \
  --max-instances=20

# Scale LiveKit VM
gcloud compute instances stop livekit-server --zone=us-central1-a
gcloud compute instances set-machine-type livekit-server \
  --zone=us-central1-a \
  --machine-type=n2-standard-8
gcloud compute instances start livekit-server --zone=us-central1-a
```

---

## Troubleshooting

See [../troubleshooting.md](../troubleshooting.md) for comprehensive troubleshooting guide.

### Quick Fixes

**Service won't start**:
```bash
# Check logs
gcloud run services logs read <service-name> --region=us-central1 --limit=100

# Common fix: Update environment variables
gcloud run services update <service-name> \
  --region=us-central1 \
  --set-env-vars="MISSING_VAR=value"
```

**Database connection failed**:
```bash
# Test connection
gcloud sql connect platform-db --user=platform

# Check VPC connector
gcloud compute networks vpc-access connectors describe platform-connector --region=us-central1
```

**LiveKit not accessible**:
```bash
# Check VM status
gcloud compute instances describe livekit-server --zone=us-central1-a

# Check Docker container
gcloud compute ssh livekit-server --zone=us-central1-a
docker ps
docker logs livekit-livekit-1
```

---

## Rollback Procedures

### Rollback Cloud Run Service

```bash
# List revisions
gcloud run revisions list --service=api-service --region=us-central1

# Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=api-service \
  --region=us-central1 \
  --format="value(name)" \
  --limit=2 | tail -n 1)

gcloud run services update-traffic api-service \
  --region=us-central1 \
  --to-revisions=$PREVIOUS_REVISION=100
```

### Rollback Database

```bash
# List backups
gcloud sql backups list --instance=platform-db

# Restore from backup
gcloud sql backups restore <BACKUP_ID> \
  --backup-instance=platform-db \
  --backup-instance=platform-db
```

### Rollback Complete Deployment

```bash
# Destroy all resources (CAREFUL!)
./deploy.sh --destroy  # Not implemented - manual cleanup required

# Manual cleanup
gcloud run services delete api-service --region=us-central1 --quiet
gcloud run services delete websocket-service --region=us-central1 --quiet
gcloud run services delete agent-service --region=us-central1 --quiet
gcloud compute instances delete livekit-server --zone=us-central1-a --quiet
gcloud sql instances delete platform-db --quiet
gcloud redis instances delete platform-cache --region=us-central1 --quiet
```

---

## Cost Optimization

See [../cost-optimization.md](../cost-optimization.md) for detailed cost optimization strategies.

**Quick Wins**:
- Set Cloud Run min-instances to 0 for staging
- Use Committed Use Discounts for production
- Enable Sustained Use Discounts (automatic)
- Right-size database and Redis instances
- Use Vertex AI for Gemini (no egress costs)

---

## Next Steps

1. ✅ Complete staging deployment
2. ⏳ Configure custom domains
3. ⏳ Setup monitoring dashboards
4. ⏳ Run load tests
5. ⏳ Configure CI/CD pipeline
6. ⏳ Production deployment

---

## Support Resources

- **GCP Console**: https://console.cloud.google.com/
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **LiveKit Docs**: https://docs.livekit.io/
- **Project Docs**: See `/docs/` directory
