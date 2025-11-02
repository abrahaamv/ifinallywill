#!/bin/bash

################################################################################
# AI Platform - Infrastructure Destruction Script
#
# WARNING: This will delete ALL resources and data
# Usage: ./scripts/destroy.sh
################################################################################

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}WARNING: This will destroy ALL infrastructure and delete ALL data!${NC}"
echo ""
echo "This action will:"
echo "  - Delete all Cloud Run services"
echo "  - Delete LiveKit GCE instance"
echo "  - Delete Cloud SQL database (ALL DATA LOST)"
echo "  - Delete Redis instance"
echo "  - Delete VPC network and firewall rules"
echo "  - Delete all secrets"
echo "  - Delete storage buckets"
echo ""
read -p "Are you ABSOLUTELY sure you want to continue? (type 'DELETE' to confirm): " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "Destruction cancelled."
    exit 0
fi

# Load configuration
if [ ! -f ".deploy.config" ]; then
    echo -e "${RED}Configuration file not found. Cannot proceed.${NC}"
    exit 1
fi

source .deploy.config

echo ""
echo -e "${YELLOW}Starting infrastructure destruction...${NC}"
echo ""

# Delete Cloud Run services
echo "Deleting Cloud Run services..."
gcloud run services delete api-server --region="$REGION" --quiet 2>/dev/null || true
gcloud run services delete realtime-server --region="$REGION" --quiet 2>/dev/null || true
gcloud run services delete dashboard --region="$REGION" --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cloud Run services deleted"

# Delete GCE instances
echo "Deleting GCE instances..."
gcloud compute instances delete livekit-server --zone="$ZONE" --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} GCE instances deleted"

# Delete Cloud SQL
echo "Deleting Cloud SQL instance..."
gcloud sql instances delete ai-platform-db --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cloud SQL deleted"

# Delete Redis
echo "Deleting Redis instance..."
gcloud redis instances delete ai-platform-redis --region="$REGION" --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Redis deleted"

# Delete VPC Access Connector
echo "Deleting VPC Access Connector..."
gcloud compute networks vpc-access connectors delete ai-platform-connector --region="$REGION" --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} VPC Access Connector deleted"

# Delete firewall rules
echo "Deleting firewall rules..."
gcloud compute firewall-rules delete allow-internal --quiet 2>/dev/null || true
gcloud compute firewall-rules delete allow-ssh --quiet 2>/dev/null || true
gcloud compute firewall-rules delete allow-http-https --quiet 2>/dev/null || true
gcloud compute firewall-rules delete allow-webrtc --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Firewall rules deleted"

# Delete VPC peering
echo "Deleting VPC peering..."
gcloud services vpc-peerings delete \
  --service=servicenetworking.googleapis.com \
  --network=ai-platform-vpc \
  --quiet 2>/dev/null || true

gcloud compute addresses delete google-managed-services-ai-platform-vpc --global --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} VPC peering deleted"

# Delete subnet
echo "Deleting subnet..."
gcloud compute networks subnets delete ai-platform-subnet --region="$REGION" --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Subnet deleted"

# Delete VPC network
echo "Deleting VPC network..."
gcloud compute networks delete ai-platform-vpc --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} VPC network deleted"

# Delete secrets
echo "Deleting secrets..."
gcloud secrets delete database-url --quiet 2>/dev/null || true
gcloud secrets delete redis-url --quiet 2>/dev/null || true
gcloud secrets delete session-secret --quiet 2>/dev/null || true
gcloud secrets delete openai-api-key --quiet 2>/dev/null || true
gcloud secrets delete anthropic-api-key --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Secrets deleted"

# Delete container images
echo "Deleting container images..."
gcloud container images delete gcr.io/$PROJECT_ID/api-server --quiet 2>/dev/null || true
gcloud container images delete gcr.io/$PROJECT_ID/realtime-server --quiet 2>/dev/null || true
gcloud container images delete gcr.io/$PROJECT_ID/dashboard --quiet 2>/dev/null || true
echo -e "${GREEN}✓${NC} Container images deleted"

echo ""
echo -e "${GREEN}Infrastructure destroyed successfully!${NC}"
echo ""
echo "Note: The GCP project itself still exists. To delete the entire project:"
echo "  gcloud projects delete $PROJECT_ID"
echo ""
echo "Local configuration files remain intact for potential redeployment."
