# Janus + Gemini Live API Implementation Analysis

> **Document Purpose**: Comprehensive analysis of the current VK-Agent implementation for enterprise production validation and improvement research.
>
> **Last Updated**: 2025-12-15
> **Status**: Production Deployed at `agent.visualkit.live`
> **Code Sync Status**: Local and Production SYNCHRONIZED (6,025 LOC total)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Production Infrastructure](#3-production-infrastructure)
4. [Component Deep Dive](#4-component-deep-dive)
5. [Audio Pipeline Analysis](#5-audio-pipeline-analysis)
6. [Configuration Analysis](#6-configuration-analysis)
7. [Code Quality Assessment](#7-code-quality-assessment)
8. [Identified Issues & Gaps](#8-identified-issues--gaps)
9. [Research Topics for Enterprise Enhancement](#9-research-topics-for-enterprise-enhancement)
10. [Appendix: File Reference](#10-appendix-file-reference)

---

## 1. Executive Summary

### 1.1 What We Built

A **real-time bidirectional voice AI system** that connects:
- **Janus Gateway AudioBridge** (WebRTC audio mixing)
- **Google Gemini Live API** (AI with native voice synthesis)

### 1.2 Key Metrics

| Metric | Current Value | Target |
|--------|---------------|--------|
| **Total Lines of Code** | 6,025 LOC | - |
| **Target Latency** | <500ms | <300ms |
| **Audio Sample Rates** | 48kHz (Janus) ↔ 16kHz/24kHz (Gemini) | - |
| **Codec** | Opus (VoIP mode) | - |
| **Cost** | ~$0.40/1M tokens | - |

### 1.3 Architecture Decision: Why Janus + Gemini?

| Alternative | Monthly Cost | Latency | Decision |
|-------------|--------------|---------|----------|
| LiveKit Enterprise | $5,000+/month | ~500ms | Too expensive |
| Twilio + OpenAI | $2,000+/month | 1-2s | High latency |
| **Janus + Gemini** | **~$50/month** | **<500ms** | **SELECTED** |

### 1.4 Current Production Status

```
✅ VK-Agent: Running (healthy) at agent.visualkit.live
✅ Janus Gateway: Running at janus.visualkit.live
✅ AudioBridge: Room 5679 configured
✅ WebRTC: ICE Full mode, DTLS enabled
⚠️  VideoRoom: Has errors ("No such room" in logs)
```

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION INFRASTRUCTURE                               │
│                            Hetzner VPS: 178.156.151.139                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐      ┌──────────────────┐      ┌──────────────────────────────┐  │
│  │   Browser    │      │     Caddy        │      │        Cloudflare            │  │
│  │  (WebRTC)    │◄────►│  (Reverse Proxy) │◄────►│    (DNS + SSL + CDN)         │  │
│  └──────┬───────┘      └────────┬─────────┘      └──────────────────────────────┘  │
│         │                       │                                                    │
│         │ WSS                   │ HTTP/WS                                           │
│         ▼                       ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                         HOST NETWORK MODE                                     │  │
│  │  ┌────────────────────┐              ┌────────────────────────────────────┐  │  │
│  │  │   Janus Gateway    │              │           VK-Agent                 │  │  │
│  │  │   (Docker: host)   │              │         (Docker: host)             │  │  │
│  │  │                    │   RTP/UDP    │                                    │  │  │
│  │  │  ┌──────────────┐  │◄────────────►│  ┌──────────────┐                  │  │  │
│  │  │  │ AudioBridge  │  │  127.0.0.1   │  │ RTP Handler  │                  │  │  │
│  │  │  │  Room 5679   │  │    :5008     │  │              │                  │  │  │
│  │  │  └──────────────┘  │              │  └──────┬───────┘                  │  │  │
│  │  │                    │              │         │                          │  │  │
│  │  │  ┌──────────────┐  │              │  ┌──────▼───────┐                  │  │  │
│  │  │  │ VideoRoom    │  │              │  │ AudioProcess │                  │  │  │
│  │  │  │ (Screen)     │  │              │  │ Opus↔PCM     │                  │  │  │
│  │  │  └──────────────┘  │              │  └──────┬───────┘                  │  │  │
│  │  │                    │              │         │                          │  │  │
│  │  │  WS: :8188         │              │  ┌──────▼───────┐    ┌──────────┐  │  │  │
│  │  └────────────────────┘              │  │ GeminiClient │───►│ Gemini   │  │  │  │
│  │                                      │  │  WebSocket   │    │ Live API │  │  │  │
│  │                                      │  └──────────────┘    └──────────┘  │  │  │
│  │                                      │                                    │  │  │
│  │                                      │  API: :3004 (/health, /text, etc) │  │  │
│  │                                      └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagram

```
USER SPEAKS                                                    AI RESPONDS
     │                                                              ▲
     ▼                                                              │
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐    ┌─────────┐
│ Browser │────►│  Janus  │────►│VK-Agent │────►│ Gemini  │───►│VK-Agent │
│  Mic    │     │AudioBrdg│     │         │     │Live API │    │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘    └────┬────┘
                                                                    │
    Opus/48kHz      RTP/UDP       PCM/16kHz      WebSocket         │
                   127.0.0.1      (send_audio)                     │
                     :5008                                         ▼
                                                              ┌─────────┐
                                                              │  Janus  │
    ◄─────────────────────────────────────────────────────────│AudioBrdg│
                         RTP/UDP (Opus/48kHz)                 └─────────┘

LATENCY BREAKDOWN:
├─ Browser → Janus WebRTC:     ~50-100ms (network + ICE)
├─ Janus → VK-Agent RTP:       ~1-5ms (localhost UDP)
├─ VK-Agent Processing:        ~10-20ms (decode + resample)
├─ Gemini Processing:          ~200-400ms (AI inference)
├─ VK-Agent Processing:        ~10-20ms (resample + encode)
├─ VK-Agent → Janus RTP:       ~1-5ms (localhost UDP)
└─ Janus → Browser WebRTC:     ~50-100ms (network)
                               ─────────────
                        TOTAL: ~320-650ms end-to-end
```

### 2.3 Component Interaction Sequence

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │  Janus   │     │VK-Agent  │     │ Gemini   │     │  Gemini  │
│          │     │  Gateway │     │  Bridge  │     │  Client  │     │ Live API │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │  1. WS Connect │                │                │                │
     │───────────────►│                │                │                │
     │                │                │                │                │
     │  2. Join Room  │                │                │                │
     │───────────────►│                │                │                │
     │                │                │                │                │
     │                │  3. RTP Setup  │                │                │
     │                │◄───────────────│                │                │
     │                │  (Plain RTP)   │                │                │
     │                │                │                │                │
     │                │                │  4. WS Connect │                │
     │                │                │───────────────►│───────────────►│
     │                │                │                │  (setup msg)   │
     │                │                │                │                │
     │  5. Audio RTP  │                │                │                │
     │───────────────►│  6. Forward    │                │                │
     │                │───────────────►│                │                │
     │                │   (UDP:5008)   │                │                │
     │                │                │  7. PCM Audio  │                │
     │                │                │───────────────►│───────────────►│
     │                │                │  (16kHz mono)  │                │
     │                │                │                │                │
     │                │                │                │  8. AI Audio   │
     │                │                │◄───────────────│◄───────────────│
     │                │                │  (24kHz mono)  │                │
     │                │  9. RTP Audio  │                │                │
     │◄───────────────│◄───────────────│                │                │
     │  (Opus/48kHz)  │                │                │                │
     │                │                │                │                │
```

---

## 3. Production Infrastructure

### 3.1 Server Details

| Property | Value |
|----------|-------|
| **Provider** | Hetzner Cloud |
| **IP Address** | `178.156.151.139` |
| **OS** | Linux (Debian-based) |
| **Access** | SSH as `root` |

### 3.2 Production URLs

| Service | URL | Port | Protocol |
|---------|-----|------|----------|
| Landing | https://visualkit.live | 443 | HTTPS (Cloudflare Pages) |
| Dashboard | https://app.visualkit.live | 443 | HTTPS (Cloudflare Pages) |
| Meeting | https://meet.visualkit.live | 443 | HTTPS (Cloudflare Pages) |
| Platform API | https://api.visualkit.live | 3001 | HTTPS (Caddy) |
| VK-Agent API | https://agent.visualkit.live | 3004 | HTTPS (Caddy) |
| Janus WebSocket | wss://janus.visualkit.live | 8188 | WSS (Caddy) |
| Widget CDN | https://cdn.visualkit.live | 443 | HTTPS (Caddy) |

### 3.3 Docker Container Status

```bash
# Current running containers (as of 2025-12-15)
CONTAINER           STATUS                    PORTS
vk-agent            Up (healthy)              -
janus-gateway       Up                        -
platform-api        Up (healthy)              -
chatwoot-*          Up (unhealthy)            3000, 3003
```

### 3.4 Network Configuration

**Both Janus and VK-Agent run in HOST NETWORK MODE**

This is critical for:
- Low-latency RTP communication via `127.0.0.1`
- Direct port binding without NAT
- Simplified ICE candidate handling

```yaml
# Production network settings
VK_AGENT_JANUS_WS_URL=ws://127.0.0.1:8188
VK_AGENT_RTP_HOST=127.0.0.1
VK_AGENT_RTP_PORT=5008
```

### 3.5 Caddy Reverse Proxy Configuration

```caddyfile
# VK-Agent (production)
agent.visualkit.live {
    reverse_proxy localhost:3004
}

# Janus WebSocket
janus.visualkit.live {
    reverse_proxy localhost:8188
}
```

---

## 4. Component Deep Dive

### 4.1 File Structure

```
services/vk-agent/
├── src/
│   ├── __init__.py           (2 lines)   - Package init
│   ├── main.py               (121 lines) - Entry point
│   ├── config.py             (384 lines) - Configuration management
│   ├── models.py             (517 lines) - Data structures
│   ├── bridge.py             (871 lines) - Main orchestrator ⭐
│   ├── janus_client.py       (754 lines) - Janus WebSocket client
│   ├── gemini_client.py      (580 lines) - Gemini Live API client
│   ├── audio_processor.py    (589 lines) - Opus codec + resampling
│   ├── rtp_handler.py        (697 lines) - RTP packet handling
│   ├── videoroom_client.py   (602 lines) - VideoRoom plugin client
│   ├── video_processor.py    (498 lines) - Video frame processing
│   └── agent.py              (300 lines) - Legacy/alternative agent
├── Dockerfile                            - Container build
├── docker-compose.yml                    - Local dev setup
├── requirements.txt                      - Python dependencies
└── .env.example                          - Environment template
```

**Total: 6,025 lines of Python code**

### 4.2 Core Component: `bridge.py` (871 lines)

The **AgentBridge** class is the main orchestrator that coordinates all components.

#### 4.2.1 Class Structure

```python
class AgentBridge:
    """Main bridge orchestrator for Janus-Gemini voice AI."""

    # Core components
    settings: Settings
    janus_client: JanusClient
    gemini_client: GeminiLiveClient
    audio_processor: AudioProcessor
    rtp_receiver: RTPReceiver
    rtp_sender: RTPSender
    jitter_buffer: RTPJitterBuffer

    # State management
    stats: BridgeStats
    state: AgentState
    _is_speaking: bool  # AI currently outputting audio
    _muted: bool        # User audio muted

    # Audio buffers
    _audio_send_buffer: bytearray
    _gemini_output_queue: Deque[bytes]
```

#### 4.2.2 Key Methods

| Method | Purpose | Lines |
|--------|---------|-------|
| `start()` | Initialize all components | ~80 |
| `stop()` | Graceful shutdown | ~40 |
| `_on_rtp_packet()` | Handle incoming RTP from Janus | ~60 |
| `_process_rtp_audio()` | Decode Opus, send to Gemini | ~50 |
| `_on_gemini_audio()` | Handle audio from Gemini | ~70 |
| `_send_audio_to_janus()` | Encode PCM to Opus, send RTP | ~60 |
| `send_text()` | Send text prompt to Gemini | ~20 |
| `get_status()` | Return bridge status | ~30 |

#### 4.2.3 Audio Flow in Bridge

```python
# INCOMING AUDIO (User → AI)
async def _on_rtp_packet(self, packet: RTPPacket):
    # 1. Skip if AI is speaking (feedback prevention)
    if self._is_speaking:
        return

    # 2. Put in jitter buffer for reordering
    self.jitter_buffer.put(packet)

    # 3. Process buffered packets
    await self._process_rtp_audio()

async def _process_rtp_audio(self):
    while True:
        packet = self.jitter_buffer.get()
        if not packet:
            break

        # 4. Decode Opus to PCM (48kHz)
        pcm_48k = self.audio_processor.decode_opus(packet.payload)

        # 5. Resample to Gemini input rate (16kHz)
        pcm_16k = self.audio_processor.resample(pcm_48k, 48000, 16000)

        # 6. Accumulate until threshold
        self._audio_send_buffer.extend(pcm_16k)

        # 7. Send chunks to Gemini
        if len(self._audio_send_buffer) >= self.AUDIO_SEND_THRESHOLD:
            await self.gemini_client.send_audio(bytes(self._audio_send_buffer))
            self._audio_send_buffer.clear()

# OUTGOING AUDIO (AI → User)
async def _on_gemini_audio(self, pcm_24k: bytes):
    # 1. Mark as speaking
    self._is_speaking = True

    # 2. Convert Gemini output (24kHz) to Janus format (48kHz Opus)
    opus_frames = self.audio_processor.gemini_to_janus(pcm_24k)

    # 3. Send each 20ms frame via RTP
    for opus_frame in opus_frames:
        self.rtp_sender.send(opus_frame, marker=(first_frame))
        await asyncio.sleep(0.018)  # ~20ms pacing
```

### 4.3 Janus Client: `janus_client.py` (754 lines)

#### 4.3.1 Class Structure

```python
class JanusClient:
    """WebSocket client for Janus Gateway AudioBridge plugin."""

    config: JanusConfig
    session: JanusSession
    _ws: websockets.WebSocketClientProtocol
    _transaction_callbacks: Dict[str, asyncio.Future]
    _keepalive_task: asyncio.Task
```

#### 4.3.2 Connection Flow

```python
async def connect(self):
    # 1. WebSocket connection
    self._ws = await websockets.connect(self.config.websocket_url)

    # 2. Create Janus session
    response = await self._send_request({"janus": "create"})
    self.session.session_id = response["data"]["id"]

    # 3. Attach to AudioBridge plugin
    response = await self._send_request({
        "janus": "attach",
        "plugin": "janus.plugin.audiobridge",
        "session_id": self.session.session_id
    })
    self.session.handle_id = response["data"]["id"]

    # 4. Join room as PLAIN RTP participant (not WebRTC)
    response = await self._send_request({
        "janus": "message",
        "body": {
            "request": "join",
            "room": self.config.room_id,
            "display": self.config.display_name,
            "rtp": {
                "ip": self.config.rtp_host,
                "port": self.config.rtp_port,
                "payload_type": 111  # Opus
            }
        }
    })

    # 5. Extract RTP target (where Janus sends TO us)
    self.session.rtp_target_ip = response["plugindata"]["data"]["rtp"]["ip"]
    self.session.rtp_target_port = response["plugindata"]["data"]["rtp"]["port"]
```

#### 4.3.3 Plain RTP Mode

**Critical Feature**: VK-Agent joins as a "plain RTP participant", NOT a WebRTC peer.

This means:
- No ICE/DTLS negotiation for the agent
- Direct RTP/UDP communication
- Lower latency than full WebRTC
- Simpler implementation

```
┌────────────────┐          ┌────────────────────────────────────┐
│  Browser       │          │  Janus AudioBridge                 │
│  (WebRTC)      │◄────────►│  ┌───────────────────────────────┐ │
└────────────────┘  ICE/    │  │        Audio Mixer            │ │
                    DTLS    │  │  ┌──────┐   ┌──────┐          │ │
                            │  │  │User 1│   │User 2│  ...     │ │
┌────────────────┐          │  │  └──┬───┘   └──┬───┘          │ │
│  VK-Agent      │          │  │     │          │              │ │
│  (Plain RTP)   │◄────────►│  │     ▼          ▼              │ │
└────────────────┘  UDP     │  │  ┌────────────────────────┐   │ │
                    only    │  │  │   Mixed Output         │   │ │
                            │  │  └───────────┬────────────┘   │ │
                            │  │              │                │ │
                            │  │              ▼                │ │
                            │  │  ┌─────────────────┐          │ │
                            │  │  │ Plain RTP Out   │──► Agent │ │
                            │  │  └─────────────────┘          │ │
                            │  └───────────────────────────────┘ │
                            └────────────────────────────────────┘
```

### 4.4 Gemini Client: `gemini_client.py` (580 lines)

#### 4.4.1 Class Structure

```python
class GeminiLiveClient:
    """WebSocket client for Google Gemini Live API."""

    config: GeminiConfig
    session: GeminiSession
    _ws: websockets.WebSocketClientProtocol

    # Callbacks
    on_audio: Callable[[bytes], Awaitable[None]]
    on_text: Callable[[str], Awaitable[None]]
    on_turn_complete: Callable[[], Awaitable[None]]
    on_interrupted: Callable[[], Awaitable[None]]
```

#### 4.4.2 Gemini Live API Protocol

```python
# Connection URL
GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"

# 1. Setup message (sent on connect)
{
    "setup": {
        "model": "models/gemini-2.0-flash-exp",
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": "Puck"
                    }
                }
            }
        },
        "systemInstruction": {
            "parts": [{"text": "You are Jimmy..."}]
        }
    }
}

# 2. Audio input (send to Gemini)
{
    "realtimeInput": {
        "mediaChunks": [{
            "mimeType": "audio/pcm;rate=16000",
            "data": "<base64-encoded-pcm>"
        }]
    }
}

# 3. Audio output (receive from Gemini)
{
    "serverContent": {
        "modelTurn": {
            "parts": [{
                "inlineData": {
                    "mimeType": "audio/pcm;rate=24000",
                    "data": "<base64-encoded-pcm>"
                }
            }]
        }
    }
}

# 4. Turn complete (AI finished speaking)
{
    "serverContent": {
        "turnComplete": true
    }
}

# 5. Interruption (user started speaking while AI was talking)
{
    "serverContent": {
        "interrupted": true
    }
}
```

#### 4.4.3 Audio Format Details

| Direction | Sample Rate | Channels | Bit Depth | Format |
|-----------|-------------|----------|-----------|--------|
| **To Gemini** | 16,000 Hz | 1 (mono) | 16-bit | PCM, little-endian |
| **From Gemini** | 24,000 Hz | 1 (mono) | 16-bit | PCM, little-endian |

### 4.5 Audio Processor: `audio_processor.py` (589 lines)

#### 4.5.1 Key Responsibilities

1. **Opus Decoding**: Janus RTP (Opus) → PCM16 @ 48kHz
2. **Resampling**: 48kHz → 16kHz (to Gemini), 24kHz → 48kHz (from Gemini)
3. **Opus Encoding**: PCM16 @ 48kHz → Opus for RTP

#### 4.5.2 Dependencies

```python
# Core audio libraries
import opuslib      # Opus codec (requires libopus system library)
import numpy as np  # Array operations
from scipy import signal  # High-quality resampling
```

#### 4.5.3 Resampling Quality

```python
def resample(self, samples: np.ndarray, from_rate: int, to_rate: int) -> np.ndarray:
    if HAS_SCIPY:
        # High-quality polyphase resampling (scipy.signal.resample)
        resampled = signal.resample(samples.astype(np.float64), new_length)
    else:
        # Fallback: Linear interpolation (lower quality)
        resampled = np.interp(x_new, x_old, samples.astype(np.float64))
```

**Current Status**: scipy IS available in production (requirement in requirements.txt)

### 4.6 RTP Handler: `rtp_handler.py` (697 lines)

#### 4.6.1 RTP Packet Structure (RFC 3550)

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       sequence number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           synchronization source (SSRC) identifier            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          payload...                           |
```

#### 4.6.2 Key Classes

| Class | Purpose |
|-------|---------|
| `RTPPacket` | Data structure for RTP packets |
| `RTPReceiver` | Async UDP listener for incoming audio |
| `RTPSender` | UDP sender for outgoing audio |
| `RTPJitterBuffer` | Packet reordering buffer |

#### 4.6.3 Jitter Buffer Configuration

```python
class RTPJitterBuffer:
    buffer_time_ms: int = 100    # Buffer depth
    max_packets: int = 50        # Max buffered packets
    skip_threshold: int = 16     # Sequence gap before skipping
```

---

## 5. Audio Pipeline Analysis

### 5.1 Complete Audio Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INCOMING AUDIO (User → AI)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Browser Mic     Janus AudioBridge    VK-Agent           Gemini Live API    │
│      │                 │                  │                    │            │
│      │ Opus/48kHz      │                  │                    │            │
│      │ WebRTC          │                  │                    │            │
│      ▼                 │                  │                    │            │
│  ┌────────┐            │                  │                    │            │
│  │Encode  │────────────►                  │                    │            │
│  │Opus    │   ICE/DTLS │                  │                    │            │
│  └────────┘            │                  │                    │            │
│                        ▼                  │                    │            │
│                   ┌────────┐              │                    │            │
│                   │Mix all │              │                    │            │
│                   │streams │              │                    │            │
│                   └───┬────┘              │                    │            │
│                       │ RTP/UDP           │                    │            │
│                       │ Opus/48kHz        │                    │            │
│                       │ Port 5008         │                    │            │
│                       ▼                   │                    │            │
│                   ┌───────────────────────▼───────┐            │            │
│                   │ RTPReceiver                   │            │            │
│                   │ └─► JitterBuffer              │            │            │
│                   │     └─► decode_opus()         │            │            │
│                   │         PCM16 @ 48kHz         │            │            │
│                   │         └─► resample()        │            │            │
│                   │             PCM16 @ 16kHz     │            │            │
│                   │             └─► buffer        │            │            │
│                   └───────────────────────┬───────┘            │            │
│                                           │ PCM16/16kHz        │            │
│                                           │ Base64 encoded     │            │
│                                           │ WebSocket          │            │
│                                           ▼                    │            │
│                                       ┌────────────────────────▼──┐         │
│                                       │ Gemini Live API           │         │
│                                       │ - Speech recognition      │         │
│                                       │ - LLM processing          │         │
│                                       │ - Native TTS (Puck voice) │         │
│                                       └───────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTGOING AUDIO (AI → User)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Gemini Live API    VK-Agent           Janus AudioBridge    Browser Speaker │
│      │                  │                    │                    │         │
│      │ PCM16/24kHz      │                    │                    │         │
│      │ Base64/WS        │                    │                    │         │
│      ▼                  │                    │                    │         │
│  ┌───────────────────────▼───────┐           │                    │         │
│  │ GeminiClient                  │           │                    │         │
│  │ └─► on_audio callback         │           │                    │         │
│  │     └─► _on_gemini_audio()    │           │                    │         │
│  │         └─► gemini_to_janus() │           │                    │         │
│  │             │                 │           │                    │         │
│  │             ├─ resample()     │           │                    │         │
│  │             │  24kHz → 48kHz  │           │                    │         │
│  │             │                 │           │                    │         │
│  │             ├─ split frames   │           │                    │         │
│  │             │  (20ms each)    │           │                    │         │
│  │             │                 │           │                    │         │
│  │             └─ encode_opus()  │           │                    │         │
│  │                per frame      │           │                    │         │
│  └───────────────────────┬───────┘           │                    │         │
│                          │ RTP/UDP           │                    │         │
│                          │ Opus/48kHz        │                    │         │
│                          │ 20ms frames       │                    │         │
│                          ▼                   │                    │         │
│                      ┌───────────────────────▼───────┐            │         │
│                      │ Janus AudioBridge             │            │         │
│                      │ └─► Mix with other streams    │            │         │
│                      │     └─► Forward to WebRTC     │            │         │
│                      └───────────────────────┬───────┘            │         │
│                                              │ ICE/DTLS           │         │
│                                              │ Opus               │         │
│                                              ▼                    │         │
│                                          ┌───────────────────────►│         │
│                                          │   Browser decode       │         │
│                                          │   + play               │         │
│                                          └────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Audio Format Conversions

| Stage | Sample Rate | Format | Size per 20ms |
|-------|-------------|--------|---------------|
| Browser → Janus | 48,000 Hz | Opus | ~40-80 bytes |
| Janus → VK-Agent | 48,000 Hz | Opus RTP | ~52-92 bytes |
| VK-Agent decoded | 48,000 Hz | PCM16 | 1,920 bytes |
| VK-Agent resampled | 16,000 Hz | PCM16 | 640 bytes |
| Gemini input | 16,000 Hz | PCM16 Base64 | ~853 chars |
| Gemini output | 24,000 Hz | PCM16 Base64 | ~1,280 chars |
| VK-Agent resampled | 48,000 Hz | PCM16 | 1,920 bytes |
| VK-Agent encoded | 48,000 Hz | Opus | ~40-80 bytes |
| VK-Agent → Janus | 48,000 Hz | Opus RTP | ~52-92 bytes |

### 5.3 Feedback Prevention Logic

```python
# In bridge.py
async def _on_rtp_packet(self, packet: RTPPacket):
    # CRITICAL: Don't process user audio while AI is speaking
    # This prevents the AI from hearing itself
    if self._is_speaking:
        return  # Discard incoming audio

    # Process normally when AI is not speaking
    self.jitter_buffer.put(packet)
    await self._process_rtp_audio()

async def _on_gemini_audio(self, pcm_data: bytes):
    # Mark as speaking when audio starts
    self._is_speaking = True
    # ... send audio to Janus ...

async def _on_turn_complete(self):
    # Mark as not speaking when AI finishes
    self._is_speaking = False
```

---

## 6. Configuration Analysis

### 6.1 Local vs Production Comparison

#### 6.1.1 Janus Main Config (`janus.jcfg`)

| Setting | Local | Production | Notes |
|---------|-------|------------|-------|
| `debug_level` | 5 (notice) | 4 (warning) | Production is quieter |
| `admin_secret` | Static string | Random hash | Production is secure |
| `ice_lite` | true | false | Production uses full ICE |
| `nat_1_1_mapping` | 172.30.0.20 | Not set | Not needed in host mode |
| `rtp_port_range` | 10000-10100 | 10000-60000 | Production has wider range |

#### 6.1.2 AudioBridge Config

| Setting | Local | Production | Match? |
|---------|-------|------------|--------|
| `admin_key` | Static | "audiobridge_admin" | ⚠️ Should be secure |
| `sampling_rate` | 48000 | 48000 | ✅ |
| `allow_rtp_participants` | true | true | ✅ |
| `room-5679` | Configured | Configured | ✅ |

#### 6.1.3 VK-Agent Environment

| Variable | Local Default | Production | Notes |
|----------|---------------|------------|-------|
| `VK_AGENT_JANUS_WS_URL` | ws://localhost:8188 | ws://127.0.0.1:8188 | Host network |
| `VK_AGENT_RTP_HOST` | 172.19.0.1 | 127.0.0.1 | Host network |
| `VK_AGENT_RTP_PORT` | 5004 | 5008 | Different port |
| `VK_AGENT_VIDEO_RTP_PORT` | 5006 | 5010 | Different port |
| `VK_AGENT_GEMINI_MODEL` | gemini-2.0-flash-exp | gemini-2.0-flash-exp | ✅ |
| `VK_AGENT_GEMINI_VOICE` | Puck | Puck | ✅ |

### 6.2 Network Topology Differences

**Local Development (Docker Bridge Network)**:
```
┌─────────────────────────────────────────────────┐
│  Docker Network: 172.21.0.0/16                  │
│                                                 │
│  VK-Agent (172.21.0.3) ◄──► Janus (172.21.0.2) │
│                                                 │
│  RTP flows over Docker bridge network           │
└─────────────────────────────────────────────────┘
```

**Production (Host Network Mode)**:
```
┌─────────────────────────────────────────────────┐
│  Host Network: 127.0.0.1                        │
│                                                 │
│  VK-Agent ◄──────────────────────────► Janus   │
│  (localhost:5008)                  (localhost)  │
│                                                 │
│  RTP flows over loopback (zero-copy)           │
└─────────────────────────────────────────────────┘
```

### 6.3 Configuration Files to Sync

| File | Local Path | Production Path | Sync Status |
|------|------------|-----------------|-------------|
| Source Code | `services/vk-agent/src/` | `/opt/vk-agent/src/` | ✅ SYNCED |
| requirements.txt | `services/vk-agent/requirements.txt` | `/opt/vk-agent/requirements.txt` | ✅ SYNCED |
| Dockerfile | `services/vk-agent/Dockerfile` | `/opt/vk-agent/Dockerfile` | ✅ SYNCED |
| .env | `services/vk-agent/.env.example` | `/opt/vk-agent/.env` | ⚠️ Different |
| janus.jcfg | `infrastructure/docker/janus-configs/` | `/opt/janus/config/` | ⚠️ Different |

---

## 7. Code Quality Assessment

### 7.1 Strengths

| Area | Assessment | Score |
|------|------------|-------|
| **Architecture** | Clean separation of concerns | 9/10 |
| **Documentation** | Excellent docstrings and comments | 9/10 |
| **Error Handling** | Comprehensive try/except blocks | 8/10 |
| **Type Hints** | Full typing throughout | 9/10 |
| **Logging** | Structured logging with levels | 8/10 |
| **Configuration** | Dataclass-based, env-driven | 9/10 |
| **Testing** | Basic test functions included | 6/10 |
| **Async Design** | Proper async/await patterns | 9/10 |

### 7.2 Code Patterns Used

```python
# 1. Dataclass-based Configuration
@dataclass
class JanusConfig:
    websocket_url: str = field(default_factory=lambda: os.getenv(...))

# 2. Async Context Manager
class AgentBridge:
    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

# 3. Callback-based Event Handling
class GeminiClient:
    on_audio: Callable[[bytes], Awaitable[None]]
    on_text: Callable[[str], Awaitable[None]]

# 4. State Machine Pattern
class AgentState(Enum):
    INITIALIZING = "initializing"
    CONNECTING = "connecting"
    READY = "ready"
    ACTIVE = "active"
    # ...
```

### 7.3 Areas for Improvement

| Area | Issue | Priority |
|------|-------|----------|
| **Reconnection** | No automatic reconnection on disconnect | HIGH |
| **Health Checks** | Basic health, no deep checks | MEDIUM |
| **Metrics** | Limited observability | MEDIUM |
| **Testing** | No unit tests, only manual tests | MEDIUM |
| **Rate Limiting** | No protection against audio flooding | LOW |
| **Multi-tenancy** | Single room hardcoded | LOW |

---

## 8. Identified Issues & Gaps

### 8.1 Critical Issues

#### 8.1.1 VideoRoom Error in Production Logs

```
[ERR] [plugins/janus_videoroom.c:janus_videoroom_handler:9702] No such room
```

**Root Cause**: VK-Agent tries to join VideoRoom for screen sharing, but room doesn't exist.

**Impact**: Screen sharing functionality broken.

**Fix Required**: Either pre-create VideoRoom or handle room creation dynamically.

#### 8.1.2 No Automatic Reconnection

Currently, if Janus or Gemini WebSocket disconnects, VK-Agent doesn't automatically reconnect.

```python
# Current behavior
async def _receive_messages(self):
    try:
        async for message in self._ws:
            await self._handle_message(message)
    except websockets.ConnectionClosed:
        logger.error("Connection closed")
        # No reconnection logic!
```

**Fix Required**: Implement exponential backoff reconnection.

### 8.2 Security Gaps

| Gap | Risk Level | Recommendation |
|-----|------------|----------------|
| Static admin_key in AudioBridge | MEDIUM | Use strong random key |
| CORS allow_origin = "*" | LOW | Restrict to known domains |
| No API authentication | MEDIUM | Add API key auth |
| Gemini API key in .env | LOW | Use secrets manager |

### 8.3 Performance Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Fixed jitter buffer (100ms) | Latency | Adaptive buffer based on network |
| No audio compression before send | Bandwidth | Implement VAD gating |
| Synchronous Opus encoding | CPU | Consider async/threaded encoding |
| No connection pooling | Scalability | Pool WebSocket connections |

### 8.4 Operational Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No structured metrics | Monitoring | Add Prometheus metrics |
| Basic health check | Reliability | Add deep health checks |
| No graceful shutdown | Data loss | Implement drain before stop |
| Manual deployment | DevOps | Add CI/CD pipeline |

---

## 9. Research Topics for Enterprise Enhancement

### 9.1 Latency Optimization

**Current State**: ~320-650ms end-to-end

**Target**: <300ms (human-like conversation)

**Research Areas**:
1. **Adaptive Jitter Buffer**: Dynamic buffer sizing based on network conditions
2. **Speculative Execution**: Start processing before user finishes speaking
3. **Audio Chunking**: Smaller audio chunks to Gemini (trade-off with API limits)
4. **Edge Deployment**: Move VK-Agent closer to users

### 9.2 Reliability & Resilience

**Research Areas**:
1. **Circuit Breaker Pattern**: Graceful degradation on failures
2. **Automatic Reconnection**: Exponential backoff with state recovery
3. **Multi-region Failover**: Geo-distributed deployment
4. **Health Check Protocol**: Deep health with dependency checking

### 9.3 Scalability

**Research Areas**:
1. **Janus Clustering**: Using janus-cloud for horizontal scaling
2. **Load Balancing**: Multiple VK-Agent instances
3. **Session Affinity**: Sticky sessions for stateful connections
4. **Resource Pooling**: Connection and thread pools

### 9.4 Security Hardening

**Research Areas**:
1. **mTLS for Internal Traffic**: Encrypt Janus ↔ VK-Agent
2. **API Authentication**: JWT or API key validation
3. **Rate Limiting**: Protect against DoS
4. **Audit Logging**: Track all API calls

### 9.5 Observability

**Research Areas**:
1. **Distributed Tracing**: OpenTelemetry integration
2. **Metrics**: Prometheus/Grafana dashboards
3. **Log Aggregation**: Structured JSON logging
4. **Alerting**: PagerDuty/Slack integration

### 9.6 Audio Quality

**Research Areas**:
1. **Acoustic Echo Cancellation (AEC)**: Browser-side or server-side
2. **Noise Suppression**: RNNoise integration in Janus
3. **Voice Activity Detection (VAD)**: Better turn detection
4. **Opus FEC**: Forward error correction for lossy networks

---

## 10. Appendix: File Reference

### 10.1 Production File Locations

```bash
# VK-Agent
/opt/vk-agent/
├── src/              # Python source code
├── .env              # Environment variables (SECRETS!)
├── Dockerfile        # Container build
├── requirements.txt  # Python dependencies
└── docker-compose.yml # Local dev only

# Janus Gateway
/opt/janus/config/
├── janus.jcfg                          # Main config
├── janus.plugin.audiobridge.jcfg       # AudioBridge config
├── janus.plugin.videoroom.jcfg         # VideoRoom config (may be missing)
└── janus.transport.websockets.jcfg     # WebSocket config

# Caddy
/etc/caddy/Caddyfile  # Reverse proxy configuration
```

### 10.2 Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /health` | GET | Health check |
| `GET /status` | GET | Detailed bridge status |
| `GET /stats` | GET | Audio/RTP statistics |
| `POST /text` | POST | Send text to Gemini |
| `POST /screen` | POST | Send screen frame |
| `POST /mute` | POST | Mute/unmute agent |

### 10.3 Environment Variables Reference

```bash
# Required
GEMINI_API_KEY=<api-key>           # Google AI API key

# Janus Connection
VK_AGENT_JANUS_WS_URL=ws://127.0.0.1:8188
VK_AGENT_JANUS_ROOM_ID=5679
VK_AGENT_JANUS_DISPLAY=Jimmy

# RTP Configuration
VK_AGENT_RTP_HOST=127.0.0.1
VK_AGENT_RTP_PORT=5008
VK_AGENT_VIDEO_RTP_PORT=5010

# Gemini Configuration
VK_AGENT_GEMINI_MODEL=models/gemini-2.0-flash-exp
VK_AGENT_GEMINI_VOICE=Puck
VK_AGENT_SYSTEM_INSTRUCTION=<system-prompt>

# Server Configuration
VK_AGENT_API_HOST=0.0.0.0
VK_AGENT_API_PORT=3004
VK_AGENT_LOG_LEVEL=INFO
VK_AGENT_DEBUG_AUDIO=false
```

### 10.4 Docker Commands Reference

```bash
# SSH to server
ssh root@178.156.151.139

# Check container status
docker ps --format 'table {{.Names}}\t{{.Status}}'

# View logs
docker logs vk-agent --tail 100 -f
docker logs janus-gateway --tail 100 -f

# Restart services
docker restart vk-agent
docker restart janus-gateway

# Health check
curl https://agent.visualkit.live/health
curl https://agent.visualkit.live/status
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-15 | Claude | Initial comprehensive analysis |

---

**Next Steps**: Use this document as the foundation for enterprise enhancement research. Priority areas:
1. Fix VideoRoom error
2. Implement reconnection logic
3. Add observability (metrics, tracing)
4. Security hardening
5. Latency optimization
