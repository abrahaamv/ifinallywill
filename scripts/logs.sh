#!/bin/bash

################################################################################
# AI Platform - Logs Viewer Script
#
# View logs from all services
# Usage: ./scripts/logs.sh [service]
#   service: api, realtime, dashboard, livekit, agent, all (default)
################################################################################

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Load configuration
if [ ! -f ".deploy.config" ]; then
    echo "Configuration file not found."
    exit 1
fi

source .deploy.config

SERVICE=${1:-all}
LINES=${2:-50}

log_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# API Server logs
if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
    log_header "API Server Logs (last $LINES lines)"
    gcloud run services logs read api-server \
      --region="$REGION" \
      --limit="$LINES" \
      --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No logs available"
    echo ""
fi

# Realtime Server logs
if [ "$SERVICE" = "realtime" ] || [ "$SERVICE" = "all" ]; then
    log_header "Realtime Server Logs (last $LINES lines)"
    gcloud run services logs read realtime-server \
      --region="$REGION" \
      --limit="$LINES" \
      --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No logs available"
    echo ""
fi

# Dashboard logs
if [ "$SERVICE" = "dashboard" ] || [ "$SERVICE" = "all" ]; then
    log_header "Dashboard Logs (last $LINES lines)"
    gcloud run services logs read dashboard \
      --region="$REGION" \
      --limit="$LINES" \
      --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No logs available"
    echo ""
fi

# LiveKit server logs
if [ "$SERVICE" = "livekit" ] || [ "$SERVICE" = "all" ]; then
    log_header "LiveKit Server Logs (last $LINES lines)"
    gcloud compute ssh livekit-server --zone="$ZONE" \
      --command="docker logs livekit-livekit-1 --tail $LINES" 2>/dev/null || echo "Unable to fetch LiveKit logs"
    echo ""
fi

# Python agent logs
if [ "$SERVICE" = "agent" ] || [ "$SERVICE" = "all" ]; then
    log_header "Python Agent Logs (last $LINES lines)"
    gcloud compute ssh livekit-server --zone="$ZONE" \
      --command="sudo journalctl -u livekit-agent -n $LINES --no-pager" 2>/dev/null || echo "Unable to fetch agent logs"
    echo ""
fi

# Error logs across all services
if [ "$SERVICE" = "errors" ]; then
    log_header "Error Logs (last $LINES errors across all services)"
    gcloud logging read "severity>=ERROR" \
      --limit="$LINES" \
      --format="table(timestamp,resource.type,severity,textPayload)" \
      --project="$PROJECT_ID"
fi

# Follow logs (tail -f equivalent)
if [ "$SERVICE" = "follow" ]; then
    log_header "Following API Server Logs (Ctrl+C to exit)"
    gcloud run services logs tail api-server --region="$REGION"
fi

# Help
if [ "$SERVICE" = "help" ]; then
    echo "Usage: ./scripts/logs.sh [service] [lines]"
    echo ""
    echo "Services:"
    echo "  api       - API server logs"
    echo "  realtime  - Realtime server logs"
    echo "  dashboard - Dashboard logs"
    echo "  livekit   - LiveKit server logs"
    echo "  agent     - Python agent logs"
    echo "  errors    - Error logs from all services"
    echo "  follow    - Follow API server logs in real-time"
    echo "  all       - All service logs (default)"
    echo ""
    echo "Lines: Number of log lines to show (default: 50)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/logs.sh api"
    echo "  ./scripts/logs.sh errors 100"
    echo "  ./scripts/logs.sh follow"
fi
