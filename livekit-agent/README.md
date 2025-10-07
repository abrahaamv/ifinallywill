# LiveKit Multi-Modal Agent (Phase 5 - Week 2)

Python-based AI agent for real-time meeting interaction with multi-modal capabilities.

## Features

- **1 FPS Screen Capture**: 96% cost reduction vs 30 FPS
- **Voice Transcription**: Deepgram Nova-2 model
- **Multi-Modal AI**: Vision + voice + text processing
- **Tenant Isolation**: Automatic context extraction from room metadata
- **RAG Integration**: Backend API for knowledge base queries

## Requirements

- Python 3.11+
- LiveKit Cloud account (Enterprise plan recommended)
- Deepgram API key

## Setup

### 1. Create Virtual Environment

\`\`\`bash
cd livekit-agent

# Using pyenv (recommended)
pyenv install 3.11
pyenv local 3.11

# Create virtual environment
python -m venv venv

# Activate
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
\`\`\`

### 2. Install Dependencies

\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 3. Configure Environment

\`\`\`bash
cp .env.example .env
# Edit .env with your credentials
\`\`\`

Required credentials:
- \`LIVEKIT_URL\`: Your LiveKit Cloud URL (wss://your-project.livekit.cloud)
- \`LIVEKIT_API_KEY\`: API key from LiveKit Cloud
- \`LIVEKIT_API_SECRET\`: API secret from LiveKit Cloud
- \`DEEPGRAM_API_KEY\`: API key from Deepgram

### 4. Run Agent

\`\`\`bash
# Development mode (auto-connects to all rooms)
python agent.py dev

# Production mode (connects via webhook)
python agent.py start
\`\`\`

## Architecture

### Screen Capture Optimization

**1 FPS Sampling Strategy**:
- Input: 30 FPS screen share from client
- Processing: Sample 1 frame every 30 frames
- Cost: 60 frames/minute vs 1,800 frames/minute (30 FPS)
- Reduction: **96% cost savings**

### Tenant Context

Room name format: \`tenant_{tenantId}_{roomName}\`

Example: \`tenant_org_abc123_sales-meeting\`
- Tenant ID: \`org_abc123\`
- Room: \`sales-meeting\`

Agent extracts tenant context to:
1. Fetch tenant-specific knowledge base
2. Apply custom AI instructions
3. Track usage for billing

### Track Handling

**Audio Tracks** → Deepgram transcription → LLM processing → Voice synthesis
**Screen Share** → 1 FPS sampling → Vision AI analysis → Contextual responses
**Camera Tracks** → Not processed (cost optimization)

## Development Status

**Phase 5 Week 2**: ✅ Base agent implementation complete
- Room connection and track subscription
- 1 FPS screen capture logic
- Deepgram integration
- Tenant context extraction

**Phase 5 Week 3**: ⏳ AI integration pending
- Gemini Flash 2.5 for vision analysis
- GPT-4o-mini for LLM processing
- RAG backend integration
- Voice synthesis

## Testing

### Local Development

1. Start backend API:
\`\`\`bash
cd ../
pnpm dev:api
\`\`\`

2. Start agent:
\`\`\`bash
cd livekit-agent
source venv/bin/activate
python agent.py dev
\`\`\`

3. Create meeting room from dashboard and join
4. Agent should auto-connect and send welcome message

### Production Testing

See \`docs/implementation/PHASE_5_WEEK_2_READINESS.md\` for complete testing procedures.

## Troubleshooting

### Agent Not Connecting

- Verify LiveKit credentials in \`.env\`
- Check LiveKit Cloud dashboard for active rooms
- Ensure backend API is running
- Check logs: \`LOG_LEVEL=DEBUG python agent.py dev\`

### Deepgram Errors

- Verify Deepgram API key
- Check API usage limits
- Ensure audio track is being received

### Track Subscription Issues

- Check room metadata includes tenant prefix
- Verify AutoSubscribe configuration
- Check track publication settings in frontend

## Cost Optimization

**Screen Capture**: 1 FPS = $0.10/hour/user (vs $3.00/hour @ 30 FPS)
**Voice Transcription**: Deepgram Nova-2 = $0.0043/minute
**Vision AI**: Gemini Flash 2.5 = $0.00015/image

**Total**: ~$0.40/hour/user for full multi-modal experience

## References

- LiveKit Agents: https://docs.livekit.io/agents/overview/
- Deepgram: https://developers.deepgram.com/
- Backend API: \`packages/api-contract/src/routers/livekit.ts\`
