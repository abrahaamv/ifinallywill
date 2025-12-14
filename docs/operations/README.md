# Operations Documentation

Operational guides for the VisualKit AI Assistant Platform deployed on Hetzner VPS + Cloudflare.

**Last Updated**: 2025-12-14

---

## Production Infrastructure

| Component | Location | Details |
|-----------|----------|---------|
| **Server** | Hetzner VPS | `178.156.151.139` |
| **Reverse Proxy** | Caddy | Auto SSL, routing |
| **DNS/CDN** | Cloudflare | DNS + Pages |
| **Frontend Apps** | Cloudflare Pages | Landing, Dashboard, Meeting |

See [infrastructure.md](infrastructure.md) for complete details.

---

## Quick Reference

### Service Health

```bash
# Platform API
curl https://api.visualkit.live/health

# VK-Agent (Voice AI)
curl https://agent.visualkit.live/health
curl https://agent.visualkit.live/status  # Detailed status

# Check all services on server
ssh root@178.156.151.139 "docker ps"
```

### Server Access

```bash
# SSH to server
ssh root@178.156.151.139

# View container logs
docker logs platform-api --tail 50
docker logs vk-agent --tail 50
docker logs janus-gateway --tail 50

# Restart services
docker restart platform-api
docker restart vk-agent

# Reload Caddy
systemctl reload caddy
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [infrastructure.md](infrastructure.md) | **Production deployment details** - DNS, services, Docker, Caddy |
| [deployment.md](deployment.md) | Deployment strategies and options |
| [observability.md](observability.md) | Monitoring and logging patterns |
| [alerting.md](alerting.md) | Alert configuration |
| [backup-restore-procedures.md](backup-restore-procedures.md) | Backup and restore |
| [troubleshooting.md](troubleshooting.md) | Common issues and solutions |
| [cost-optimization.md](cost-optimization.md) | Cost management |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Pages (Static):                    DNS (A Records):                │
│  - visualkit.live (Landing)         - api.visualkit.live            │
│  - app.visualkit.live (Dashboard)   - agent.visualkit.live          │
│  - meet.visualkit.live (Meeting)    - janus.visualkit.live          │
│                                      - cdn.visualkit.live           │
│                                      - support.visualkit.live       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   HETZNER VPS (178.156.151.139)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CADDY (Reverse Proxy + SSL)                                        │
│   └── Routes: api, agent, janus, cdn, support                        │
│                                                                      │
│   DOCKER CONTAINERS:                                                 │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│   │  Platform API  │  │    VK-Agent    │  │ Janus Gateway  │        │
│   │     :3001      │  │     :3004      │  │     :8188      │        │
│   │   (Fastify)    │  │   (Python)     │  │   (WebRTC)     │        │
│   └────────────────┘  └────────────────┘  └────────────────┘        │
│                              │                    │                  │
│                              ▼                    │                  │
│                       ┌────────────┐              │                  │
│                       │  Gemini    │◄─────────────┘                  │
│                       │  Live API  │   (Audio via RTP)              │
│                       └────────────┘                                 │
│                                                                      │
│   ┌────────────────────────────────────────────────────┐            │
│   │                    CHATWOOT                         │            │
│   │  chatwoot-1 (main) + sidekiq (jobs) + proxy        │            │
│   └────────────────────────────────────────────────────┘            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Service Details

### Platform API (`api.visualkit.live`)

- **Port**: 3001
- **Stack**: Fastify + tRPC v11
- **Container**: `platform-api`
- **Health**: `curl https://api.visualkit.live/health`

### VK-Agent (`agent.visualkit.live`)

- **Port**: 3004 (API), 5005/UDP (RTP)
- **Stack**: Python + FastAPI + Gemini Live API
- **Container**: `vk-agent`
- **Health**: `curl https://agent.visualkit.live/health`

**API Endpoints**:
- `GET /health` - Health check
- `GET /status` - Detailed status
- `POST /text` - Send text to Gemini
- `POST /screen` - Send screen frame for visual AI
- `POST /mute` - Mute/unmute

### Janus Gateway (`janus.visualkit.live`)

- **Ports**: 8188 (WebSocket), 8088 (HTTP), 10000-60000 (RTP)
- **Container**: `janus-gateway`
- **Plugin**: AudioBridge

### Chatwoot (`support.visualkit.live`)

- **Port**: 3003
- **Containers**: `chatwoot-chatwoot-1`, `chatwoot-chatwoot-sidekiq-1`, `chatwoot-chatwoot-proxy-1`

---

## Common Operations

### Deploy Frontend Updates

Frontends auto-deploy via Cloudflare Pages on push to main branch.

### Deploy Backend Updates

```bash
# SSH to server
ssh root@178.156.151.139

# Pull latest code and rebuild
cd /opt/platform-api
git pull
docker compose build
docker compose up -d

# Check logs
docker logs platform-api --tail 50
```

### Update VK-Agent

```bash
ssh root@178.156.151.139
cd /opt/vk-agent
git pull
docker compose build
docker compose up -d
```

### Caddy Configuration

```bash
# Edit config
nano /etc/caddy/Caddyfile

# Test config
caddy validate --config /etc/caddy/Caddyfile

# Reload
systemctl reload caddy
```

---

## Emergency Procedures

### Service Down

1. Check container status: `docker ps -a`
2. View logs: `docker logs <container> --tail 100`
3. Restart: `docker restart <container>`
4. Check Caddy: `systemctl status caddy`

### High Resource Usage

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -m
```

### Rollback

```bash
# Frontend: Rollback via Cloudflare Pages dashboard

# Backend: Revert to previous image
docker compose down
git checkout <previous-commit>
docker compose build
docker compose up -d
```

---

## Monitoring

### Health Checks

```bash
# Check all services
curl -s https://api.visualkit.live/health | jq
curl -s https://agent.visualkit.live/health | jq
curl -s https://agent.visualkit.live/status | jq
```

### Logs

```bash
# Docker logs
docker logs platform-api --tail 100 -f
docker logs vk-agent --tail 100 -f
docker logs janus-gateway --tail 100 -f

# Caddy logs
journalctl -u caddy -f
```

---

## Cost Overview

| Component | Cost | Notes |
|-----------|------|-------|
| Hetzner VPS | ~$10-30/month | Depends on specs |
| Cloudflare | Free | Free plan sufficient |
| Gemini API | ~$0.40/1M tokens | Pay per use |
| **Total** | ~$20-50/month | Excluding AI usage |

---

## Security

- **SSL/TLS**: Auto-managed by Caddy
- **Firewall**: UFW configured on server
- **SSH**: Key-based authentication only
- **Secrets**: Stored in `.env` files (not in git)
- **CORS**: Configured in each service

---

**Last Updated**: 2025-12-14
