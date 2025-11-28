# Local Server Deployment

Self-hosted deployment for the AI Assistant Platform using Docker Compose + Cloudflare Tunnel.

## Overview

This setup allows you to run the entire platform on a local server (old laptop, mini PC, etc.) and expose it securely to the internet using Cloudflare Tunnel - **completely free**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Local Server                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Docker Compose                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │ Landing │ │Dashboard│ │ Meeting │ │  API    │     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │Realtime │ │PostgreSQL│ │  Redis  │ │ LiveKit │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  │  ┌─────────┐ ┌─────────────────────────────────┐     │  │
│  │  │ Agent   │ │     Cloudflare Tunnel           │     │  │
│  │  │(Python) │ │     (Secure Exposure)           │     │  │
│  │  └─────────┘ └─────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Outbound connection only)
                    ┌─────────────────┐
                    │ Cloudflare Edge │
                    │                 │
                    │ yourdomain.com  │
                    └─────────────────┘
```

## Quick Start

### On Your Server (First Time Setup)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/platform.git
cd platform

# 2. Run the setup script
cd deployment/local
chmod +x scripts/*.sh
./scripts/setup.sh

# 3. Configure environment
cp .env.example .env
nano .env  # Edit with your API keys

# 4. Start everything
./scripts/deploy.sh
```

### Updating (From Your Dev Laptop)

```bash
# SSH into your server
ssh user@your-server-ip

# Pull latest changes and redeploy
cd ~/platform/deployment/local
./scripts/update.sh
```

## Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8GB | 16GB |
| CPU | 4 cores | 8 cores |
| Storage | 50GB SSD | 100GB SSD |
| Internet | 10 Mbps upload | 50+ Mbps |
| OS | Ubuntu 22.04 | Ubuntu 24.04 Server |

## Files Structure

```
deployment/local/
├── README.md                 # This file
├── docker-compose.yml        # Main compose file
├── .env.example              # Environment template
├── scripts/
│   ├── setup.sh              # First-time setup
│   ├── deploy.sh             # Build and start services
│   ├── update.sh             # Pull and redeploy
│   ├── stop.sh               # Stop all services
│   ├── logs.sh               # View logs
│   ├── backup.sh             # Backup databases
│   └── status.sh             # Check service health
├── config/
│   ├── nginx/
│   │   └── nginx.conf        # Reverse proxy config
│   ├── livekit/
│   │   └── livekit.yaml      # LiveKit server config
│   └── postgres/
│       └── init.sql          # Database initialization
├── dockerfiles/
│   ├── api.Dockerfile
│   ├── realtime.Dockerfile
│   ├── landing.Dockerfile
│   ├── dashboard.Dockerfile
│   ├── meeting.Dockerfile
│   └── livekit-agent.Dockerfile
└── docs/
    ├── SETUP.md              # Detailed setup guide
    ├── CLOUDFLARE.md         # Cloudflare Tunnel setup
    ├── SSH.md                # Remote access setup
    └── TROUBLESHOOTING.md    # Common issues
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `./scripts/setup.sh` | Install Docker, dependencies, prepare environment |
| `./scripts/deploy.sh` | Build images and start all services |
| `./scripts/update.sh` | Git pull + rebuild changed services |
| `./scripts/stop.sh` | Stop all services gracefully |
| `./scripts/logs.sh [service]` | View logs (all or specific service) |
| `./scripts/backup.sh` | Backup PostgreSQL and Redis data |
| `./scripts/status.sh` | Health check all services |
| `./scripts/cleanup.sh` | Remove unused Docker resources |

## Ports Used (Internal)

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Reverse proxy (main entry) |
| Landing | 5173 | Marketing site |
| Dashboard | 5174 | Admin dashboard |
| Meeting | 5175 | Meeting rooms |
| API | 3001 | Backend API |
| Realtime | 3002 | WebSocket server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & pub/sub |
| LiveKit | 7880 | WebRTC signaling |
| LiveKit RTC | 7881 | WebRTC TCP |
| LiveKit UDP | 50000-50100 | WebRTC media |

## Cloudflare Tunnel Routes

Once configured, your services will be available at:

| URL | Service |
|-----|---------|
| `https://yourdomain.com` | Landing page |
| `https://app.yourdomain.com` | Dashboard |
| `https://meet.yourdomain.com` | Meeting rooms |
| `https://api.yourdomain.com` | Backend API |
| `https://ws.yourdomain.com` | WebSocket |
| `https://livekit.yourdomain.com` | LiveKit server |

## Security Notes

- All traffic encrypted via Cloudflare (free SSL)
- No ports exposed to internet (tunnel is outbound only)
- Your server IP is hidden behind Cloudflare
- Database only accessible within Docker network
- API keys stored in `.env` (never commit this file)

## Cost

- **Server**: $0 (your hardware)
- **Electricity**: ~$5-10/month
- **Cloudflare**: $0 (free tier)
- **Domain**: ~$10-15/year (optional, can use free subdomain)
- **Total**: ~$5-10/month

## Next Steps

1. Follow [docs/SETUP.md](docs/SETUP.md) for detailed installation
2. Set up [Cloudflare Tunnel](docs/CLOUDFLARE.md)
3. Configure [SSH access](docs/SSH.md) for remote management
4. Test your deployment
5. Share with contractors!
