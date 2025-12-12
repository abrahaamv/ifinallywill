# Kubernetes Deployment Guide

## Overview

This directory contains Kubernetes manifests for deploying the LiveKit Python agent in production.

## Architecture

- **Deployment**: 3-20 replicas with rolling updates
- **HPA**: Auto-scaling based on CPU/memory
- **Service**: ClusterIP for internal metrics
- **ConfigMap**: Environment configuration
- **Secret**: API keys and credentials
- **RBAC**: Service account with minimal permissions

## Prerequisites

1. **Kubernetes cluster** (1.24+)
2. **kubectl** CLI configured
3. **Docker image** built and pushed to registry
4. **External dependencies**:
   - LiveKit Server
   - Redis
   - PostgreSQL
   - Backend API

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build image
cd livekit-agent
docker build -t your-registry/livekit-agent:latest .

# Push to registry
docker push your-registry/livekit-agent:latest
```

### 2. Update Configuration

Edit `configmap.yaml` and `secret.yaml` with your values:

```bash
# Edit ConfigMap
vi k8s/configmap.yaml

# Edit Secret (or use external secret management)
vi k8s/secret.yaml
```

**IMPORTANT**: Never commit real secrets to Git. Use:
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/)
- [HashiCorp Vault](https://www.vaultproject.io/)

### 3. Deploy

```bash
# Apply manifests
kubectl apply -f k8s/

# Or use Kustomize
kubectl apply -k k8s/

# Verify deployment
kubectl get pods -l app=livekit-agent
kubectl get hpa livekit-agent-hpa
kubectl get svc livekit-agent
```

## Monitoring

### Check Deployment Status

```bash
# Pod status
kubectl get pods -l app=livekit-agent -w

# Deployment rollout status
kubectl rollout status deployment/livekit-agent

# HPA metrics
kubectl get hpa livekit-agent-hpa

# Resource usage
kubectl top pods -l app=livekit-agent
```

### View Logs

```bash
# All pods
kubectl logs -l app=livekit-agent --tail=100 -f

# Specific pod
kubectl logs <pod-name> -f

# Previous crashed pod
kubectl logs <pod-name> --previous
```

### Prometheus Metrics

Access metrics endpoint:

```bash
# Port forward to pod
kubectl port-forward <pod-name> 9090:9090

# Curl metrics
curl http://localhost:9090/metrics
```

## Scaling

### Manual Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment livekit-agent --replicas=5

# Verify
kubectl get deployment livekit-agent
```

### Auto-Scaling (HPA)

HPA automatically scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Custom metrics (optional)

```bash
# View HPA status
kubectl describe hpa livekit-agent-hpa

# Edit HPA configuration
kubectl edit hpa livekit-agent-hpa
```

## Updates

### Rolling Update

```bash
# Update image
kubectl set image deployment/livekit-agent \
  agent=your-registry/livekit-agent:v2

# Or edit deployment
kubectl edit deployment livekit-agent

# Monitor rollout
kubectl rollout status deployment/livekit-agent
```

### Rollback

```bash
# Undo last rollout
kubectl rollout undo deployment/livekit-agent

# Rollback to specific revision
kubectl rollout undo deployment/livekit-agent --to-revision=2

# View rollout history
kubectl rollout history deployment/livekit-agent
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> --previous
```

### HPA Not Scaling

```bash
# Check metrics server
kubectl top nodes
kubectl top pods

# Describe HPA
kubectl describe hpa livekit-agent-hpa

# Check resource requests/limits
kubectl describe deployment livekit-agent
```

### Connection Issues

```bash
# Test connectivity to LiveKit
kubectl exec -it <pod-name> -- python -c "import requests; print(requests.get('http://livekit-server:7881').status_code)"

# Test connectivity to Redis
kubectl exec -it <pod-name> -- python -c "import redis; r = redis.from_url('redis://redis:6379'); print(r.ping())"

# Test connectivity to PostgreSQL
kubectl exec -it <pod-name> -- python -c "import asyncpg; print('OK')"

# Test connectivity to Backend API
kubectl exec -it <pod-name> -- python -c "import httpx; print(httpx.get('http://backend-api:3001/health').status_code)"
```

## Security

### Non-Root User

The agent runs as user `1000` (non-root) with:
- `allowPrivilegeEscalation: false`
- `readOnlyRootFilesystem: true`
- `seccompProfile: RuntimeDefault`

### RBAC

Service account `livekit-agent` has minimal permissions:
- Read ConfigMaps
- Read Secrets

### Network Policies

Add network policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: livekit-agent-netpol
spec:
  podSelector:
    matchLabels:
      app: livekit-agent
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: livekit-server
      ports:
        - protocol: TCP
          port: 7880
    # Add more egress rules for Redis, PostgreSQL, etc.
```

## Production Checklist

- [ ] Replace placeholder secrets with real values
- [ ] Use external secret management (Sealed Secrets, Vault, etc.)
- [ ] Configure resource requests/limits based on load testing
- [ ] Enable Prometheus monitoring
- [ ] Set up alerting (PagerDuty, Slack, etc.)
- [ ] Configure network policies
- [ ] Enable pod disruption budgets
- [ ] Set up log aggregation (ELK, Loki, etc.)
- [ ] Configure backup and disaster recovery
- [ ] Document runbooks for common issues
- [ ] Load test with production-like traffic
- [ ] Validate auto-scaling behavior
- [ ] Test failover scenarios

## Clean Up

```bash
# Delete all resources
kubectl delete -f k8s/

# Or with Kustomize
kubectl delete -k k8s/

# Verify deletion
kubectl get all -l app=livekit-agent
```
