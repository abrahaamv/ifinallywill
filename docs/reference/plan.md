# VK-Agent Enterprise Implementation Plan

> **Current State**: 320-650ms latency, single-server, 6,025 LOC
> **Target State**: <300ms latency, horizontally scalable, enterprise-ready
> **Based on**: [research_result.md](./research_result.md)

---

## Executive Summary

Transform VK-Agent from production-ready to enterprise-grade through 5 phases:

| Phase | Focus | Timeline | Latency Impact |
|-------|-------|----------|----------------|
| 1 | Latency Optimization | Weeks 1-2 | 320-650ms → 262-374ms |
| 2 | Reliability & State | Weeks 3-4 | Session recovery |
| 3 | Containerization | Weeks 5-6 | K8s deployment |
| 4 | Security & Compliance | Weeks 7-8 | SOC 2, GDPR ready |
| 5 | Scaling | Ongoing | 1000+ sessions |

---

## Phase 1: Latency Optimization (Weeks 1-2)

**Goal**: Reduce latency from 320-650ms to 262-374ms

### 1.1 Replace scipy with python-soxr
**File**: `services/vk-agent/src/audio_processor.py`
**Impact**: 40-80ms savings

```python
import soxr
import numpy as np

class OptimizedAudioResampler:
    def __init__(self):
        self.downsampler = soxr.ResampleStream(48000, 16000, 1, dtype='int16')
        self.upsampler = soxr.ResampleStream(24000, 48000, 1, dtype='int16')

    def to_gemini(self, audio_48k):
        return self.downsampler.resample_chunk(audio_48k)

    def from_gemini(self, audio_24k, is_last=False):
        return self.upsampler.resample_chunk(audio_24k, last=is_last)
```

**Requirements change**:
```diff
- scipy==1.15.0
+ soxr==0.5.0
```

### 1.2 Integrate Silero VAD
**File**: `services/vk-agent/src/bridge.py`
**Impact**: 30-50ms savings (40-60% silence elimination)

```python
import torch
torch.set_num_threads(1)

model, utils = torch.hub.load(
    repo_or_dir='snakers4/silero-vad',
    model='silero_vad',
    force_reload=False
)
(get_speech_timestamps, _, read_audio, _, _) = utils

def is_speech(audio_chunk, sample_rate=16000, threshold=0.5):
    speech_prob = model(torch.from_numpy(audio_chunk), sample_rate).item()
    return speech_prob > threshold
```

### 1.3 Reduce Jitter Buffer
**File**: `services/vk-agent/src/rtp_handler.py`
**Impact**: 40-90ms savings

```python
class RTPJitterBuffer:
    def __init__(
        self,
        buffer_time_ms: int = 50,      # Was: 100ms
        max_packets: int = 25,          # Was: 50
        skip_threshold: int = 8,        # Was: 16
    ):
```

### 1.4 Circuit Breakers for Gemini
**File**: `services/vk-agent/src/gemini_client.py`

```python
import pybreaker
from tenacity import retry, stop_after_attempt, wait_exponential

gemini_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=30,
    success_threshold=2,
)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
@gemini_breaker
async def call_gemini_live(audio_data):
    async with gemini_client.stream(audio_data) as response:
        return response
```

**Requirements additions**:
```
pybreaker==1.2.0
tenacity==9.0.0
```

### Phase 1 Checklist
- [ ] Replace scipy resampling with soxr
- [ ] Add Silero VAD integration
- [ ] Reduce jitter buffer settings
- [ ] Implement Gemini circuit breaker
- [ ] Benchmark latency (target: <400ms p99)

---

## Phase 2: Reliability & State Management (Weeks 3-4)

**Goal**: Session recovery, reconnection, observability

### 2.1 Redis Session State
**New file**: `services/vk-agent/src/session_state.py`

```python
from dataclasses import dataclass
from typing import List, Optional
import pickle
import redis.asyncio as redis

@dataclass
class VoiceSessionState:
    session_id: str
    user_id: str
    conversation_context: List[dict]
    janus_handle_id: Optional[int]
    gemini_session_token: Optional[str]
    last_transcript: str

class SessionStateManager:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)
        self.ttl = 300  # 5 minutes recovery window

    async def save_state(self, state: VoiceSessionState):
        key = f"voice:session:{state.session_id}"
        await self.redis.setex(key, self.ttl, pickle.dumps(state))

    async def load_state(self, session_id: str) -> Optional[VoiceSessionState]:
        key = f"voice:session:{session_id}"
        data = await self.redis.get(key)
        return pickle.loads(data) if data else None
```

### 2.2 Automatic Reconnection
**File**: `services/vk-agent/src/janus_client.py`

```python
async def connect_with_retry(self, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            await self.connect()
            return True
        except Exception as e:
            wait_time = min(2 ** attempt, 30)
            logger.warning(f"Connection failed, retry in {wait_time}s: {e}")
            await asyncio.sleep(wait_time)
    return False
```

### 2.3 Prometheus Metrics
**New file**: `services/vk-agent/src/metrics.py`

```python
from prometheus_client import Counter, Histogram, Gauge

# Voice Quality Metrics
voice_quality_mos = Gauge('voice_quality_mos', 'Mean Opinion Score', ['session_id'])
webrtc_jitter_ms = Histogram('webrtc_jitter_ms', 'Jitter in milliseconds', ['direction'])
rtp_packets_lost = Counter('rtp_packets_lost_total', 'Packet loss counter', ['direction'])

# AI Pipeline Latency
voice_ai_e2e_latency = Histogram(
    'voice_ai_e2e_latency_ms',
    'End-to-end pipeline latency',
    buckets=[100, 200, 300, 400, 500, 750, 1000, 1500, 2000]
)
```

### Phase 2 Checklist
- [ ] Add Redis dependency and session state manager
- [ ] Implement reconnection with exponential backoff
- [ ] Add Prometheus metrics endpoint (/metrics)
- [ ] Configure Grafana dashboards
- [ ] Test session recovery after disconnect

---

## Phase 3: Containerization & Orchestration (Weeks 5-6)

**Goal**: Production-ready Kubernetes deployment

### 3.1 Optimized Dockerfile
**File**: `services/vk-agent/Dockerfile`

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /build
RUN apt-get update && apt-get install -y gcc libopus-dev
COPY requirements.txt .
RUN pip wheel --no-cache-dir -r requirements.txt -w /wheels

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libopus0 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels
COPY src/ ./src/

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s \
    CMD curl -f http://localhost:3004/health || exit 1

CMD ["python", "-m", "src.main"]
```

### 3.2 Kubernetes Manifests
**New files**: `infrastructure/k8s/vk-agent/`

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vk-agent
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vk-agent
  template:
    spec:
      containers:
      - name: vk-agent
        image: vk-agent:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        envFrom:
        - secretRef:
            name: vk-agent-secrets
---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vk-agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vk-agent
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Phase 3 Checklist
- [ ] Optimize Dockerfile (target: ~300MB)
- [ ] Create Kubernetes manifests
- [ ] Configure HPA
- [ ] Set up ArgoCD application
- [ ] Test rolling deployments

---

## Phase 4: Security & Compliance (Weeks 7-8)

**Goal**: Enterprise security, compliance documentation

### 4.1 JWT Authentication
**File**: `services/vk-agent/src/api.py`

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import jwt

security = HTTPBearer()

async def verify_voice_token(credentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            PUBLIC_KEY,
            algorithms=["RS256"],
            options={"require": ["exp", "session_id", "sub"]}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

@app.post("/text")
async def send_text(request: TextRequest, token = Depends(verify_voice_token)):
    # ... authenticated endpoint
```

### 4.2 Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/text")
@limiter.limit("60/minute")
async def send_text(request: TextRequest):
    # ...
```

### 4.3 Vault Secrets (Kubernetes)
```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vk-agent-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: vk-agent-secrets
  data:
  - secretKey: GEMINI_API_KEY
    remoteRef:
      key: secret/vk-agent
      property: gemini_api_key
```

### Phase 4 Checklist
- [ ] Implement JWT authentication
- [ ] Add rate limiting
- [ ] Configure Vault integration
- [ ] Update Janus admin keys
- [ ] Document compliance controls (SOC 2, GDPR)

---

## Phase 5: Scaling & Optimization (Ongoing)

**Goal**: Handle 1000+ concurrent sessions

### 5.1 Load Testing
```bash
# k6 load test
k6 run --vus 100 --duration 5m load-test.js
```

### 5.2 Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| MOS Score | < 4.0 | < 3.5 |
| Packet Loss | > 1% | > 5% |
| Jitter | > 20ms | > 50ms |
| E2E Latency | > 1500ms | > 2500ms |

### 5.3 Cost Monitoring
| Component | Monthly (1000 sessions) |
|-----------|-------------------------|
| Compute (Hetzner) | €200-400 |
| TURN (Cloudflare) | $50-100 |
| Gemini API | $300-800 |
| Total | ~$1,200-2,500 |

---

## Files Summary

| Phase | Files to Modify/Create |
|-------|------------------------|
| 1 | `audio_processor.py`, `bridge.py`, `rtp_handler.py`, `gemini_client.py`, `requirements.txt` |
| 2 | New: `session_state.py`, `metrics.py` |
| 3 | `Dockerfile`, New: `infrastructure/k8s/vk-agent/*` |
| 4 | `api.py`, New: K8s secrets manifests |
| 5 | New: `load-test.js`, alerting configs |

---

## Quick Start

```bash
# Phase 1: Latency
pip install soxr torch  # Add to requirements.txt
# Update audio_processor.py with soxr
# Add VAD to bridge.py

# Test latency improvement
curl -X POST https://agent.visualkit.live/text -d '{"text":"Hello"}'
```

---

## References

- [Janus + Gemini Implementation](./janus_gemini_live_api_implementation.md)
- [Research Results](./research_result.md)
- [Infrastructure Documentation](../operations/INFRASTRUCTURE.md)
