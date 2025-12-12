"""
VK-Agent Bridge Orchestrator

The main component that orchestrates all parts of the voice AI agent:
- Janus AudioBridge connection (WebSocket + RTP)
- Gemini Live API connection (WebSocket)
- Bidirectional audio streaming with format conversion

Architecture:
    ┌────────────────────────────────────────────────────────────────────────────┐
    │                           AgentBridge                                       │
    ├────────────────────────────────────────────────────────────────────────────┤
    │                                                                             │
    │  ┌─────────────────┐        ┌──────────────────┐        ┌───────────────┐  │
    │  │  JanusClient    │◄──────►│   AudioProcessor │◄──────►│ GeminiClient  │  │
    │  │  (WebSocket)    │        │  (Opus + PCM)    │        │ (WebSocket)   │  │
    │  └────────┬────────┘        └──────────────────┘        └───────┬───────┘  │
    │           │                                                      │          │
    │           ▼                                                      ▼          │
    │  ┌─────────────────┐                                    ┌───────────────┐  │
    │  │  RTPReceiver    │                                    │ Audio Output  │  │
    │  │  (UDP In)       │────► Jitter Buffer ────►           │ (24kHz PCM)   │  │
    │  └─────────────────┘      Decode Opus                   └───────────────┘  │
    │           │               Resample 48k→16k                      │          │
    │           │                    │                                │          │
    │           │                    ▼                                │          │
    │           │             ┌──────────────┐                        │          │
    │           │             │ send_audio() │                        │          │
    │           │             │ to Gemini    │                        │          │
    │           │             └──────────────┘                        │          │
    │           │                                                     │          │
    │           ▼                                               Resample 24k→48k │
    │  ┌─────────────────┐                                    Encode Opus        │
    │  │  RTPSender      │◄──── 20ms Opus frames ◄────────────────────┘          │
    │  │  (UDP Out)      │                                                       │
    │  └─────────────────┘                                                       │
    │                                                                             │
    │  Feedback Prevention:                                                       │
    │    - While Gemini is speaking, discard incoming audio                       │
    │    - On interruption, clear outgoing buffer                                 │
    │                                                                             │
    └────────────────────────────────────────────────────────────────────────────┘

Usage:
    >>> from vk_agent import AgentBridge
    >>> from vk_agent.config import get_settings
    >>>
    >>> settings = get_settings()
    >>> bridge = AgentBridge(settings)
    >>>
    >>> if await bridge.start():
    ...     await bridge.run_until_stopped()
    >>> await bridge.stop()
"""

import asyncio
import logging
import os
import wave
from collections import deque
from datetime import datetime, timezone
from typing import Optional, Deque

from .config import Settings, get_settings
from .models import AgentState, BridgeStats, RTPPacket, Participant
from .audio_processor import get_audio_processor, AudioProcessor
from .rtp_handler import RTPReceiver, RTPSender, RTPJitterBuffer
from .janus_client import JanusClient
from .gemini_client import GeminiLiveClient

logger = logging.getLogger(__name__)


class AgentBridge:
    """Main bridge orchestrator for Janus-Gemini voice AI.

    Coordinates all components for bidirectional voice AI:
    - JanusClient: WebSocket + RTP connection to AudioBridge
    - GeminiClient: WebSocket connection to Gemini Live API
    - AudioProcessor: Opus codec and sample rate conversion
    - RTPReceiver/Sender: UDP audio transport
    - JitterBuffer: Packet reordering

    Features:
    - Sub-500ms latency (Gemini Live API)
    - Native voice synthesis (Puck voice)
    - Feedback prevention (mute during AI speech)
    - Interruption handling
    - Graceful degradation and reconnection

    Example:
        >>> bridge = AgentBridge(settings)
        >>> async with bridge:
        ...     await bridge.run_until_stopped()
    """

    def __init__(self, settings: Optional[Settings] = None):
        """Initialize the bridge.

        Args:
            settings: Configuration settings (uses defaults if not provided)
        """
        self.settings = settings or get_settings()

        # Components
        self.janus_client: Optional[JanusClient] = None
        self.gemini_client: Optional[GeminiLiveClient] = None
        self.audio_processor: Optional[AudioProcessor] = None
        self.rtp_receiver: Optional[RTPReceiver] = None
        self.rtp_sender: Optional[RTPSender] = None
        self._jitter_buffer = RTPJitterBuffer()

        # Audio buffers
        self._incoming_audio: Deque[bytes] = deque(maxlen=100)
        self._outgoing_audio: Deque[bytes] = deque(maxlen=100)

        # State
        self.stats = BridgeStats()
        self._running = False
        self._gemini_speaking = False
        self._stop_event = asyncio.Event()

        # Background tasks
        self._forward_task: Optional[asyncio.Task] = None
        self._playback_task: Optional[asyncio.Task] = None

        # Debug audio files
        self._debug_wav_in: Optional[wave.Wave_write] = None
        self._debug_wav_out: Optional[wave.Wave_write] = None

        logger.info("AgentBridge initialized")

    @property
    def state(self) -> AgentState:
        """Get current agent state."""
        return self.stats.state

    @property
    def is_running(self) -> bool:
        """Check if bridge is running."""
        return self._running

    async def start(self) -> bool:
        """Start the bridge.

        Startup sequence:
        1. Validate configuration
        2. Initialize audio processor
        3. Connect to Janus AudioBridge
        4. Start RTP receiver/sender
        5. Connect to Gemini Live API
        6. Start audio forwarding tasks

        Returns:
            True if all components started successfully, False otherwise
        """
        logger.info("Starting AgentBridge...")
        self.stats.state = AgentState.INITIALIZING
        self.stats.started_at = datetime.now(timezone.utc)

        # Validate configuration
        errors = self.settings.validate()
        if errors:
            for error in errors:
                logger.error(f"Configuration error: {error}")
            self.stats.state = AgentState.ERROR
            return False

        # Initialize audio processor
        self.audio_processor = get_audio_processor(self.settings.audio)
        if not self.audio_processor.is_ready:
            logger.error("Audio processor not ready - opuslib may not be installed")
            self.stats.state = AgentState.ERROR
            return False

        self.stats.state = AgentState.CONNECTING

        # Initialize Janus client
        self.janus_client = JanusClient(self.settings.janus)
        self.janus_client.on_joined = self._on_janus_joined
        self.janus_client.on_participants_changed = self._on_participants_changed
        self.janus_client.on_error = self._on_janus_error

        # Connect to Janus
        logger.info("Connecting to Janus AudioBridge...")
        if not await self.janus_client.start():
            logger.error("Failed to connect to Janus")
            self.stats.state = AgentState.ERROR
            return False

        # Start RTP receiver
        self.rtp_receiver = RTPReceiver(
            host="0.0.0.0",
            port=self.settings.janus.rtp_port,
            on_packet=self._on_rtp_packet,
        )
        if not await self.rtp_receiver.start():
            logger.error("Failed to start RTP receiver")
            await self.janus_client.stop()
            self.stats.state = AgentState.ERROR
            return False

        # Start RTP sender (to Janus)
        rtp_target = self.janus_client.rtp_target
        if not rtp_target:
            logger.error("No RTP target from Janus")
            await self.rtp_receiver.stop()
            await self.janus_client.stop()
            self.stats.state = AgentState.ERROR
            return False

        # IMPORTANT: Ignore packets from Janus RTP port to avoid echo
        # Janus sends mixed audio (including our own voice) from rtp_target port
        # We only want to process RTP-forwarded participant audio
        self.rtp_receiver.set_ignore_source_port(rtp_target[1])

        # Use participant ID as SSRC so Janus knows who's sending
        participant_id = self.janus_client.session.participant_id or 0x12345678
        ssrc = participant_id & 0xFFFFFFFF  # Ensure 32-bit
        logger.info(f"RTP sender using SSRC={ssrc} (participant_id={participant_id})")

        self.rtp_sender = RTPSender(
            host=rtp_target[0],
            port=rtp_target[1],
            ssrc=ssrc,
            payload_type=111,  # Opus
        )
        # IMPORTANT: Share the receiver's transport so we send FROM port 5004
        # Janus plain RTP requires packets to come FROM the registered address
        if self.rtp_receiver.transport:
            self.rtp_sender.set_transport(self.rtp_receiver.transport)
            logger.info(f"RTP sender sharing receiver's socket (port {self.settings.janus.rtp_port})")
        else:
            # Fallback: start own transport (may not work with Janus plain RTP)
            logger.warning("RTP receiver transport not available, starting separate sender")
            if not await self.rtp_sender.start():
                logger.error("Failed to start RTP sender")
                await self.rtp_receiver.stop()
                await self.janus_client.stop()
                self.stats.state = AgentState.ERROR
                return False

        # Initialize Gemini client
        self.gemini_client = GeminiLiveClient(self.settings.gemini)
        self.gemini_client.on_audio = self._on_gemini_audio
        self.gemini_client.on_text = self._on_gemini_text
        self.gemini_client.on_setup_complete = self._on_gemini_ready
        self.gemini_client.on_turn_complete = self._on_gemini_turn_complete
        self.gemini_client.on_interrupted = self._on_gemini_interrupted
        self.gemini_client.on_error = self._on_gemini_error

        # Connect to Gemini
        logger.info("Connecting to Gemini Live API...")
        if not await self.gemini_client.connect():
            logger.error("Failed to connect to Gemini")
            await self.rtp_sender.stop()
            await self.rtp_receiver.stop()
            await self.janus_client.stop()
            self.stats.state = AgentState.ERROR
            return False

        # Setup debug audio files if enabled
        if self.settings.debug_audio:
            self._setup_debug_audio()

        # Start audio processing tasks
        self._running = True
        self._stop_event.clear()
        self._forward_task = asyncio.create_task(self._audio_forward_loop())
        self._playback_task = asyncio.create_task(self._audio_playback_loop())

        self.stats.state = AgentState.READY
        logger.info("AgentBridge started successfully!")
        return True

    async def stop(self) -> None:
        """Stop the bridge and clean up all resources."""
        logger.info("Stopping AgentBridge...")
        self.stats.state = AgentState.STOPPING
        self._running = False
        self._stop_event.set()

        # Cancel background tasks
        if self._forward_task:
            self._forward_task.cancel()
            try:
                await self._forward_task
            except asyncio.CancelledError:
                pass

        if self._playback_task:
            self._playback_task.cancel()
            try:
                await self._playback_task
            except asyncio.CancelledError:
                pass

        # Stop components in reverse order
        if self.gemini_client:
            await self.gemini_client.disconnect()

        if self.rtp_sender:
            await self.rtp_sender.stop()

        if self.rtp_receiver:
            await self.rtp_receiver.stop()

        if self.janus_client:
            await self.janus_client.stop()

        # Close debug audio files
        if self._debug_wav_in:
            self._debug_wav_in.close()
        if self._debug_wav_out:
            self._debug_wav_out.close()

        self.stats.state = AgentState.STOPPED
        logger.info(
            f"AgentBridge stopped. Stats: "
            f"RTP recv={self.stats.rtp_packets_received}, "
            f"RTP sent={self.stats.rtp_packets_sent}, "
            f"Gemini chunks={self.stats.audio_chunks_from_gemini}"
        )

    async def run_until_stopped(self) -> None:
        """Run the bridge until stop() is called or error occurs."""
        if not self._running:
            logger.warning("Bridge not running - call start() first")
            return

        logger.info("Bridge running. Waiting for stop signal...")
        self.stats.state = AgentState.ACTIVE

        try:
            await self._stop_event.wait()
        except asyncio.CancelledError:
            pass

        logger.info("Bridge received stop signal")

    def _setup_debug_audio(self) -> None:
        """Setup debug audio file recording."""
        debug_dir = self.settings.debug_audio_dir
        os.makedirs(debug_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Audio sent to Gemini (16kHz)
        wav_in_path = os.path.join(debug_dir, f"to_gemini_{timestamp}.wav")
        self._debug_wav_in = wave.open(wav_in_path, "wb")
        self._debug_wav_in.setnchannels(1)
        self._debug_wav_in.setsampwidth(2)
        self._debug_wav_in.setframerate(self.settings.gemini.input_sample_rate)

        # Audio from Gemini (24kHz)
        wav_out_path = os.path.join(debug_dir, f"from_gemini_{timestamp}.wav")
        self._debug_wav_out = wave.open(wav_out_path, "wb")
        self._debug_wav_out.setnchannels(1)
        self._debug_wav_out.setsampwidth(2)
        self._debug_wav_out.setframerate(self.settings.gemini.output_sample_rate)

        logger.info(f"Debug audio: {wav_in_path}, {wav_out_path}")

    # ============== Janus Callbacks ==============

    def _on_janus_joined(self, data: dict) -> None:
        """Called when joined Janus room."""
        logger.info(f"Joined Janus room: participant_id={data.get('participant_id')}")
        self.stats.participants_seen = len(data.get("participants", []))

    def _on_participants_changed(self, participants: list[Participant]) -> None:
        """Called when participants join/leave."""
        self.stats.participants_seen = len(participants)
        names = [p.display for p in participants]
        logger.info(f"Participants: {names}")

        # Set up RTP forwarding for new participants (to receive their audio)
        if participants and self.janus_client:
            asyncio.create_task(self._setup_rtp_forwarding(participants))

        # Send greeting for new participants
        if participants and self.gemini_client and self.gemini_client.is_ready:
            asyncio.create_task(self._send_greeting(participants[-1].display))

    async def _setup_rtp_forwarding(self, participants: list[Participant]) -> None:
        """Set up RTP forwarding for WebRTC participants to receive their audio."""
        for p in participants:
            # Skip if we already set up forwarding for this participant
            if hasattr(self, '_forwarded_participants') and p.id in self._forwarded_participants:
                continue

            if not hasattr(self, '_forwarded_participants'):
                self._forwarded_participants = set()

            logger.info(f"Setting up RTP forwarding for participant {p.id} ({p.display})")
            try:
                await self.janus_client.configure_rtp_forwarding(
                    forward_host=self.settings.janus.rtp_host,
                    forward_port=self.settings.janus.rtp_port,
                    publisher_id=p.id
                )
                self._forwarded_participants.add(p.id)
                logger.info(f"RTP forwarding set up for {p.display}")
            except Exception as e:
                logger.error(f"Failed to set up RTP forwarding for {p.display}: {e}")

    async def _send_greeting(self, participant_name: str) -> None:
        """Send a greeting when new participant joins."""
        await asyncio.sleep(1.5)  # Brief delay for RTP setup
        if self.gemini_client and self.gemini_client.is_ready:
            logger.info(f"Sending greeting for: {participant_name}")
            await self.gemini_client.send_text(
                f"A user named {participant_name} just joined the call. Greet them warmly and briefly introduce yourself as Jimmy."
            )

    def _on_janus_error(self, error: str) -> None:
        """Called on Janus error."""
        logger.error(f"Janus error: {error}")
        self.stats.janus_errors += 1

    # ============== RTP Callbacks ==============

    def _on_rtp_packet(self, packet: RTPPacket) -> None:
        """Called when RTP packet received from Janus."""
        self.stats.rtp_packets_received += 1
        self.stats.rtp_bytes_received += len(packet.payload) + 12

        # DEBUG: Log every 50th packet
        if self.stats.rtp_packets_received % 50 == 1:
            logger.info(
                f"[BRIDGE-DEBUG] RTP packet #{self.stats.rtp_packets_received}: "
                f"seq={packet.sequence_number}, "
                f"ts={packet.timestamp}, "
                f"payload={len(packet.payload)}B, "
                f"pt={packet.payload_type}"
            )

        # Add to jitter buffer
        self._jitter_buffer.put(packet)

        # Get ordered packet
        ordered = self._jitter_buffer.get()
        if ordered:
            self._incoming_audio.append(ordered.payload)

    # ============== Gemini Callbacks ==============

    def _on_gemini_ready(self) -> None:
        """Called when Gemini is ready."""
        logger.info("Gemini is ready for audio")

    def _on_gemini_audio(self, audio_data: bytes) -> None:
        """Called when audio received from Gemini."""
        self._gemini_speaking = True
        self.stats.audio_chunks_from_gemini += 1
        self.stats.audio_bytes_from_gemini += len(audio_data)

        # Debug: save audio
        if self._debug_wav_out:
            self._debug_wav_out.writeframes(audio_data)

        self._outgoing_audio.append(audio_data)

    def _on_gemini_text(self, text: str) -> None:
        """Called when text received from Gemini."""
        logger.info(f"Gemini: {text}")

    def _on_gemini_turn_complete(self) -> None:
        """Called when Gemini finishes speaking."""
        self._gemini_speaking = False
        self.stats.gemini_turn_completions += 1
        logger.debug("Gemini turn complete")

    def _on_gemini_interrupted(self) -> None:
        """Called when Gemini is interrupted by user."""
        self._gemini_speaking = False
        self.stats.gemini_interruptions += 1
        self._outgoing_audio.clear()  # Clear pending audio
        logger.debug("Gemini interrupted")

    def _on_gemini_error(self, error: str) -> None:
        """Called on Gemini error."""
        logger.error(f"Gemini error: {error}")
        self.stats.gemini_errors += 1

    # ============== Audio Processing Loops ==============

    async def _audio_forward_loop(self) -> None:
        """Forward audio from Janus (RTP) to Gemini (WebSocket).

        Pipeline: RTP Opus 48kHz → Decode → Resample 48k→16k → PCM16 → Gemini
        """
        logger.info("Audio forward loop started")

        audio_buffer = bytearray()
        send_threshold = self.settings.audio.gemini_input_threshold

        while self._running:
            try:
                if self._incoming_audio:
                    opus_data = self._incoming_audio.popleft()

                    # Convert Opus to Gemini format
                    pcm_data = self.audio_processor.janus_to_gemini(opus_data)

                    if pcm_data:
                        audio_buffer.extend(pcm_data)

                        # Debug: save audio
                        if self._debug_wav_in:
                            self._debug_wav_in.writeframes(pcm_data)

                        # Send when buffer is full (unless Gemini is speaking)
                        if len(audio_buffer) >= send_threshold:
                            if self._gemini_speaking:
                                # Discard to prevent feedback
                                audio_buffer.clear()
                            elif self.gemini_client and self.gemini_client.is_ready:
                                await self.gemini_client.send_audio(bytes(audio_buffer))
                                self.stats.audio_chunks_to_gemini += 1
                                self.stats.audio_bytes_to_gemini += len(audio_buffer)
                                audio_buffer.clear()
                    else:
                        self.stats.decode_errors += 1
                else:
                    await asyncio.sleep(0.01)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Audio forward error: {e}")
                await asyncio.sleep(0.1)

        logger.info("Audio forward loop stopped")

    async def _audio_playback_loop(self) -> None:
        """Forward audio from Gemini (WebSocket) to Janus (RTP).

        Pipeline: Gemini PCM16 24kHz → Resample 24k→48k → Encode Opus → RTP
        """
        logger.info("Audio playback loop started")

        while self._running:
            try:
                if self._outgoing_audio:
                    pcm_data = self._outgoing_audio.popleft()

                    # Convert Gemini format to Opus frames
                    opus_frames = self.audio_processor.gemini_to_janus(pcm_data)

                    if opus_frames and self.rtp_sender:
                        # Send each 20ms frame with timing
                        for i, opus_frame in enumerate(opus_frames):
                            marker = (i == 0)  # First frame after gap
                            sent = self.rtp_sender.send(opus_frame, marker=marker)
                            if sent:
                                self.stats.rtp_packets_sent += 1
                                self.stats.rtp_bytes_sent += len(opus_frame) + 12
                                # Log every 50th packet
                                if self.stats.rtp_packets_sent % 50 == 1:
                                    logger.info(
                                        f"[PLAYBACK-DEBUG] Sent RTP #{self.stats.rtp_packets_sent}: "
                                        f"{len(opus_frame)}B to Janus"
                                    )
                            else:
                                logger.warning("[PLAYBACK-DEBUG] RTP send failed!")

                            # Pace at 20ms intervals
                            await asyncio.sleep(0.018)
                    else:
                        self.stats.encode_errors += 1
                else:
                    await asyncio.sleep(0.01)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Audio playback error: {e}")
                await asyncio.sleep(0.1)

        logger.info("Audio playback loop stopped")

    async def send_text(self, text: str) -> bool:
        """Send text message to Gemini (for commands or testing).

        Args:
            text: Text to send

        Returns:
            True if sent successfully
        """
        if self.gemini_client and self.gemini_client.is_ready:
            return await self.gemini_client.send_text(text)
        return False

    def get_status(self) -> dict:
        """Get comprehensive bridge status.

        Returns:
            Dictionary with all component statuses and statistics
        """
        return {
            "state": self.stats.state.value,
            "running": self._running,
            "gemini_speaking": self._gemini_speaking,
            "janus": {
                "connected": self.janus_client.is_connected if self.janus_client else False,
                "ready": self.janus_client.is_ready if self.janus_client else False,
                "session": self.janus_client.session.to_dict() if self.janus_client else None,
            },
            "gemini": {
                "connected": self.gemini_client.is_connected if self.gemini_client else False,
                "ready": self.gemini_client.is_ready if self.gemini_client else False,
                "session": self.gemini_client.session.to_dict() if self.gemini_client else None,
            },
            "audio": {
                "processor_ready": self.audio_processor.is_ready if self.audio_processor else False,
                "processor_stats": self.audio_processor.get_stats() if self.audio_processor else None,
            },
            "rtp": {
                "receiver_running": self.rtp_receiver.is_running if self.rtp_receiver else False,
                "sender_running": self.rtp_sender.is_running if self.rtp_sender else False,
                "jitter_buffer": self._jitter_buffer.get_stats(),
            },
            "stats": self.stats.to_dict(),
        }

    async def __aenter__(self) -> "AgentBridge":
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.stop()


async def test_bridge() -> None:
    """Test the bridge with minimal configuration."""
    from .config import get_settings, configure_logging

    configure_logging("INFO")
    settings = get_settings()

    print("Testing AgentBridge...")
    print(f"  Janus URL: {settings.janus.websocket_url}")
    print(f"  Janus Room: {settings.janus.room_id}")
    print(f"  Gemini Model: {settings.gemini.model}")
    print(f"  Gemini Key: {'set' if settings.gemini.api_key else 'NOT SET'}")

    bridge = AgentBridge(settings)

    if await bridge.start():
        print("\nBridge started successfully!")
        print(f"Status: {bridge.get_status()}")

        # Run for 30 seconds
        print("\nRunning for 30 seconds...")
        try:
            await asyncio.wait_for(bridge.run_until_stopped(), timeout=30)
        except asyncio.TimeoutError:
            pass

        await bridge.stop()
        print(f"\nFinal status: {bridge.get_status()}")
    else:
        print("Failed to start bridge")


if __name__ == "__main__":
    asyncio.run(test_bridge())
