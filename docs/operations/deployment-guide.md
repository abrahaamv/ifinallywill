# Production Deployment Guide

**Phase 3 Backend API Infrastructure**
**Version**: 1.0.0
**Last Updated**: 2025-10-06

## Overview

This guide covers deploying the Phase 3 backend API infrastructure to production, including:
- tRPC API server (Fastify)
- PostgreSQL database with RLS
- Auth.js authentication
- Health check endpoints
- Monitoring and metrics

## Prerequisites

### Required Services

- **PostgreSQL 16+** (minimum 17.3/16.7/15.11 for security patches)
- **Redis 7.4.2+** (or 7.2.7+ for older major version - security critical)
- **Node.js 20+ LTS**
- **pnpm 9+**

### Security Patches Required

🚨 **CRITICAL**: Apply these patches before deployment:

1. **Redis**: Upgrade to 7.4.2+
   - 4 RCE vulnerabilities (CVSS 7.0-8.8)
   - 7-day patch window from project start

2. **PostgreSQL**: Upgrade to 17.3/16.7/15.11/14.16/13.19
   - SQL injection actively exploited
   - Apply immediately

3. **Fastify**: Ensure 5.3.2+
   - Content-type parsing bypass vulnerability

### Infrastructure Requirements

- **Database**: PostgreSQL with PgBouncer (50-100 connections)
- **Cache**: Redis instance (separate from realtime)
- **Load Balancer**: Sticky sessions for WebSocket support (Phase 6)
- **Monitoring**: Health check endpoint integration

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="platform"
POSTGRES_USER="platform"
POSTGRES_PASSWORD="<secure-password>"

# Redis (Phase 6)
REDIS_URL="redis://localhost:6379"

# Auth.js
AUTH_SECRET="<32+ character random string>"
AUTH_TRUST_HOST="true"  # Set in production
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"
MICROSOFT_CLIENT_ID="<microsoft-oauth-client-id>"
MICROSOFT_CLIENT_SECRET="<microsoft-oauth-client-secret>"

# Application
NODE_ENV="production"
APP_VERSION="1.0.0"
PORT="3001"

# Monitoring (Optional)
SENTRY_DSN="<sentry-dsn>"  # Error tracking
```

### Generating Secrets

```bash
# Generate AUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate database password (20+ characters)
openssl rand -base64 20
```

## Deployment Steps

### 1. Database Setup

```bash
# Create database and user
psql -U postgres << EOF
CREATE DATABASE platform;
CREATE USER platform WITH ENCRYPTED PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE platform TO platform;
EOF

# Run migrations
pnpm db:push

# Verify RLS configuration
psql -U platform -d platform -c "
  SELECT COUNT(*) as rls_tables
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;
"
# Expected: 15 tables with RLS enabled
```

### 2. Install Dependencies

```bash
# Install production dependencies only
pnpm install --prod --frozen-lockfile

# Build all packages
pnpm build
```

### 3. Run Health Check

```bash
# Start the API server
pnpm dev:api

# Verify health endpoint (different terminal)
curl http://localhost:3001/trpc/health.check

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-06T...",
#   "uptime": 12345,
#   "version": "1.0.0",
#   "checks": {
#     "database": { "status": "up", "responseTime": 45, "details": { "rlsConfigured": true } },
#     "redis": { "status": "up", "message": "Not implemented (Phase 6)" }
#   }
# }
```

### 4. Configure Process Manager

**Using PM2** (recommended):

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'platform-api',
    script: 'packages/api/dist/index.js',
    instances: 4,  # Number of CPU cores
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
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 5. Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/platform-api
upstream platform_api {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;  # Add more instances
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

    # Health check endpoint (no auth required)
    location /trpc/health {
        proxy_pass http://platform_api;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/platform-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Kubernetes Deployment (Optional)

### Deployment Manifest

```yaml
# k8s/api-deployment.yaml
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

## Post-Deployment Verification

### 1. Health Check

```bash
# Comprehensive health check
curl https://api.platform.com/trpc/health.check | jq

# Liveness probe
curl https://api.platform.com/trpc/health.liveness

# Readiness probe
curl https://api.platform.com/trpc/health.readiness

# Metrics endpoint
curl https://api.platform.com/trpc/health.metrics | jq
```

### 2. Database Connectivity

```bash
# Verify database connection from API server
psql -U platform -d platform -c "SELECT COUNT(*) FROM tenants;"

# Verify RLS function
psql -U platform -d platform -c "SELECT get_current_tenant_id();"
```

### 3. Auth.js Integration

```bash
# Test OAuth redirect (should redirect to Google/Microsoft)
curl -I https://api.platform.com/api/auth/signin/google
```

## Monitoring Setup

See `monitoring-setup.md` for detailed monitoring configuration.

**Quick Setup**:

```bash
# Health check monitoring (every 5 minutes)
*/5 * * * * curl -f https://api.platform.com/trpc/health.check || alert-team

# Metrics collection (every 1 minute)
*/1 * * * * curl https://api.platform.com/trpc/health.metrics | send-to-monitoring
```

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop current version
pm2 stop platform-api

# 2. Restore previous version
git checkout <previous-tag>
pnpm install --prod
pnpm build

# 3. Restart application
pm2 start ecosystem.config.js

# 4. Verify health
curl http://localhost:3001/trpc/health.check
```

## Security Checklist

- [ ] PostgreSQL security patches applied (17.3/16.7/15.11+)
- [ ] Redis security patches applied (7.4.2+)
- [ ] Fastify security patches applied (5.3.2+)
- [ ] AUTH_SECRET is 32+ random characters
- [ ] Database credentials are strong and rotated
- [ ] HTTPS/TLS configured with valid certificates
- [ ] Security headers configured in Nginx
- [ ] RLS policies enabled on all tables (15 tables)
- [ ] OAuth credentials are production keys (not development)
- [ ] Environment variables stored securely (not in code)
- [ ] Firewall configured (allow only 80/443/3001)

## Next Steps

After Phase 3 deployment:
- Phase 4: Frontend app development
- Phase 5: AI integration + LiveKit ($5K-10K/month budget required)
- Phase 6: Real-time features (Redis Streams, WebSocket)
- Phase 7: Widget SDK + production polish

## Support

For issues during deployment, see `runbook.md` for troubleshooting guidance.
