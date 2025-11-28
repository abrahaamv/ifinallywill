#!/bin/bash
# =============================================================================
# Update Script
# Pull latest changes and redeploy
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$DEPLOY_DIR")")"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              AI Assistant Platform - Update                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$PROJECT_ROOT"

# =============================================================================
# Git Pull
# =============================================================================
echo -e "${BLUE}[1/4] Pulling latest changes...${NC}"

# Stash any local changes
git stash --include-untracked 2>/dev/null || true

# Pull latest
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $BRANCH"

git fetch origin
git pull origin "$BRANCH"

# Check if there were changes
if git diff --quiet HEAD@{1} HEAD; then
    echo -e "${YELLOW}No changes detected. Skipping rebuild.${NC}"

    read -p "Force rebuild anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting."
        exit 0
    fi
fi

echo -e "${GREEN}✓ Code updated${NC}"

# =============================================================================
# Determine What Changed
# =============================================================================
echo -e "${BLUE}[2/4] Analyzing changes...${NC}"

cd "$DEPLOY_DIR"

# Get list of changed files
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "")

REBUILD_ALL=false
REBUILD_SERVICES=()

# Check what needs rebuilding
if echo "$CHANGED_FILES" | grep -q "^packages/api/\|^packages/db/\|^packages/auth/"; then
    REBUILD_SERVICES+=("api")
fi

if echo "$CHANGED_FILES" | grep -q "^packages/realtime/"; then
    REBUILD_SERVICES+=("realtime")
fi

if echo "$CHANGED_FILES" | grep -q "^apps/landing/\|^packages/ui/"; then
    REBUILD_SERVICES+=("landing")
fi

if echo "$CHANGED_FILES" | grep -q "^apps/dashboard/\|^packages/ui/"; then
    REBUILD_SERVICES+=("dashboard")
fi

if echo "$CHANGED_FILES" | grep -q "^apps/meeting/\|^packages/ui/"; then
    REBUILD_SERVICES+=("meeting")
fi

if echo "$CHANGED_FILES" | grep -q "^livekit-agent/"; then
    REBUILD_SERVICES+=("livekit-agent")
fi

if echo "$CHANGED_FILES" | grep -q "^deployment/local/\|^docker-compose\|Dockerfile"; then
    REBUILD_ALL=true
fi

# If nothing specific, rebuild all
if [ ${#REBUILD_SERVICES[@]} -eq 0 ]; then
    REBUILD_ALL=true
fi

# =============================================================================
# Rebuild
# =============================================================================
echo -e "${BLUE}[3/4] Rebuilding services...${NC}"

if [ "$REBUILD_ALL" = true ]; then
    echo "Rebuilding all services..."
    docker compose build --parallel
else
    echo "Rebuilding: ${REBUILD_SERVICES[*]}"
    docker compose build "${REBUILD_SERVICES[@]}"
fi

echo -e "${GREEN}✓ Build complete${NC}"

# =============================================================================
# Restart Services
# =============================================================================
echo -e "${BLUE}[4/4] Restarting services...${NC}"

if [ "$REBUILD_ALL" = true ]; then
    # Full restart
    docker compose down
    docker compose up -d
else
    # Rolling restart of changed services
    for service in "${REBUILD_SERVICES[@]}"; do
        echo "Restarting $service..."
        docker compose up -d --no-deps "$service"
    done
fi

# Wait for services
sleep 5

# =============================================================================
# Health Check
# =============================================================================
echo ""
echo -e "${BLUE}Verifying services...${NC}"

"$SCRIPT_DIR/status.sh" --quiet

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Update Complete!                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Updated at: $(date)"
echo "Commit: $(git rev-parse --short HEAD)"
echo ""
echo "View logs: ./scripts/logs.sh"
