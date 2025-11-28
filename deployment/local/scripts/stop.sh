#!/bin/bash
# =============================================================================
# Stop Script
# Gracefully stop all services
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

echo -e "${BLUE}Stopping all services...${NC}"

# Graceful shutdown
docker compose down

echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
echo "To start again: ./scripts/deploy.sh"
echo "To remove volumes (data): docker compose down -v"
