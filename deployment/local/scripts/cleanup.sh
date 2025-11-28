#!/bin/bash
# =============================================================================
# Cleanup Script
# Remove unused Docker resources to free disk space
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              AI Assistant Platform - Cleanup                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Current disk usage:${NC}"
docker system df
echo ""

echo -e "${YELLOW}This will remove:${NC}"
echo "  • Stopped containers"
echo "  • Unused networks"
echo "  • Dangling images"
echo "  • Build cache"
echo ""
echo -e "${RED}Note: This will NOT remove:${NC}"
echo "  • Running containers"
echo "  • Named volumes (your data is safe)"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Cleaning up...${NC}"

    # Remove stopped containers
    docker container prune -f

    # Remove unused networks
    docker network prune -f

    # Remove dangling images
    docker image prune -f

    # Remove build cache
    docker builder prune -f

    echo ""
    echo -e "${GREEN}Cleanup complete!${NC}"
    echo ""
    echo -e "${BLUE}Disk usage after cleanup:${NC}"
    docker system df
else
    echo "Cancelled."
fi
