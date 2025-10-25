# Production Deployment Guide

**Enterprise AI Assistant Platform**

This guide covers all deployment strategies from simple PaaS platforms to enterprise Kubernetes clusters.

---

## 🎯 Deployment Strategy Overview

**Blue-Green Deployments**: Zero-downtime releases with instant rollback

**Infrastructure Options**:
1. **Quick Start** - Railway/Fly.io PaaS (recommended for MVP)
2. **Traditional** - VMs with PM2 + Nginx (full control)
3. **Enterprise** - Kubernetes clusters (high availability)

---

## Prerequisites

### Required Services

- **PostgreSQL 16+** (minimum 17.3/16.7/15.11/14.16/13.19)
- **Redis 7.4.2+** (or 7.2.7+ for older major version)
- **Node.js 20+ LTS**
- **pnpm 9+**

### 🚨 Security Patches (CRITICAL)

Apply these patches **before** deployment (7-day patch window):

1. **PostgreSQL**: SQL injection vulnerability actively exploited
   - Upgrade to 17.3 / 16.7 / 15.11 / 14.16 / 13.19

2. **Redis**: 4 RCE vulnerabilities (CVSS 7.0-8.8)
   - Upgrade to 7.4.2+ or 7.2.7+

3. **Fastify**: Content-type parsing bypass
   - Ensure 5.3.2+

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth.js
AUTH_SECRET="<32+ character random string>"
AUTH_TRUST_HOST="true"
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"
MICROSOFT_CLIENT_ID="<microsoft-oauth-client-id>"
MICROSOFT_CLIENT_SECRET="<microsoft-oauth-client-secret>"

# Application
NODE_ENV="production"
PORT="3001"
APP_VERSION="1.0.0"

# Optional: Monitoring
SENTRY_DSN="<sentry-dsn>"
```

### Generating Secrets

```bash
# AUTH_SECRET (32+ characters)
openssl rand -base64 32

# Database password (20+ characters)
openssl rand -base64 20
```

---

## Option 1: Quick Start (PaaS)

### Railway Deployment (Recommended)

**Setup**:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
railway variables set AUTH_SECRET="$(openssl rand -base64 32)"
railway variables set OPENAI_API_KEY="sk-..."
```

**railway.json**:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start:api",
    "healthcheckPath": "/trpc/health.check",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Auto-Deploy on Push**:

```yaml
# .github/workflows/deploy-railway.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway
        run: npm install -g @railway/cli

      - name: Deploy
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Fly.io Deployment (Alternative)

**fly.toml**:

```toml
app = "platform-api"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["gcr.io/paketo-buildpacks/nodejs"]

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 2

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    timeout = "5s"
    path = "/trpc/health.check"

[deploy]
  release_command = "pnpm db:push"

[scaling]
  min_count = 2
  max_count = 10
```

**Deploy**:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app
flyctl launch

# Deploy
flyctl deploy
```

---

## Option 2: Traditional VMs (PM2 + Nginx)

### 1. Database Setup

```bash
# Create database and user
psql -U postgres << EOF
CREATE DATABASE platform;
CREATE USER platform WITH ENCRYPTED PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE platform TO platform;
\c platform
CREATE EXTENSION IF NOT EXISTS vector;
EOF

# Run migrations
pnpm db:push

# Verify RLS configuration (should return 15)
psql -U platform -d platform -c "
  SELECT COUNT(*) as rls_tables
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;
"
```

### 2. Install Dependencies

```bash
# Production install
pnpm install --prod --frozen-lockfile

# Build all packages
pnpm build
```

### 3. PM2 Process Manager

**Install PM2**:

```bash
npm install -g pm2
```

**ecosystem.config.js**:

```javascript
module.exports = {
  apps: [{
    name: 'platform-api',
    script: 'packages/api/dist/index.js',
    instances: 4,  // Number of CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '500M',
    error_file: '/var/log/platform/api-error.log',
    out_file: '/var/log/platform/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

**Start Application**:

```bash
# Start
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### 4. Nginx Reverse Proxy

**/etc/nginx/sites-available/platform-api**:

```nginx
upstream platform_api {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.platform.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.platform.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.platform.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.platform.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/platform-api-access.log;
    error_log /var/log/nginx/platform-api-error.log;

    # Proxy configuration
    location / {
        proxy_pass http://platform_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no auth)
    location /trpc/health {
        proxy_pass http://platform_api;
        access_log off;
    }
}
```

**Enable Site**:

```bash
sudo ln -s /etc/nginx/sites-available/platform-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 3: Kubernetes (Enterprise)

### Deployment Manifest

**k8s/api-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform-api
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: platform-api
  template:
    metadata:
      labels:
        app: platform-api
        version: "1.0.0"
    spec:
      containers:
      - name: api
        image: platform/api:1.0.0
        ports:
        - containerPort: 3001
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: database-url
        - name: AUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: platform-secrets
              key: auth-secret
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /trpc/health.liveness
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /trpc/health.readiness
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
---
apiVersion: v1
kind: Service
metadata:
  name: platform-api
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: platform-api
  ports:
  - port: 80
    targetPort: 3001
    protocol: TCP
    name: http
```

---

## Managed Database Services

### Neon PostgreSQL (Recommended)

```bash
# Create production database
neonctl projects create --name platform-production

# Get connection string
neonctl connection-string platform-production

# Set environment
export DATABASE_URL="postgresql://..."

# Run migrations
pnpm db:push
```

### Upstash Redis

```bash
# Create via dashboard: https://upstash.com
# Get connection string
export REDIS_URL="redis://..."
```

---

## CDN for Widget SDK

### Cloudflare R2 Setup

```bash
# Build widget
cd apps/widget-sdk
pnpm build

# Upload to Cloudflare R2
aws s3 cp dist/ s3://platform-cdn/widget/v1/ --recursive \
  --endpoint-url https://[account-id].r2.cloudflarestorage.com
```

### Versioning Strategy

```
cdn.platform.com/widget/
├── v1/
│   ├── widget.js (latest v1.x.x)
│   └── widget.min.js
├── v1.0.0/
│   └── widget.js (specific version)
└── latest/
    └── widget.js (always latest, risky)
```

---

## Secrets Management

### GitHub Secrets

```bash
# Add secrets to repository
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set REDIS_URL --body "redis://..."
gh secret set AUTH_SECRET --body "$(openssl rand -base64 32)"
gh secret set OPENAI_API_KEY --body "sk-..."
gh secret set RAILWAY_TOKEN --body "..."
```

---

## CI/CD Pipeline

### Complete GitHub Actions Workflow

**.github/workflows/ci-cd.yml**:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Widget to CDN
        run: |
          cd apps/widget-sdk
          pnpm build
          aws s3 sync dist/ s3://platform-cdn/widget/v1/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.CDN_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.CDN_SECRET_KEY }}
```

---

## Health Checks

### Implementation

```typescript
// packages/api/src/routes/health.ts
export async function healthCheck() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    livekit: await checkLiveKit(),
  };

  const healthy = Object.values(checks).every((c) => c.healthy);

  return {
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION,
    checks,
  };
}

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    const rlsCheck = await db.execute(sql`
      SELECT COUNT(*) as rls_tables
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
    `);
    return {
      status: 'up',
      responseTime: Date.now(),
      details: { rlsConfigured: rlsCheck.rows[0].rls_tables === 15 }
    };
  } catch (error) {
    return { status: 'down', error: error.message };
  }
}
```

### Verification

```bash
# Comprehensive health check
curl https://api.platform.com/trpc/health.check | jq

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-25T...",
#   "uptime": 12345,
#   "version": "1.0.0",
#   "checks": {
#     "database": { "status": "up", "responseTime": 45, "details": { "rlsConfigured": true } },
#     "redis": { "status": "up" }
#   }
# }
```

---

## Rollback Procedures

### Railway

```bash
railway rollback
```

### Fly.io

```bash
flyctl releases list
flyctl releases rollback <version>
```

### PM2

```bash
# Stop current version
pm2 stop platform-api

# Restore previous version
git checkout <previous-tag>
pnpm install --prod
pnpm build

# Restart
pm2 start ecosystem.config.js

# Verify
curl http://localhost:3001/trpc/health.check
```

### Kubernetes

```bash
kubectl rollout undo deployment/platform-api -n production
kubectl rollout status deployment/platform-api -n production
```

---

## Scaling

### Horizontal Scaling

**Railway**: Auto-scales based on CPU/memory

**Fly.io**:
```bash
flyctl scale count 5
flyctl scale vm performance-2x
```

**PM2**:
```bash
pm2 scale platform-api 8  # 8 instances
```

**Kubernetes**:
```bash
kubectl scale deployment platform-api --replicas=10 -n production
```

### Database Scaling

**Neon**: Auto-scales compute
```bash
# Add read replicas
neonctl replicas add --name analytics-replica
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Comprehensive check
curl https://api.platform.com/trpc/health.check | jq

# Liveness probe
curl https://api.platform.com/trpc/health.liveness

# Readiness probe
curl https://api.platform.com/trpc/health.readiness

# Metrics
curl https://api.platform.com/trpc/health.metrics | jq
```

### 2. Database Connectivity

```bash
# Connection test
psql -U platform -d platform -c "SELECT COUNT(*) FROM tenants;"

# RLS function test
psql -U platform -d platform -c "SELECT get_current_tenant_id();"

# Verify all 15 tables have RLS
psql -U platform -d platform -c "
  SELECT tablename, relrowsecurity as rls_enabled
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  ORDER BY tablename;
"
```

### 3. Auth.js Integration

```bash
# Test OAuth redirect (should redirect to Google/Microsoft)
curl -I https://api.platform.com/api/auth/signin/google
curl -I https://api.platform.com/api/auth/signin/microsoft
```

---

## Security Checklist

Pre-deployment verification:

- [ ] PostgreSQL security patches applied (17.3/16.7/15.11/14.16/13.19)
- [ ] Redis security patches applied (7.4.2+)
- [ ] Fastify security patches applied (5.3.2+)
- [ ] AUTH_SECRET is 32+ random characters (not default)
- [ ] Database credentials are strong (20+ characters) and rotated
- [ ] HTTPS/TLS configured with valid certificates
- [ ] Security headers configured (X-Frame-Options, CSP, HSTS)
- [ ] RLS policies enabled on all 15 tables with FORCE mode
- [ ] OAuth credentials are production keys (not development)
- [ ] Environment variables stored securely (not in code/git)
- [ ] Firewall configured (allow only 80/443 externally)
- [ ] Rate limiting configured (100 req/min per IP)
- [ ] CORS configured for allowed origins only
- [ ] All dependencies updated to latest secure versions

---

## Monitoring Setup

See `observability.md` for comprehensive monitoring configuration.

**Quick Health Monitoring**:

```bash
# Health check monitoring (every 5 minutes)
*/5 * * * * curl -f https://api.platform.com/trpc/health.check || alert-team

# Metrics collection (every 1 minute)
*/1 * * * * curl https://api.platform.com/trpc/health.metrics | send-to-prometheus
```

---

## Next Steps

After successful deployment:

1. **Phase 4**: Frontend apps (Landing, Dashboard, Meeting)
2. **Phase 5**: AI Integration + LiveKit ($5K-10K/month budget required)
3. **Phase 6**: Real-time features (WebSocket + Redis Streams)
4. **Phase 7**: Widget SDK production release
5. **Phase 8**: Production security hardening (MFA, audit logs, GDPR)

---

## Support Resources

- **Monitoring**: `docs/operations/observability.md`
- **Troubleshooting**: `docs/operations/runbook.md`
- **Architecture**: `docs/architecture/overview.md`
- **Security**: `docs/security/security-guide.md`
