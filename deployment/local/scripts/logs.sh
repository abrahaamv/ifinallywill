#!/bin/bash
# =============================================================================
# Logs Script
# View service logs
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

# If a service name is provided, show only that service
if [ -n "$1" ]; then
    docker compose logs -f "$1"
else
    echo "Usage: ./logs.sh [service]"
    echo ""
    echo "Available services:"
    echo "  postgres      - PostgreSQL database"
    echo "  redis         - Redis cache"
    echo "  livekit       - LiveKit WebRTC server"
    echo "  api           - Backend API"
    echo "  realtime      - WebSocket server"
    echo "  landing       - Landing page"
    echo "  dashboard     - Dashboard app"
    echo "  meeting       - Meeting app"
    echo "  nginx         - Reverse proxy"
    echo "  cloudflared   - Cloudflare tunnel"
    echo "  livekit-agent - AI agent"
    echo ""
    echo "Examples:"
    echo "  ./logs.sh api          # View API logs"
    echo "  ./logs.sh livekit-agent # View AI agent logs"
    echo ""
    echo "Showing all logs (Ctrl+C to exit)..."
    echo ""
    docker compose logs -f --tail=100
fi
