# Setup Guide - AI Assistant Platform Production Agent

Complete setup and deployment guide for the production LiveKit agent.

## Prerequisites

- **Python 3.10+** - Required for LiveKit SDK
- **Virtual environment** - For dependency isolation
- **Backend API running** - TypeScript tRPC backend at `http://localhost:3001`
- **LiveKit server** - Cloud or self-hosted
- **API keys** - OpenAI, Deepgram, Cartesia/Rime

## Installation

### 1. Navigate to Reference Implementation

```bash
cd docs/reference/ai-agent
```

**Note**: This is the reference implementation. For production implementation, see `../ai-agent-implementation.md`

### 2. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Check Python 3.10+ is installed
- Create virtual environment in `venv/`
- Install all dependencies from `requirements.txt`
- Upgrade pip to latest version

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# LiveKit (REQUIRED)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx

# AI Services (REQUIRED)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxx

# TTS (Choose one - REQUIRED)
CARTESIA_API_KEY=xxxxxxxxxxxxxxxx  # Development
RIME_API_KEY=xxxxxxxxxxxxxxxx      # Production (optional)

# Backend Integration (REQUIRED)
API_BASE_URL=http://localhost:3001
AGENT_API_KEY=xxxxxxxxxxxxxxxx
```

### 4. Start Backend API

The agent requires the TypeScript backend to be running:

```bash
# In another terminal
cd ../../packages/api
pnpm dev
```

Backend should be running at `http://localhost:3001`.

### 5. Start Agent

```bash
chmod +x start.sh
./start.sh
```

You should see:
```
🚀 Starting AI Assistant Platform Agent
========================================
Activating virtual environment...
Loading environment variables...
✅ All required environment variables set

Configuration:
  LiveKit URL: wss://your-project.livekit.cloud
  Backend API: http://localhost:3001
  Environment: development

Starting agent...
```

## Getting API Keys

### LiveKit

1. Sign up at [livekit.io](https://livekit.io)
2. Create a new project
3. Go to Settings → API Keys
4. Copy URL, API Key, and API Secret

### OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy and save securely

### Deepgram

1. Sign up at [console.deepgram.com](https://console.deepgram.com)
2. Create new API key
3. Copy and save

### Cartesia (Development TTS)

1. Sign up at [cartesia.ai](https://cartesia.ai)
2. Generate API key
3. Copy and save

### Rime AI (Production TTS - Optional)

1. Contact [rime.ai](https://rime.ai) for access
2. Get API key
3. Configure for production environment

## Backend Integration Setup

### 1. Generate Agent API Key

In the backend admin panel:

```typescript
// Create agent API key for backend authentication
const agentKey = await generateAgentApiKey({
  name: "Production Agent",
  permissions: ["tenant.read", "usage.write", "knowledge.search"]
});
```

### 2. Configure Backend URL

Development:
```bash
API_BASE_URL=http://localhost:3001
```

Production:
```bash
API_BASE_URL=https://api.yourdomain.com
```

### 3. Test Connection

```bash
# The agent will test backend connection on startup
# Check logs for:
# ✅ Backend connection successful
# ℹ️ Connected to backend: http://localhost:3001
```

## Environment-Specific Configuration

### Development

```bash
AGENT_ENV=development
CARTESIA_API_KEY=your-cartesia-key  # Use Cartesia for faster/cheaper TTS
```

### Production

```bash
AGENT_ENV=production
RIME_API_KEY=your-rime-key  # Use Rime AI for premium voice quality
```

## Verification

### 1. Check Agent Status

After starting, verify:
- ✅ Virtual environment activated
- ✅ All environment variables loaded
- ✅ Backend connection successful
- ✅ LiveKit connection established

### 2. Test Meeting Integration

1. Start frontend: `cd apps/web && pnpm dev`
2. Create a meeting room
3. Agent should automatically join
4. Test voice, vision, and chat capabilities

### 3. Monitor Logs

```bash
# Agent logs show:
# - Room joins/leaves
# - Vision API calls with cost tracking
# - Backend integration events
# - Usage tracking confirmations
```

## Troubleshooting

### Python Version Error

```
❌ Error: Python 3.10+ required. Found: 3.9.x
```

**Solution**: Install Python 3.10+
```bash
# Ubuntu/Debian
sudo apt install python3.10

# macOS
brew install python@3.10
```

### Missing Environment Variables

```
❌ Error: Missing required environment variables:
  - LIVEKIT_URL
  - OPENAI_API_KEY
```

**Solution**: Check `.env` file has all required variables

### Backend Connection Failed

```
❌ Backend connection failed: Connection refused
```

**Solution**:
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check `API_BASE_URL` is correct
3. Verify `AGENT_API_KEY` is valid

### LiveKit Connection Failed

```
❌ LiveKit connection failed: Invalid credentials
```

**Solution**:
1. Verify `LIVEKIT_URL` format: `wss://your-project.livekit.cloud`
2. Check API Key and Secret are correct
3. Ensure project is active in LiveKit dashboard

### Vision API Errors

```
❌ Vision API error: Rate limit exceeded
```

**Solution**:
1. Check OpenAI API quota
2. Verify billing is set up
3. 1 FPS capture should prevent rate limits

## Advanced Configuration

### Custom Instructions

Edit `agent.py`:

```python
INSTRUCTIONS = """
Your custom AI assistant instructions here.
Customize personality, tone, capabilities, etc.
"""
```

### Adjust Frame Rate

Default is 1 FPS (optimal for cost). To adjust:

```python
# In agent.py
TARGET_FPS = 1  # Change if needed (higher = more cost)
```

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=DEBUG
```

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t ai-agent:latest .

# Run container
docker run -d \
  --env-file .env \
  --name ai-agent \
  ai-agent:latest
```

### Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/ai-agent.service
```

```ini
[Unit]
Description=AI Assistant Platform Agent
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ai_agent_true
Environment="PATH=/path/to/ai_agent_true/venv/bin"
ExecStart=/path/to/ai_agent_true/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable ai-agent
sudo systemctl start ai-agent
```

## Next Steps

- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Backend integration patterns
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
- **Platform docs** - See `../../../../docs/` for complete platform documentation
- **Production implementation** - See `../ai-agent-implementation.md` for production guide

## Support

For issues:
1. Check agent logs for error details
2. Verify backend API is accessible
3. Review platform documentation
4. Check LiveKit dashboard for connection status
