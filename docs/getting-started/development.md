# Development Setup Guide

## 🎯 Quick Start

**Time to first run**: ~15 minutes

```bash
# 1. Clone and install
git clone <repo-url> platform
cd platform
pnpm install

# 2. Start local services (Docker)
pnpm db:up

# 3. Setup database
pnpm db:push
pnpm db:seed

# 4. Start development
pnpm dev

# 🎉 Ready!
# - Landing: http://localhost:5173 (public marketing)
# - Dashboard: http://localhost:5174 (admin portal)
# - Meeting: http://localhost:5175 (meeting rooms)
# - Widget SDK: http://localhost:5176 (embeddable widget)
# - API Server: http://localhost:3001
# - Realtime Server: http://localhost:3002
```

> **📌 Multi-App Architecture - Phase 1 Foundation**
>
> **4 Apps** (all Phase 1 placeholders):
> - `apps/landing` - Public marketing (port 5173) → **www.platform.com**
> - `apps/dashboard` - Admin portal (port 5174) → **dashboard.platform.com**
> - `apps/meeting` - Meeting rooms (port 5175) → **meet.platform.com**
> - `apps/widget-sdk` - Embeddable widget (port 5176) → Customer websites
>
> **Shared Components**: `packages/ui` for design consistency across all apps
>
> Full implementation follows `docs/guides/roadmap.md`. See `docs/ARCHITECTURE_RESTRUCTURE_REPORT.md` for complete architecture decisions.

---

## 📋 Prerequisites

### Required Software

```yaml
Node.js: >= 20.x LTS
pnpm: >= 9.0
Docker: >= 20.10
Docker Compose: >= 2.0
Git: >= 2.30
```

### Installation

**macOS**:
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20
brew install node@20

# Install pnpm
npm install -g pnpm@latest

# Install Docker Desktop
brew install --cask docker
```

**Windows**:
```powershell
# Install via Chocolatey
choco install nodejs-lts pnpm docker-desktop git

# Or download installers:
# - Node.js: https://nodejs.org/
# - pnpm: https://pnpm.io/installation
# - Docker Desktop: https://www.docker.com/products/docker-desktop
```

**Linux (Ubuntu/Debian)**:
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@latest

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

---

## 🐳 Docker Services

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: platform-postgres
    environment:
      POSTGRES_USER: platform
      POSTGRES_PASSWORD: platform_dev_password
      POSTGRES_DB: platform
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U platform']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: platform-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres-data:
  redis-data:
```

### Docker Commands

```bash
# Start all services
pnpm db:up
# or: docker-compose up -d

# View logs
pnpm db:logs
# or: docker-compose logs -f

# Stop services
pnpm db:down
# or: docker-compose down

# Stop and remove data (fresh start)
pnpm db:reset
# or: docker-compose down -v

# Check service health
docker-compose ps
```

---

## 🔐 Environment Variables

### Root `.env` File

```bash
# .env (root directory)

# ==================== DATABASE ====================
DATABASE_URL="postgresql://platform:platform_dev_password@localhost:5432/platform"
DIRECT_URL="${DATABASE_URL}" # For migrations

# ==================== REDIS ====================
REDIS_URL="redis://localhost:6379"

# ==================== LIVEKIT ====================
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
LIVEKIT_WS_URL="ws://localhost:7880"
# Or use LiveKit Cloud:
# LIVEKIT_WS_URL="wss://your-project.livekit.cloud"

# ==================== AI SERVICES ====================

# OpenAI
OPENAI_API_KEY="sk-..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Google Gemini
GOOGLE_AI_API_KEY="..."

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY="..."

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY="..."

# Voyage AI (Embeddings)
VOYAGE_API_KEY="..."

# Cohere (Reranking)
COHERE_API_KEY="..."

# ==================== STRIPE ====================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# ==================== OBSERVABILITY ====================
SENTRY_DSN="" # Optional
AXIOM_TOKEN="" # Optional

# ==================== SECURITY ====================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
SESSION_SECRET="your-super-secret-session-key-change-in-production"

# ==================== DEVELOPMENT ====================
NODE_ENV="development"
LOG_LEVEL="debug"
```

### Generate Secrets

```bash
# Generate random secrets for JWT and sessions
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use this script:
# scripts/generate-secrets.js
const crypto = require('crypto');

console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
```

### Environment File Template

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

---

## 📦 Installation

### Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url> platform
cd platform

# Install all dependencies (uses pnpm workspaces)
pnpm install

# This installs dependencies for:
# - Root workspace
# - All apps (dashboard, meeting, widget, api)
# - All packages (ui, database, api-contract, etc.)
```

### Verify Installation

```bash
# Check Node.js version
node --version
# Should output: v20.x.x or higher

# Check pnpm version
pnpm --version
# Should output: 9.x.x or higher

# Check Docker
docker --version
docker-compose --version

# List all workspace packages
pnpm list --depth 0
```

---

## 🗄️ Database Setup

### Initial Setup

```bash
# 1. Start PostgreSQL + Redis
pnpm db:up

# 2. Wait for services to be healthy (10-30 seconds)
docker-compose ps

# 3. Enable pgvector extension (one-time)
docker exec -it platform-postgres psql -U platform -d platform -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. Generate and push schema
pnpm db:push

# 5. Seed database with demo data
pnpm db:seed

# ✅ Database is ready!
```

### Database Commands

```bash
# Push schema changes (development)
pnpm db:push

# Generate migration files (production)
pnpm db:generate

# Apply migrations
pnpm db:migrate

# View database in GUI
pnpm db:studio
# Opens Drizzle Studio at http://localhost:4983

# Reset database (⚠️ deletes all data)
pnpm db:reset

# Backup database
pnpm db:backup

# Restore from backup
pnpm db:restore <backup-file>
```

### Manual Database Access

```bash
# Access PostgreSQL CLI
docker exec -it platform-postgres psql -U platform -d platform

# Run queries
platform=# SELECT * FROM tenants;
platform=# \dt  # List tables
platform=# \d+ users  # Describe table
platform=# \q  # Quit

# Access Redis CLI
docker exec -it platform-redis redis-cli

127.0.0.1:6379> KEYS *
127.0.0.1:6379> GET key-name
127.0.0.1:6379> exit
```

---

## 🚀 Running the Application

### Development Mode (All Services)

```bash
# Start everything in parallel
pnpm dev

# This starts:
# - apps/dashboard (Vite dev server on :5173)
# - apps/meeting (Vite dev server on :5174)
# - apps/widget (Vite dev server on :5175)
# - packages/api (Fastify server on :3001)
```

### Individual Services

```bash
# Run specific app
pnpm --filter @platform/dashboard dev
pnpm --filter @platform/api dev

# Or use shorthand:
pnpm dev:dashboard
pnpm dev:api
pnpm dev:widget
```

### Build for Production

```bash
# Build all apps and packages
pnpm build

# Build specific app
pnpm --filter @platform/api build

# Type-check without building
pnpm typecheck

# Lint all code
pnpm lint

# Format code
pnpm format
```

---

## 🔧 Turborepo Configuration

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {
      "cache": true
    },
    "test": {
      "cache": true,
      "dependsOn": ["^build"]
    }
  }
}
```

### Package Scripts

```json
// package.json (root)
{
  "scripts": {
    // Development
    "dev": "turbo run dev",
    "dev:dashboard": "turbo run dev --filter=@platform/dashboard",
    "dev:api": "turbo run dev --filter=@platform/api",

    // Build
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",

    // Database
    "db:up": "docker-compose up -d",
    "db:down": "docker-compose down",
    "db:logs": "docker-compose logs -f",
    "db:reset": "docker-compose down -v && docker-compose up -d",
    "db:push": "drizzle-kit push:pg",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit up:pg",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx packages/database/src/seed.ts",

    // Testing
    "test": "turbo run test",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch"
  }
}
```

---

## 🧪 Verification Tests

### Health Check

```bash
# Check API health
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Create Test Session

```bash
# Register test tenant
curl -X POST http://localhost:3001/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "tenantName": "Test Company"
  }'

# Should return session token and user info
```

---

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs platform-postgres

# Test connection
docker exec -it platform-postgres psql -U platform -d platform -c "SELECT 1"

# Restart service
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
docker exec -it platform-redis redis-cli ping
# Should return: PONG

# Restart service
docker-compose restart redis
```

### Port Already in Use

```bash
# Find process using port 5432 (PostgreSQL)
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml:
ports:
  - '5433:5432'  # Use port 5433 on host
```

### pnpm Install Issues

```bash
# Clear pnpm cache
pnpm store prune

# Remove all node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall
pnpm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript project references
pnpm build --force

# Check for circular dependencies
pnpm list --depth 99 | grep -B5 -A5 "WARN"
```

### LiveKit Connection Issues

```bash
# Check if using LiveKit Cloud
# Verify API key and secret in .env

# If running locally:
# Download LiveKit Server: https://github.com/livekit/livekit
# Run: ./livekit-server --dev
```

---

## 📁 Project Structure

```
platform/
├── apps/
│   ├── dashboard/         # Customer dashboard (React + Vite)
│   ├── meeting/           # Meeting interface (React + Vite + LiveKit)
│   ├── widget/            # Embeddable widget (React + Vite)
│   ├── api/               # Backend API (Fastify + tRPC)
│   └── docs/              # Documentation site (Vitepress)
│
├── packages/
│   ├── ui/                # Shared React components
│   ├── database/          # Drizzle schemas + migrations
│   ├── api-contract/      # tRPC router definitions
│   ├── ai-core/           # AI service abstractions
│   ├── voice/             # Voice pipeline (STT/TTS)
│   ├── vision/            # Screen analysis engine
│   ├── rag/               # RAG system + embeddings
│   ├── auth/              # Lucia Auth utilities
│   ├── chat/              # Chat logic (SSE + LiveKit)
│   └── config/            # Shared configs
│
├── tooling/
│   ├── typescript-config/ # Base tsconfig files
│   └── eslint-config/     # Shared ESLint rules
│
├── scripts/               # Build and utility scripts
├── .github/               # GitHub Actions workflows
├── docker-compose.yml     # Local development services
├── turbo.json             # Turborepo configuration
├── package.json           # Root package file
├── pnpm-workspace.yaml    # pnpm workspace config
└── .env                   # Environment variables
```

---

## 🔄 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/widget-customization

# Start development
pnpm dev

# Make changes in:
# - packages/api-contract/src/routers/widgets.ts
# - apps/dashboard/src/pages/widgets.tsx

# Turborepo will auto-rebuild dependencies!
```

### 2. Database Schema Changes

```bash
# 1. Modify schema
# Edit: packages/database/src/schema/widgets.ts

# 2. Push changes (development)
pnpm db:push

# 3. Generate migration (production)
pnpm db:generate

# 4. Review migration file
# Check: packages/database/migrations/0002_add_widget_settings.sql

# 5. Commit both schema and migration
git add packages/database/src/schema/widgets.ts
git add packages/database/migrations/0002_add_widget_settings.sql
git commit -m "feat: add widget customization settings"
```

### 3. Testing

```bash
# Run unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Watch mode during development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### 4. Code Quality

```bash
# Type-check all packages
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format

# Run all checks before committing
pnpm lint && pnpm typecheck && pnpm test:unit
```

---

## 🎯 Common Tasks

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/my-package/src

# Create package.json
cat > packages/my-package/package.json << EOF
{
  "name": "@platform/my-package",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
EOF

# Install package in workspace
pnpm install
```

### Adding Dependencies

```bash
# Add to root (DevTools)
pnpm add -D typescript prettier -w

# Add to specific package
pnpm add zod --filter @platform/api-contract

# Add to specific app
pnpm add @tanstack/react-query --filter @platform/dashboard
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Debug specific package
DEBUG=platform:* pnpm dev

# Node.js inspector
NODE_OPTIONS='--inspect' pnpm dev:api
# Open chrome://inspect in Chrome
```

---

## 📚 Additional Resources

### Documentation
- **Architecture**: See `02-ARCHITECTURE.md`
- **API Design**: See `03-API-DESIGN.md`
- **Database**: See `04-DATABASE-SCHEMA.md`
- **Testing**: See `06-TESTING-STRATEGY.md`

### External Docs
- [Turborepo](https://turbo.build/repo/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [tRPC](https://trpc.io/docs)
- [LiveKit](https://docs.livekit.io/)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

## ✅ Checklist for New Developers

- [ ] Install Node.js 20+ and pnpm
- [ ] Install Docker Desktop
- [ ] Clone repository
- [ ] Copy `.env.example` to `.env`
- [ ] Add AI API keys to `.env`
- [ ] Run `pnpm install`
- [ ] Run `pnpm db:up`
- [ ] Run `pnpm db:push && pnpm db:seed`
- [ ] Run `pnpm dev`
- [ ] Open http://localhost:5173
- [ ] Create test account and widget
- [ ] Run `pnpm test:unit`
- [ ] Join team Slack/Discord
- [ ] Review project documentation

---

**🎉 You're ready to build!**

Next: See `06-TESTING-STRATEGY.md` for testing best practices.
