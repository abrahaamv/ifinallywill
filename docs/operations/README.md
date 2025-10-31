# Operations Documentation

Operational runbooks, deployment guides, and troubleshooting procedures for the AI Assistant Platform.

---

## 📁 Directory Structure

```
docs/operations/
├── deployment/
│   ├── staging.md               # Staging deployment guide
│   ├── production.md            # Production deployment guide
│   └── livekit-deployment.md    # LiveKit self-hosting guide
├── troubleshooting.md           # Comprehensive troubleshooting runbook
├── cost-optimization.md         # Cost management strategies
└── README.md                    # This file
```

---

## 🚀 Quick Start

### For First-Time Deployment

1. **Read Architecture**: [`deployment/staging.md`](deployment/staging.md)
2. **Configure Environment**: Copy `/infrastructure/staging/.env.example` to `.env`
3. **Run Deployment**: `cd infrastructure/staging && ./deploy.sh`
4. **Verify**: Check all health endpoints

### For Ongoing Operations

- **Troubleshooting**: See [`troubleshooting.md`](troubleshooting.md)
- **Cost Monitoring**: See [`cost-optimization.md`](cost-optimization.md)
- **Production Deployment**: See [`deployment/production.md`](deployment/production.md)

---

## 📖 Deployment Guides

### [Staging Deployment](deployment/staging.md)

Complete guide for deploying to Google Cloud Platform staging environment.

**Key Topics**:
- Quick start (one-command deployment)
- Architecture overview
- Prerequisites and setup
- Phase-by-phase deployment
- Monitoring and health checks
- Custom domain configuration
- Troubleshooting common issues

**Estimated Time**: 6-8 hours (first time), 2-3 hours (subsequent)
**Monthly Cost**: $225-280

---

### [Production Deployment](deployment/production.md)

Enterprise-grade deployment with high availability and security hardening.

**Key Topics**:
- Production requirements and checklist
- High availability architecture
- Blue-green deployment strategy
- Security hardening
- Monitoring and alerting
- Disaster recovery procedures
- Compliance and audit logging

**Estimated Time**: 8-12 hours (first time)
**Monthly Cost**: $650-900 (with Committed Use Discounts)

---

### [LiveKit Self-Hosting](deployment/livekit-deployment.md)

Comprehensive guide for self-hosting LiveKit on GCP (95-97% cost savings).

**Key Topics**:
- Cost comparison ($150-200/month vs $5K-10K/month Enterprise)
- Manual and automated deployment options
- Docker Compose configuration
- SSL/TLS setup
- Monitoring and maintenance
- Scaling and high availability
- Performance tuning

**Estimated Time**: 1-2 hours (automated), 3-4 hours (manual)
**Monthly Cost**: $150-200 (staging), $450-600 (production 3x instances)

---

## 🔧 Troubleshooting

### [Comprehensive Runbook](troubleshooting.md)

Complete troubleshooting guide for all platform services.

**Covered Services**:
- Cloud Run (API, WebSocket, Python Agent)
- Cloud SQL (PostgreSQL)
- MemoryStore (Redis)
- LiveKit (self-hosted)
- Frontend (Cloud Storage + CDN)

**Common Issues**:
- Service won't start
- Database connection failures
- Redis connectivity issues
- LiveKit WebRTC failures
- High latency or error rates
- Resource exhaustion

**Emergency Procedures**:
- Immediate mitigation steps
- Rollback procedures
- Service restart procedures
- Log analysis commands

---

## 💰 Cost Optimization

### [Cost Management Guide](cost-optimization.md)

Strategies for minimizing GCP costs while maintaining performance.

**Topics Covered**:
- Current cost breakdown (staging vs production)
- Committed Use Discounts (30-57% savings)
- Sustained Use Discounts (automatic)
- Resource right-sizing
- Monitoring and budget alerts
- Cost optimization scenarios
- Monthly/quarterly review processes

**Key Metrics**:
- Staging: $225-280/month target
- Production: $650-900/month target (with CUDs)
- LiveKit Savings: $58K-118K/year (95-97%)
- Gemini Egress Savings: ~$120/month

---

## 🛠️ Deployment Scripts

Executable deployment automation scripts are in `/infrastructure/`:

```bash
# Staging deployment
cd infrastructure/staging
./deploy.sh

# Production deployment
cd infrastructure/production
./deploy.sh

# Options
./deploy.sh --help                     # Show all options
./deploy.sh --skip-infrastructure      # Skip infrastructure setup
./deploy.sh --skip-backend            # Skip backend deployment
./deploy.sh --verify-only             # Only run health checks
```

See [`/infrastructure/README.md`](../../infrastructure/README.md) for detailed script documentation.

---

## 🔍 Monitoring & Health Checks

### Service Health Endpoints

```bash
# API Server
curl https://<API_URL>/health

# WebSocket Server
curl https://<WS_URL>/health

# LiveKit Server
curl http://<LIVEKIT_IP>:7881/
```

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read api-service --region=us-central1 --limit=100
gcloud run services logs read websocket-service --region=us-central1 --limit=100
gcloud run services logs read agent-service --region=us-central1 --limit=100

# LiveKit logs
gcloud compute ssh livekit-server --zone=us-central1-a
docker logs livekit-livekit-1 --tail=100
```

### Cost Monitoring

```bash
# View current month costs
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Set budget alerts (do this via Console)
# https://console.cloud.google.com/billing/budgets
```

---

## 📊 Architecture Overview

### Hybrid Docker Architecture

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

**Why This Architecture?**:
- Cloud Run for stateless services (auto-scaling, pay-per-request)
- GCE + Docker for LiveKit (stable connections, predictable costs)
- Managed services for databases (no maintenance, enterprise reliability)
- 95-97% cost savings on LiveKit vs Enterprise
- No egress costs for Gemini API (85% of AI requests)

---

## 🔐 Security Best Practices

### Implemented

- ✅ VPC networking with private subnets
- ✅ Firewall rules (SSH, internal, LiveKit ports)
- ✅ Database private IP (no public access)
- ✅ Environment variables in Secret Manager
- ✅ HTTPS for all Cloud Run services
- ✅ CORS configuration

### Recommended for Production

- SSL/TLS certificates for custom domains
- IP whitelisting for admin access
- Cloud Armor (DDoS protection)
- Audit logging enabled
- Regular security scans (target: 95+ score)
- Automated secret rotation

---

## 🚨 Emergency Procedures

### Service Outage

1. **Check Status**:
   ```bash
   gcloud run services list --region=us-central1
   gcloud sql instances list
   gcloud redis instances list --region=us-central1
   ```

2. **View Recent Logs**:
   ```bash
   gcloud run services logs read <service-name> --region=us-central1 --limit=100
   ```

3. **Rollback if Needed**:
   ```bash
   gcloud run services update-traffic <service-name> \
     --region=us-central1 \
     --to-revisions=<PREVIOUS_REVISION>=100
   ```

4. **Escalate**: Contact on-call engineer via PagerDuty

### Database Issues

1. **Check Connection**:
   ```bash
   gcloud sql connect platform-db --user=platform
   ```

2. **Failover to Replica** (Production):
   ```bash
   gcloud sql instances failover platform-prod-db
   ```

3. **Restore from Backup**:
   ```bash
   gcloud sql backups list --instance=platform-db
   gcloud sql backups restore <BACKUP_ID> --backup-instance=platform-db
   ```

See [troubleshooting.md](troubleshooting.md) for comprehensive emergency procedures.

---

## 📞 Support & Escalation

### Documentation

- **Deployment**: [`deployment/`](deployment/)
- **Troubleshooting**: [`troubleshooting.md`](troubleshooting.md)
- **Cost**: [`cost-optimization.md`](cost-optimization.md)
- **Implementation**: [`/docs/adr/`](../adr/)

### External Resources

- **GCP Console**: https://console.cloud.google.com/
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **LiveKit Docs**: https://docs.livekit.io/
- **Project Repository**: https://github.com/your-org/platform

### On-Call

For production incidents:
1. Check status dashboards
2. Review recent deployments
3. Follow troubleshooting runbook
4. Escalate if unresolved within 30 minutes

---

## 🎯 Performance Targets

### Staging

```yaml
API Response Time: P95 <500ms (acceptable for development)
Database Query Time: P95 <200ms
Uptime Target: 95% (sufficient for staging)
```

### Production

```yaml
API Response Time: P95 <200ms
Database Query Time: P95 <100ms
Uptime Target: 99.9% (8.7 hours/year downtime)
LiveKit Packet Loss: <1%
Error Rate: <0.5%
```

---

## 📈 Continuous Improvement

### Regular Reviews

**Weekly** (5-10 minutes):
- Review error logs
- Check cost trends
- Monitor performance metrics

**Monthly** (30-60 minutes):
- Update dependencies
- Review security patches
- Optimize resource allocation
- Verify backup restoration

**Quarterly** (2-4 hours):
- Security audit
- Disaster recovery test
- Performance optimization
- Architecture review

---

## 🔄 CI/CD Integration

GitHub Actions workflows for automated deployment:

- `.github/workflows/test.yml` - Run tests on every PR
- `.github/workflows/deploy-staging.yml` - Deploy to staging on push to main
- `.github/workflows/deploy-production.yml` - Deploy to production on release

See [deployment/staging.md](deployment/staging.md) for CI/CD configuration details.

---

## 📝 Contributing

When updating operational documentation:

1. **Test Procedures**: Verify all commands work before documenting
2. **Screenshots**: Add screenshots for complex UI operations
3. **Versioning**: Note GCP API versions and tool versions
4. **Clarity**: Write for someone unfamiliar with the system
5. **Maintenance**: Update docs when architecture changes

---

## 📄 License

See [LICENSE](../../LICENSE) in project root.

---

**Last Updated**: January 2025
**Maintained By**: Platform Engineering Team
