# VisualKit Platform Infrastructure

**Last Updated**: 2025-12-14

This document describes the current production infrastructure for the VisualKit platform.

---

## Server Infrastructure

### Hetzner VPS (Primary Server)

| Property | Value |
|----------|-------|
| **IP Address** | `178.156.151.139` |
| **Provider** | Hetzner Cloud |
| **Location** | Europe |
| **Access** | SSH as `root` |

**Deployed Services** (via Docker):
- `platform-api` - Fastify + tRPC backend
- `vk-agent` - Python Voice AI Agent (Janus-Gemini bridge)
- `janus-gateway` - WebRTC signaling server
- `chatwoot-chatwoot-1` - Support chat platform
- `chatwoot-chatwoot-proxy-1` - Chatwoot proxy
- `chatwoot-chatwoot-sidekiq-1` - Chatwoot background jobs

**Directory Structure**:
```
/opt/
├── chatwoot/          # Chatwoot configuration
├── dashboard/         # Dashboard static files (Cloudflare Pages now)
├── janus/             # Janus Gateway config
│   └── config/        # Janus configuration files
├── platform-api/      # Platform API deployment
├── vk-agent/          # Voice AI Agent
│   ├── src/           # Python source code
│   ├── Dockerfile
│   └── docker-compose.yml
└── widget-cdn/        # Widget SDK static files
```

---

## DNS Configuration (Cloudflare)

### A Records (Direct to Hetzner - DNS Only)

| Subdomain | IP | Proxy | Purpose |
|-----------|-----|-------|---------|
| `agent` | 178.156.151.139 | DNS only | VK-Agent API |
| `api` | 178.156.151.139 | DNS only | Platform API |
| `cdn` | 178.156.151.139 | DNS only | Widget CDN |
| `janus` | 178.156.151.139 | DNS only | Janus WebRTC |
| `support` | 178.156.151.139 | DNS only | Chatwoot |
| `ws` | 178.156.151.139 | DNS only | WebSocket server |

### CNAME Records (Cloudflare Pages - Proxied)

| Subdomain | Target | Proxy | Purpose |
|-----------|--------|-------|---------|
| `app` | visualkit-dashboard.pages.dev | Proxied | Dashboard app |
| `meet` | visualkit-meeting.pages.dev | Proxied | Meeting app |
| `visualkit.live` | visualkit-landing.pages.dev | Proxied | Landing page |
| `www` | l4xm51g7.up.railway.app | Proxied | Redirect to main |

---

## Service URLs

### Production URLs

| Service | URL | Port (Internal) |
|---------|-----|-----------------|
| **Landing Page** | https://visualkit.live | Cloudflare Pages |
| **Dashboard** | https://app.visualkit.live | Cloudflare Pages |
| **Meeting App** | https://meet.visualkit.live | Cloudflare Pages |
| **Platform API** | https://api.visualkit.live | 3001 |
| **WebSocket** | wss://ws.visualkit.live | 3002 |
| **VK-Agent API** | https://agent.visualkit.live | 3004 |
| **Janus WebSocket** | wss://janus.visualkit.live | 8188 |
| **Widget CDN** | https://cdn.visualkit.live | Static files |
| **Support (Chatwoot)** | https://support.visualkit.live | 3003 |

### Internal Ports (on Hetzner Server)

| Service | Port | Protocol |
|---------|------|----------|
| Platform API | 3001 | HTTP |
| WebSocket Server | 3002 | WS |
| Chatwoot | 3000, 3003 | HTTP |
| VK-Agent API | 3004 | HTTP |
| VK-Agent RTP | 5005 | UDP |
| Janus HTTP | 8088 | HTTP |
| Janus WebSocket | 8188 | WS |
| Janus RTP | 10000-60000 | UDP |

---

## Caddy Configuration (Reverse Proxy)

Location: `/etc/caddy/Caddyfile`

```caddy
# Platform API
api.visualkit.live {
    reverse_proxy localhost:3001
}

# Widget CDN
cdn.visualkit.live {
    root * /opt/widget-cdn
    file_server
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, OPTIONS"
        Cache-Control "public, max-age=31536000, immutable"
    }
}

# Chatwoot Support
support.visualkit.live {
    reverse_proxy localhost:3003
    header -X-Frame-Options
}

# WebSocket endpoint
ws.visualkit.live {
    reverse_proxy localhost:3002
}

# VK-Agent
agent.visualkit.live {
    reverse_proxy localhost:3004
}

# Janus WebSocket (for browser WebRTC)
janus.visualkit.live {
    reverse_proxy localhost:8188
}

# Janus HTTP API
janus-api.visualkit.live {
    reverse_proxy localhost:8088
}
```

---

## Cloudflare Pages Deployments

### Landing Page
- **Project**: `visualkit-landing`
- **URL**: https://visualkit.live
- **Source**: `apps/landing` (built with Vite)
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`

### Dashboard
- **Project**: `visualkit-dashboard`
- **URL**: https://app.visualkit.live
- **Source**: `apps/dashboard` (built with Vite)
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`

### Meeting App
- **Project**: `visualkit-meeting`
- **URL**: https://meet.visualkit.live
- **Source**: `apps/meeting` (built with Vite)
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`

---

## Docker Services

### VK-Agent (Voice AI)

```yaml
# /opt/vk-agent/docker-compose.yml
services:
  vk-agent:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vk-agent
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - VK_AGENT_JANUS_WS_URL=ws://172.18.0.1:8188
      - VK_AGENT_RTP_HOST=172.18.0.2
      - VK_AGENT_RTP_PORT=5005
    ports:
      - "5005:5005/udp"  # RTP audio
      - "3004:3004"      # API server
```

### Janus Gateway

```yaml
# /opt/janus/docker-compose.yml
services:
  janus:
    image: canyan/janus-gateway:latest
    container_name: janus-gateway
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./config:/etc/janus:ro
    environment:
      - JANUS_STUN_SERVER=stun:stun.l.google.com:19302
```

### Platform API

```yaml
# /opt/platform-api/docker-compose.yml
services:
  platform-api:
    build: .
    container_name: platform-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Janus Gateway Configuration

### Main Config (`/opt/janus/config/janus.jcfg`)

```
general: {
    configs_folder = "/etc/janus"
    plugins_folder = "/usr/lib/janus/plugins"
    transports_folder = "/usr/lib/janus/transports"
    log_to_stdout = true
    debug_level = 4
    admin_secret = "[REDACTED]"
}

nat: {
    stun_server = "stun.l.google.com"
    stun_port = 19302
    nice_debug = false
    full_trickle = true
    ice_lite = false
    ice_tcp = false
    rtp_port_range = "10000-60000"
}

media: {
    max_nack_queue = 1000
    rtp_port_range = "10000-60000"
}
```

### WebSocket Transport (`janus.transport.websockets.jcfg`)

```
general: {
    json = "indented"
    ws = true
    ws_port = 8188
    ws_ip = "0.0.0.0"
    wss = false
    ws_ping_pong = true
    ws_logging = "err,warn"
}
```

### HTTP Transport (`janus.transport.http.jcfg`)

```
general: {
    json = "indented"
    base_path = "/janus"
}

http: {
    http = true
    port = 8088
    https = false
}

cors: {
    allow_origin = "*"
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Cloudflare Pages (Static Sites)              DNS (Proxied/Direct)          │
│  ┌─────────────────────────────────┐          ┌─────────────────────────┐   │
│  │ visualkit.live (Landing)        │          │ api.visualkit.live     ─┼───┤
│  │ app.visualkit.live (Dashboard)  │          │ agent.visualkit.live   ─┼───┤
│  │ meet.visualkit.live (Meeting)   │          │ janus.visualkit.live   ─┼───┤
│  └─────────────────────────────────┘          │ cdn.visualkit.live     ─┼───┤
│                                                │ support.visualkit.live ─┼───┤
│                                                │ ws.visualkit.live      ─┼───┤
│                                                └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        HETZNER VPS (178.156.151.139)                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                           CADDY (Reverse Proxy)                      │    │
│   │   - SSL/TLS termination                                              │    │
│   │   - Routes traffic to internal services                              │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                    │           │           │           │                      │
│                    ▼           ▼           ▼           ▼                      │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐            │
│   │ Platform   │ │  VK-Agent  │ │   Janus    │ │    Chatwoot    │            │
│   │   API      │ │  (Python)  │ │  Gateway   │ │    Support     │            │
│   │  :3001     │ │   :3004    │ │   :8188    │ │     :3003      │            │
│   └────────────┘ └────────────┘ └────────────┘ └────────────────┘            │
│         │               │              │                                      │
│         │               │              │                                      │
│         │        ┌──────┴──────┐       │                                      │
│         │        │   Gemini    │       │                                      │
│         │        │  Live API   │       │                                      │
│         │        │  (Google)   │       │                                      │
│         │        └─────────────┘       │                                      │
│         │                              │                                      │
│         ▼                              ▼                                      │
│   ┌────────────────────────────────────────────────────────────────┐         │
│   │                    RTP Audio Flow                               │         │
│   │                                                                 │         │
│   │    Browser ◄──WebRTC──► Janus ◄──RTP──► VK-Agent ◄──WS──► Gemini│         │
│   │                                                                 │         │
│   └────────────────────────────────────────────────────────────────┘         │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## VK-Agent API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Detailed bridge status |
| `/stats` | GET | Bridge statistics |
| `/text` | POST | Send text to Gemini |
| `/screen` | POST | Send screen frame (base64 image) |
| `/mute` | POST | Mute/unmute agent |
| `/stop` | POST | Stop the bridge |
| `/config` | GET | Current configuration |

### Screen Frame API (Visual AI)

```bash
# Send a screen frame for visual understanding
curl -X POST https://agent.visualkit.live/screen \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<base64-encoded-jpeg>",
    "mime_type": "image/jpeg"
  }'
```

---

## Quick Reference Commands

### Check Service Status

```bash
# SSH to server
ssh root@178.156.151.139

# Check all Docker containers
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Check VK-Agent logs
docker logs vk-agent --tail 50

# Check Janus logs
docker logs janus-gateway --tail 50

# Check Platform API logs
docker logs platform-api --tail 50

# Check Caddy status
systemctl status caddy

# View Caddy config
cat /etc/caddy/Caddyfile

# Reload Caddy
systemctl reload caddy
```

### Health Checks

```bash
# Platform API
curl https://api.visualkit.live/health

# VK-Agent
curl https://agent.visualkit.live/health

# VK-Agent detailed status
curl https://agent.visualkit.live/status
```

---

## Email Configuration

| Type | Host | Priority |
|------|------|----------|
| MX | mx.zoho.com | 10 |
| MX | mx2.zoho.com | 20 |
| MX | mx3.zoho.com | 50 |

SPF Record: `v=spf1 include:zoho.com ~all`
DKIM: Configured via `zmail._domainkey`
DMARC: `v=DMARC1; p=none; rua=...`

---

## Security Notes

1. **SSL/TLS**: All traffic proxied through Cloudflare with Full (Strict) SSL
2. **Firewall**: Caddy handles all external traffic, internal services not exposed
3. **DNS Only Records**: Direct connections to server bypass Cloudflare proxy
4. **Secrets**: Stored in `.env` files on server (not in git)

---

## Troubleshooting

### Service Not Responding

```bash
# Check if container is running
docker ps | grep <service-name>

# Restart container
docker restart <container-name>

# Check logs for errors
docker logs <container-name> --tail 100
```

### Janus Connection Issues

```bash
# Test WebSocket
wscat -c wss://janus.visualkit.live

# Check Janus HTTP
curl http://localhost:8088/janus/info
```

### VK-Agent Audio Issues

```bash
# Check agent status
curl https://agent.visualkit.live/status

# View RTP statistics
curl https://agent.visualkit.live/stats
```
