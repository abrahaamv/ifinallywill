"""
VK-Agent: Janus-Gemini Voice Bridge

Production-grade voice AI agent service that bridges Janus AudioBridge
with Google Gemini Live API for real-time conversational AI in video meetings.

Architecture:
    Meeting Room (WebRTC) <-> Janus AudioBridge <-> VK-Agent <-> Gemini Live API

Components:
    - JanusClient: WebSocket + RTP connection to Janus AudioBridge
    - GeminiClient: WebSocket connection to Gemini Live API
    - AudioProcessor: Opus codec and sample rate conversion
    - RTPHandler: RFC 3550 packet handling with jitter buffer
    - Bridge: Main orchestrator coordinating all components

Usage:
    >>> from vk_agent import AgentBridge, AgentConfig
    >>> config = AgentConfig(room_id=5679)
    >>> async with AgentBridge(config) as bridge:
    ...     await bridge.run_until_stopped()
"""

__version__ = "1.0.0"
__author__ = "VisualKit Team"

from .models import (
    AgentState,
    AudioFormat,
    RTPPacket,
    JanusSession,
    GeminiSession,
    BridgeStats,
)
from .config import Settings, get_settings
from .bridge import AgentBridge

__all__ = [
    # Version
    "__version__",
    # Models
    "AgentState",
    "AudioFormat",
    "RTPPacket",
    "JanusSession",
    "GeminiSession",
    "BridgeStats",
    # Config
    "Settings",
    "get_settings",
    # Main
    "AgentBridge",
]
