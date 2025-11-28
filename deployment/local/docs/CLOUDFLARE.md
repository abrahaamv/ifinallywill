# Cloudflare Tunnel Setup

Cloudflare Tunnel lets you expose your local server to the internet securely, without opening ports or exposing your IP.

## Why Cloudflare Tunnel?

| Feature | Traditional Port Forwarding | Cloudflare Tunnel |
|---------|---------------------------|-------------------|
| **Security** | Exposes your IP | IP hidden |
| **SSL** | Manual setup needed | Automatic, free |
| **Firewall** | Port forwarding required | No ports needed |
| **DDoS Protection** | None | Built-in |
| **Cost** | Free | Free |

## Prerequisites

- Cloudflare account (free)
- Domain name (can use free Cloudflare subdomain)

## Step 1: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for free account
3. Verify email

## Step 2: Add Domain (Optional but Recommended)

**Option A: Use your own domain**

1. Go to Cloudflare Dashboard → "Add a Site"
2. Enter your domain
3. Select Free plan
4. Update nameservers at your registrar to Cloudflare's

**Option B: Use free Cloudflare subdomain**

- You can use `*.cfargotunnel.com` subdomains for free
- Less professional but works fine for demos

## Step 3: Create Tunnel

### Via CLI (Recommended)

```bash
# Install cloudflared (if not already)
# Already done by setup.sh

# Login to Cloudflare
cloudflared tunnel login

# This opens a browser - authorize the domain you want to use

# Create tunnel
cloudflared tunnel create ai-platform

# This outputs:
# - Tunnel UUID
# - Credentials file location (~/.cloudflared/<uuid>.json)
```

### Via Dashboard

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to: Networks → Tunnels
3. Click "Create a tunnel"
4. Choose "Cloudflared" connector
5. Name it "ai-platform"
6. Copy the tunnel token

## Step 4: Get Tunnel Token

### From Dashboard
1. Go to Zero Trust → Networks → Tunnels
2. Click on your tunnel
3. Click "Configure"
4. Copy the token from the install command

### From CLI
```bash
# List tunnels
cloudflared tunnel list

# Get tunnel info (includes credentials path)
cloudflared tunnel info ai-platform
```

## Step 5: Configure Routes

In Cloudflare Dashboard (Zero Trust → Networks → Tunnels → Your Tunnel → Public Hostname):

Add these hostnames:

| Public Hostname | Path | Type | URL |
|-----------------|------|------|-----|
| `yourdomain.com` | | HTTP | `http://nginx:80` |
| `api.yourdomain.com` | | HTTP | `http://nginx:80` |
| `app.yourdomain.com` | | HTTP | `http://nginx:80` |
| `meet.yourdomain.com` | | HTTP | `http://nginx:80` |
| `ws.yourdomain.com` | | HTTP | `http://realtime:3002` |
| `livekit.yourdomain.com` | | HTTP | `http://livekit:7880` |

### WebSocket Configuration

For WebSocket routes (ws, livekit), enable these settings:
- **HTTP/2 Origin**: On
- **WebSockets**: On

## Step 6: Add Token to Environment

```bash
cd ~/platform/deployment/local

# Edit .env
nano .env

# Add:
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here
```

## Step 7: Deploy

```bash
./scripts/deploy.sh
```

The cloudflared container will automatically connect to Cloudflare using your token.

## Step 8: Verify

```bash
# Check tunnel is connected
docker compose logs cloudflared

# Should see: "Connection registered" or "Tunnel is connected"

# Test from another device
curl https://yourdomain.com
```

## DNS Configuration

If using your own domain, make sure DNS records exist in Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | @ | `<tunnel-id>.cfargotunnel.com` | Proxied |
| CNAME | api | `<tunnel-id>.cfargotunnel.com` | Proxied |
| CNAME | app | `<tunnel-id>.cfargotunnel.com` | Proxied |
| CNAME | meet | `<tunnel-id>.cfargotunnel.com` | Proxied |
| CNAME | livekit | `<tunnel-id>.cfargotunnel.com` | Proxied |

**Note**: These are usually created automatically when you add routes in Zero Trust.

## LiveKit Special Configuration

LiveKit needs special handling for WebRTC:

### Option 1: Tunnel Only (Recommended for Testing)

Works but may have higher latency:
- Use HTTP route to `livekit:7880`
- Enable WebSocket support

### Option 2: Direct Connection (Better Performance)

For production, consider:
1. Open ports 7880, 7881, 50000-50060/udp
2. Use your public IP or DDNS
3. LiveKit handles its own TURN/STUN

## Troubleshooting

### Tunnel Not Connecting

```bash
# Check cloudflared logs
docker compose logs cloudflared

# Common issues:
# - Invalid token: Double-check CLOUDFLARE_TUNNEL_TOKEN in .env
# - Network issues: Cloudflare uses port 443 outbound
```

### 502 Bad Gateway

```bash
# Check target service is running
docker compose ps nginx

# Check nginx can reach services
docker compose exec nginx wget -qO- http://api:3001/health
```

### WebSocket Not Working

1. In Cloudflare Dashboard → Zero Trust → Settings → Network
2. Enable: "Proxy WebSockets over HTTPS"
3. Or configure per-route in tunnel settings

### SSL Certificate Issues

- Cloudflare handles SSL automatically
- Make sure your domain is proxied (orange cloud in DNS)
- Check SSL/TLS settings: Full (strict) recommended

## Security Settings (Recommended)

In Cloudflare Dashboard:

### SSL/TLS
- Mode: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On

### Security
- Security Level: Medium or High
- Bot Fight Mode: On (if available)
- Browser Integrity Check: On

### Speed
- Auto Minify: CSS, JavaScript, HTML
- Brotli: On

## Cost

Cloudflare Tunnel is **completely free** including:
- Unlimited bandwidth
- Unlimited requests
- Free SSL certificates
- Basic DDoS protection

Paid features (not required):
- Access policies (Zero Trust)
- Advanced analytics
- Custom rules
