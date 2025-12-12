#!/bin/bash

# Kubernetes Deployment Verification Script
# Validates LiveKit agent deployment and HPA scaling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "LiveKit Agent Deployment Verification"
echo "================================"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check Kubernetes connection
echo "1. Checking Kubernetes connection..."
kubectl cluster-info > /dev/null 2>&1
print_status $? "Kubernetes cluster accessible"

# 2. Check deployment exists
echo ""
echo "2. Checking deployment..."
kubectl get deployment livekit-agent > /dev/null 2>&1
print_status $? "Deployment 'livekit-agent' exists"

# 3. Check pod status
echo ""
echo "3. Checking pod status..."
DESIRED_REPLICAS=$(kubectl get deployment livekit-agent -o jsonpath='{.spec.replicas}')
READY_REPLICAS=$(kubectl get deployment livekit-agent -o jsonpath='{.status.readyReplicas}')
READY_REPLICAS=${READY_REPLICAS:-0}

echo "   Desired replicas: $DESIRED_REPLICAS"
echo "   Ready replicas: $READY_REPLICAS"

if [ "$READY_REPLICAS" -eq "$DESIRED_REPLICAS" ]; then
    print_status 0 "All pods are ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
else
    print_warning "Only $READY_REPLICAS/$DESIRED_REPLICAS pods are ready"

    # Show pod details
    echo ""
    echo "Pod status:"
    kubectl get pods -l app=livekit-agent

    # Check for errors
    echo ""
    echo "Recent events:"
    kubectl get events --sort-by='.lastTimestamp' | grep livekit-agent | tail -5
fi

# 4. Check HPA
echo ""
echo "4. Checking HorizontalPodAutoscaler..."
kubectl get hpa livekit-agent-hpa > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status 0 "HPA 'livekit-agent-hpa' exists"

    echo ""
    echo "HPA status:"
    kubectl get hpa livekit-agent-hpa

    # Check if HPA is active
    CURRENT_CPU=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')
    TARGET_CPU=$(kubectl get hpa livekit-agent-hpa -o jsonpath='{.status.currentMetrics[0].resource.target.averageUtilization}')

    if [ -n "$CURRENT_CPU" ]; then
        echo "   Current CPU: ${CURRENT_CPU}%"
        echo "   Target CPU: ${TARGET_CPU}%"

        if [ "$CURRENT_CPU" -lt "$TARGET_CPU" ]; then
            print_status 0 "CPU utilization within target"
        else
            print_warning "CPU utilization above target - HPA may scale up"
        fi
    fi
else
    print_warning "HPA not found (auto-scaling disabled)"
fi

# 5. Check service
echo ""
echo "5. Checking service..."
kubectl get svc livekit-agent > /dev/null 2>&1
print_status $? "Service 'livekit-agent' exists"

# 6. Check ConfigMap
echo ""
echo "6. Checking ConfigMap..."
kubectl get configmap livekit-agent-config > /dev/null 2>&1
print_status $? "ConfigMap 'livekit-agent-config' exists"

# 7. Check Secret
echo ""
echo "7. Checking Secret..."
kubectl get secret livekit-agent-secrets > /dev/null 2>&1
print_status $? "Secret 'livekit-agent-secrets' exists"

# 8. Check resource usage
echo ""
echo "8. Checking resource usage..."
if kubectl top pods -l app=livekit-agent > /dev/null 2>&1; then
    echo ""
    kubectl top pods -l app=livekit-agent
    print_status 0 "Resource metrics available"
else
    print_warning "Metrics server not available (cannot check resource usage)"
fi

# 9. Check logs for errors
echo ""
echo "9. Checking recent logs for errors..."
PODS=$(kubectl get pods -l app=livekit-agent -o jsonpath='{.items[*].metadata.name}')
ERROR_COUNT=0

for pod in $PODS; do
    ERRORS=$(kubectl logs $pod --tail=100 | grep -i error | wc -l)
    ERROR_COUNT=$((ERROR_COUNT + ERRORS))
done

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_status 0 "No errors found in recent logs"
else
    print_warning "Found $ERROR_COUNT error(s) in recent logs"
    echo ""
    echo "Sample errors (first pod):"
    FIRST_POD=$(echo $PODS | awk '{print $1}')
    kubectl logs $FIRST_POD --tail=100 | grep -i error | head -5
fi

# 10. Test connectivity
echo ""
echo "10. Testing pod connectivity..."
FIRST_POD=$(kubectl get pods -l app=livekit-agent -o jsonpath='{.items[0].metadata.name}')

if [ -n "$FIRST_POD" ]; then
    # Test if pod can reach external services
    echo "   Testing DNS resolution..."
    kubectl exec $FIRST_POD -- nslookup google.com > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status 0 "DNS resolution working"
    else
        print_warning "DNS resolution failed"
    fi
else
    print_warning "No pods available for connectivity test"
fi

# Summary
echo ""
echo "================================"
echo "Verification Complete"
echo "================================"
echo ""
echo "Summary:"
echo "  Deployment: $READY_REPLICAS/$DESIRED_REPLICAS pods ready"
echo "  HPA: $(kubectl get hpa livekit-agent-hpa > /dev/null 2>&1 && echo 'Active' || echo 'Not found')"
echo "  Errors: $ERROR_COUNT in recent logs"
echo ""

if [ "$READY_REPLICAS" -eq "$DESIRED_REPLICAS" ] && [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment is healthy${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Deployment has issues - review output above${NC}"
    exit 1
fi
