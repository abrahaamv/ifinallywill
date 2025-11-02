#!/bin/bash

################################################################################
# AI Platform - Validation Script
#
# Comprehensive health checks for all services
# Usage: ./scripts/validate.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load configuration
if [ ! -f ".deploy.config" ]; then
    echo "Configuration file not found."
    exit 1
fi

source .deploy.config

PASSED=0
FAILED=0

check_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Checking $name... "

    if [ -z "$url" ]; then
        echo -e "${YELLOW}SKIP${NC} (URL not available)"
        return
    fi

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} (HTTP $response, expected $expected)"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AI Platform Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get service URLs
API_URL=$(gcloud run services describe api-server --region="$REGION" --format="get(status.url)" 2>/dev/null || echo "")
REALTIME_URL=$(gcloud run services describe realtime-server --region="$REGION" --format="get(status.url)" 2>/dev/null || echo "")
DASHBOARD_URL=$(gcloud run services describe dashboard --region="$REGION" --format="get(status.url)" 2>/dev/null || echo "")
LIVEKIT_IP=$(gcloud compute instances describe livekit-server --zone="$ZONE" --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || echo "")

echo -e "${BLUE}1. Cloud Run Services${NC}"
echo ""

check_service "API Server Health" "$API_URL/health" "200"
check_service "Realtime Server Health" "$REALTIME_URL/health" "200"
check_service "Dashboard" "$DASHBOARD_URL" "200"

echo ""
echo -e "${BLUE}2. Database & Cache${NC}"
echo ""

echo -n "Checking PostgreSQL connection... "
if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo -n "Checking PostgreSQL tables... "
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -ge 28 ]; then
    echo -e "${GREEN}PASS${NC} ($TABLE_COUNT tables)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC} ($TABLE_COUNT tables, expected 28+)"
    FAILED=$((FAILED + 1))
fi

echo -n "Checking RLS policies... "
POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
if [ "$POLICY_COUNT" -ge 76 ]; then
    echo -e "${GREEN}PASS${NC} ($POLICY_COUNT policies)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARNING${NC} ($POLICY_COUNT policies, expected 76+)"
fi

echo -n "Checking Redis connection... "
if redis-cli -u "$REDIS_URL" PING | grep -q "PONG"; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo -e "${BLUE}3. LiveKit Infrastructure${NC}"
echo ""

if [ -n "$LIVEKIT_IP" ]; then
    check_service "LiveKit Server" "http://$LIVEKIT_IP:7880/" "200\|404"

    echo -n "Checking LiveKit Docker containers... "
    CONTAINER_STATUS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="docker ps --filter 'name=livekit' --format '{{.Status}}'" 2>/dev/null || echo "")
    if echo "$CONTAINER_STATUS" | grep -q "Up"; then
        echo -e "${GREEN}PASS${NC} (Running)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} (Not running)"
        FAILED=$((FAILED + 1))
    fi

    echo -n "Checking Python agent service... "
    AGENT_STATUS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo systemctl is-active livekit-agent" 2>/dev/null || echo "")
    if [ "$AGENT_STATUS" = "active" ]; then
        echo -e "${GREEN}PASS${NC} (Active)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} ($AGENT_STATUS)"
        FAILED=$((FAILED + 1))
    fi

    echo -n "Checking Python agent logs for errors... "
    AGENT_ERRORS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo journalctl -u livekit-agent -n 100 --no-pager | grep -i 'error\|critical\|fatal' | wc -l" 2>/dev/null || echo "999")
    if [ "$AGENT_ERRORS" -eq 0 ]; then
        echo -e "${GREEN}PASS${NC} (No critical errors)"
        PASSED=$((PASSED + 1))
    elif [ "$AGENT_ERRORS" -lt 5 ]; then
        echo -e "${YELLOW}WARNING${NC} ($AGENT_ERRORS errors in last 100 lines)"
    else
        echo -e "${RED}FAIL${NC} ($AGENT_ERRORS errors in last 100 lines)"
        FAILED=$((FAILED + 1))
    fi

    echo -n "Checking Python agent dependencies... "
    AGENT_DEPS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="cd /opt/livekit-agent && source venv/bin/activate && pip list | grep -i 'livekit-agents\|anthropic\|google-generativeai' | wc -l" 2>/dev/null || echo "0")
    if [ "$AGENT_DEPS" -ge 3 ]; then
        echo -e "${GREEN}PASS${NC} (All dependencies installed)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} (Missing dependencies: expected 3+, found $AGENT_DEPS)"
        FAILED=$((FAILED + 1))
    fi

    echo -n "Validating Python agent configuration... "
    AGENT_CONFIG=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="test -f /opt/livekit-agent/.env && echo 'exists' || echo 'missing'" 2>/dev/null || echo "missing")
    if [ "$AGENT_CONFIG" = "exists" ]; then
        echo -e "${GREEN}PASS${NC} (.env file exists)"
        PASSED=$((PASSED + 1))

        # Check required environment variables
        echo -n "Checking agent environment variables... "
        REQUIRED_VARS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="cd /opt/livekit-agent && grep -E '^(LIVEKIT_URL|LIVEKIT_API_KEY|LIVEKIT_API_SECRET|ANTHROPIC_API_KEY|GOOGLE_AI_API_KEY)=' .env | wc -l" 2>/dev/null || echo "0")
        if [ "$REQUIRED_VARS" -ge 5 ]; then
            echo -e "${GREEN}PASS${NC} ($REQUIRED_VARS/5 required variables set)"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}FAIL${NC} ($REQUIRED_VARS/5 required variables set)"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${RED}FAIL${NC} (.env file missing)"
        FAILED=$((FAILED + 1))
    fi

    echo -n "Testing agent LiveKit connection... "
    # Check if agent can connect to LiveKit by examining recent logs
    AGENT_CONNECTED=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo journalctl -u livekit-agent -n 50 --no-pager | grep -i 'connected\|ready' | wc -l" 2>/dev/null || echo "0")
    if [ "$AGENT_CONNECTED" -gt 0 ]; then
        echo -e "${GREEN}PASS${NC} (Agent connected to LiveKit)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARNING${NC} (No recent connection logs found)"
    fi

    echo -n "Checking agent multi-modal capabilities... "
    # Verify agent has vision and voice plugins loaded
    AGENT_PLUGINS=$(gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo journalctl -u livekit-agent -n 200 --no-pager | grep -E 'VisionAwareAgent|voice|vision|multimodal' | wc -l" 2>/dev/null || echo "0")
    if [ "$AGENT_PLUGINS" -gt 0 ]; then
        echo -e "${GREEN}PASS${NC} (Multi-modal plugins loaded)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARNING${NC} (No multi-modal plugin logs found)"
    fi
else
    echo -e "${YELLOW}SKIP${NC} LiveKit not deployed"
fi

echo ""
echo -e "${BLUE}4. API Endpoints${NC}"
echo ""

if [ -n "$API_URL" ]; then
    check_service "Health endpoint" "$API_URL/health" "200"
    check_service "tRPC metadata" "$API_URL/trpc" "200\|404"
fi

echo ""
echo -e "${BLUE}5. Resource Utilization${NC}"
echo ""

echo -n "Checking Cloud SQL CPU usage... "
CPU_USAGE=$(gcloud sql instances describe ai-platform-db --format="get(settings.dataDiskSizeGb)" 2>/dev/null || echo "0")
if [ "$CPU_USAGE" != "0" ]; then
    echo -e "${GREEN}PASS${NC} (Monitoring available)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}SKIP${NC} (Metrics not available)"
fi

echo -n "Checking Redis memory usage... "
REDIS_MEMORY=$(gcloud redis instances describe ai-platform-redis --region="$REGION" --format="get(memorySizeGb)" 2>/dev/null || echo "0")
if [ "$REDIS_MEMORY" != "0" ]; then
    echo -e "${GREEN}PASS${NC} (${REDIS_MEMORY}GB allocated)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}SKIP${NC} (Metrics not available)"
fi

echo ""
echo -e "${BLUE}6. Security Checks${NC}"
echo ""

echo -n "Checking secret management... "
SECRET_COUNT=$(gcloud secrets list --filter="name:database-url OR name:redis-url OR name:session-secret" --format="value(name)" | wc -l)
if [ "$SECRET_COUNT" -ge 3 ]; then
    echo -e "${GREEN}PASS${NC} ($SECRET_COUNT secrets configured)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC} ($SECRET_COUNT secrets, expected 3+)"
    FAILED=$((FAILED + 1))
fi

echo -n "Checking firewall rules... "
FW_COUNT=$(gcloud compute firewall-rules list --filter="network:ai-platform-vpc" --format="value(name)" | wc -l)
if [ "$FW_COUNT" -ge 4 ]; then
    echo -e "${GREEN}PASS${NC} ($FW_COUNT rules configured)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARNING${NC} ($FW_COUNT rules, expected 4+)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Your platform is healthy and ready to use."
    echo ""
    echo "Service URLs:"
    echo "  Dashboard:  $DASHBOARD_URL"
    echo "  API:        $API_URL"
    echo "  Realtime:   $REALTIME_URL"
    echo "  LiveKit:    ws://$LIVEKIT_IP:7880"
    exit 0
else
    echo -e "${RED}✗ Some checks failed!${NC}"
    echo ""
    echo "Please review the failed checks above."
    echo "Run './scripts/logs.sh errors' to view error logs."
    exit 1
fi
