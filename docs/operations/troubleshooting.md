# Troubleshooting Guide

Complete troubleshooting runbook for common issues in staging deployment.

---

## Quick Diagnosis

### System Health Check

```bash
# Run comprehensive health check
cd docs/phases/phase-9-staging-deployment/scripts
./health-check.sh

# Or manual checks
gcloud run services list --region=us-central1
gcloud sql instances list
gcloud redis instances list --region=us-central1
gcloud compute instances list
```

---

## Cloud Run Issues

### Issue: Service won't start

**Symptoms**:
- Service shows "Revision failed"
- Container exits immediately
- Health checks failing

**Diagnosis**:
```bash
# Check logs
gcloud run services logs read api-service \
  --region=us-central1 \
  --limit=100

# Check service configuration
gcloud run services describe api-service \
  --region=us-central1 \
  --format=yaml
```

**Common Causes & Solutions**:

1. **Missing environment variables**
   ```bash
   # List current env vars
   gcloud run services describe api-service \
     --region=us-central1 \
     --format="get(spec.template.spec.containers[0].env)"

   # Add missing variable
   gcloud run services update api-service \
     --region=us-central1 \
     --set-env-vars="MISSING_VAR=value"
   ```

2. **Database connection failure**
   ```bash
   # Test database connectivity from Cloud Shell
   gcloud sql connect platform-db --user=platform

   # Check VPC connector
   gcloud compute networks vpc-access connectors describe platform-connector \
     --region=us-central1

   # Verify service is using VPC connector
   gcloud run services describe api-service \
     --region=us-central1 \
     --format="get(spec.template.spec.containers[0].env.VPC_CONNECTOR)"
   ```

3. **Out of memory**
   ```bash
   # Check memory usage in logs
   gcloud run services logs read api-service \
     --region=us-central1 \
     | grep -i "memory"

   # Increase memory
   gcloud run services update api-service \
     --region=us-central1 \
     --memory=8Gi
   ```

4. **Port mismatch**
   ```bash
   # Cloud Run expects port 8080 by default
   # Ensure your app listens on PORT env var

   # Update port
   gcloud run services update api-service \
     --region=us-central1 \
     --port=3001  # If your app uses different port
   ```

### Issue: Slow response times

**Symptoms**:
- API responses >1 second
- Timeout errors
- High latency

**Diagnosis**:
```bash
# Check Cloud Run metrics
gcloud monitoring dashboards list

# Check request latency
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check instance count
gcloud run services describe api-service \
  --region=us-central1 \
  --format="get(status.traffic[0].percent)"
```

**Solutions**:

1. **Cold starts**
   ```bash
   # Set minimum instances to avoid cold starts
   gcloud run services update api-service \
     --region=us-central1 \
     --min-instances=1  # Staging: 1-2, Production: 3-5
   ```

2. **Database query optimization**
   ```bash
   # Enable query logging
   gcloud sql instances patch platform-db \
     --database-flags=log_statement=all

   # Analyze slow queries
   gcloud sql instances describe platform-db \
     --format="get(settings.ipConfiguration.privateNetwork)"
   ```

3. **Increase concurrency**
   ```bash
   # Allow more requests per instance
   gcloud run services update api-service \
     --region=us-central1 \
     --concurrency=100  # Default is 80
   ```

---

## Database Issues

### Issue: Can't connect to Cloud SQL

**Symptoms**:
- "Connection refused"
- "Host not found"
- Timeouts

**Diagnosis**:
```bash
# Check instance status
gcloud sql instances describe platform-db \
  --format="get(state)"
# Should show: RUNNABLE

# Get private IP
gcloud sql instances describe platform-db \
  --format="get(ipAddresses[0].ipAddress)"

# Test connection from Cloud Run
gcloud run services update api-service \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=postgresql://platform:PASSWORD@PRIVATE_IP:5432/platform"
```

**Solutions**:

1. **VPC peering issue**
   ```bash
   # Verify VPC peering exists
   gcloud services vpc-peerings list \
     --network=platform-vpc

   # Recreate if needed
   gcloud services vpc-peerings connect \
     --service=servicenetworking.googleapis.com \
     --ranges=google-managed-services-platform-vpc \
     --network=platform-vpc
   ```

2. **Wrong connection string**
   ```bash
   # Correct format for private IP:
   DATABASE_URL=postgresql://USER:PASSWORD@PRIVATE_IP:5432/DATABASE

   # NOT using connection name format (that's for Cloud SQL Proxy)
   ```

3. **Firewall blocking**
   ```bash
   # Check VPC firewall rules
   gcloud compute firewall-rules list \
     --filter="network:platform-vpc"

   # Ensure internal traffic is allowed
   gcloud compute firewall-rules describe platform-allow-internal
   ```

### Issue: Slow database queries

**Symptoms**:
- API timeouts
- High database CPU
- Query execution >1 second

**Diagnosis**:
```bash
# Enable performance insights
gcloud sql instances patch platform-db \
  --insights-config-query-insights-enabled \
  --insights-config-query-plans-per-minute=5

# Check current connections
gcloud sql instances describe platform-db \
  --format="get(settings.insightsConfig.queryInsightsEnabled)"

# View slow queries in Cloud Console
echo "https://console.cloud.google.com/sql/instances/platform-db/query-insights?project=$PROJECT_ID"
```

**Solutions**:

1. **Missing indexes**
   ```sql
   -- Connect to database
   gcloud sql connect platform-db --user=platform

   -- Check for missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname = 'public'
   ORDER BY n_distinct DESC;

   -- Add indexes (example)
   CREATE INDEX CONCURRENTLY idx_sessions_tenant_id ON sessions(tenant_id);
   CREATE INDEX CONCURRENTLY idx_messages_session_id ON messages(session_id);
   ```

2. **Connection pooling**
   ```bash
   # Implement PgBouncer
   # See database optimization guide

   # Or use Prisma connection pooling
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?pgbouncer=true&connection_limit=20"
   ```

3. **Upgrade instance**
   ```bash
   # Scale up temporarily for testing
   gcloud sql instances patch platform-db \
     --tier=db-n1-standard-2  # 2 vCPU, 7.5GB RAM

   # Monitor improvement
   # If performance improves, keep the larger size
   ```

---

## Redis Issues

### Issue: Can't connect to Redis

**Symptoms**:
- "Connection refused"
- "ECONNREFUSED"
- Rate limiting not working

**Diagnosis**:
```bash
# Check Redis status
gcloud redis instances describe platform-cache \
  --region=us-central1 \
  --format="get(state)"
# Should show: READY

# Get host and port
gcloud redis instances describe platform-cache \
  --region=us-central1 \
  --format="value(host,port)"

# Test from Cloud Run
# Add temporary debug endpoint in your app to test Redis
```

**Solutions**:

1. **Wrong connection string**
   ```bash
   # Correct format:
   REDIS_URL=redis://HOST:6379

   # If password protected:
   REDIS_URL=redis://:PASSWORD@HOST:6379

   # Update Cloud Run service
   gcloud run services update api-service \
     --region=us-central1 \
     --set-env-vars="REDIS_URL=redis://10.0.0.4:6379"
   ```

2. **VPC connectivity**
   ```bash
   # Ensure service uses VPC connector
   gcloud run services update api-service \
     --region=us-central1 \
     --vpc-connector=platform-connector

   # Check connector status
   gcloud compute networks vpc-access connectors describe platform-connector \
     --region=us-central1
   ```

### Issue: High memory usage

**Symptoms**:
- Redis using >90% memory
- Eviction warnings
- Connection timeouts

**Diagnosis**:
```bash
# Check memory usage
gcloud redis instances describe platform-cache \
  --region=us-central1 \
  --format="get(memorySizeGb,currentLocationId)"

# Get memory stats (if you have redis-cli access)
# redis-cli -h HOST -p 6379 INFO memory
```

**Solutions**:

1. **Increase memory**
   ```bash
   # Upgrade to larger instance
   gcloud redis instances update platform-cache \
     --region=us-central1 \
     --size=2  # 2GB
   ```

2. **Set eviction policy**
   ```bash
   # Configure maxmemory-policy
   gcloud redis instances update platform-cache \
     --region=us-central1 \
     --redis-config="maxmemory-policy=allkeys-lru"
   ```

3. **Clear old data**
   ```bash
   # Review TTLs in your application
   # Ensure rate limit keys have proper expiration
   # Example in code:
   # redis.setex('rate_limit:user:123', 3600, '100')  # 1 hour TTL
   ```

---

## LiveKit Issues

### Issue: WebRTC connections fail

**Symptoms**:
- "ICE connection failed"
- No video/audio
- Connection timeouts

**Diagnosis**:
```bash
# SSH into LiveKit server
gcloud compute ssh livekit-server --zone=us-central1-a

# Check LiveKit logs
sudo docker-compose logs livekit | tail -100

# Test connectivity
curl http://localhost:7881/

# Check ports
sudo netstat -tunlp | grep 7880
sudo netstat -tunlp | grep 50000
```

**Solutions**:

1. **Firewall issues**
   ```bash
   # Verify GCP firewall rules
   gcloud compute firewall-rules describe platform-allow-livekit

   # Check UFW on VM
   sudo ufw status

   # Ensure UDP ports are open
   sudo ufw allow 50000:50100/udp
   ```

2. **External IP not detected**
   ```bash
   # Get VM external IP
   gcloud compute instances describe livekit-server \
     --zone=us-central1-a \
     --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

   # Update livekit.yaml
   sudo nano /opt/livekit/livekit.yaml

   # Add:
   rtc:
     use_external_ip: true
     external_ip: "YOUR_STATIC_IP"

   # Restart
   sudo docker-compose restart livekit
   ```

3. **TURN server needed**
   ```bash
   # For restrictive networks, TURN is required
   # Enable in livekit.yaml:
   turn:
     enabled: true
     domain: "livekit-staging.platform.com"
     udp_port: 3478
     tls_port: 5349
   ```

### Issue: LiveKit container keeps restarting

**Symptoms**:
- Docker container in restart loop
- Logs show startup errors

**Diagnosis**:
```bash
# Check container status
sudo docker-compose ps

# Check logs
sudo docker-compose logs --tail=200 livekit

# Check configuration
sudo docker-compose config
```

**Solutions**:

1. **Invalid configuration**
   ```bash
   # Validate YAML syntax
   sudo docker-compose config

   # Check livekit.yaml
   sudo nano /opt/livekit/livekit.yaml

   # Common issues:
   # - Indentation errors
   # - Missing required fields
   # - Invalid port numbers
   ```

2. **Port conflicts**
   ```bash
   # Check if ports are already in use
   sudo netstat -tunlp | grep 7880
   sudo netstat -tunlp | grep 7881

   # Kill conflicting process or change ports
   ```

3. **Out of memory**
   ```bash
   # Check VM memory
   free -h

   # Check Docker limits
   docker stats

   # Upgrade VM if needed
   gcloud compute instances stop livekit-server --zone=us-central1-a
   gcloud compute instances set-machine-type livekit-server \
     --zone=us-central1-a \
     --machine-type=n2-standard-8
   gcloud compute instances start livekit-server --zone=us-central1-a
   ```

---

## Frontend Issues

### Issue: Frontend not loading

**Symptoms**:
- 404 errors
- Blank page
- "NoSuchBucket" errors

**Diagnosis**:
```bash
# Check bucket exists
gsutil ls gs://platform-staging-landing

# Check bucket permissions
gsutil iam get gs://platform-staging-landing

# Test direct access
curl -I https://storage.googleapis.com/platform-staging-landing/index.html
```

**Solutions**:

1. **Bucket not public**
   ```bash
   # Make bucket public
   gsutil iam ch allUsers:objectViewer gs://platform-staging-landing

   # Or use signed URLs for private content
   ```

2. **Files not uploaded**
   ```bash
   # Upload files
   cd apps/landing
   pnpm build
   gsutil -m rsync -r -d dist/ gs://platform-staging-landing/

   # Verify
   gsutil ls -r gs://platform-staging-landing/
   ```

3. **CORS issues**
   ```bash
   # Create cors.json
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF

   # Apply CORS
   gsutil cors set cors.json gs://platform-staging-landing
   ```

### Issue: API calls failing from frontend

**Symptoms**:
- CORS errors
- 403 Forbidden
- Network errors

**Diagnosis**:
```bash
# Check API CORS configuration
curl -H "Origin: https://staging.platform.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://api-service-xxx.run.app/api/trpc

# Check from browser console
# Look for Access-Control-Allow-Origin headers
```

**Solutions**:

1. **Configure CORS**
   ```javascript
   // In packages/api/src/server.ts
   fastify.register(cors, {
     origin: [
       'https://staging.platform.com',
       'https://dashboard-staging.platform.com',
       'https://meet-staging.platform.com',
       'http://localhost:5173', // Development
       'http://localhost:5174',
     ],
     credentials: true,
   });
   ```

2. **Update environment variables**
   ```bash
   # Add frontend URLs to API service
   gcloud run services update api-service \
     --region=us-central1 \
     --set-env-vars="ALLOWED_ORIGINS=https://staging.platform.com,https://dashboard-staging.platform.com"
   ```

---

## Performance Issues

### Issue: High costs

**Symptoms**:
- Billing alerts
- Unexpected charges
- Budget overruns

**Diagnosis**:
```bash
# Check current spend
gcloud billing accounts list

# View cost breakdown
echo "https://console.cloud.google.com/billing/reports?project=$PROJECT_ID"

# Check resource usage
gcloud run services list --format="table(name,region,status.url)"
gcloud compute instances list
gcloud sql instances list
```

**Solutions**:

1. **Scale down unused services**
   ```bash
   # Reduce Cloud Run instances during off-hours
   gcloud run services update api-service \
     --region=us-central1 \
     --min-instances=0  # Allow scaling to zero

   # Stop LiveKit VM when not in use (staging only)
   gcloud compute instances stop livekit-server --zone=us-central1-a
   ```

2. **Optimize database**
   ```bash
   # Use smaller instance for staging
   gcloud sql instances patch platform-db \
     --tier=db-f1-micro  # Smallest tier

   # Delete old backups
   gcloud sql backups list --instance=platform-db
   gcloud sql backups delete BACKUP_ID --instance=platform-db
   ```

3. **Review bandwidth usage**
   ```bash
   # Check egress costs
   # Main culprit: AI API calls

   # Ensure you're using Vertex AI for Gemini (no egress)
   # Verify in code: packages/ai-core/src/providers/gemini.ts
   ```

### Issue: Slow page loads

**Symptoms**:
- First Contentful Paint >3s
- Large bundle sizes
- Poor Lighthouse scores

**Diagnosis**:
```bash
# Check bundle sizes
cd apps/landing
pnpm build
du -sh dist/*

# Run Lighthouse
npx lighthouse https://staging.platform.com \
  --output=html \
  --output-path=./lighthouse-report.html
```

**Solutions**:

1. **Enable CDN caching**
   ```bash
   # Set cache headers
   gsutil -m setmeta \
     -h "Cache-Control:public, max-age=31536000, immutable" \
     "gs://platform-staging-landing/assets/**"

   # Set shorter cache for HTML
   gsutil -m setmeta \
     -h "Cache-Control:public, max-age=3600" \
     "gs://platform-staging-landing/*.html"
   ```

2. **Enable compression**
   ```bash
   # Gzip already enabled by Cloud Storage
   # Verify:
   curl -H "Accept-Encoding: gzip" \
     -I https://storage.googleapis.com/platform-staging-landing/index.html \
     | grep "content-encoding"
   ```

3. **Code splitting**
   ```javascript
   // In Vite config
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             ui: ['@radix-ui/react-*'],
           },
         },
       },
     },
   });
   ```

---

## Emergency Procedures

### Complete System Failure

```bash
# 1. Check overall system status
gcloud monitoring dashboards list

# 2. Restart all services
./scripts/restart-all-services.sh

# 3. If database is down
gcloud sql instances restart platform-db

# 4. If Redis is down
gcloud redis instances failover platform-cache --region=us-central1

# 5. Rollback recent changes
gcloud run services update-traffic api-service \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

### Data Loss Prevention

```bash
# Create emergency backup
gcloud sql backups create \
  --instance=platform-db \
  --description="Emergency backup $(date +%Y%m%d_%H%M%S)"

# Export to Cloud Storage
gcloud sql export sql platform-db \
  gs://platform-backups/emergency-$(date +%Y%m%d_%H%M%S).sql \
  --database=platform
```

### Incident Response Checklist

1. ✅ Identify affected services
2. ✅ Check error logs and metrics
3. ✅ Notify team (if production)
4. ✅ Create incident ticket
5. ✅ Execute rollback if needed
6. ✅ Fix root cause
7. ✅ Test fix in staging
8. ✅ Deploy fix
9. ✅ Post-mortem documentation

---

## Getting Help

### Support Channels

**GCP Support**:
- Console: https://console.cloud.google.com/support
- Documentation: https://cloud.google.com/docs

**LiveKit Support**:
- Docs: https://docs.livekit.io
- Community: https://livekit.io/community

**Project Issues**:
- GitHub: Create issue in project repository
- Team: Contact via Slack/email

### Useful Commands Reference

```bash
# Quick diagnostics
./scripts/health-check.sh
./scripts/view-logs.sh
./scripts/check-costs.sh

# Service management
./scripts/restart-service.sh [service-name]
./scripts/scale-service.sh [service-name] [instances]
./scripts/rollback-service.sh [service-name]

# Database management
./scripts/db-backup.sh
./scripts/db-restore.sh [backup-id]
./scripts/db-query-stats.sh
```

---

**Last Updated**: 2025-01-27
**Maintained By**: Platform Team
**Review Schedule**: Monthly
