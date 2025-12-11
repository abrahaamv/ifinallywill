# Railway Deployment Guide

Deploy VisualKit Landing and Meeting apps to Railway for investor preview.

## Quick Start (5 minutes)

### 1. Install Railway CLI

```bash
# macOS
brew install railway

# Or with npm
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Deploy Landing App (visualkit.live)

```bash
# From project root
cd /home/abrahaam/Documents/GitHub/platform

# Create new Railway project for landing
railway init

# Link to the project
railway link

# Deploy (Railway reads apps/landing/railway.toml)
railway up --config apps/landing/railway.toml
```

After deployment:
1. Go to Railway dashboard → Settings → Domains
2. Add custom domain: `visualkit.live`
3. Update your DNS with the provided CNAME

### 4. Deploy Meeting App (meet.visualkit.live)

```bash
# Create a second Railway project for meeting
railway init

# Link to the new project
railway link

# Deploy
railway up --config apps/meeting/railway.toml
```

After deployment:
1. Go to Railway dashboard → Settings → Domains
2. Add custom domain: `meet.visualkit.live`
3. Update your DNS with the provided CNAME

## Alternative: Railway Dashboard Deployment

If you prefer the web UI:

### Landing App
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect your GitHub and select the `platform` repo
4. Configure:
   - **Root Directory**: Leave empty (uses project root)
   - **Build Command**: Auto-detected from Dockerfile
   - **Dockerfile Path**: `apps/landing/Dockerfile`
5. Deploy and add custom domain `visualkit.live`

### Meeting App
1. Create another Railway service in the same project OR a new project
2. Same steps but use:
   - **Dockerfile Path**: `apps/meeting/Dockerfile`
3. Add custom domain `meet.visualkit.live`

## DNS Configuration

Add these DNS records to your domain registrar (Cloudflare, Namecheap, etc.):

```
# Landing (visualkit.live)
Type: CNAME
Name: @ (or visualkit.live)
Value: <railway-provided-domain>.railway.app

# Meeting (meet.visualkit.live)
Type: CNAME
Name: meet
Value: <railway-provided-domain>.railway.app
```

## Environment Variables (Optional)

The apps use smart defaults, but you can override:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_URL` | Auto-detected | Landing page URL |
| `VITE_DASHBOARD_URL` | `https://dashboard.visualkit.live` | Dashboard URL |
| `VITE_MEET_URL` | `https://meet.visualkit.live` | Meeting app URL |

Set in Railway dashboard → Variables tab.

## Estimated Costs

Railway Hobby plan ($5/month) is sufficient:
- ~$2-3/month for landing (static site, low traffic)
- ~$2-3/month for meeting (static site with client-side demo)

## What Gets Deployed

### Landing Page (visualkit.live)
- Full marketing site with all features described
- "Private Beta - Launching Q1 2025" banner
- Partnership inquiry email link
- Demo widget chat
- Responsive design

### Meeting App (meet.visualkit.live)
- Lobby page for creating/joining rooms
- Demo meeting room with simulated AI assistant
- Screen sharing UI (client-side simulation)
- Chat panel with AI responses

**Note**: The meeting demo is fully client-side. No backend required for the investor preview.

## Testing Before Deploy

```bash
# Build locally to test
pnpm install
pnpm --filter @platform/landing build
pnpm --filter @platform/meeting build

# Preview locally
pnpm --filter @platform/landing preview
pnpm --filter @platform/meeting preview
```

## Troubleshooting

### Build fails on Railway
- Check Dockerfile paths are correct
- Ensure pnpm-lock.yaml is committed
- Check Railway logs for specific errors

### Domain not working
- DNS propagation can take 24-48 hours
- Verify CNAME records are correct
- Check Railway domain settings

### Apps show wrong URLs
- Set environment variables in Railway dashboard
- Or rely on auto-detection (hostname-based)

## Support

For issues: Create an issue in the GitHub repository.
For partnership inquiries: abrahaam@visualkit.live
