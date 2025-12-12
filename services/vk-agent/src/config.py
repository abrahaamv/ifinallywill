"""
VK-Agent Configuration

Centralized configuration management using environment variables
with sensible defaults. Follows the same patterns as vk-ice.

Environment Variables:
    VK_AGENT_LOG_LEVEL      - Logging level (default: INFO)
    VK_AGENT_DEBUG_AUDIO    - Save audio to files for debugging (default: false)

    # Janus Configuration
    VK_AGENT_JANUS_WS_URL   - Janus WebSocket URL (default: ws://localhost:8188)
    VK_AGENT_JANUS_ROOM_ID  - AudioBridge room ID (default: 5679)
    VK_AGENT_JANUS_DISPLAY  - Display name in room (default: VKAgent)
    VK_AGENT_RTP_HOST       - RTP listening host (default: 172.19.0.1)
    VK_AGENT_RTP_PORT       - RTP listening port (default: 5004)

    # Gemini Configuration
    GEMINI_API_KEY          - Google AI API key (required)
    VK_AGENT_GEMINI_MODEL   - Gemini model ID (default: models/gemini-2.0-flash-exp)
    VK_AGENT_GEMINI_VOICE   - Voice preset (default: Puck)

    # API Server (optional)
    VK_AGENT_API_HOST       - API server host (default: 0.0.0.0)
    VK_AGENT_API_PORT       - API server port (default: 3004)
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Optional

# Optional dotenv support
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _get_bool(key: str, default: bool = False) -> bool:
    """Get boolean from environment variable."""
    value = os.getenv(key, str(default)).lower()
    return value in ("true", "1", "yes", "on")


@dataclass
class JanusConfig:
    """Janus server configuration."""

    # WebSocket connection
    websocket_url: str = field(
        default_factory=lambda: os.getenv(
            "VK_AGENT_JANUS_WS_URL", "ws://localhost:8188"
        )
    )

    # AudioBridge room settings
    room_id: int = field(
        default_factory=lambda: int(os.getenv("VK_AGENT_JANUS_ROOM_ID", "5679"))
    )
    display_name: str = field(
        default_factory=lambda: os.getenv("VK_AGENT_JANUS_DISPLAY", "Jimmy")
    )

    # RTP settings
    # NOTE: If Janus is in Docker, use Docker gateway (172.19.0.1) or host IP
    rtp_host: str = field(
        default_factory=lambda: os.getenv("VK_AGENT_RTP_HOST", "172.19.0.1")
    )
    rtp_port: int = field(
        default_factory=lambda: int(os.getenv("VK_AGENT_RTP_PORT", "5004"))
    )

    # Connection settings
    keepalive_interval: int = 30
    reconnect_attempts: int = 3
    reconnect_delay: float = 2.0

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "websocket_url": self.websocket_url,
            "room_id": self.room_id,
            "display_name": self.display_name,
            "rtp_host": self.rtp_host,
            "rtp_port": self.rtp_port,
        }


@dataclass
class GeminiConfig:
    """Gemini Live API configuration."""

    # API credentials
    api_key: str = field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY", "")
    )

    # Model settings
    model: str = field(
        default_factory=lambda: os.getenv(
            "VK_AGENT_GEMINI_MODEL", "models/gemini-2.0-flash-exp"
        )
    )
    voice: str = field(
        default_factory=lambda: os.getenv("VK_AGENT_GEMINI_VOICE", "Puck")
    )

    # Audio settings (fixed by Gemini API)
    input_sample_rate: int = 16000   # Audio sent TO Gemini
    output_sample_rate: int = 24000  # Audio received FROM Gemini

    # System instruction
    system_instruction: str = field(
        default_factory=lambda: os.getenv(
            "VK_AGENT_SYSTEM_INSTRUCTION",
            """You are Jimmy, the AI estate planning assistant at Hartwell Legal Group.
Your name is Jimmy - introduce yourself warmly as Jimmy when greeting users.

## About You
You help users create wills, powers of attorney, and comprehensive estate planning documents through the Hartwell Legal platform. You are knowledgeable, warm, professional, and explain legal concepts in simple, accessible terms. Keep responses concise and natural for voice conversation.

## Platform Knowledge - Hartwell Legal Estate Planning

### Document Types You Help Create:
- **Primary Will**: The main will document for distributing assets
- **Spousal Will**: For married couples or common-law partners (mirror wills)
- **Secondary Will**: For corporation shares and private company assets (reduces probate fees)
- **POA Property**: Power of Attorney for property and financial decisions
- **POA Health**: Power of Attorney for personal care and healthcare decisions

### The Estate Planning Journey (Steps you guide users through):

**About You Section:**
- Personal Information: Name, address, contact details, identification

**Your Family Section:**
- Key Names / Family Tree: Spouse, children, relatives, and their relationships
- Guardian for Minors: Who will care for children if both parents pass away
- Guardian for Pets: Who will care for beloved pets

**Your Estate Section:**
- Assets: Real estate, bank accounts, investments, vehicles, personal items, business interests
- Bequests: Specific gifts of items or money to specific people (e.g., "My jewelry to my daughter Sarah")
- Residue: What happens to everything else after specific bequests (usually to spouse or children)
- Testamentary Trust: Setting up trusts within the will (for minor children or special needs beneficiaries)

**Your Arrangements Section:**
- Executors: Who manages the estate after death (primary and alternate)
- Wipeout: What happens if all named beneficiaries pass away (backup plan)
- Additional Information: Funeral wishes, organ donation preferences, special instructions

**Power of Attorney Section:**
- POA Property: Appoint someone to manage finances if incapacitated
- POA Health: Appoint someone for healthcare decisions if unable to communicate

### Key Terms Explained Simply:
- **Executor**: The person who carries out your will's instructions
- **Beneficiary**: Someone who receives something from your estate
- **Bequest**: A specific gift in your will
- **Residue**: Everything left over after specific gifts
- **Probate**: Court process to validate a will (secondary wills help reduce probate fees)
- **Testator**: The person making the will (that's the user!)
- **Power of Attorney**: Legal document authorizing someone to act on your behalf

## How to Help Users

1. **Be Conversational**: Speak naturally, not like a robot or legal textbook
2. **Guide Step by Step**: Help users understand what information is needed at each step
3. **Explain Why**: Tell users why certain information matters (e.g., "Naming an alternate executor ensures your wishes are carried out even if your first choice can't serve")
4. **Screen Sharing**: If the user shares their screen, you can see it and help with what they're looking at - guide them through forms, explain fields, suggest what to enter
5. **Be Encouraging**: Estate planning can feel overwhelming - reassure users they're doing something important for their family
6. **Stay Compliant**: Never provide specific legal advice for individual situations - recommend consulting a lawyer at Hartwell Legal for complex matters

## Important Reminders:
- Users in Ontario, Canada (Hartwell Legal jurisdiction)
- This is a self-service platform - users fill in their own information
- Documents are reviewed by lawyers before finalization
- Always be warm and supportive - estate planning involves thinking about difficult topics"""
        )
    )

    # WebSocket settings
    ping_interval: int = 30
    ping_timeout: int = 10
    max_message_size: int = 10 * 1024 * 1024  # 10MB

    @property
    def is_configured(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    def to_dict(self) -> dict:
        """Convert to dictionary (excludes API key)."""
        return {
            "model": self.model,
            "voice": self.voice,
            "input_sample_rate": self.input_sample_rate,
            "output_sample_rate": self.output_sample_rate,
            "is_configured": self.is_configured,
        }


@dataclass
class AudioConfig:
    """Audio processing configuration."""

    # Janus AudioBridge typically uses Opus at 48kHz
    janus_sample_rate: int = 48000
    janus_channels: int = 1

    # Gemini expects 16kHz input, outputs 24kHz
    gemini_input_rate: int = 16000
    gemini_output_rate: int = 24000

    # RTP/Opus frame settings
    frame_duration_ms: int = 20  # Standard 20ms Opus frames
    opus_bitrate: int = 24000    # Opus encoding bitrate

    # Buffer settings
    jitter_buffer_ms: int = 100  # Jitter buffer depth
    send_buffer_ms: int = 100    # Audio accumulation before sending

    @property
    def janus_frame_samples(self) -> int:
        """Samples per 20ms frame at Janus rate."""
        return int(self.janus_sample_rate * self.frame_duration_ms / 1000)

    @property
    def gemini_input_threshold(self) -> int:
        """Bytes to accumulate before sending to Gemini."""
        samples = int(self.gemini_input_rate * self.send_buffer_ms / 1000)
        return samples * 2  # 16-bit = 2 bytes per sample

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "janus_sample_rate": self.janus_sample_rate,
            "gemini_input_rate": self.gemini_input_rate,
            "gemini_output_rate": self.gemini_output_rate,
            "frame_duration_ms": self.frame_duration_ms,
            "jitter_buffer_ms": self.jitter_buffer_ms,
        }


@dataclass
class Settings:
    """Application settings."""

    # Logging
    log_level: str = field(
        default_factory=lambda: os.getenv("VK_AGENT_LOG_LEVEL", "INFO")
    )
    log_format: str = field(
        default_factory=lambda: os.getenv(
            "VK_AGENT_LOG_FORMAT",
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    )

    # Debug options
    debug_audio: bool = field(
        default_factory=lambda: _get_bool("VK_AGENT_DEBUG_AUDIO", False)
    )
    debug_audio_dir: str = field(
        default_factory=lambda: os.getenv(
            "VK_AGENT_DEBUG_AUDIO_DIR", "/tmp/vk-agent-audio"
        )
    )

    # API server (optional)
    api_host: str = field(
        default_factory=lambda: os.getenv("VK_AGENT_API_HOST", "0.0.0.0")
    )
    api_port: int = field(
        default_factory=lambda: int(os.getenv("VK_AGENT_API_PORT", "3004"))
    )

    # Component configs
    janus: JanusConfig = field(default_factory=JanusConfig)
    gemini: GeminiConfig = field(default_factory=GeminiConfig)
    audio: AudioConfig = field(default_factory=AudioConfig)

    # Version
    version: str = "1.0.0"

    def __post_init__(self):
        """Validate settings after initialization."""
        # Validate log level
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.log_level.upper() not in valid_levels:
            self.log_level = "INFO"
        else:
            self.log_level = self.log_level.upper()

        # Validate port range
        if not 1 <= self.api_port <= 65535:
            self.api_port = 3004

    def validate(self) -> list[str]:
        """Validate configuration and return list of errors.

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        if not self.gemini.api_key:
            errors.append("GEMINI_API_KEY environment variable is required")

        if self.janus.rtp_port < 1024 or self.janus.rtp_port > 65535:
            errors.append(f"Invalid RTP port: {self.janus.rtp_port}")

        return errors

    def to_dict(self) -> dict:
        """Convert to dictionary for logging/debugging."""
        return {
            "log_level": self.log_level,
            "debug_audio": self.debug_audio,
            "api_host": self.api_host,
            "api_port": self.api_port,
            "janus": self.janus.to_dict(),
            "gemini": self.gemini.to_dict(),
            "audio": self.audio.to_dict(),
            "version": self.version,
        }


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get settings instance (lazy initialization)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def configure_logging(level: str = None) -> None:
    """Configure application logging.

    Args:
        level: Log level override (default: from settings)
    """
    settings = get_settings()
    log_level = level or settings.log_level

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=settings.log_format,
    )

    # Set specific loggers
    logging.getLogger("vk_agent").setLevel(getattr(logging, log_level.upper()))

    # Reduce noise from third-party libraries
    logging.getLogger("websockets").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


def load_config() -> dict:
    """Load configuration as a dictionary.

    Legacy function for compatibility with prototype code.

    Returns:
        Configuration dictionary with janus, gemini, and audio sections
    """
    settings = get_settings()
    return {
        "janus": settings.janus,
        "gemini": settings.gemini,
        "audio": settings.audio,
    }
