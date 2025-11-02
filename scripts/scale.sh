#!/bin/bash

################################################################################
# AI Platform - Service Scaling Script
#
# Scale Cloud Run services up or down
# Usage: ./scripts/scale.sh [up|down|status]
################################################################################

set -e

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

ACTION=${1:-status}

case $ACTION in
    up)
        echo -e "${GREEN}Scaling services UP...${NC}"
        echo ""

        echo "Scaling API server..."
        gcloud run services update api-server \
          --region="$REGION" \
          --min-instances=1 \
          --max-instances=10 \
          --quiet

        echo "Scaling Realtime server..."
        gcloud run services update realtime-server \
          --region="$REGION" \
          --min-instances=1 \
          --max-instances=5 \
          --quiet

        echo "Scaling Dashboard..."
        gcloud run services update dashboard \
          --region="$REGION" \
          --min-instances=1 \
          --max-instances=5 \
          --quiet

        echo ""
        echo -e "${GREEN}✓ Services scaled UP${NC}"
        echo "  - API: 1-10 instances"
        echo "  - Realtime: 1-5 instances"
        echo "  - Dashboard: 1-5 instances"
        ;;

    down)
        echo -e "${YELLOW}Scaling services DOWN...${NC}"
        echo ""

        echo "Scaling API server..."
        gcloud run services update api-server \
          --region="$REGION" \
          --min-instances=0 \
          --max-instances=2 \
          --quiet

        echo "Scaling Realtime server..."
        gcloud run services update realtime-server \
          --region="$REGION" \
          --min-instances=0 \
          --max-instances=1 \
          --quiet

        echo "Scaling Dashboard..."
        gcloud run services update dashboard \
          --region="$REGION" \
          --min-instances=0 \
          --max-instances=1 \
          --quiet

        echo ""
        echo -e "${GREEN}✓ Services scaled DOWN${NC}"
        echo "  - API: 0-2 instances (cold starts enabled)"
        echo "  - Realtime: 0-1 instances"
        echo "  - Dashboard: 0-1 instances"
        echo ""
        echo -e "${YELLOW}Note: Cold starts may cause slower initial responses${NC}"
        ;;

    status)
        echo -e "${BLUE}Current Service Status:${NC}"
        echo ""

        echo "API Server:"
        gcloud run services describe api-server \
          --region="$REGION" \
          --format="table(status.conditions.status,status.url,spec.template.spec.containers[0].resources.limits)" 2>/dev/null || echo "  Not deployed"

        echo ""
        echo "Realtime Server:"
        gcloud run services describe realtime-server \
          --region="$REGION" \
          --format="table(status.conditions.status,status.url,spec.template.spec.containers[0].resources.limits)" 2>/dev/null || echo "  Not deployed"

        echo ""
        echo "Dashboard:"
        gcloud run services describe dashboard \
          --region="$REGION" \
          --format="table(status.conditions.status,status.url,spec.template.spec.containers[0].resources.limits)" 2>/dev/null || echo "  Not deployed"

        echo ""
        echo "LiveKit Server:"
        if gcloud compute instances describe livekit-server --zone="$ZONE" &>/dev/null; then
            STATUS=$(gcloud compute instances describe livekit-server --zone="$ZONE" --format="get(status)")
            echo "  Status: $STATUS"

            if [ "$STATUS" = "RUNNING" ]; then
                echo "  Checking Docker containers..."
                gcloud compute ssh livekit-server --zone="$ZONE" \
                  --command="docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || echo "  Unable to check containers"
            fi
        else
            echo "  Not deployed"
        fi
        ;;

    production)
        echo -e "${GREEN}Scaling to PRODUCTION configuration...${NC}"
        echo ""

        echo "Scaling API server..."
        gcloud run services update api-server \
          --region="$REGION" \
          --min-instances=2 \
          --max-instances=20 \
          --memory=2Gi \
          --cpu=4 \
          --quiet

        echo "Scaling Realtime server..."
        gcloud run services update realtime-server \
          --region="$REGION" \
          --min-instances=2 \
          --max-instances=10 \
          --memory=1Gi \
          --cpu=2 \
          --quiet

        echo "Scaling Dashboard..."
        gcloud run services update dashboard \
          --region="$REGION" \
          --min-instances=2 \
          --max-instances=10 \
          --memory=1Gi \
          --cpu=2 \
          --quiet

        echo ""
        echo -e "${GREEN}✓ Services scaled to PRODUCTION${NC}"
        echo "  - API: 2-20 instances, 2Gi RAM, 4 CPUs"
        echo "  - Realtime: 2-10 instances, 1Gi RAM, 2 CPUs"
        echo "  - Dashboard: 2-10 instances, 1Gi RAM, 2 CPUs"
        echo ""
        echo -e "${YELLOW}WARNING: This significantly increases costs!${NC}"
        ;;

    help)
        echo "Usage: ./scripts/scale.sh [up|down|status|production]"
        echo ""
        echo "Commands:"
        echo "  up         - Scale services UP (normal operation)"
        echo "  down       - Scale services DOWN (cost saving, cold starts)"
        echo "  status     - Show current service status"
        echo "  production - Scale to production configuration (high cost)"
        echo ""
        echo "Examples:"
        echo "  ./scripts/scale.sh up       # Scale up for normal use"
        echo "  ./scripts/scale.sh down     # Scale down to save costs"
        echo "  ./scripts/scale.sh status   # Check current status"
        ;;

    *)
        echo "Unknown action: $ACTION"
        echo "Usage: ./scripts/scale.sh [up|down|status|production|help]"
        exit 1
        ;;
esac
