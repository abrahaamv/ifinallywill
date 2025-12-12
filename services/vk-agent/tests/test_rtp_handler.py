"""
Tests for VK-Agent RTP handler
"""

import pytest
from src.rtp_handler import RTPJitterBuffer
from src.models import RTPPacket


class TestRTPJitterBuffer:
    """Tests for RTP jitter buffer."""

    def test_ordered_packets(self):
        """Test that ordered packets are returned in order."""
        buffer = RTPJitterBuffer()

        # Add packets in order
        for seq in range(1, 6):
            packet = RTPPacket(sequence_number=seq, payload=b"data")
            buffer.put(packet)

        # Get packets
        results = []
        for _ in range(5):
            p = buffer.get()
            if p:
                results.append(p.sequence_number)

        assert results == [1, 2, 3, 4, 5]

    def test_out_of_order_packets(self):
        """Test that out-of-order packets are reordered."""
        buffer = RTPJitterBuffer()

        # Add packets out of order
        for seq in [3, 1, 5, 2, 4]:
            packet = RTPPacket(sequence_number=seq, payload=b"data")
            buffer.put(packet)

        # Get packets (should be in order)
        results = []
        for _ in range(10):  # Try more than we added
            p = buffer.get()
            if p:
                results.append(p.sequence_number)

        # Should get 1, 2, 3, 4, 5 (in order)
        assert results == [1, 2, 3, 4, 5]

    def test_lost_packet_handling(self):
        """Test that lost packets are skipped after threshold."""
        buffer = RTPJitterBuffer(skip_threshold=3)

        # Add packets with gap (seq 2-4 missing)
        buffer.put(RTPPacket(sequence_number=1, payload=b"data"))
        buffer.put(RTPPacket(sequence_number=5, payload=b"data"))
        buffer.put(RTPPacket(sequence_number=6, payload=b"data"))

        # Get first packet
        p1 = buffer.get()
        assert p1 is not None
        assert p1.sequence_number == 1

        # Next get should skip to 5 (after looking ahead)
        p5 = buffer.get()
        assert p5 is not None
        assert p5.sequence_number == 5

        # Next should be 6
        p6 = buffer.get()
        assert p6 is not None
        assert p6.sequence_number == 6

    def test_clear(self):
        """Test buffer clearing."""
        buffer = RTPJitterBuffer()

        # Add some packets
        for seq in range(1, 6):
            buffer.put(RTPPacket(sequence_number=seq, payload=b"data"))

        assert buffer.size == 5

        # Clear
        buffer.clear()

        assert buffer.size == 0
        assert buffer.get() is None

    def test_stats(self):
        """Test statistics tracking."""
        buffer = RTPJitterBuffer()

        # Add and get packets
        for seq in range(1, 6):
            buffer.put(RTPPacket(sequence_number=seq, payload=b"data"))

        for _ in range(5):
            buffer.get()

        stats = buffer.get_stats()
        assert stats["packets_in"] == 5
        assert stats["packets_out"] == 5
        assert stats["current_size"] == 0
