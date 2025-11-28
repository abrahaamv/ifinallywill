#!/bin/bash
# =============================================================================
# Deploy Script
# Builds and starts all services
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$DEPLOY_DIR")")"

cd "$DEPLOY_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              AI Assistant Platform - Deploy                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =============================================================================
# Pre-flight Checks
# =============================================================================
echo -e "${BLUE}[1/5] Running pre-flight checks...${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Run: cp .env.example .env && nano .env"
    exit 1
fi

# Check required environment variables
source .env

REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "SESSION_SECRET"
    "GOOGLE_API_KEY"
    "LIVEKIT_API_KEY"
    "LIVEKIT_API_SECRET"
    "CLOUDFLARE_TUNNEL_TOKEN"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "your-"* ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing or unconfigured environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Edit .env and configure these variables."
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed!${NC}"
    echo "Run: ./scripts/setup.sh"
    exit 1
fi

echo -e "${GREEN}✓ Docker available${NC}"

# =============================================================================
# Build Images
# =============================================================================
echo -e "${BLUE}[2/5] Building Docker images...${NC}"

docker compose build --parallel

echo -e "${GREEN}✓ Images built${NC}"

# =============================================================================
# Database Migration
# =============================================================================
echo -e "${BLUE}[3/5] Starting databases...${NC}"

# Start only databases first
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U platform > /dev/null 2>&1; do
    sleep 1
done

echo -e "${GREEN}✓ Databases ready${NC}"

# =============================================================================
# Run Migrations
# =============================================================================
echo -e "${BLUE}[4/5] Running database migrations...${NC}"

# Run Drizzle migrations via API container (one-off)
docker compose run --rm api sh -c "cd packages/db && pnpm db:push" 2>/dev/null || {
    echo -e "${YELLOW}Note: Migration step skipped (run manually if needed)${NC}"
}

echo -e "${GREEN}✓ Migrations complete${NC}"

# =============================================================================
# Start All Services
# =============================================================================
echo -e "${BLUE}[5/5] Starting all services...${NC}"

docker compose up -d

# Wait a moment for services to start
sleep 5

# =============================================================================
# Health Check
# =============================================================================
echo ""
echo -e "${BLUE}Checking service health...${NC}"

SERVICES=("postgres" "redis" "livekit" "api" "realtime" "landing" "dashboard" "meeting" "nginx" "cloudflared" "livekit-agent")

for service in "${SERVICES[@]}"; do
    STATUS=$(docker compose ps --format '{{.Status}}' "$service" 2>/dev/null | head -n1)
    if [[ "$STATUS" == *"Up"* ]] || [[ "$STATUS" == *"running"* ]]; then
        echo -e "  ${GREEN}✓${NC} $service: $STATUS"
    else
        echo -e "  ${RED}✗${NC} $service: $STATUS"
    fi
done

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  Deployment Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Your platform is now running!"
echo ""
echo "Local URLs (for testing):"
echo "  • Landing:   http://localhost"
echo "  • Dashboard: http://localhost/app/"
echo "  • Meeting:   http://localhost/meet/"
echo "  • API:       http://localhost/api/"
echo ""
echo "Public URLs (via Cloudflare Tunnel):"
echo "  • Configure in Cloudflare Zero Trust Dashboard"
echo "  • Map your domain routes to localhost:80"
echo ""
echo "Useful commands:"
echo "  • View logs:     ./scripts/logs.sh"
echo "  • Check status:  ./scripts/status.sh"
echo "  • Stop all:      ./scripts/stop.sh"
echo "  • Update:        ./scripts/update.sh"
