# Infrastructure

Production-ready deployment infrastructure for the AI Assistant Platform.

---

## Directory Structure

```
infrastructure/
├── staging/
│   ├── deploy.sh      # Automated staging deployment script
│   └── .env.example   # Staging environment configuration template
├── production/
│   ├── deploy.sh      # Automated production deployment script
│   └── .env.example   # Production environment configuration template
├── docker/            # Docker development environment
│   └── docker-compose.yml
└── k8s/               # Kubernetes manifests (future)
    └── ...
```

---

## Quick Start

### Staging Deployment

```bash
cd staging

# Configure environment
cp .env.example .env
# Edit .env with your GCP credentials and API keys

# Run deployment
./deploy.sh

# Or deploy specific phases
./deploy.sh --skip-frontend  # Skip frontend deployment
./deploy.sh --verify-only    # Only verify existing deployment
```

### Production Deployment

```bash
cd production

# Configure environment
cp .env.example .env
# Edit .env with production credentials

# Run deployment with safety checks
./deploy.sh

# Production uses blue-green deployment by default
```

---

## Deployment Scripts

Both `staging/deploy.sh` and `production/deploy.sh` support:

**Options**:
```bash
--skip-infrastructure    Skip infrastructure setup (use existing)
--skip-database         Skip database setup (use existing)
--skip-backend          Skip backend deployment
--skip-frontend         Skip frontend deployment
--skip-monitoring       Skip monitoring setup
--verify-only           Only run verification checks
--help                  Show help message
```

**Phases**:
1. Infrastructure (VPC, subnets, firewall, static IPs)
2. Database (Cloud SQL PostgreSQL + MemoryStore Redis)
3. LiveKit (GCE VM with Docker Compose)
4. Backend (Cloud Run deployments)
5. Frontend (Cloud Storage + CDN)
6. Monitoring (alerts and dashboards)

---

## Environment Configuration

### Required Variables

```bash
# GCP Project
PROJECT_ID=platform-staging
REGION=us-central1
ZONE=us-central1-a

# Database
DATABASE_PASSWORD=<32+ character password>
REDIS_PASSWORD=<32+ character password>

# Authentication
NEXTAUTH_SECRET=<32+ character secret>

# AI Providers
GOOGLE_API_KEY=<your-google-api-key>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
DEEPGRAM_API_KEY=<your-deepgram-api-key>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
VOYAGE_API_KEY=<your-voyage-api-key>

# LiveKit
LIVEKIT_API_KEY=<generated-during-setup>
LIVEKIT_API_SECRET=<generated-during-setup>
```

See `.env.example` for complete configuration template.

---

## Architecture

### Staging

```
Compute:
  - Cloud Run (API, WebSocket, Python Agent)
  - GCE VM (LiveKit self-hosted)

Data:
  - Cloud SQL PostgreSQL 16 (db-n1-standard-1)
  - MemoryStore Redis 7.4 (1GB Basic)

Storage:
  - Cloud Storage (frontend apps)
  - Cloud CDN (edge caching)

Cost: $225-280/month
```

### Production

```
Compute:
  - Cloud Run (higher min instances)
  - GCE VM cluster (3x LiveKit instances)

Data:
  - Cloud SQL PostgreSQL 16 (db-n1-standard-4)
  - Cloud SQL Read Replica (same spec)
  - MemoryStore Redis 7.4 (5GB HA)

Storage:
  - Cloud Storage (multi-region)
  - Cloud CDN (global edge)

Cost: $650-900/month (with Committed Use Discounts)
```

---

## Prerequisites

### Tools

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

### GCP Setup

1. Create project: https://console.cloud.google.com/projectcreate
2. Enable billing: https://console.cloud.google.com/billing
3. Set project ID:
   ```bash
   export PROJECT_ID=platform-staging
   gcloud config set project $PROJECT_ID
   ```

---

## Operational Guides

Comprehensive operational documentation available in `/docs/operations/`:

- **Deployment**: [`/docs/operations/deployment/staging.md`](../docs/operations/deployment/staging.md)
- **Production**: [`/docs/operations/deployment/production.md`](../docs/operations/deployment/production.md)
- **LiveKit**: [`/docs/operations/deployment/livekit-deployment.md`](../docs/operations/deployment/livekit-deployment.md)
- **Troubleshooting**: [`/docs/operations/troubleshooting.md`](../docs/operations/troubleshooting.md)
- **Cost Optimization**: [`/docs/operations/cost-optimization.md`](../docs/operations/cost-optimization.md)

---

## CI/CD Integration

GitHub Actions workflows are available in `.github/workflows/`:

- `test.yml` - Automated testing (runs on every PR)
- `deploy-staging.yml` - Staging deployment (push to main)
- `deploy-production.yml` - Production deployment (releases)

---

## Security

### Best Practices

- ✅ Never commit `.env` files (use `.env.example` as template)
- ✅ Store secrets in GCP Secret Manager
- ✅ Use VPC private networking
- ✅ Enable firewall rules
- ✅ Rotate secrets regularly
- ✅ Use HTTPS for all services

### Production Checklist

- [ ] SSL/TLS certificates configured
- [ ] IP whitelisting for admin access
- [ ] Audit logging enabled
- [ ] Automated backups verified
- [ ] Disaster recovery tested
- [ ] Security scan completed (target: 95+ score)

---

## Monitoring

### Health Checks

```bash
# API
curl https://<API_URL>/health

# WebSocket
curl https://<WS_URL>/health

# LiveKit
curl http://<LIVEKIT_IP>:7881/
```

### Logs

```bash
# Cloud Run services
gcloud run services logs read api-service --region=us-central1 --limit=100

# LiveKit
gcloud compute ssh livekit-server --zone=us-central1-a
docker logs livekit-livekit-1
```

---

## Troubleshooting

Common issues and solutions:

**Service won't start**:
```bash
# Check logs
gcloud run services logs read <service-name> --region=us-central1 --limit=100

# Update environment variables
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

See [/docs/operations/troubleshooting.md](../docs/operations/troubleshooting.md) for comprehensive troubleshooting guide.

---

## Cost Monitoring

### Current Costs

**Staging**: $225-280/month
- Compute: $203-263/month
- Data: $120/month
- Storage: $17-35/month

**Production**: $650-900/month (with CUDs)
- Compute: $425-605/month
- Data: $460-740/month
- Storage: $660-900/month

### Optimization Tips

- Use Cloud Run min-instances=0 for staging
- Enable Committed Use Discounts for production (30% savings)
- Use Vertex AI for Gemini (no egress costs)
- Right-size database and Redis instances
- Monitor daily spend vs budget

See [/docs/operations/cost-optimization.md](../docs/operations/cost-optimization.md) for detailed strategies.

---

## Support

- **Documentation**: `/docs/operations/`
- **Implementation Notes**: `/docs/phases/phase-9-staging-deployment.md`
- **GCP Console**: https://console.cloud.google.com/
- **LiveKit Docs**: https://docs.livekit.io/

---

## License

See [LICENSE](../LICENSE) in project root.
