# Phase 9 Readiness: Staging Deployment

**Status**: Ready to Begin
**Created**: 2025-01-11
**Target Start**: Immediately after documentation updates
**Estimated Duration**: 2-3 weeks
**Priority**: HIGH - Deployment before resuming Phase 12

---

## 📋 Executive Summary

Phase 9 focuses on deploying the complete production-ready platform (Phases 1-11) to a staging environment on Google Cloud Platform (GCP). This phase validates the full system in a production-like environment, establishes CI/CD pipelines, and gathers real-world usage data before resuming Phase 12 enterprise features.

**Strategic Context**: After completing 11 phases (92% of planned work), we're pivoting from feature development to deployment to validate the platform's production readiness and gather usage insights.

---

## 🎯 Objectives

### Primary Goals
1. **Staging Environment**: Deploy full platform to GCP staging with production-equivalent infrastructure
2. **Infrastructure as Code**: Implement automated deployment scripts (Docker Compose + Terraform)
3. **CI/CD Pipelines**: Establish automated testing and deployment with GitHub Actions
4. **Observability**: Set up monitoring, logging, and alerting systems
5. **Production Validation**: Verify all 28 database tables, 9 routers, 40+ procedures work in production environment

### Success Criteria
- ✅ All services running on staging.platform.com
- ✅ End-to-end user flows working (signup → chat → video → surveys)
- ✅ Zero critical errors in 48-hour soak test
- ✅ Complete monitoring dashboards with <5s alert response time
- ✅ Automated CI/CD deploying on git push
- ✅ Performance meeting targets (<200ms API, <3s page load)

---

## 🏗️ Architecture Overview

### Target Infrastructure (GCP Hybrid Architecture)

**Stateless Services** (Cloud Run - auto-scaling):
```
┌─────────────────────────────────────────────────────────────┐
│ Cloud Run (Auto-scaling 0-10 instances)                     │
├─────────────────────────────────────────────────────────────┤
│ • API Server (Fastify + tRPC)           Port: 3001          │
│ • WebSocket Server (Realtime)           Port: 3002          │
│ • Python Agent (LiveKit)                 Dynamic            │
└─────────────────────────────────────────────────────────────┘
```

**Stateful Services** (GCE + Docker):
```
┌─────────────────────────────────────────────────────────────┐
│ Google Compute Engine (e2-medium: 2 vCPU, 4GB RAM)         │
├─────────────────────────────────────────────────────────────┤
│ • LiveKit Server (self-hosted)           Port: 7880, 7881  │
│   - 95-97% cost savings vs Enterprise                       │
│   - Full WebRTC support                                     │
└─────────────────────────────────────────────────────────────┘
```

**Managed Services**:
```
┌─────────────────────────────────────────────────────────────┐
│ Cloud SQL PostgreSQL 16.7+ (db-f1-micro: 1 vCPU, 3.75GB)   │
│ MemoryStore Redis 7.4.2+ (Basic: 1GB)                      │
│ Cloud Storage + CDN (frontend apps, widget SDK)             │
└─────────────────────────────────────────────────────────────┘
```

### Cost Estimate (Staging)
```
Service                    Monthly Cost    Rationale
─────────────────────────  ──────────────  ───────────────────────
Cloud Run (API + WS)       $15-30          Auto-scaling to 0
Cloud Run (Python Agent)   $30-50          1-5 instances
GCE (LiveKit)              $25-35          e2-medium 24/7
Cloud SQL (PostgreSQL)     $10-15          db-f1-micro
MemoryStore (Redis)        $25-35          Basic 1GB
Cloud Storage + CDN        $5-10           Minimal traffic
Egress/Networking          $15-25          GCP → API providers
───────────────────────────────────────────────────────────────
TOTAL STAGING:             $125-200/month  Low traffic estimate
```

**Production Estimate**: $650-900/month (with Committed Use Discounts)

---

## 📦 Week 1: Infrastructure Setup

### Day 1-2: GCP Project Setup

**Prerequisites**:
- [ ] GCP account with billing enabled
- [ ] gcloud CLI installed and authenticated
- [ ] Terraform 1.6+ installed
- [ ] Docker 24+ installed

**Tasks**:
- [ ] Create GCP project: `platform-staging`
- [ ] Enable required APIs:
  ```bash
  gcloud services enable \
    compute.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    storage-api.googleapis.com \
    secretmanager.googleapis.com
  ```
- [ ] Create service account with minimal permissions
- [ ] Set up Workload Identity for GitHub Actions
- [ ] Configure Secret Manager for API keys

**Files to Create**:
```
infrastructure/staging/
├── terraform/
│   ├── main.tf              # Main infrastructure
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   ├── cloud-run.tf         # API + WebSocket + Agent
│   ├── gce.tf               # LiveKit server
│   ├── cloud-sql.tf         # PostgreSQL
│   ├── redis.tf             # MemoryStore Redis
│   ├── storage.tf           # Cloud Storage + CDN
│   └── secrets.tf           # Secret Manager
├── docker/
│   ├── docker-compose.yml   # Local testing
│   └── Dockerfile.livekit   # LiveKit container
├── scripts/
│   ├── deploy.sh            # One-command deployment
│   ├── setup-secrets.sh     # Configure secrets
│   └── verify.sh            # Post-deployment validation
├── .env.example             # Environment template
└── README.md                # Deployment guide
```

**Validation Checklist**:
- [ ] `terraform plan` executes without errors
- [ ] Service account permissions verified
- [ ] Secrets created in Secret Manager
- [ ] Network policies allow required traffic

---

### Day 3-4: Database Deployment

**Tasks**:
- [ ] Deploy Cloud SQL PostgreSQL 16.7+ instance
- [ ] Enable pgvector extension
- [ ] Configure backup policy (daily backups, 7-day retention)
- [ ] Set up connection pooling (Cloud SQL Proxy or PgBouncer)
- [ ] Run all 12 migrations from `packages/db/migrations/`
- [ ] Verify RLS policies active (76+ policies on 28 tables)
- [ ] Seed staging data (test tenants, users)

**Database Configuration**:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should show 76+ policies across 28 tables
```

**Connection String Format**:
```
postgresql://platform_service:PASSWORD@/platform?host=/cloudsql/PROJECT:REGION:INSTANCE
```

**Validation Checklist**:
- [ ] All 28 tables created successfully
- [ ] 76+ RLS policies active (SELECT, INSERT, UPDATE, DELETE per tenant table)
- [ ] pgvector extension working (test embedding query)
- [ ] FORCE RLS enabled on all tenant-scoped tables
- [ ] Helper function `get_current_tenant_id()` available
- [ ] Seed data populated (test tenant + users)
- [ ] Backup policy configured and first backup completed

---

### Day 5-7: Redis & Caching Layer

**Tasks**:
- [ ] Deploy MemoryStore Redis 7.4.2+ (Basic tier, 1GB)
- [ ] Configure Redis Streams for WebSocket
- [ ] Set up consumer groups for message broadcasting
- [ ] Configure session storage (Auth.js sessions)
- [ ] Test rate limiting functionality

**Redis Configuration**:
```bash
# Test Redis connection
redis-cli -h REDIS_HOST -p 6379 PING

# Verify streams working
redis-cli -h REDIS_HOST XINFO STREAM session:TENANT_ID:SESSION_ID

# Check consumer groups
redis-cli -h REDIS_HOST XINFO GROUPS session:TENANT_ID:SESSION_ID
```

**Validation Checklist**:
- [ ] Redis 7.4.2+ deployed (security patches applied)
- [ ] Streams working for WebSocket messages
- [ ] Consumer groups configured for multi-instance
- [ ] Session storage working (Auth.js integration)
- [ ] Rate limiting functional (6-tier system from Phase 8)

---

## 🚀 Week 2: Application Deployment

### Day 1-2: Backend Services (Cloud Run)

**Services to Deploy**:
1. **API Server** (port 3001)
2. **WebSocket Server** (port 3002)
3. **Python LiveKit Agent** (dynamic ports)

**Cloud Run Configuration**:
```yaml
# cloud-run-api.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: platform-api
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/platform-api:TAG
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-url
              key: url
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
      scaling:
        minInstances: 0  # Scale to zero
        maxInstances: 10
```

**Deployment Commands**:
```bash
# Build and push API server
cd packages/api
docker build -t gcr.io/PROJECT_ID/platform-api:latest .
docker push gcr.io/PROJECT_ID/platform-api:latest
gcloud run deploy platform-api \
  --image gcr.io/PROJECT_ID/platform-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=staging"

# Build and push WebSocket server
cd packages/realtime
docker build -t gcr.io/PROJECT_ID/platform-websocket:latest .
docker push gcr.io/PROJECT_ID/platform-websocket:latest
gcloud run deploy platform-websocket \
  --image gcr.io/PROJECT_ID/platform-websocket:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 1  # Keep 1 instance warm for WebSocket

# Build and push Python agent
cd livekit-agent
docker build -t gcr.io/PROJECT_ID/livekit-agent:latest .
docker push gcr.io/PROJECT_ID/livekit-agent:latest
gcloud run deploy livekit-agent \
  --image gcr.io/PROJECT_ID/livekit-agent:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 5
```

**Validation Checklist**:
- [ ] API server responding on `https://api-staging.platform.com`
- [ ] Health check endpoint returning 200: `/health`
- [ ] tRPC endpoints functional (test with `curl` or Postman)
- [ ] WebSocket server accepting connections
- [ ] Python agent connecting to LiveKit server
- [ ] Environment variables loaded from Secret Manager
- [ ] Database connections successful (test queries)
- [ ] Redis connections working (test pub/sub)

---

### Day 3-4: LiveKit Self-Hosted Server (GCE)

**LiveKit Server Setup** (95-97% cost savings):
```bash
# SSH into GCE instance
gcloud compute ssh livekit-server --zone=us-central1-a

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.9'
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    ports:
      - "7880:7880"  # HTTP
      - "7881:7881"  # HTTPS
      - "7882:7882"  # TURN
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
      - ./certs:/certs
    restart: unless-stopped

  redis:
    image: redis:7.4-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
EOF

# Start LiveKit server
docker-compose up -d

# Verify LiveKit running
curl http://localhost:7880/
```

**LiveKit Configuration** (`livekit.yaml`):
```yaml
port: 7880
bind_addresses:
  - "0.0.0.0"

rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true

keys:
  API_KEY: ${LIVEKIT_API_KEY}
  API_SECRET: ${LIVEKIT_API_SECRET}

redis:
  address: redis:6379

logging:
  level: info
  json: true
```

**Firewall Rules**:
```bash
# Allow LiveKit ports
gcloud compute firewall-rules create allow-livekit \
  --allow tcp:7880,tcp:7881,udp:50000-60000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags livekit-server
```

**Validation Checklist**:
- [ ] LiveKit server running on GCE instance
- [ ] HTTP endpoint accessible: `http://EXTERNAL_IP:7880`
- [ ] TURN server functional (WebRTC connectivity)
- [ ] Redis backend connected
- [ ] API keys configured correctly
- [ ] Firewall rules allow required ports
- [ ] Python agent connecting successfully
- [ ] Test room creation and video streaming

---

### Day 5-7: Frontend Deployment (Cloud Storage + CDN)

**Frontend Apps to Deploy**:
1. **Landing** → `www-staging.platform.com`
2. **Dashboard** → `dashboard-staging.platform.com`
3. **Meeting** → `meet-staging.platform.com`
4. **Widget SDK** → `cdn-staging.platform.com/widget/`

**Build and Deploy**:
```bash
# Build all frontend apps
pnpm build

# Upload to Cloud Storage
gsutil -m cp -r apps/landing/dist/* gs://platform-staging-landing/
gsutil -m cp -r apps/dashboard/dist/* gs://platform-staging-dashboard/
gsutil -m cp -r apps/meeting/dist/* gs://platform-staging-meeting/
gsutil -m cp -r apps/widget-sdk/dist/* gs://platform-staging-widget/

# Configure Cloud CDN
gcloud compute backend-buckets create platform-landing \
  --gcs-bucket-name=platform-staging-landing \
  --enable-cdn

# Set up Load Balancer and SSL certificates
gcloud compute url-maps create platform-staging \
  --default-backend-bucket platform-landing

gcloud compute ssl-certificates create platform-staging-cert \
  --domains www-staging.platform.com,dashboard-staging.platform.com,meet-staging.platform.com

gcloud compute target-https-proxies create platform-staging-proxy \
  --url-map platform-staging \
  --ssl-certificates platform-staging-cert
```

**Validation Checklist**:
- [ ] Landing page accessible at `https://www-staging.platform.com`
- [ ] Dashboard accessible at `https://dashboard-staging.platform.com`
- [ ] Meeting app accessible at `https://meet-staging.platform.com`
- [ ] Widget SDK available at `https://cdn-staging.platform.com/widget/v1/widget.js`
- [ ] SSL certificates valid and working
- [ ] CDN caching configured (check headers)
- [ ] All static assets loading correctly
- [ ] API connections working from frontend

---

## 🔄 Week 3: CI/CD & Validation

### Day 1-3: GitHub Actions CI/CD

**Pipelines to Create**:
1. **test.yml** - Run on every PR (linting, type checking, tests)
2. **deploy-staging.yml** - Deploy on push to main branch
3. **deploy-production.yml** - Deploy on release tag (future)

**GitHub Actions Workflow** (`.github/workflows/deploy-staging.yml`):
```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      - name: Build and push API
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/platform-api:${{ github.sha }} packages/api
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/platform-api:${{ github.sha }}
          gcloud run deploy platform-api --image gcr.io/${{ secrets.GCP_PROJECT }}/platform-api:${{ github.sha }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to Cloud Storage
        run: |
          gsutil -m rsync -r -d apps/landing/dist gs://platform-staging-landing
          gsutil -m rsync -r -d apps/dashboard/dist gs://platform-staging-dashboard
```

**Validation Checklist**:
- [ ] Test workflow runs on every PR
- [ ] Deploy workflow runs on push to main
- [ ] Workload Identity configured (no service account keys)
- [ ] Secrets configured in GitHub repository
- [ ] Build and push Docker images successfully
- [ ] Cloud Run deployments successful
- [ ] Frontend uploads to Cloud Storage working
- [ ] Post-deployment health checks passing

---

### Day 4-5: Monitoring & Observability

**Monitoring Stack**:
1. **Google Cloud Monitoring** - Infrastructure metrics
2. **Cloud Logging** - Application logs
3. **Uptime Checks** - Availability monitoring
4. **Alerting Policies** - Incident notifications

**Metrics to Monitor**:
```yaml
API Server:
  - Request rate (requests/second)
  - Error rate (4xx, 5xx)
  - P50, P95, P99 latency
  - CPU and memory usage
  - Database connection pool

WebSocket Server:
  - Active connections
  - Message throughput
  - Redis pub/sub lag
  - Connection errors

Database:
  - Query latency
  - Connection count
  - Disk usage
  - Replication lag (if enabled)

Redis:
  - Memory usage
  - Hit rate
  - Commands/second
  - Evictions

LiveKit:
  - Active rooms
  - Participant count
  - Video/audio quality
  - TURN server usage
```

**Alerting Policies**:
```yaml
Critical (PagerDuty):
  - API error rate > 5%
  - Database connections exhausted
  - Redis out of memory
  - LiveKit server down

Warning (Email):
  - API P95 latency > 500ms
  - Database disk > 80%
  - Redis memory > 75%
  - Active WebSocket connections > 1000
```

**Validation Checklist**:
- [ ] Cloud Monitoring dashboards created
- [ ] Application logs flowing to Cloud Logging
- [ ] Uptime checks configured for all services
- [ ] Alert policies configured and tested
- [ ] Alert notifications working (email, Slack, PagerDuty)
- [ ] Log-based metrics created for custom events
- [ ] Error tracking integrated (Sentry or similar)

---

### Day 6-7: End-to-End Testing & Validation

**Test Scenarios**:
1. **User Registration & Login** (Auth.js OAuth)
2. **AI Chat** (GPT-4o-mini/GPT-4o routing)
3. **Real-time Chat** (WebSocket + Redis Streams)
4. **Video Meeting** (LiveKit + Python agent)
5. **Knowledge Upload** (RAG system)
6. **Survey System** (Multi-tier fallback)
7. **Problem Escalation** (Human agent handoff)

**Performance Benchmarks**:
```yaml
API Endpoints:
  - Health check: < 50ms (P95)
  - tRPC queries: < 200ms (P95)
  - AI chat: < 2s (P95)
  - Knowledge search: < 500ms (P95)

Frontend:
  - Page load (First Contentful Paint): < 1s
  - Time to Interactive: < 3s
  - Lighthouse Performance: > 90

WebSocket:
  - Connection time: < 500ms
  - Message latency: < 100ms
  - Auto-reconnect: < 3s

LiveKit:
  - Room join: < 2s
  - Video start: < 3s
  - Audio latency: < 300ms
```

**48-Hour Soak Test**:
- [ ] All services running continuously
- [ ] Zero critical errors
- [ ] Memory stable (no leaks)
- [ ] CPU usage within limits
- [ ] Database connections stable
- [ ] Redis memory stable
- [ ] No service restarts

**Validation Checklist**:
- [ ] All test scenarios passing
- [ ] Performance benchmarks met
- [ ] 48-hour soak test completed
- [ ] Error rates < 0.1%
- [ ] All monitoring alerts working
- [ ] Load testing completed (100 concurrent users)
- [ ] Security scan passed (OWASP ZAP or similar)

---

## 📚 Documentation Requirements

### Deployment Guides
- [ ] `infrastructure/staging/README.md` - One-command deployment
- [ ] `docs/operations/deployment/staging.md` - Complete staging guide
- [ ] `docs/operations/troubleshooting.md` - Common issues and solutions
- [ ] `docs/operations/cost-optimization.md` - Cost management strategies

### Runbooks
- [ ] Incident response procedures
- [ ] Service restart procedures
- [ ] Database backup and restore
- [ ] Rollback procedures
- [ ] Scaling procedures

### Architecture Diagrams
- [ ] Infrastructure architecture (draw.io or Lucidchart)
- [ ] Network topology
- [ ] Data flow diagrams
- [ ] Deployment architecture

---

## 🎯 Success Metrics

### Phase 9 Completion Criteria

**Infrastructure** (Must Have):
- ✅ All services deployed to GCP staging
- ✅ Database fully migrated (28 tables, 76+ RLS policies)
- ✅ Redis Streams operational
- ✅ LiveKit self-hosted server running
- ✅ All frontend apps deployed with SSL

**CI/CD** (Must Have):
- ✅ GitHub Actions workflows active
- ✅ Automated testing on every PR
- ✅ Automated deployment on main push
- ✅ Zero-downtime deployments

**Observability** (Must Have):
- ✅ Monitoring dashboards complete
- ✅ Alerting policies configured
- ✅ Log aggregation working
- ✅ Uptime checks passing

**Performance** (Must Have):
- ✅ API P95 latency < 200ms
- ✅ Frontend load time < 3s
- ✅ WebSocket message latency < 100ms
- ✅ Zero critical errors in 48h soak test

**Documentation** (Must Have):
- ✅ Deployment guides complete
- ✅ Runbooks created
- ✅ Architecture diagrams published

---

## 🚧 Known Risks & Mitigation

### Risk 1: GCP Cost Overruns
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Set up billing alerts at $100, $150, $200
- Use Committed Use Discounts for production
- Auto-scaling to zero for idle services
- Regular cost review (weekly)

### Risk 2: LiveKit Self-Hosted Reliability
**Impact**: High
**Probability**: Low
**Mitigation**:
- Monitor LiveKit server 24/7 with Uptime checks
- Auto-restart on failure with systemd
- Keep LiveKit Enterprise as fallback option
- Regular backups of LiveKit configuration

### Risk 3: Database Migration Issues
**Impact**: Critical
**Probability**: Low
**Mitigation**:
- Test all 12 migrations on staging first
- Verify RLS policies before production
- Backup before each migration
- Rollback plan documented

### Risk 4: WebSocket Sticky Sessions
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Configure load balancer for sticky sessions
- Implement Redis-backed session storage
- Test multi-instance message delivery
- Document sticky session setup

---

## 📝 Phase Transition Workflow

After Phase 9 completion:
1. **Document Phase 9 Implementation**: Create `docs/phases/phase-9-implementation.md`
2. **Update Project Status**: Update README, roadmap, CLAUDE.md with Phase 9 complete
3. **Production Readiness Assessment**: Complete audit checklist
4. **Resume Phase 12**: Create Phase 12 continuation plan based on staging insights

---

## 📞 Support & Escalation

**Primary Contact**: Development Team
**Escalation Path**: Infrastructure Team → Engineering Lead → CTO

**Emergency Procedures**:
1. Check monitoring dashboards
2. Review recent deployments (rollback if needed)
3. Check error logs in Cloud Logging
4. Escalate if unresolved in 30 minutes

---

## ✅ Pre-Flight Checklist

Before starting Phase 9:
- [ ] All documentation updates committed (README, roadmap, CLAUDE.md)
- [ ] Phase 10 and Phase 11 implementation docs complete
- [ ] Phase 12 marked as paused at 50%
- [ ] GCP account ready with billing enabled
- [ ] Team aligned on deployment strategy
- [ ] Budget approval for staging costs ($125-200/month)
- [ ] Monitoring tools selected and configured
- [ ] Incident response procedures documented

---

**Phase 9 is now ready to begin. Follow this checklist systematically, validating each step before proceeding to the next.**
