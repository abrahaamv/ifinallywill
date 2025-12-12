#!/bin/bash
# Deploy Platform API to Hetzner
# Usage: ./deploy-api.sh

set -e

SERVER="root@178.156.151.139"
REMOTE_DIR="/opt/platform-api"

echo "=== Platform API Deployment ==="

# Step 1: Build Docker image locally
echo "[1/4] Building Docker image..."
docker build -t platform-api:latest -f packages/api/Dockerfile .

# Step 2: Save and transfer image
echo "[2/4] Transferring image to Hetzner..."
docker save platform-api:latest | gzip | ssh $SERVER "gunzip | docker load"

# Step 3: Create remote directory and env file
echo "[3/4] Setting up remote environment..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Copy env file (create .env.production first!)
if [ -f "infrastructure/hetzner/.env.production" ]; then
    scp infrastructure/hetzner/.env.production $SERVER:$REMOTE_DIR/.env
else
    echo "WARNING: .env.production not found. Create it from .env.example"
    echo "  cp infrastructure/hetzner/.env.example infrastructure/hetzner/.env.production"
    echo "  # Edit with production values"
    exit 1
fi

# Step 4: Run container
echo "[4/4] Starting API container..."
ssh $SERVER << 'EOF'
cd /opt/platform-api

# Stop existing container if running
docker stop platform-api 2>/dev/null || true
docker rm platform-api 2>/dev/null || true

# Run new container
docker run -d \
  --name platform-api \
  --restart unless-stopped \
  --network platform-network \
  -p 3001:3001 \
  -p 3002:3002 \
  --env-file .env \
  platform-api:latest

# Wait for health check
echo "Waiting for API to be healthy..."
sleep 10
docker ps --filter name=platform-api

# Test health endpoint
curl -sf http://localhost:3001/health && echo "API is healthy!" || echo "Health check failed"
EOF

echo ""
echo "=== Deployment Complete ==="
echo "API:       http://178.156.151.139:3001"
echo "WebSocket: ws://178.156.151.139:3002"
echo ""
echo "Next: Configure Cloudflare DNS"
echo "  api.visualkit.live -> 178.156.151.139"
echo "  ws.visualkit.live  -> 178.156.151.139"
