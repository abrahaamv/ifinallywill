#!/bin/bash
# =============================================================================
# Status Script
# Check health of all services
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

QUIET=false
if [ "$1" == "--quiet" ] || [ "$1" == "-q" ]; then
    QUIET=true
fi

if [ "$QUIET" = false ]; then
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              AI Assistant Platform - Status                   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
fi

# =============================================================================
# Service Status
# =============================================================================
echo -e "${BLUE}Service Status:${NC}"
echo ""

# Define services and their health check endpoints
declare -A SERVICES=(
    ["postgres"]="Database"
    ["redis"]="Cache"
    ["livekit"]="WebRTC Server"
    ["api"]="Backend API"
    ["realtime"]="WebSocket Server"
    ["landing"]="Landing Page"
    ["dashboard"]="Dashboard"
    ["meeting"]="Meeting App"
    ["nginx"]="Reverse Proxy"
    ["cloudflared"]="Cloudflare Tunnel"
    ["livekit-agent"]="AI Agent"
)

HEALTHY=0
UNHEALTHY=0

for service in "${!SERVICES[@]}"; do
    DESCRIPTION="${SERVICES[$service]}"
    STATUS=$(docker compose ps --format '{{.Status}}' "$service" 2>/dev/null | head -n1)

    if [[ "$STATUS" == *"Up"* ]] || [[ "$STATUS" == *"running"* ]]; then
        if [[ "$STATUS" == *"healthy"* ]]; then
            echo -e "  ${GREEN}●${NC} $service ($DESCRIPTION): ${GREEN}healthy${NC}"
        else
            echo -e "  ${GREEN}●${NC} $service ($DESCRIPTION): ${GREEN}running${NC}"
        fi
        ((HEALTHY++))
    elif [[ "$STATUS" == *"starting"* ]]; then
        echo -e "  ${YELLOW}●${NC} $service ($DESCRIPTION): ${YELLOW}starting${NC}"
    else
        echo -e "  ${RED}●${NC} $service ($DESCRIPTION): ${RED}stopped${NC}"
        ((UNHEALTHY++))
    fi
done

echo ""

# =============================================================================
# Resource Usage
# =============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Resource Usage:${NC}"
    echo ""
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -15
    echo ""
fi

# =============================================================================
# Disk Usage
# =============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Disk Usage:${NC}"
    echo ""
    docker system df 2>/dev/null
    echo ""
fi

# =============================================================================
# Quick Health Checks
# =============================================================================
if [ "$QUIET" = false ]; then
    echo -e "${BLUE}Endpoint Health:${NC}"
    echo ""

    # Check local endpoints
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null | grep -q "200"; then
        echo -e "  ${GREEN}✓${NC} Nginx (localhost:80): OK"
    else
        echo -e "  ${RED}✗${NC} Nginx (localhost:80): Failed"
    fi

    if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null | grep -q "200"; then
        echo -e "  ${GREEN}✓${NC} API (localhost/api): OK"
    else
        echo -e "  ${YELLOW}?${NC} API (localhost/api): Not responding"
    fi

    echo ""
fi

# =============================================================================
# Summary
# =============================================================================
TOTAL=$((HEALTHY + UNHEALTHY))

if [ $UNHEALTHY -eq 0 ]; then
    echo -e "${GREEN}All $HEALTHY services are running!${NC}"
else
    echo -e "${YELLOW}$HEALTHY/$TOTAL services running, $UNHEALTHY stopped${NC}"
fi
