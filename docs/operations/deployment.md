# Production Deployment Guide

## 🎯 Deployment Strategy

**Blue-Green Deployments**: Zero-downtime releases with instant rollback

**Infrastructure as Code**: Railway/Fly.io with Git-based deployments

---

## 🚀 Railway Deployment (Recommended)

### Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set DATABASE_URL="..."
railway variables set REDIS_URL="..."
railway variables set OPENAI_API_KEY="..."
```

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start:api",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Auto-Deploy on Push

```yaml
# .github/workflows/deploy.yml
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

---

## ☁️ Fly.io Deployment (Alternative)

### fly.toml

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
    path = "/health"

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[deploy]
  release_command = "pnpm db:migrate"

[scaling]
  min_count = 2
  max_count = 10
```

### Deploy

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

## 🗄️ Database Deployment

### Neon PostgreSQL

```bash
# Create production database
neonctl projects create --name platform-production

# Get connection string
neonctl connection-string platform-production

# Set in environment
export DATABASE_URL="postgresql://..."

# Run migrations
pnpm db:migrate
```

### Upstash Redis

```bash
# Create production Redis
# Via Upstash dashboard: https://upstash.com

# Get connection string
export REDIS_URL="redis://..."
```

---

## 📦 CDN for Widget

### Cloudflare Setup

```bash
# Build widget
cd apps/widget
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

## 🔐 Secrets Management

### GitHub Secrets

```bash
# Add secrets to GitHub repository
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set OPENAI_API_KEY --body "sk-..."
gh secret set RAILWAY_TOKEN --body "..."
```

### Environment-Specific Configs

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=${{ secrets.DATABASE_URL }}
REDIS_URL=${{ secrets.REDIS_URL }}
```

---

## 🔄 CI/CD Pipeline

### Complete GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD

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
        run: pnpm test:unit
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
          cd apps/widget
          pnpm build
          aws s3 sync dist/ s3://platform-cdn/widget/v1/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.CDN_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.CDN_SECRET_KEY }}
```

---

## 📊 Health Checks

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
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  };
}

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

---

## 🔙 Rollback Strategy

```bash
# Railway rollback
railway rollback

# Fly.io rollback
flyctl releases list
flyctl releases rollback <version>

# Git-based rollback
git revert HEAD
git push origin main
```

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Railway: Auto-scales based on CPU/memory

# Fly.io: Manual scaling
flyctl scale count 5
flyctl scale vm performance-2x
```

### Database Scaling

```bash
# Neon: Auto-scales compute
# Add read replicas for analytics
neonctl replicas add --name analytics-replica
```

---

## ✅ Pre-Production Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] DNS records updated
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security audit passed

---

**Final**: See `ARCHITECTURE-IMPROVEMENTS.md` for critical architectural decisions.
