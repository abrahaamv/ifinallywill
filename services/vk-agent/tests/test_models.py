"""
Tests for VK-Agent data models
"""

import pytest
from src.models import (
    RTPPacket,
    AudioFormat,
    CodecType,
    AgentState,
    BridgeStats,
)


class TestRTPPacket:
    """Tests for RTP packet parsing and serialization."""

    def test_parse_valid_packet(self):
        """Test parsing a valid RTP packet."""
        # Construct a minimal RTP packet
        # V=2, P=0, X=0, CC=0, M=0, PT=111, seq=1234, ts=5678, ssrc=9999
        header = bytes([
            0x80,  # V=2, P=0, X=0, CC=0
            0x6f,  # M=0, PT=111 (Opus)
            0x04, 0xd2,  # seq=1234
            0x00, 0x00, 0x16, 0x2e,  # ts=5678
            0x00, 0x00, 0x27, 0x0f,  # ssrc=9999
        ])
        payload = b"\x01\x02\x03\x04"
        raw = header + payload

        packet = RTPPacket.parse(raw)
        assert packet is not None
        assert packet.version == 2
        assert packet.payload_type == 111
        assert packet.sequence_number == 1234
        assert packet.timestamp == 5678
        assert packet.ssrc == 9999
        assert packet.payload == payload

    def test_parse_short_packet(self):
        """Test that short packets return None."""
        packet = RTPPacket.parse(b"\x00" * 10)  # Less than 12 bytes
        assert packet is None

    def test_to_bytes_roundtrip(self):
        """Test serialization and parsing roundtrip."""
        original = RTPPacket(
            version=2,
            marker=True,
            payload_type=111,
            sequence_number=5000,
            timestamp=100000,
            ssrc=0xDEADBEEF,
            payload=b"test payload",
        )

        raw = original.to_bytes()
        parsed = RTPPacket.parse(raw)

        assert parsed is not None
        assert parsed.version == original.version
        assert parsed.marker == original.marker
        assert parsed.payload_type == original.payload_type
        assert parsed.sequence_number == original.sequence_number
        assert parsed.timestamp == original.timestamp
        assert parsed.ssrc == original.ssrc
        assert parsed.payload == original.payload


class TestAudioFormat:
    """Tests for audio format configuration."""

    def test_bytes_per_sample(self):
        """Test bytes per sample calculation."""
        mono_16bit = AudioFormat(sample_rate=48000, channels=1, bit_depth=16)
        assert mono_16bit.bytes_per_sample == 2

        stereo_16bit = AudioFormat(sample_rate=48000, channels=2, bit_depth=16)
        assert stereo_16bit.bytes_per_sample == 4

    def test_bytes_per_second(self):
        """Test bytes per second calculation."""
        format_16k = AudioFormat(sample_rate=16000, channels=1, bit_depth=16)
        assert format_16k.bytes_per_second == 32000  # 16000 * 2

        format_48k = AudioFormat(sample_rate=48000, channels=1, bit_depth=16)
        assert format_48k.bytes_per_second == 96000  # 48000 * 2

    def test_samples_for_duration(self):
        """Test sample count for duration."""
        format_48k = AudioFormat(sample_rate=48000)

        # 20ms = 960 samples at 48kHz
        assert format_48k.samples_for_duration_ms(20) == 960

        # 100ms = 4800 samples at 48kHz
        assert format_48k.samples_for_duration_ms(100) == 4800


class TestBridgeStats:
    """Tests for bridge statistics."""

    def test_initial_state(self):
        """Test initial statistics state."""
        stats = BridgeStats()
        assert stats.state == AgentState.INITIALIZING
        assert stats.rtp_packets_received == 0
        assert stats.rtp_packets_sent == 0
        assert stats.uptime_seconds == 0.0

    def test_packet_loss_rate(self):
        """Test packet loss rate calculation."""
        stats = BridgeStats()
        stats.rtp_packets_received = 90
        stats.rtp_packets_lost = 10

        assert stats.rtp_packet_loss_rate == 0.1  # 10%

    def test_to_dict(self):
        """Test dictionary serialization."""
        stats = BridgeStats(
            state=AgentState.ACTIVE,
            rtp_packets_received=100,
            rtp_packets_sent=50,
        )

        result = stats.to_dict()
        assert result["state"] == "active"
        assert result["rtp"]["packets_received"] == 100
        assert result["rtp"]["packets_sent"] == 50
