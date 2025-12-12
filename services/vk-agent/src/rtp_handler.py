"""
VK-Agent RTP Handler

Handles RTP packet parsing, creation, and UDP transport for audio streams
between Janus AudioBridge and the VK-Agent bridge.

Features:
    - RFC 3550 compliant RTP packet parsing and serialization
    - Async UDP receiver with configurable callbacks
    - UDP sender with sequence/timestamp tracking
    - Jitter buffer for out-of-order packet handling
    - Statistics tracking (packets, bytes, loss)

Architecture:
    Janus AudioBridge
          │
          │ UDP (RTP Opus)
          ▼
    ┌─────────────────┐
    │   RTPReceiver   │ ──► Callback with RTPPacket
    └─────────────────┘

    ┌─────────────────┐
    │   RTPSender     │ ◄── send(opus_payload)
    └─────────────────┘
          │
          │ UDP (RTP Opus)
          ▼
    Janus AudioBridge
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Callable, Tuple, Dict

from .models import RTPPacket

logger = logging.getLogger(__name__)


@dataclass
class RTPReceiverStats:
    """Statistics for RTP receiver."""
    packets_received: int = 0
    bytes_received: int = 0
    packets_lost: int = 0
    last_sequence: int = -1
    started_at: Optional[datetime] = None

    @property
    def loss_rate(self) -> float:
        """Calculate packet loss rate (0.0 to 1.0)."""
        total = self.packets_received + self.packets_lost
        if total == 0:
            return 0.0
        return self.packets_lost / total

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "packets_received": self.packets_received,
            "bytes_received": self.bytes_received,
            "packets_lost": self.packets_lost,
            "loss_rate": round(self.loss_rate, 4),
            "started_at": self.started_at.isoformat() if self.started_at else None,
        }


@dataclass
class RTPSenderStats:
    """Statistics for RTP sender."""
    packets_sent: int = 0
    bytes_sent: int = 0
    started_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "packets_sent": self.packets_sent,
            "bytes_sent": self.bytes_sent,
            "started_at": self.started_at.isoformat() if self.started_at else None,
        }


class RTPProtocol(asyncio.DatagramProtocol):
    """Async UDP protocol for receiving RTP packets.

    This is the low-level asyncio protocol that receives UDP datagrams
    and passes them to a callback function.
    """

    def __init__(self, callback: Callable[[bytes, Tuple[str, int]], None]):
        """Initialize protocol with callback.

        Args:
            callback: Function to call with (data, addr) on packet receipt
        """
        self.callback = callback
        self.transport: Optional[asyncio.DatagramTransport] = None

    def connection_made(self, transport: asyncio.DatagramTransport) -> None:
        """Called when transport is established."""
        self.transport = transport
        logger.debug(f"RTP protocol connected: {transport.get_extra_info('sockname')}")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]) -> None:
        """Called when a UDP datagram is received."""
        self.callback(data, addr)

    def error_received(self, exc: Exception) -> None:
        """Called on UDP error."""
        logger.error(f"RTP protocol error: {exc}")

    def connection_lost(self, exc: Optional[Exception]) -> None:
        """Called when transport is closed."""
        if exc:
            logger.error(f"RTP protocol connection lost: {exc}")
        else:
            logger.debug("RTP protocol connection closed")


class RTPReceiver:
    """UDP receiver for RTP packets from Janus AudioBridge.

    Listens on a UDP port for incoming RTP packets, parses them,
    and invokes a callback with each parsed packet.

    Example:
        >>> def on_packet(packet: RTPPacket):
        ...     print(f"Received: seq={packet.sequence_number}")
        >>>
        >>> receiver = RTPReceiver(
        ...     host="0.0.0.0",
        ...     port=5004,
        ...     on_packet=on_packet,
        ... )
        >>> await receiver.start()
        >>> # ... receive packets ...
        >>> await receiver.stop()
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 5004,
        on_packet: Optional[Callable[[RTPPacket], None]] = None,
        ignore_source_port: Optional[int] = None,
    ):
        """Initialize RTP receiver.

        Args:
            host: IP address to bind (0.0.0.0 for all interfaces)
            port: UDP port to listen on
            on_packet: Callback function for received packets
            ignore_source_port: If set, ignore packets FROM this source port.
                               Used to filter out echo from Janus mixed audio.
        """
        self.host = host
        self.port = port
        self.on_packet = on_packet
        self.ignore_source_port = ignore_source_port

        self._transport: Optional[asyncio.DatagramTransport] = None
        self._protocol: Optional[RTPProtocol] = None
        self._running = False

        self.stats = RTPReceiverStats()

    def set_ignore_source_port(self, port: int) -> None:
        """Set source port to ignore (for filtering echo).

        Args:
            port: Source port to ignore packets from
        """
        self.ignore_source_port = port
        logger.info(f"RTP receiver will ignore packets from source port {port}")

    async def start(self) -> bool:
        """Start the RTP receiver.

        Returns:
            True if started successfully, False otherwise
        """
        if self._running:
            logger.warning("RTP receiver already running")
            return True

        try:
            loop = asyncio.get_event_loop()

            # Create UDP endpoint
            self._transport, self._protocol = await loop.create_datagram_endpoint(
                lambda: RTPProtocol(self._handle_datagram),
                local_addr=(self.host, self.port),
            )

            self._running = True
            self.stats.started_at = datetime.now(timezone.utc)

            # Get actual bound address
            sockname = self._transport.get_extra_info('sockname')
            logger.info(
                f"[RTP-DEBUG] RTP receiver STARTED - "
                f"requested={self.host}:{self.port}, "
                f"actual={sockname}, "
                f"callback={'SET' if self.on_packet else 'NOT SET'}"
            )
            return True

        except OSError as e:
            logger.error(f"Failed to bind RTP receiver to {self.host}:{self.port}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to start RTP receiver: {e}")
            return False

    def _handle_datagram(self, data: bytes, addr: Tuple[str, int]) -> None:
        """Handle incoming UDP datagram.

        Args:
            data: Raw UDP payload
            addr: Source (host, port) tuple
        """
        # Filter out packets from ignored source port (e.g., Janus mixed audio echo)
        if self.ignore_source_port and addr[1] == self.ignore_source_port:
            # This is our own mixed audio echoed back - ignore it
            return

        # DEBUG: Log incoming UDP data (reduced frequency)
        if self.stats.packets_received % 50 == 0:
            logger.info(
                f"[RTP-DEBUG] UDP packet received! "
                f"from={addr}, size={len(data)}, "
                f"first_bytes={data[:12].hex() if len(data) >= 12 else data.hex()}"
            )

        # Parse RTP packet
        packet = RTPPacket.parse(data)
        if packet is None:
            logger.warning(f"[RTP-DEBUG] Failed to parse RTP from {addr}, data={data[:20].hex()}")
            return

        # Update statistics
        self.stats.packets_received += 1
        self.stats.bytes_received += len(data)

        # Check for packet loss
        if self.stats.last_sequence >= 0:
            expected = (self.stats.last_sequence + 1) & 0xFFFF
            if packet.sequence_number != expected:
                # Account for wraparound
                diff = (packet.sequence_number - expected) & 0xFFFF
                if diff < 0x8000:  # Forward gap
                    self.stats.packets_lost += diff
                    logger.debug(f"Packet loss detected: {diff} packets")

        self.stats.last_sequence = packet.sequence_number

        # Invoke callback
        if self.on_packet:
            try:
                self.on_packet(packet)
            except Exception as e:
                logger.error(f"Error in RTP packet callback: {e}")

    async def stop(self) -> None:
        """Stop the RTP receiver."""
        if not self._running:
            return

        self._running = False

        if self._transport:
            self._transport.close()
            self._transport = None

        logger.info(
            f"RTP receiver stopped. Stats: "
            f"packets={self.stats.packets_received}, "
            f"lost={self.stats.packets_lost}"
        )

    @property
    def is_running(self) -> bool:
        """Check if receiver is running."""
        return self._running

    @property
    def transport(self) -> Optional[asyncio.DatagramTransport]:
        """Get the underlying UDP transport for sending."""
        return self._transport

    def send_to(self, data: bytes, addr: Tuple[str, int]) -> bool:
        """Send data via this receiver's socket.

        This allows sending from the same port we're receiving on,
        which is required for Janus plain RTP participants.

        Args:
            data: Raw data to send
            addr: Destination (host, port) tuple

        Returns:
            True if sent successfully
        """
        if not self._transport:
            logger.warning("Cannot send - transport not initialized")
            return False
        try:
            self._transport.sendto(data, addr)
            return True
        except Exception as e:
            logger.error(f"Failed to send via receiver transport: {e}")
            return False


class RTPSender:
    """UDP sender for RTP packets to Janus AudioBridge.

    Creates RTP packets with proper headers and sends them via UDP.
    Manages sequence numbers and timestamps automatically.

    Example:
        >>> sender = RTPSender(
        ...     host="172.19.0.1",
        ...     port=5006,
        ...     ssrc=0x12345678,
        ... )
        >>> await sender.start()
        >>>
        >>> # Send Opus audio
        >>> sender.send(opus_frame, marker=True)  # First packet
        >>> sender.send(opus_frame)  # Subsequent packets
        >>>
        >>> await sender.stop()
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 5006,
        ssrc: int = 0x12345678,
        payload_type: int = 111,  # Opus
        sample_rate: int = 48000,
    ):
        """Initialize RTP sender.

        Args:
            host: Target IP address
            port: Target UDP port
            ssrc: Synchronization source identifier
            payload_type: RTP payload type (111 for Opus)
            sample_rate: Audio sample rate (for timestamp calculation)
        """
        self.host = host
        self.port = port
        self.ssrc = ssrc
        self.payload_type = payload_type
        self.sample_rate = sample_rate

        self._transport: Optional[asyncio.DatagramTransport] = None
        self._protocol: Optional[asyncio.DatagramProtocol] = None
        self._external_transport: Optional[asyncio.DatagramTransport] = None  # For sharing receiver's socket

        # RTP state
        self._sequence_number = 0
        self._timestamp = 0
        self._samples_per_packet = 960  # 20ms at 48kHz

        self.stats = RTPSenderStats()

    def set_transport(self, transport: asyncio.DatagramTransport) -> None:
        """Set an external transport (e.g., from RTPReceiver) for sending.

        This allows sending from the same port as the receiver, which is
        required for Janus plain RTP participants.

        Args:
            transport: The DatagramTransport to use for sending
        """
        self._external_transport = transport
        logger.info(f"RTP sender using shared transport -> {self.host}:{self.port}")

    async def start(self, local_port: int = 0) -> bool:
        """Start the RTP sender.

        Args:
            local_port: Local port to bind to (0 = random). Set this to match
                       the port registered with Janus for plain RTP participant.

        Returns:
            True if started successfully, False otherwise
        """
        try:
            loop = asyncio.get_event_loop()

            # Create UDP endpoint - bind to specific local port if provided
            # This is important for Janus plain RTP participants - Janus expects
            # packets to come FROM the registered address
            if local_port > 0:
                self._transport, self._protocol = await loop.create_datagram_endpoint(
                    asyncio.DatagramProtocol,
                    local_addr=("0.0.0.0", local_port),
                    remote_addr=(self.host, self.port),
                )
                logger.info(f"RTP sender started, local port {local_port} -> {self.host}:{self.port}")
            else:
                self._transport, self._protocol = await loop.create_datagram_endpoint(
                    asyncio.DatagramProtocol,
                    remote_addr=(self.host, self.port),
                )
                logger.info(f"RTP sender started, target: {self.host}:{self.port}")

            self.stats.started_at = datetime.now(timezone.utc)
            return True

        except Exception as e:
            logger.error(f"Failed to start RTP sender: {e}")
            return False

    def send(self, payload: bytes, marker: bool = False) -> bool:
        """Send audio payload via RTP.

        Args:
            payload: Audio payload (Opus encoded)
            marker: Marker bit (True for first packet after silence)

        Returns:
            True if sent successfully, False otherwise
        """
        # Use external transport if set (shared socket with receiver)
        transport = self._external_transport or self._transport
        if not transport:
            logger.debug("Cannot send: transport not ready")
            return False

        try:
            # Create RTP packet
            packet = RTPPacket(
                version=2,
                marker=marker,
                payload_type=self.payload_type,
                sequence_number=self._sequence_number,
                timestamp=self._timestamp,
                ssrc=self.ssrc,
                payload=payload,
            )

            # Send packet - use sendto for external transport, send for own
            packet_bytes = packet.to_bytes()
            if self._external_transport:
                transport.sendto(packet_bytes, (self.host, self.port))
            else:
                transport.sendto(packet_bytes)

            # Update state
            self._sequence_number = (self._sequence_number + 1) & 0xFFFF
            self._timestamp = (self._timestamp + self._samples_per_packet) & 0xFFFFFFFF

            # Update statistics
            self.stats.packets_sent += 1
            self.stats.bytes_sent += len(payload) + 12  # payload + RTP header

            return True

        except Exception as e:
            logger.error(f"RTP send error: {e}")
            return False

    async def stop(self) -> None:
        """Stop the RTP sender."""
        # Only close our own transport, not external one
        if self._transport:
            self._transport.close()
            self._transport = None
        self._external_transport = None

        logger.info(
            f"RTP sender stopped. Stats: "
            f"packets={self.stats.packets_sent}, "
            f"bytes={self.stats.bytes_sent}"
        )

    @property
    def is_running(self) -> bool:
        """Check if sender is ready."""
        return (self._transport is not None) or (self._external_transport is not None)


class RTPJitterBuffer:
    """Jitter buffer for RTP packet reordering.

    Buffers incoming RTP packets and outputs them in sequence order,
    handling out-of-order delivery and packet loss.

    The buffer works by:
    1. Storing packets indexed by sequence number
    2. Outputting packets in order when available
    3. Skipping lost packets after timeout

    Example:
        >>> buffer = RTPJitterBuffer(buffer_time_ms=100)
        >>>
        >>> # Packets may arrive out of order
        >>> buffer.put(packet_3)
        >>> buffer.put(packet_1)
        >>> buffer.put(packet_2)
        >>>
        >>> # Get returns in order
        >>> packet_1 = buffer.get()
        >>> packet_2 = buffer.get()
        >>> packet_3 = buffer.get()
    """

    def __init__(
        self,
        buffer_time_ms: int = 100,
        max_packets: int = 50,
        skip_threshold: int = 16,
    ):
        """Initialize jitter buffer.

        Args:
            buffer_time_ms: Buffer depth in milliseconds (for logging)
            max_packets: Maximum packets to buffer before forced output
            skip_threshold: Sequence gap before skipping lost packets
        """
        self.buffer_time_ms = buffer_time_ms
        self.max_packets = max_packets
        self.skip_threshold = skip_threshold

        self._buffer: Dict[int, RTPPacket] = {}
        self._next_sequence: int = -1

        # Statistics
        self._packets_in = 0
        self._packets_out = 0
        self._packets_dropped = 0

    def put(self, packet: RTPPacket) -> None:
        """Add packet to buffer.

        Args:
            packet: RTP packet to buffer
        """
        self._packets_in += 1

        # Store packet by sequence number
        self._buffer[packet.sequence_number] = packet

        # Initialize sequence tracking on first packet
        if self._next_sequence < 0:
            self._next_sequence = packet.sequence_number

        # Prevent buffer overflow
        if len(self._buffer) > self.max_packets:
            self._force_output()

    def get(self) -> Optional[RTPPacket]:
        """Get next packet in sequence.

        Returns:
            Next RTPPacket in order, or None if not ready
        """
        if self._next_sequence < 0:
            return None

        seq = self._next_sequence & 0xFFFF

        # Exact sequence match
        if seq in self._buffer:
            packet = self._buffer.pop(seq)
            self._next_sequence = (seq + 1) & 0xFFFF
            self._packets_out += 1
            return packet

        # Look ahead for available packets (handle loss)
        for i in range(1, self.skip_threshold + 1):
            check_seq = (seq + i) & 0xFFFF
            if check_seq in self._buffer:
                # Skip lost packets
                logger.debug(f"Jitter buffer: skipping {i} lost packets")
                self._packets_dropped += i
                packet = self._buffer.pop(check_seq)
                self._next_sequence = (check_seq + 1) & 0xFFFF
                self._packets_out += 1
                return packet

        return None

    def _force_output(self) -> None:
        """Force output when buffer is full."""
        if not self._buffer:
            return

        # Find minimum sequence number
        min_seq = min(self._buffer.keys())
        self._next_sequence = min_seq
        logger.debug(f"Jitter buffer overflow, resetting to seq={min_seq}")

    def clear(self) -> None:
        """Clear the buffer."""
        self._buffer.clear()
        self._next_sequence = -1

    @property
    def size(self) -> int:
        """Current number of buffered packets."""
        return len(self._buffer)

    def get_stats(self) -> dict:
        """Get buffer statistics."""
        return {
            "packets_in": self._packets_in,
            "packets_out": self._packets_out,
            "packets_dropped": self._packets_dropped,
            "current_size": len(self._buffer),
            "next_sequence": self._next_sequence,
        }


async def test_rtp_handler() -> None:
    """Test RTP handling functionality."""
    print("Testing RTP Handler...")

    packets_received = []

    def on_packet(packet: RTPPacket):
        packets_received.append(packet)
        print(
            f"  Received: seq={packet.sequence_number}, "
            f"ts={packet.timestamp}, "
            f"payload={len(packet.payload)} bytes"
        )

    # Test receiver
    receiver = RTPReceiver(
        host="0.0.0.0",
        port=15004,  # Use high port for testing
        on_packet=on_packet,
    )

    if await receiver.start():
        print(f"RTP receiver started on port {receiver.port}")

        # Test sender (loopback)
        sender = RTPSender(
            host="127.0.0.1",
            port=15004,
            ssrc=0xDEADBEEF,
        )

        if await sender.start():
            print("RTP sender started")

            # Send test packets
            for i in range(5):
                test_payload = bytes([0x00, 0x01, 0x02, 0x03] * 10)
                sender.send(test_payload, marker=(i == 0))
                print(f"  Sent packet {i + 1}")
                await asyncio.sleep(0.02)  # 20ms between packets

            await asyncio.sleep(0.1)  # Wait for packets

            await sender.stop()

        await receiver.stop()

        print(f"\nReceived {len(packets_received)} packets")
        print(f"Receiver stats: {receiver.stats.to_dict()}")
        print(f"Sender stats: {sender.stats.to_dict()}")

    # Test jitter buffer
    print("\nTesting Jitter Buffer...")
    buffer = RTPJitterBuffer()

    # Simulate out-of-order delivery
    for seq in [3, 1, 2, 5, 4]:
        packet = RTPPacket(sequence_number=seq, payload=b"\x00" * 10)
        buffer.put(packet)
        print(f"  Put seq={seq}")

    print("  Getting packets in order:")
    while True:
        packet = buffer.get()
        if packet is None:
            break
        print(f"    Got seq={packet.sequence_number}")

    print(f"  Buffer stats: {buffer.get_stats()}")
    print("\nRTP handler test complete!")


if __name__ == "__main__":
    asyncio.run(test_rtp_handler())
