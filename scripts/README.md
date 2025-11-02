# 🛠️ Platform Management Scripts

Industry-standard infrastructure management toolkit for AI Platform on GCP.

## 📋 Available Scripts

### `destroy.sh` - Infrastructure Teardown
**Deletes ALL resources** and data from GCP.

```bash
./scripts/destroy.sh
```

**What it does**:
- Deletes Cloud Run services
- Deletes GCE instances (LiveKit)
- Deletes Cloud SQL database ⚠️ **DATA LOSS**
- Deletes Redis instance
- Deletes VPC network and firewall rules
- Deletes all secrets from Secret Manager
- Deletes container images from GCR

**Safety**: Requires typing "DELETE" to confirm.

---

### `logs.sh` - Log Viewer
View logs from all services.

```bash
./scripts/logs.sh [service] [lines]
```

**Services**:
- `api` - API server logs
- `realtime` - Realtime server logs
- `dashboard` - Dashboard logs
- `livekit` - LiveKit server logs
- `agent` - Python agent logs
- `errors` - Error logs from all services
- `follow` - Follow API server logs in real-time
- `all` - All service logs (default)

**Examples**:
```bash
./scripts/logs.sh api              # API server logs (50 lines)
./scripts/logs.sh errors 100       # Last 100 errors
./scripts/logs.sh follow           # Follow logs in real-time
./scripts/logs.sh all 200          # All services, 200 lines each
```

---

### `scale.sh` - Service Scaling
Scale Cloud Run services up or down.

```bash
./scripts/scale.sh [up|down|status|production]
```

**Commands**:
- `up` - Scale services UP (normal operation)
  - API: 1-10 instances
  - Realtime: 1-5 instances
  - Dashboard: 1-5 instances

- `down` - Scale services DOWN (cost saving, cold starts)
  - API: 0-2 instances
  - Realtime: 0-1 instances
  - Dashboard: 0-1 instances

- `status` - Show current service status

- `production` - Scale to production configuration ⚠️ **HIGH COST**
  - API: 2-20 instances, 2Gi RAM, 4 CPUs
  - Realtime: 2-10 instances, 1Gi RAM, 2 CPUs
  - Dashboard: 2-10 instances, 1Gi RAM, 2 CPUs

**Examples**:
```bash
./scripts/scale.sh up       # Scale up for normal use
./scripts/scale.sh down     # Scale down overnight
./scripts/scale.sh status   # Check current status
```

---

### `validate.sh` - Health Checks
Comprehensive validation of all services.

```bash
./scripts/validate.sh
```

**Checks**:
1. **Cloud Run Services**
   - API server health endpoint
   - Realtime server health endpoint
   - Dashboard accessibility

2. **Database & Cache**
   - PostgreSQL connection
   - Table count (28 expected)
   - RLS policies (76+ expected)
   - Redis connection

3. **LiveKit Infrastructure**
   - LiveKit server status
   - Docker container health
   - Python agent service

4. **API Endpoints**
   - Health endpoint
   - tRPC metadata

5. **Resource Utilization**
   - Cloud SQL metrics
   - Redis memory usage

6. **Security Checks**
   - Secret Manager configuration
   - Firewall rules

**Exit Codes**:
- `0` - All checks passed
- `1` - Some checks failed

---

## 🚀 Quick Start Workflow

### Initial Deployment
```bash
# 1. Deploy everything
./deploy.sh

# 2. Validate deployment
./scripts/validate.sh

# 3. Check logs
./scripts/logs.sh all
```

### Daily Operations
```bash
# Morning: Scale up
./scripts/scale.sh up

# Check status
./scripts/scale.sh status

# Evening: Scale down
./scripts/scale.sh down
```

### Troubleshooting
```bash
# Check error logs
./scripts/logs.sh errors 200

# Follow live logs
./scripts/logs.sh follow

# Validate all services
./scripts/validate.sh
```

### Cleanup
```bash
# Delete everything
./scripts/destroy.sh
```

---

## 📊 Cost Optimization

### Development Schedule (Weekdays 9am-5pm)
```bash
# 9am - Scale up
./scripts/scale.sh up

# 5pm - Scale down
./scripts/scale.sh down
```

**Savings**: ~40-60% reduction in Cloud Run costs

### Weekend Shutdown
```bash
# Friday 5pm
./scripts/scale.sh down

# Stop LiveKit (optional)
gcloud compute instances stop livekit-server --zone=$ZONE

# Monday 9am
gcloud compute instances start livekit-server --zone=$ZONE
./scripts/scale.sh up
```

**Savings**: ~70-80% reduction on weekends

---

## 🔐 Security Best Practices

1. **Never commit `.deploy.config`** (contains secrets)
2. **Rotate secrets regularly** (every 90 days)
3. **Use Secret Manager** for all credentials
4. **Review firewall rules** before production
5. **Enable VPC Service Controls** for production

---

## 📚 Additional Resources

- **Main Deployment Guide**: `../DEPLOYMENT_GUIDE_PERSONAL.md`
- **Phase 9 Readiness**: `../docs/adr/PHASE_9_READINESS.md`
- **Project Documentation**: `../docs/`
- **GCP Console**: https://console.cloud.google.com

---

## 🆘 Emergency Contacts

**Critical Issues**:
1. Check logs: `./scripts/logs.sh errors 500`
2. Validate services: `./scripts/validate.sh`
3. Scale down to isolate: `./scripts/scale.sh down`
4. Review GCP console: https://console.cloud.google.com/logs

**Complete Failure**:
```bash
# Nuclear option - rebuild everything
./scripts/destroy.sh
./deploy.sh
```

---

## 🤝 Contributing

These scripts follow industry-standard practices:
- **POSIX-compliant** bash
- **Idempotent** operations
- **Color-coded** output
- **Error handling** with `set -e`
- **Progress tracking**

To add new scripts, follow the template in existing scripts.
