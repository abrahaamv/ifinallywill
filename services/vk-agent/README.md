# VK-Agent: Janus-Gemini Voice Bridge

Production-grade voice AI agent service that bridges Janus AudioBridge with Google Gemini Live API for real-time conversational AI in video meetings.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VK-Agent Architecture                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────┐    WebSocket     ┌────────────────────────────────────────┐   │
│   │    Janus    │◄────────────────►│              VK-Agent                  │   │
│   │ AudioBridge │                  │  ┌──────────────────────────────────┐  │   │
│   │             │    RTP/UDP       │  │        JanusClient               │  │   │
│   │  Room 5679  │◄────────────────►│  │  - WebSocket signaling           │  │   │
│   │             │                  │  │  - Plain RTP mode (no WebRTC)    │  │   │
│   └─────────────┘                  │  │  - generate_offer flow           │  │   │
│         ▲                          │  └──────────────────────────────────┘  │   │
│         │                          │                  │                      │   │
│         │ WebRTC                   │                  ▼                      │   │
│         │                          │  ┌──────────────────────────────────┐  │   │
│   ┌─────────────┐                  │  │        AudioProcessor            │  │   │
│   │   Browser   │                  │  │  - Opus encode/decode            │  │   │
│   │   Clients   │                  │  │  - Sample rate conversion        │  │   │
│   │             │                  │  │    48kHz ↔ 16kHz/24kHz          │  │   │
│   └─────────────┘                  │  │  - PCM16 frame handling          │  │   │
│                                    │  └──────────────────────────────────┘  │   │
│                                    │                  │                      │   │
│                                    │                  ▼                      │   │
│   ┌─────────────┐    WebSocket     │  ┌──────────────────────────────────┐  │   │
│   │   Gemini    │◄────────────────►│  │        GeminiClient              │  │   │
│   │  Live API   │                  │  │  - Live API v1alpha             │  │   │
│   │             │                  │  │  - Bidirectional audio           │  │   │
│   │ 2.0-flash   │                  │  │  - Native voice (Puck)           │  │   │
│   └─────────────┘                  │  │  - Tool/function support         │  │   │
│                                    │  └──────────────────────────────────┘  │   │
│                                    │                  │                      │   │
│                                    │                  ▼                      │   │
│                                    │  ┌──────────────────────────────────┐  │   │
│                                    │  │        RTPHandler                │  │   │
│                                    │  │  - RFC 3550 packet parsing       │  │   │
│                                    │  │  - Jitter buffer (100ms)         │  │   │
│                                    │  │  - UDP socket management         │  │   │
│                                    │  │  - Sequence/timestamp tracking   │  │   │
│                                    │  └──────────────────────────────────┘  │   │
│                                    └────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Audio Pipeline

### Janus → Gemini (User Speech)
```
RTP Opus 48kHz → Decode Opus → Resample 48kHz→16kHz → PCM16 bytes → Gemini WebSocket
```

### Gemini → Janus (AI Response)
```
Gemini WebSocket → PCM16 24kHz → Resample 24kHz→48kHz → Encode Opus → RTP packets
```

## Features

- **Sub-500ms Latency**: Direct audio streaming to Gemini Live API
- **Native Voice**: Uses Gemini's Puck voice (no separate TTS)
- **Interruption Handling**: Built-in support for natural conversation flow
- **Feedback Prevention**: Blocks audio forwarding while AI is speaking
- **Jitter Buffer**: Handles out-of-order RTP packets
- **Multi-Room Support**: One agent instance per room
- **Health Monitoring**: REST API for status and control
- **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM

## Quick Start

### Prerequisites

- Python 3.11+
- Janus Gateway with AudioBridge plugin
- Google AI API key (Gemini)
- libopus (for Opus codec)

### Installation

```bash
cd services/vk-agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install system dependency (Opus codec)
# Ubuntu/Debian:
sudo apt-get install libopus-dev

# macOS:
brew install opus

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (GEMINI_API_KEY required)
```

### Running

```bash
# Development mode (verbose logging)
python -m src.main --room 5679 --verbose

# Production mode
python -m src.main --room 5679

# With custom configuration
python -m src.main \
  --room 5679 \
  --janus-url ws://janus:8188 \
  --rtp-host 172.19.0.1 \
  --rtp-port 5004 \
  --model models/gemini-2.0-flash-exp \
  --voice Puck
```

### Docker

```bash
# Build
docker build -t vk-agent:latest .

# Run
docker run -d \
  --name vk-agent \
  --env-file .env \
  -p 5004:5004/udp \
  -p 3004:3004 \
  vk-agent:latest --room 5679

# Docker Compose (with Janus)
docker-compose up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google AI API key | **Required** |
| `VK_AGENT_JANUS_WS_URL` | Janus WebSocket URL | `ws://localhost:8188` |
| `VK_AGENT_JANUS_ROOM_ID` | AudioBridge room ID | `5679` |
| `VK_AGENT_RTP_HOST` | Host IP for RTP (Docker gateway) | `172.19.0.1` |
| `VK_AGENT_RTP_PORT` | RTP listening port | `5004` |
| `VK_AGENT_GEMINI_MODEL` | Gemini model ID | `models/gemini-2.0-flash-exp` |
| `VK_AGENT_GEMINI_VOICE` | Voice preset | `Puck` |
| `VK_AGENT_LOG_LEVEL` | Logging level | `INFO` |
| `VK_AGENT_DEBUG_AUDIO` | Save audio to files | `false` |

### Command Line Options

```
usage: main.py [-h] [--room ROOM] [--janus-url URL] [--rtp-host HOST]
               [--rtp-port PORT] [--model MODEL] [--voice {Puck,Aoede,...}]
               [--verbose] [--debug-audio]

VK-Agent: Janus-Gemini Voice Bridge

optional arguments:
  --room, -r          Janus AudioBridge room ID
  --janus-url         Janus WebSocket URL
  --rtp-host          Host IP for RTP (Docker gateway)
  --rtp-port          RTP listening port
  --model             Gemini model ID
  --voice             Voice preset (Puck, Aoede, Charon, Fenrir, Kore)
  --verbose, -v       Enable verbose logging
  --debug-audio       Save audio to files for debugging
```

## API Server

Optional REST API for monitoring and control:

```bash
# Start API server
python -m src.api --port 3004
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Detailed bridge status |
| `/stats` | GET | Runtime statistics |
| `/text` | POST | Send text to Gemini |
| `/mute` | POST | Mute/unmute agent |
| `/stop` | POST | Stop bridge gracefully |
| `/config` | GET | Current configuration |

## Project Structure

```
services/vk-agent/
├── src/
│   ├── __init__.py          # Package exports
│   ├── main.py              # CLI entry point
│   ├── api.py               # REST API server
│   ├── bridge.py            # Main orchestrator
│   ├── janus_client.py      # Janus WebSocket client
│   ├── gemini_client.py     # Gemini Live API client
│   ├── audio_processor.py   # Opus codec + resampling
│   ├── rtp_handler.py       # RTP packet handling
│   ├── config.py            # Configuration management
│   └── models.py            # Data models
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Test fixtures
│   ├── test_models.py
│   └── test_rtp_handler.py
├── janus/
│   ├── janus.jcfg           # Janus main config
│   ├── janus.plugin.audiobridge.jcfg
│   └── janus.transport.websockets.jcfg
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Development

### Running Tests

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint
ruff check src/ tests/

# Type check
mypy src/
```

## Cost Analysis

| Component | Rate | Notes |
|-----------|------|-------|
| Input tokens | $0.075/1M | User speech (16kHz PCM) |
| Output tokens | $0.30/1M | AI responses |
| Audio streaming | Included | Native in Gemini Live |

**Estimated cost per hour of conversation**: ~$0.50-1.50 depending on activity

## Troubleshooting

### Common Issues

**"Connection refused" to Janus**
- Ensure Janus is running: `docker ps | grep janus`
- Check WebSocket port is exposed (8188)
- Verify `janus-protocol` subprotocol support

**No audio from Gemini**
- Verify GEMINI_API_KEY is set correctly
- Check RTP_HOST is reachable from Janus container
- Ensure RTP_PORT (5004) is not blocked by firewall
- Enable `--debug-audio` to save audio files

**Audio quality issues**
- Increase jitter buffer size for high-latency networks
- Check Opus codec is installed (`pip show opuslib`)
- Verify sample rate conversion is working

### Debug Mode

```bash
# Enable verbose logging
python -m src.main --room 5679 --verbose

# Save audio to files
python -m src.main --room 5679 --debug-audio

# Environment variable
VK_AGENT_LOG_LEVEL=DEBUG python -m src.main --room 5679
```

## Integration with VisualKit

The VK-Agent integrates with the broader VisualKit platform:

1. **Room Management**: Dashboard creates rooms via Janus API
2. **Agent Spawning**: API server triggers agent join on room creation
3. **Cost Tracking**: Agent reports token usage to platform API
4. **Escalation**: Agent can trigger human handoff to Chatwoot

## License

Proprietary - VisualKit Platform
