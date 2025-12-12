"""
VK-Agent Data Models

This module defines all data structures used throughout the VK-Agent service.
Models are designed for:
- Type safety with dataclasses
- JSON serialization for API responses
- Integration with Janus and Gemini protocols

Architecture:
    RTPPacket → Individual RTP packet (RFC 3550)
    AudioFormat → Audio stream configuration
    JanusSession → Janus connection state
    GeminiSession → Gemini Live API state
    BridgeStats → Aggregate metrics
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any
import struct


class AgentState(Enum):
    """Agent lifecycle states.

    INITIALIZING: Components being created
    CONNECTING: Establishing connections to Janus and Gemini
    READY: All systems ready, waiting for participants
    ACTIVE: Processing audio bidirectionally
    PAUSED: Temporarily not forwarding audio
    STOPPING: Graceful shutdown in progress
    STOPPED: Agent fully stopped
    ERROR: Unrecoverable error state
    """
    INITIALIZING = "initializing"
    CONNECTING = "connecting"
    READY = "ready"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class TransportProtocol(Enum):
    """Transport protocol for RTP/RTCP.

    UDP: Default, lowest latency
    TCP: Reliable delivery, firewall-friendly
    """
    UDP = "udp"
    TCP = "tcp"


class CodecType(Enum):
    """Audio codec types.

    OPUS: WebRTC standard, variable bitrate
    PCM16: Raw uncompressed audio
    """
    OPUS = "opus"
    PCM16 = "pcm16"


@dataclass
class AudioFormat:
    """Audio stream format specification.

    Defines the format for a specific audio stream in the pipeline.

    Attributes:
        sample_rate: Samples per second (Hz)
        channels: Number of audio channels (1=mono, 2=stereo)
        bit_depth: Bits per sample (16 for PCM16)
        codec: Audio codec used

    Common Configurations:
        Janus AudioBridge: 48000Hz, 1ch, Opus
        Gemini Input: 16000Hz, 1ch, PCM16
        Gemini Output: 24000Hz, 1ch, PCM16
    """
    sample_rate: int
    channels: int = 1
    bit_depth: int = 16
    codec: CodecType = CodecType.PCM16

    @property
    def bytes_per_sample(self) -> int:
        """Calculate bytes per sample."""
        return (self.bit_depth // 8) * self.channels

    @property
    def bytes_per_second(self) -> int:
        """Calculate bytes per second of audio."""
        return self.sample_rate * self.bytes_per_sample

    def samples_for_duration_ms(self, duration_ms: int) -> int:
        """Calculate samples for a duration in milliseconds."""
        return int(self.sample_rate * duration_ms / 1000)

    def bytes_for_duration_ms(self, duration_ms: int) -> int:
        """Calculate bytes for a duration in milliseconds."""
        return self.samples_for_duration_ms(duration_ms) * self.bytes_per_sample

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "sample_rate": self.sample_rate,
            "channels": self.channels,
            "bit_depth": self.bit_depth,
            "codec": self.codec.value,
        }


# Standard audio formats used in the pipeline
JANUS_AUDIO_FORMAT = AudioFormat(
    sample_rate=48000,
    channels=1,
    codec=CodecType.OPUS,
)

GEMINI_INPUT_FORMAT = AudioFormat(
    sample_rate=16000,
    channels=1,
    codec=CodecType.PCM16,
)

GEMINI_OUTPUT_FORMAT = AudioFormat(
    sample_rate=24000,
    channels=1,
    codec=CodecType.PCM16,
)


@dataclass
class RTPPacket:
    """RTP Packet structure (RFC 3550).

    Format:
        0                   1                   2                   3
        0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        |V=2|P|X|  CC   |M|     PT      |       sequence number         |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        |                           timestamp                           |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        |           synchronization source (SSRC) identifier            |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

    Attributes:
        version: RTP version (always 2)
        padding: Packet has padding bytes
        extension: Header extension present
        csrc_count: Contributing source count
        marker: Marker bit (first packet after silence)
        payload_type: Audio codec identifier (111 = Opus)
        sequence_number: Packet sequence (16-bit, wraps)
        timestamp: Media timestamp (32-bit, wraps)
        ssrc: Synchronization source identifier
        payload: Audio data bytes
    """
    version: int = 2
    padding: bool = False
    extension: bool = False
    csrc_count: int = 0
    marker: bool = False
    payload_type: int = 111  # Opus
    sequence_number: int = 0
    timestamp: int = 0
    ssrc: int = 0
    payload: bytes = field(default_factory=bytes)

    # Timestamp when packet was received (for jitter calculation)
    received_at: Optional[datetime] = None

    @classmethod
    def parse(cls, data: bytes) -> Optional["RTPPacket"]:
        """Parse RTP packet from raw bytes.

        Args:
            data: Raw packet bytes (minimum 12 bytes for header)

        Returns:
            Parsed RTPPacket or None if invalid
        """
        if len(data) < 12:
            return None

        try:
            # Parse first byte: V(2) P(1) X(1) CC(4)
            first_byte = data[0]
            version = (first_byte >> 6) & 0x03
            padding = bool((first_byte >> 5) & 0x01)
            extension = bool((first_byte >> 4) & 0x01)
            csrc_count = first_byte & 0x0F

            # Verify version
            if version != 2:
                return None

            # Parse second byte: M(1) PT(7)
            second_byte = data[1]
            marker = bool((second_byte >> 7) & 0x01)
            payload_type = second_byte & 0x7F

            # Parse sequence number, timestamp, SSRC
            sequence_number, timestamp, ssrc = struct.unpack("!HII", data[2:12])

            # Calculate header length (12 + CSRC entries)
            header_len = 12 + (csrc_count * 4)

            # Handle extension header if present
            if extension and len(data) >= header_len + 4:
                ext_profile, ext_len = struct.unpack(
                    "!HH", data[header_len : header_len + 4]
                )
                header_len += 4 + (ext_len * 4)

            # Extract payload
            payload = data[header_len:]

            # Handle padding
            if padding and len(payload) > 0:
                pad_len = payload[-1]
                if pad_len <= len(payload):
                    payload = payload[:-pad_len]

            return cls(
                version=version,
                padding=padding,
                extension=extension,
                csrc_count=csrc_count,
                marker=marker,
                payload_type=payload_type,
                sequence_number=sequence_number,
                timestamp=timestamp,
                ssrc=ssrc,
                payload=payload,
                received_at=datetime.now(timezone.utc),
            )

        except Exception:
            return None

    def to_bytes(self) -> bytes:
        """Serialize RTP packet to bytes.

        Returns:
            Complete RTP packet as bytes
        """
        # First byte: V(2) P(1) X(1) CC(4)
        first_byte = (
            (self.version << 6)
            | (int(self.padding) << 5)
            | (int(self.extension) << 4)
            | (self.csrc_count & 0x0F)
        )

        # Second byte: M(1) PT(7)
        second_byte = (int(self.marker) << 7) | (self.payload_type & 0x7F)

        # Build header
        header = struct.pack(
            "!BBHII",
            first_byte,
            second_byte,
            self.sequence_number & 0xFFFF,
            self.timestamp & 0xFFFFFFFF,
            self.ssrc & 0xFFFFFFFF,
        )

        return header + self.payload

    @property
    def header_size(self) -> int:
        """Size of RTP header in bytes."""
        return 12 + (self.csrc_count * 4)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for debugging."""
        return {
            "version": self.version,
            "marker": self.marker,
            "payload_type": self.payload_type,
            "sequence_number": self.sequence_number,
            "timestamp": self.timestamp,
            "ssrc": hex(self.ssrc),
            "payload_size": len(self.payload),
        }


@dataclass
class JanusSession:
    """Janus connection session state.

    Tracks the state of a Janus WebSocket connection and
    AudioBridge plugin attachment.

    Attributes:
        session_id: Janus session identifier
        handle_id: AudioBridge plugin handle
        room_id: AudioBridge room number
        participant_id: Our ID in the room
        rtp_target: Where to send RTP packets to Janus
        connected: WebSocket connected
        joined: Successfully joined room
    """
    session_id: Optional[int] = None
    handle_id: Optional[int] = None
    room_id: int = 0
    participant_id: Optional[int] = None
    display_name: str = "VKAgent"

    # RTP target from Janus (where we send TO)
    rtp_target_ip: Optional[str] = None
    rtp_target_port: Optional[int] = None

    # Connection state
    connected: bool = False
    joined: bool = False

    # Timestamps
    connected_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None

    @property
    def is_ready(self) -> bool:
        """Check if session is ready for audio."""
        return (
            self.connected
            and self.joined
            and self.session_id is not None
            and self.handle_id is not None
            and self.rtp_target_ip is not None
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "session_id": self.session_id,
            "handle_id": self.handle_id,
            "room_id": self.room_id,
            "participant_id": self.participant_id,
            "display_name": self.display_name,
            "rtp_target": f"{self.rtp_target_ip}:{self.rtp_target_port}",
            "connected": self.connected,
            "joined": self.joined,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


@dataclass
class GeminiSession:
    """Gemini Live API session state.

    Tracks the state of a Gemini WebSocket connection.

    Attributes:
        model: Gemini model ID (e.g., "models/gemini-2.0-flash-exp")
        connected: WebSocket connected
        setup_complete: Initial setup handshake done
        voice: Voice preset being used
    """
    model: str = "models/gemini-2.0-flash-exp"
    voice: str = "Puck"
    system_instruction: Optional[str] = None

    # Connection state
    connected: bool = False
    setup_complete: bool = False
    is_speaking: bool = False

    # Timestamps
    connected_at: Optional[datetime] = None
    last_audio_sent: Optional[datetime] = None
    last_audio_received: Optional[datetime] = None

    @property
    def is_ready(self) -> bool:
        """Check if session is ready for audio."""
        return self.connected and self.setup_complete

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model": self.model,
            "voice": self.voice,
            "connected": self.connected,
            "setup_complete": self.setup_complete,
            "is_speaking": self.is_speaking,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
        }


@dataclass
class BridgeStats:
    """Aggregate statistics for the bridge.

    Tracks runtime metrics for monitoring and debugging.

    Attributes:
        state: Current agent state
        started_at: When bridge was started
        rtp_packets_received: Packets from Janus
        rtp_packets_sent: Packets to Janus
        rtp_bytes_received: Bytes from Janus
        rtp_bytes_sent: Bytes to Janus
        audio_chunks_to_gemini: PCM chunks sent to Gemini
        audio_chunks_from_gemini: PCM chunks received from Gemini
        gemini_interruptions: Times Gemini was interrupted
        decode_errors: Opus decode failures
        encode_errors: Opus encode failures
    """
    state: AgentState = AgentState.INITIALIZING
    started_at: Optional[datetime] = None

    # RTP statistics
    rtp_packets_received: int = 0
    rtp_packets_sent: int = 0
    rtp_bytes_received: int = 0
    rtp_bytes_sent: int = 0
    rtp_packets_lost: int = 0

    # Audio processing statistics
    audio_chunks_to_gemini: int = 0
    audio_chunks_from_gemini: int = 0
    audio_bytes_to_gemini: int = 0
    audio_bytes_from_gemini: int = 0

    # Event statistics
    gemini_interruptions: int = 0
    gemini_turn_completions: int = 0
    participants_seen: int = 0

    # Error statistics
    decode_errors: int = 0
    encode_errors: int = 0
    janus_errors: int = 0
    gemini_errors: int = 0

    @property
    def uptime_seconds(self) -> float:
        """Calculate uptime in seconds."""
        if not self.started_at:
            return 0.0
        return (datetime.now(timezone.utc) - self.started_at).total_seconds()

    @property
    def rtp_packet_loss_rate(self) -> float:
        """Calculate packet loss rate (0.0 to 1.0)."""
        total = self.rtp_packets_received + self.rtp_packets_lost
        if total == 0:
            return 0.0
        return self.rtp_packets_lost / total

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "state": self.state.value,
            "uptime_seconds": round(self.uptime_seconds, 2),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "rtp": {
                "packets_received": self.rtp_packets_received,
                "packets_sent": self.rtp_packets_sent,
                "bytes_received": self.rtp_bytes_received,
                "bytes_sent": self.rtp_bytes_sent,
                "packets_lost": self.rtp_packets_lost,
                "loss_rate": round(self.rtp_packet_loss_rate, 4),
            },
            "audio": {
                "chunks_to_gemini": self.audio_chunks_to_gemini,
                "chunks_from_gemini": self.audio_chunks_from_gemini,
                "bytes_to_gemini": self.audio_bytes_to_gemini,
                "bytes_from_gemini": self.audio_bytes_from_gemini,
            },
            "events": {
                "gemini_interruptions": self.gemini_interruptions,
                "gemini_turn_completions": self.gemini_turn_completions,
                "participants_seen": self.participants_seen,
            },
            "errors": {
                "decode": self.decode_errors,
                "encode": self.encode_errors,
                "janus": self.janus_errors,
                "gemini": self.gemini_errors,
            },
        }


@dataclass
class Participant:
    """Participant in the AudioBridge room.

    Attributes:
        id: Janus participant ID
        display: Display name
        muted: Currently muted
        talking: Currently talking (audio level above threshold)
    """
    id: int
    display: str = "Unknown"
    muted: bool = False
    talking: bool = False
    joined_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "display": self.display,
            "muted": self.muted,
            "talking": self.talking,
            "joined_at": self.joined_at.isoformat(),
        }
