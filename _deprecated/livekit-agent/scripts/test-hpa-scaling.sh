#!/bin/bash

# HPA Scaling Test Script
# Simulates load to trigger HPA auto-scaling

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "HPA Scaling Test"
echo "================================"
echo ""

# Check if HPA exists
kubectl get hpa livekit-agent-hpa > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ HPA 'livekit-agent-hpa' not found${NC}"
    echo "Deploy HPA first: kubectl apply -f k8s/hpa.yaml"
    exit 1
fi

# Get initial state
INITIAL_REPLICAS=$(kubectl get deployment livekit-agent -o jsonpath='{.spec.replicas}')
MIN_REPLICAS=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.spec.minReplicas}')
MAX_REPLICAS=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.spec.maxReplicas}')
TARGET_CPU=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.spec.metrics[0].resource.target.averageUtilization}')

echo "Initial state:"
echo "  Current replicas: $INITIAL_REPLICAS"
echo "  HPA range: $MIN_REPLICAS - $MAX_REPLICAS"
echo "  Target CPU: ${TARGET_CPU}%"
echo ""

# Function to get current metrics
get_metrics() {
    REPLICAS=$(kubectl get deployment livekit-agent -o jsonpath='{.spec.replicas}')
    READY=$(kubectl get deployment livekit-agent -o jsonpath='{.status.readyReplicas}')
    READY=${READY:-0}
    CPU=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')
    CPU=${CPU:-0}

    echo "[$1] Replicas: $REPLICAS (Ready: $READY) | CPU: ${CPU}%"
}

# Monitor HPA for changes
echo "Monitoring HPA (press Ctrl+C to stop)..."
echo ""

ITERATION=0
PREVIOUS_REPLICAS=$INITIAL_REPLICAS

while true; do
    ITERATION=$((ITERATION + 1))

    get_metrics "$ITERATION"

    # Check if scaling occurred
    CURRENT_REPLICAS=$(kubectl get deployment livekit-agent -o jsonpath='{.spec.replicas}')
    if [ "$CURRENT_REPLICAS" -ne "$PREVIOUS_REPLICAS" ]; then
        if [ "$CURRENT_REPLICAS" -gt "$PREVIOUS_REPLICAS" ]; then
            echo -e "  ${GREEN}↑ Scaled up: $PREVIOUS_REPLICAS → $CURRENT_REPLICAS${NC}"
        else
            echo -e "  ${YELLOW}↓ Scaled down: $PREVIOUS_REPLICAS → $CURRENT_REPLICAS${NC}"
        fi
        PREVIOUS_REPLICAS=$CURRENT_REPLICAS
    fi

    # Check if max replicas reached
    if [ "$CURRENT_REPLICAS" -eq "$MAX_REPLICAS" ]; then
        echo -e "  ${YELLOW}⚠ Max replicas reached ($MAX_REPLICAS)${NC}"
    fi

    sleep 10
done
