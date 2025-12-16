"""
VK-Agent Video Processor

Handles video frame extraction from RTP streams and encoding for Gemini.
Supports VP8 and H.264 codecs commonly used in WebRTC.

Dependencies:
    - av (PyAV) for video decoding
    - Pillow for image processing
"""

import asyncio
import logging
import struct
from io import BytesIO
from typing import Optional, Callable, Dict, List
from collections import deque
import time

logger = logging.getLogger(__name__)

# Try to import video processing libraries
try:
    import av
    AV_AVAILABLE = True
except ImportError:
    AV_AVAILABLE = False
    logger.warning("PyAV not available - video processing will be limited")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("Pillow not available - image processing will be limited")


class VideoProcessor:
    """Process video from RTP streams.

    Receives RTP video packets, reassembles frames, decodes them,
    and provides frames for sending to Gemini Live API.
    """

    def __init__(
        self,
        target_fps: float = 1.0,
        target_width: int = 1280,
        target_height: int = 720,
        jpeg_quality: int = 85,
    ):
        """Initialize video processor.

        Args:
            target_fps: Target frames per second to send to Gemini
            target_width: Target frame width (will scale if needed)
            target_height: Target frame height (will scale if needed)
            jpeg_quality: JPEG compression quality (0-100)
        """
        self.target_fps = target_fps
        self.target_width = target_width
        self.target_height = target_height
        self.jpeg_quality = jpeg_quality

        # Frame interval in seconds
        self.frame_interval = 1.0 / target_fps

        # RTP packet buffer for reassembly
        self._rtp_buffer: Dict[int, List[bytes]] = {}  # timestamp -> packets
        self._rtp_sequences: Dict[int, List[int]] = {}  # timestamp -> sequence numbers

        # Video decoder
        self._decoder: Optional[av.CodecContext] = None
        self._codec_name: Optional[str] = None

        # Frame output
        self._last_frame_time = 0
        self._frame_callback: Optional[Callable[[bytes, str], None]] = None

        # Keyframe request callback (for PLI)
        self._request_keyframe_callback: Optional[Callable[[], None]] = None

        # Keyframe tracking
        self._has_keyframe = False
        self._last_keyframe_request = 0
        self._keyframe_request_interval = 2.0  # Request keyframe every 2s if needed
        self._consecutive_decode_errors = 0
        self._max_decode_errors = 5  # Reset decoder after this many errors

        # Stats
        self.frames_decoded = 0
        self.frames_sent = 0
        self.packets_received = 0
        self.decode_errors = 0
        self.keyframes_received = 0

        # Running state
        self._running = False

    def set_codec(self, codec: str):
        """Set the video codec for decoding.

        Args:
            codec: Codec name ('vp8', 'vp9', 'h264')
        """
        if not AV_AVAILABLE:
            logger.error("PyAV not available, cannot set codec")
            return

        codec_map = {
            "vp8": "vp8",
            "vp9": "vp9",
            "h264": "h264",
            "h.264": "h264",
        }

        av_codec = codec_map.get(codec.lower())
        if not av_codec:
            logger.error(f"Unknown codec: {codec}")
            return

        try:
            codec_obj = av.Codec(av_codec, "r")
            self._decoder = codec_obj.create()
            self._codec_name = av_codec
            logger.info(f"Video decoder initialized: {av_codec}")
        except Exception as e:
            logger.error(f"Failed to create decoder for {codec}: {e}")
            self._decoder = None

    def set_frame_callback(self, callback: Callable[[bytes, str], None]):
        """Set callback for decoded frames.

        Args:
            callback: Function called with (jpeg_bytes, mime_type)
        """
        self._frame_callback = callback

    def set_keyframe_request_callback(self, callback: Callable[[], None]):
        """Set callback for requesting keyframes (PLI).

        Args:
            callback: Function called when a keyframe is needed
        """
        self._request_keyframe_callback = callback

    def _request_keyframe_if_needed(self):
        """Request a keyframe if we haven't received one recently."""
        current_time = time.time()
        if current_time - self._last_keyframe_request >= self._keyframe_request_interval:
            self._last_keyframe_request = current_time
            if self._request_keyframe_callback:
                logger.info("Requesting keyframe (PLI) from publisher")
                self._request_keyframe_callback()

    def _reset_decoder(self):
        """Reset the decoder state to recover from errors."""
        if self._codec_name:
            logger.info(f"Resetting {self._codec_name} decoder due to errors")
            self.set_codec(self._codec_name)
            self._has_keyframe = False
            self._consecutive_decode_errors = 0
            # Request a fresh keyframe after reset
            self._request_keyframe_if_needed()

    def process_rtp_packet(self, packet: bytes) -> Optional[bytes]:
        """Process an incoming RTP video packet.

        Args:
            packet: Raw RTP packet data

        Returns:
            JPEG frame bytes if a complete frame was decoded, None otherwise
        """
        if len(packet) < 12:
            return None

        self.packets_received += 1

        # Auto-initialize VP8 decoder on first packet if not already set
        if self._decoder is None and self.packets_received == 1:
            logger.info("Auto-initializing VP8 decoder for video stream")
            self.set_codec("vp8")

        # Debug: log first few packets
        if self.packets_received <= 3:
            logger.info(f"Raw RTP packet #{self.packets_received}: len={len(packet)}, first 30 hex: {packet[:30].hex()}")

        # Parse RTP header
        # Byte 0: V(2) P(1) X(1) CC(4)
        # Byte 1: M(1) PT(7)
        # Bytes 2-3: Sequence number
        # Bytes 4-7: Timestamp
        # Bytes 8-11: SSRC

        first_byte = packet[0]
        second_byte = packet[1]

        version = (first_byte >> 6) & 0x03
        padding = (first_byte >> 5) & 0x01
        extension = (first_byte >> 4) & 0x01
        csrc_count = first_byte & 0x0F
        marker = (second_byte >> 7) & 0x01
        payload_type = second_byte & 0x7F

        sequence_number = struct.unpack("!H", packet[2:4])[0]
        timestamp = struct.unpack("!I", packet[4:8])[0]
        ssrc = struct.unpack("!I", packet[8:12])[0]

        # Calculate header length
        header_len = 12 + (csrc_count * 4)
        if extension:
            # Skip extension header
            ext_len = struct.unpack("!H", packet[header_len + 2:header_len + 4])[0]
            header_len += 4 + (ext_len * 4)

        payload = packet[header_len:]

        # Strip VP8 RTP payload descriptor (RFC 7741)
        # The VP8 payload descriptor is variable length
        if len(payload) > 0:
            vp8_desc = payload[0]
            desc_len = 1

            # X bit: extension present
            if vp8_desc & 0x80:
                if len(payload) > desc_len:
                    ext_byte = payload[desc_len]
                    desc_len += 1
                    # I bit: picture ID present
                    if ext_byte & 0x80:
                        if len(payload) > desc_len:
                            # Check if 16-bit picture ID (M bit set)
                            if payload[desc_len] & 0x80:
                                desc_len += 2
                            else:
                                desc_len += 1
                    # L bit: TL0PICIDX present
                    if ext_byte & 0x40:
                        desc_len += 1
                    # T/K bits: TID/KEYIDX present
                    if ext_byte & 0x20 or ext_byte & 0x10:
                        desc_len += 1

            payload = payload[desc_len:]

        # Debug: log VP8 payload after descriptor stripping
        if self.packets_received <= 3:
            logger.info(f"VP8 payload #{self.packets_received}: desc_len={desc_len}, payload_len={len(payload)}, first 20 hex: {payload[:20].hex() if len(payload) >= 20 else payload.hex()}")

        # Buffer packet by timestamp (with de-duplication by sequence number)
        if timestamp not in self._rtp_buffer:
            self._rtp_buffer[timestamp] = {}  # seq -> payload dict for dedup
            self._rtp_sequences[timestamp] = set()

        # Only add if not duplicate
        if sequence_number not in self._rtp_sequences[timestamp]:
            self._rtp_buffer[timestamp][sequence_number] = payload
            self._rtp_sequences[timestamp].add(sequence_number)

        # If marker bit is set, frame is complete
        if marker:
            return self._decode_frame(timestamp)

        # Clean up old buffers (keep last 10 timestamps)
        while len(self._rtp_buffer) > 10:
            oldest = min(self._rtp_buffer.keys())
            del self._rtp_buffer[oldest]
            if oldest in self._rtp_sequences:
                del self._rtp_sequences[oldest]

        return None

    def _decode_frame(self, timestamp: int) -> Optional[bytes]:
        """Decode a complete video frame.

        Args:
            timestamp: RTP timestamp of the frame

        Returns:
            JPEG frame bytes if successful, None otherwise
        """
        if timestamp not in self._rtp_buffer:
            return None

        # Get packets for this frame
        packets_dict = self._rtp_buffer.pop(timestamp)  # seq -> payload
        sequences_set = self._rtp_sequences.pop(timestamp)

        if not packets_dict:
            return None

        # Debug: log assembly info
        sorted_seqs = sorted(sequences_set)
        if self.frames_decoded == 0:
            logger.info(f"Frame assembly: {len(packets_dict)} unique packets, seqs={sorted_seqs[:5]}...")
            for seq in sorted_seqs[:3]:
                pkt = packets_dict[seq]
                logger.info(f"  Packet seq={seq}, len={len(pkt)}, first 10: {pkt[:10].hex() if len(pkt) >= 10 else pkt.hex()}")

        # Sort by sequence number and concatenate
        frame_data = b"".join(packets_dict[seq] for seq in sorted_seqs)

        # Decode the frame
        if not self._decoder or not AV_AVAILABLE:
            # Without decoder, we can't process the frame
            logger.debug("No decoder available, skipping frame")
            return None

        # Check if this is a VP8 keyframe (I-frame)
        # VP8 keyframe detection: first byte & 0x01 == 0 means keyframe
        # https://datatracker.ietf.org/doc/html/rfc6386#section-9.1
        is_keyframe = False
        if len(frame_data) > 0:
            # VP8 frame header: bit 0 of first byte is frame_type (0=keyframe, 1=interframe)
            is_keyframe = (frame_data[0] & 0x01) == 0

        if is_keyframe:
            self._has_keyframe = True
            self.keyframes_received += 1
            self._consecutive_decode_errors = 0  # Reset error count on keyframe
            logger.info(f"Received keyframe #{self.keyframes_received}, {len(frame_data)} bytes")

        # If we haven't received a keyframe yet, skip P-frames
        if not self._has_keyframe and not is_keyframe:
            logger.debug("Waiting for first keyframe, skipping P-frame")
            return None

        # Check timing for rate limiting (1 FPS to Gemini)
        current_time = time.time()
        should_send = current_time - self._last_frame_time >= self.frame_interval

        try:
            # Log frame data for debugging
            frame_type = "keyframe" if is_keyframe else "P-frame"
            if self.frames_decoded == 0:
                logger.info(f"First {frame_type} decode: {len(frame_data)} bytes, first 20: {frame_data[:20].hex() if len(frame_data) >= 20 else frame_data.hex()}")

            # ALWAYS decode to maintain decoder state (VP8 P-frames need previous frames)
            av_packet = av.Packet(frame_data)
            frames = self._decoder.decode(av_packet)

            for frame in frames:
                self.frames_decoded += 1
                self._consecutive_decode_errors = 0  # Reset on success

                # Only send to Gemini at target FPS rate
                if should_send:
                    logger.info(f"Decoded frame {self.frames_decoded} ({frame_type}): {frame.width}x{frame.height} - SENDING")

                    # Convert to JPEG
                    jpeg_bytes = self._frame_to_jpeg(frame)
                    if jpeg_bytes:
                        self._last_frame_time = current_time
                        self.frames_sent += 1

                        # Call callback if set
                        if self._frame_callback:
                            self._frame_callback(jpeg_bytes, "image/jpeg")

                        return jpeg_bytes
                else:
                    # Decoded but not sending (rate limited)
                    if self.frames_decoded % 30 == 0:  # Log every 30 frames
                        logger.debug(f"Decoded frame {self.frames_decoded} ({frame_type}) - rate limited, not sending")

        except Exception as e:
            self.decode_errors += 1
            self._consecutive_decode_errors += 1

            if is_keyframe:
                logger.error(f"Keyframe decode error: {e}")
                # Reset decoder on keyframe error - decoder state is corrupt
                self._reset_decoder()
            else:
                # P-frame errors are normal if we lost packets
                if self._consecutive_decode_errors <= 3:
                    logger.debug(f"P-frame decode error (may need keyframe): {e}")

            # If too many consecutive errors, reset decoder
            if self._consecutive_decode_errors >= self._max_decode_errors:
                logger.warning(f"Too many decode errors ({self._consecutive_decode_errors}), resetting decoder")
                self._reset_decoder()

        return None

    def _frame_to_jpeg(self, frame) -> Optional[bytes]:
        """Convert an AV frame to JPEG bytes.

        Args:
            frame: PyAV video frame

        Returns:
            JPEG bytes or None on error
        """
        if not PIL_AVAILABLE:
            logger.error("Pillow not available for JPEG conversion")
            return None

        try:
            # Convert to PIL Image
            img = frame.to_image()

            # Resize if needed
            if img.width > self.target_width or img.height > self.target_height:
                img.thumbnail((self.target_width, self.target_height), Image.Resampling.LANCZOS)

            # Convert to JPEG
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=self.jpeg_quality)
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"JPEG conversion error: {e}")
            return None

    def get_stats(self) -> dict:
        """Get processor statistics."""
        return {
            "packets_received": self.packets_received,
            "frames_decoded": self.frames_decoded,
            "frames_sent": self.frames_sent,
            "keyframes_received": self.keyframes_received,
            "decode_errors": self.decode_errors,
            "has_keyframe": self._has_keyframe,
            "codec": self._codec_name,
            "target_fps": self.target_fps,
            "av_available": AV_AVAILABLE,
            "pil_available": PIL_AVAILABLE,
        }


class VideoRTPReceiver:
    """Receives video RTP packets on a UDP port."""

    def __init__(
        self,
        port: int,
        host: str = "0.0.0.0",
        processor: Optional[VideoProcessor] = None,
    ):
        """Initialize RTP receiver.

        Args:
            port: UDP port to listen on
            host: Host address to bind to
            processor: VideoProcessor instance for frame decoding
        """
        self.port = port
        self.host = host
        self.processor = processor or VideoProcessor()

        self._transport: Optional[asyncio.DatagramTransport] = None
        self._protocol: Optional["VideoRTPProtocol"] = None
        self._running = False

    async def start(self):
        """Start receiving video RTP packets."""
        loop = asyncio.get_event_loop()

        self._transport, self._protocol = await loop.create_datagram_endpoint(
            lambda: VideoRTPProtocol(self.processor),
            local_addr=(self.host, self.port),
        )

        self._running = True
        logger.info(f"Video RTP receiver started on {self.host}:{self.port}")

    async def stop(self):
        """Stop receiving packets."""
        self._running = False
        if self._transport:
            self._transport.close()
            self._transport = None
        logger.info("Video RTP receiver stopped")


class VideoRTPProtocol(asyncio.DatagramProtocol):
    """UDP protocol for receiving video RTP packets."""

    def __init__(self, processor: VideoProcessor):
        self.processor = processor
        self.packets_received = 0

    def datagram_received(self, data: bytes, addr):
        """Handle incoming UDP packet."""
        self.packets_received += 1
        # Process through video processor
        self.processor.process_rtp_packet(data)

    def error_received(self, exc):
        """Handle UDP error."""
        logger.error(f"Video RTP error: {exc}")

    def connection_lost(self, exc):
        """Handle connection loss."""
        if exc:
            logger.error(f"Video RTP connection lost: {exc}")
