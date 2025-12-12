# VK-ICE: VisualKit ICE Credential Service

> **Production-grade TURN/STUN credential extraction and management service**

VK-ICE provides free WebRTC ICE credentials by extracting them from multiple providers (8x8/Brave Talk, KMeet, etc.) with automatic failover, caching, and health monitoring.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VK-ICE SERVICE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FastAPI REST API                       │   │
│  │  GET  /api/ice/credentials  - Get ICE credentials        │   │
│  │  GET  /api/ice/providers    - List providers             │   │
│  │  GET  /api/ice/health       - Health check               │   │
│  │  GET  /api/ice/stats        - Statistics                 │   │
│  └────────────────────────────────┬─────────────────────────┘   │
│                                   │                              │
│  ┌────────────────────────────────┴─────────────────────────┐   │
│  │                      IceEngine                            │   │
│  │  - Multi-provider orchestration                           │   │
│  │  - Automatic failover                                     │   │
│  │  - TTL-based caching                                      │   │
│  │  - Health monitoring                                      │   │
│  └────────────────────────────────┬─────────────────────────┘   │
│                                   │                              │
│  ┌────────────────────────────────┴─────────────────────────┐   │
│  │                     Providers                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ 8x8 (Brave) │ │   KMeet     │ │    Fallback         │ │   │
│  │  │ XEP-0215    │ │ EU Backup   │ │  Public STUN        │ │   │
│  │  │ 35 PoPs     │ │ Swiss       │ │  Always available   │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider** | 8x8 (Brave Talk), KMeet (EU), Public STUN fallback |
| **Automatic Failover** | Seamlessly switches providers on failure |
| **TTL Caching** | Reduces provider calls, improves latency |
| **Background Refresh** | Proactively refreshes before expiry |
| **Health Monitoring** | Per-provider health tracking |
| **REST API** | FastAPI with OpenAPI documentation |
| **Zero Cost** | Extracts credentials from free providers |

## Quick Start

### Installation

```bash
cd services/vk-ice
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Server

```bash
# Development
python -m vk_ice.main

# Production
uvicorn vk_ice.api:app --host 0.0.0.0 --port 3003 --workers 4
```

### Using the API

```bash
# Get ICE credentials
curl http://localhost:3003/api/ice/credentials

# Response:
{
  "iceServers": [
    {"urls": ["stun:stun.l.google.com:19302"]},
    {
      "urls": ["turn:prod-8x8-turnrelay-oracle.jitsi.net:443?transport=tcp"],
      "username": "1733750400:room123",
      "credential": "abc123..."
    }
  ],
  "provider": "8x8",
  "ttl_seconds": 3600,
  "remaining_ttl": 3595,
  "has_turn": true,
  "has_stun": true
}

# Force specific provider
curl "http://localhost:3003/api/ice/credentials?provider=kmeet"

# Force fresh credentials (bypass cache)
curl "http://localhost:3003/api/ice/credentials?force_refresh=true"

# Check provider health
curl http://localhost:3003/api/ice/health

# Get statistics
curl http://localhost:3003/api/ice/stats
```

## Python SDK Usage

```python
from vk_ice import IceEngine

async def main():
    # Create and start engine
    engine = IceEngine()
    await engine.start()

    # Get credentials (automatic failover)
    config = await engine.get_credentials()

    # Use in WebRTC
    rtc_config = config.to_rtc_configuration()
    # {"iceServers": [...]}

    # Or str0m format
    str0m_config = config.to_str0m_config()
    # ["turn:user:pass@host:port", ...]

    # Cleanup
    await engine.stop()

# Or use context manager
async with IceEngine() as engine:
    config = await engine.get_credentials()
```

## Integration with VisualKit

### VK Agent (Python)

```python
# In services/vk-agent/agent.py
from vk_ice import IceEngine

class VKAgent:
    def __init__(self):
        self.ice_engine = IceEngine()

    async def start(self):
        await self.ice_engine.start()

    async def get_ice_config(self):
        config = await self.ice_engine.get_credentials()
        return config.to_rtc_configuration()
```

### Platform API (TypeScript)

```typescript
// In packages/api/src/services/ice.ts
async function getIceCredentials(): Promise<RTCConfiguration> {
  const response = await fetch('http://vk-ice:3003/api/ice/credentials');
  const data = await response.json();

  return {
    iceServers: data.iceServers,
  };
}
```

### Janus Gateway Integration

```javascript
// In packages/vk-client/src/janus/JanusClient.ts
const iceConfig = await fetch('/api/ice/credentials').then(r => r.json());

const pc = new RTCPeerConnection({
  iceServers: iceConfig.iceServers,
});

// Proceed with Janus signaling...
```

## Provider Details

### 8x8 Provider (Primary)

Extracts credentials from 8x8's JaaS infrastructure via Brave Talk.

| Property | Value |
|----------|-------|
| **Tenant** | `vpaas-magic-cookie-a4818bd762a044998d717b70ac734cfe` |
| **TURN Host** | `prod-8x8-turnrelay-oracle.jitsi.net` |
| **Protocol** | XEP-0215 via XMPP |
| **Coverage** | 35 Points of Presence globally |
| **TTL** | 1 hour (credentials valid ~12h) |

**Flow:**
1. HTTP request to Brave Talk API → Get JWT
2. XMPP WebSocket connection with JWT
3. XEP-0215 query for external services
4. Parse TURN/STUN credentials

### KMeet Provider (EU Backup)

EU-based backup using Infomaniak's KMeet service.

| Property | Value |
|----------|-------|
| **Host** | `kmeet.infomaniak.com` |
| **Region** | Switzerland (EU) |
| **Compliance** | GDPR, Swiss privacy laws |
| **TTL** | 1 hour |

**Use Cases:**
- EU data residency requirements
- Primary provider unavailable
- Geographic diversity

### Fallback Provider

Public STUN servers as last resort.

| Property | Value |
|----------|-------|
| **Servers** | Google, Cloudflare, Mozilla |
| **TURN** | No (STUN only) |
| **Success Rate** | ~85% (fails behind strict NAT) |
| **TTL** | 60 seconds (encourages retry) |

**WARNING:** Fallback mode has no TURN relay. ~15% of connections will fail.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VK_ICE_HOST` | `0.0.0.0` | Server bind host |
| `VK_ICE_PORT` | `3003` | Server bind port |
| `VK_ICE_LOG_LEVEL` | `INFO` | Logging level |
| `VK_ICE_PROVIDERS` | `8x8,kmeet,fallback` | Provider priority |
| `VK_ICE_CACHE_TTL` | `3600` | Cache TTL (seconds) |
| `VK_ICE_FAILOVER_DELAY` | `0.5` | Delay between failover attempts |
| `VK_ICE_MAX_RETRIES` | `3` | Retries per provider |

### Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3003
CMD ["uvicorn", "vk_ice.api:app", "--host", "0.0.0.0", "--port", "3003"]
```

```yaml
# docker-compose.yml
services:
  vk-ice:
    build: ./services/vk-ice
    ports:
      - "3003:3003"
    environment:
      - VK_ICE_LOG_LEVEL=INFO
      - VK_ICE_PROVIDERS=8x8,kmeet,fallback
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## API Reference

### GET /api/ice/credentials

Get ICE credentials for WebRTC connections.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | string | (auto) | Force specific provider |
| `force_refresh` | boolean | false | Bypass cache |

**Response:**
```json
{
  "iceServers": [
    {"urls": ["stun:stun.example.com:19302"]},
    {
      "urls": ["turn:turn.example.com:3478"],
      "username": "user",
      "credential": "pass"
    }
  ],
  "provider": "8x8",
  "ttl_seconds": 3600,
  "remaining_ttl": 3550,
  "has_turn": true,
  "has_stun": true
}
```

### GET /api/ice/providers

List available providers with health status.

**Response:**
```json
{
  "providers": ["8x8", "kmeet", "fallback"],
  "priority_order": ["8x8", "kmeet", "fallback"],
  "health": {
    "8x8": {
      "provider": "8x8",
      "status": "healthy",
      "is_healthy": true,
      "consecutive_failures": 0,
      "average_latency_ms": 245.5
    }
  }
}
```

### GET /api/ice/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "providers": { ... },
  "cache_size": 3
}
```

### GET /api/ice/stats

Engine statistics.

**Response:**
```json
{
  "running": true,
  "started_at": "2024-12-09T10:00:00Z",
  "total_requests": 1250,
  "cache_hits": 1100,
  "cache_misses": 150,
  "cache_hit_rate": 0.88,
  "failovers": 12,
  "providers": ["8x8", "kmeet", "fallback"]
}
```

### POST /api/ice/refresh

Force refresh credentials from all providers.

### DELETE /api/ice/cache

Clear all cached credentials.

## Architecture

### File Structure

```
services/vk-ice/
├── __init__.py          # Package exports
├── api.py               # FastAPI REST endpoints
├── cache.py             # TTL-based credential cache
├── config.py            # Configuration management
├── engine.py            # Main orchestrator
├── main.py              # Entry point / CLI
├── models.py            # Data models
├── providers/
│   ├── __init__.py      # Provider registry
│   ├── base.py          # Abstract base provider
│   ├── x8x8.py          # 8x8/Brave Talk provider
│   ├── kmeet.py         # KMeet EU provider
│   └── fallback.py      # Public STUN fallback
├── tests/
│   ├── test_engine.py
│   ├── test_cache.py
│   └── test_providers.py
├── requirements.txt
└── README.md
```

### Failover Behavior

```
Request arrives
    │
    ▼
┌─────────────────┐
│ Check cache     │──── Hit ────► Return cached
└────────┬────────┘
         │ Miss
         ▼
┌─────────────────┐
│ Try 8x8         │──── Success ─► Cache & Return
└────────┬────────┘
         │ Fail
         ▼ (wait 0.5s)
┌─────────────────┐
│ Try KMeet       │──── Success ─► Cache & Return
└────────┬────────┘
         │ Fail
         ▼ (wait 0.5s)
┌─────────────────┐
│ Try Fallback    │──── Success ─► Cache & Return
└────────┬────────┘
         │ Fail (unlikely)
         ▼
┌─────────────────┐
│ Return stale    │◄─── If prefer_cached=true
│ cache           │
└────────┬────────┘
         │ No cache
         ▼
┌─────────────────┐
│ Return public   │     (STUN only, 60s TTL)
│ STUN servers    │
└─────────────────┘
```

### Cost Savings

| Approach | Monthly Cost | VK-ICE Savings |
|----------|-------------|----------------|
| Self-hosted Coturn | $2,000-20,000 | 100% |
| Xirsys | Pay per use | 100% |
| Twilio TURN | $0.40/GB | 100% |
| **VK-ICE** | **$0** | - |

## Development

### Running Tests

```bash
cd services/vk-ice
pytest tests/ -v
pytest tests/ --cov=vk_ice --cov-report=html
```

### Adding a New Provider

1. Create provider in `providers/my_provider.py`:

```python
from .base import IceProvider
from ..models import IceConfig, IceServer, IceServerType

class MyProvider(IceProvider):
    provider_name = "my_provider"
    default_ttl = 3600

    async def _fetch_credentials(self) -> IceConfig:
        # Your extraction logic
        servers = [
            IceServer(
                type=IceServerType.TURN,
                host="turn.example.com",
                port=3478,
                username="user",
                credential="pass",
            )
        ]
        return IceConfig(
            servers=servers,
            provider=self.provider_name,
        )
```

2. Register in `providers/__init__.py`:

```python
from .my_provider import MyProvider

PROVIDER_REGISTRY = {
    # ...existing providers...
    "my_provider": MyProvider,
}
```

## Troubleshooting

### No TURN Credentials

If only getting STUN servers:

1. Check provider health: `curl /api/ice/health`
2. Force refresh: `curl "/api/ice/credentials?force_refresh=true"`
3. Check logs for XEP-0215 errors
4. Try specific provider: `curl "/api/ice/credentials?provider=8x8"`

### Connection Timeouts

1. Verify network connectivity to 8x8/KMeet
2. Check firewall rules for WebSocket connections
3. Try fallback provider
4. Check DNS resolution

### High Cache Miss Rate

1. Verify TTL settings
2. Check if credentials are expiring early
3. Monitor provider health
4. Consider increasing `cache_refresh_before`

## License

Proprietary - VisualKit Team

## References

- [XEP-0215: External Service Discovery](https://xmpp.org/extensions/xep-0215.html)
- [8x8 JaaS Documentation](https://developer.8x8.com/jaas)
- [WebRTC ICE RFC](https://tools.ietf.org/html/rfc8445)
- [TURN REST API](https://tools.ietf.org/html/draft-uberti-behave-turn-rest-00)
