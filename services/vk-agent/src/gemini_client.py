"""
VK-Agent Gemini Live API Client

Connects to Google's Gemini Live API for real-time audio conversation.
Based on Google's live-api-web-console demo protocol.

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                      GeminiLiveClient                            │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  WebSocket Connection:                                           │
    │    URL: wss://generativelanguage.googleapis.com/ws/...          │
    │    Protocol: JSON messages with binary audio as base64          │
    │                                                                  │
    │  Setup Message:                                                  │
    │    - Model selection (gemini-2.0-flash-exp)                     │
    │    - Voice configuration (Puck, Aoede, etc.)                    │
    │    - System instruction                                          │
    │    - Response modality (AUDIO)                                   │
    │                                                                  │
    │  Audio Flow:                                                     │
    │    Input: PCM16 @ 16kHz -> base64 -> realtimeInput              │
    │    Output: serverContent.modelTurn.inlineData -> base64 -> PCM  │
    │                                                                  │
    │  Events:                                                         │
    │    - setupComplete: Session ready                                │
    │    - serverContent.turnComplete: AI finished speaking           │
    │    - serverContent.interrupted: User interrupted AI             │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Audio Format:
    Input: PCM16, 16kHz, mono (audio/pcm;rate=16000)
    Output: PCM16, 24kHz, mono (audio/pcm;rate=24000)
"""

import asyncio
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Callable, Any

import websockets
from websockets.client import WebSocketClientProtocol

from .config import GeminiConfig
from .models import GeminiSession

logger = logging.getLogger(__name__)

# Gemini Live API WebSocket endpoint
GEMINI_LIVE_WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
)


class GeminiLiveClient:
    """Gemini Live API client for real-time audio conversation.

    Manages bidirectional audio streaming with Gemini:
    - WebSocket connection management
    - Session setup and configuration
    - Audio input (PCM16 @ 16kHz)
    - Audio output (PCM16 @ 24kHz)
    - Turn management and interruption handling

    Example:
        >>> client = GeminiLiveClient(config)
        >>> client.on_audio = handle_audio_output
        >>> client.on_turn_complete = handle_turn_complete
        >>>
        >>> if await client.connect():
        ...     await client.send_audio(pcm_data)
        ...     # ... audio callback will fire ...
        ...     await client.disconnect()
    """

    def __init__(self, config: GeminiConfig):
        """Initialize Gemini client.

        Args:
            config: Gemini configuration with API key, model, voice, etc.
        """
        self.config = config

        # WebSocket connection
        self._ws: Optional[WebSocketClientProtocol] = None
        self._receive_task: Optional[asyncio.Task] = None

        # Session state
        self.session = GeminiSession(
            model=config.model,
            voice=config.voice,
            system_instruction=config.system_instruction,
        )

        # Callbacks
        self.on_audio: Optional[Callable[[bytes], None]] = None
        self.on_text: Optional[Callable[[str], None]] = None
        self.on_turn_complete: Optional[Callable[[], None]] = None
        self.on_interrupted: Optional[Callable[[], None]] = None
        self.on_setup_complete: Optional[Callable[[], None]] = None
        self.on_error: Optional[Callable[[str], None]] = None

        # Statistics
        self._audio_chunks_sent = 0
        self._audio_chunks_received = 0
        self._bytes_sent = 0
        self._bytes_received = 0

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return self._ws is not None and self.session.connected

    @property
    def is_ready(self) -> bool:
        """Check if client is ready to send/receive audio."""
        return self.session.is_ready

    def _get_websocket_url(self) -> str:
        """Get WebSocket URL with API key."""
        return f"{GEMINI_LIVE_WS_URL}?key={self.config.api_key}"

    async def connect(self) -> bool:
        """Connect to Gemini Live API.

        Returns:
            True if connected and setup complete, False otherwise
        """
        if not self.config.api_key:
            logger.error("GEMINI_API_KEY not configured")
            return False

        try:
            url = self._get_websocket_url()
            # Use extra_headers for newer websockets versions (>=11.0)
            self._ws = await websockets.connect(
                url,
                extra_headers={
                    "Content-Type": "application/json",
                },
                ping_interval=self.config.ping_interval,
                ping_timeout=self.config.ping_timeout,
                max_size=self.config.max_message_size,
            )

            self.session.connected = True
            self.session.connected_at = datetime.now(timezone.utc)
            logger.info("Connected to Gemini Live API")

            # Send setup message
            await self._send_setup()

            # Start receive loop
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Wait for setup complete
            for _ in range(50):  # 5 second timeout
                if self.session.setup_complete:
                    logger.info("Gemini session ready")
                    return True
                await asyncio.sleep(0.1)

            logger.error("Timeout waiting for Gemini setup")
            await self.disconnect()
            return False

        except Exception as e:
            logger.error(f"Failed to connect to Gemini: {e}")
            if self.on_error:
                self.on_error(str(e))
            return False

    async def _send_setup(self) -> None:
        """Send initial setup message to configure the session."""
        setup_config = {
            "model": self.config.model,
            "generation_config": {
                "response_modalities": ["AUDIO"],
                # Enable video/image input with medium resolution
                "media_resolution": "MEDIA_RESOLUTION_MEDIUM",
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": self.config.voice,
                        }
                    }
                },
            },
            "tools": [],
        }

        if self.config.system_instruction:
            setup_config["system_instruction"] = {
                "parts": [{"text": self.config.system_instruction}]
            }

        msg = {"setup": setup_config}
        await self._ws.send(json.dumps(msg))
        logger.info(f"Sent setup: model={self.config.model}, voice={self.config.voice}")

    async def _receive_loop(self) -> None:
        """Process incoming messages from Gemini."""
        while self._ws and self.session.connected:
            try:
                message = await self._ws.recv()
                data = json.loads(message)
                await self._handle_message(data)
            except websockets.exceptions.ConnectionClosed:
                logger.info("Gemini connection closed")
                self.session.connected = False
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Gemini receive error: {e}")
                continue

    async def _handle_message(self, data: dict) -> None:
        """Handle incoming Gemini message.

        Message types:
        - setupComplete: Session is ready
        - serverContent: Audio/text response from model
        - toolCall: Function calling request
        - toolCallCancellation: Function call cancelled
        """
        # Setup complete
        if "setupComplete" in data:
            self.session.setup_complete = True
            logger.info("Gemini setup complete")
            if self.on_setup_complete:
                self.on_setup_complete()
            return

        # Server content (responses)
        if "serverContent" in data:
            content = data["serverContent"]

            # Check for interruption
            if content.get("interrupted"):
                self.session.is_speaking = False
                logger.debug("Gemini interrupted by user")
                if self.on_interrupted:
                    self.on_interrupted()
                return

            # Check for turn complete
            if content.get("turnComplete"):
                self.session.is_speaking = False
                logger.debug("Gemini turn complete")
                if self.on_turn_complete:
                    self.on_turn_complete()

            # Process model output
            model_turn = content.get("modelTurn", {})
            parts = model_turn.get("parts", [])

            for part in parts:
                # Audio response
                if "inlineData" in part:
                    inline_data = part["inlineData"]
                    mime_type = inline_data.get("mimeType", "")

                    if mime_type.startswith("audio/pcm"):
                        self.session.is_speaking = True
                        audio_b64 = inline_data.get("data", "")
                        audio_bytes = base64.b64decode(audio_b64)

                        self._audio_chunks_received += 1
                        self._bytes_received += len(audio_bytes)
                        self.session.last_audio_received = datetime.now(timezone.utc)

                        if self.on_audio:
                            self.on_audio(audio_bytes)

                # Text response
                if "text" in part:
                    text = part["text"]
                    logger.debug(f"Gemini text: {text}")
                    if self.on_text:
                        self.on_text(text)

        # Tool calls (function calling)
        if "toolCall" in data:
            logger.info(f"Tool call received: {data['toolCall']}")
            # TODO: Implement tool handling if needed

        # Tool call cancellation
        if "toolCallCancellation" in data:
            logger.info("Tool call cancelled")

    async def send_audio(self, audio_data: bytes) -> bool:
        """Send audio data to Gemini.

        Args:
            audio_data: PCM16 audio bytes at 16kHz sample rate

        Returns:
            True if sent successfully, False otherwise
        """
        if not self._ws or not self.session.connected:
            logger.debug("Cannot send audio: not connected")
            return False

        if not self.session.setup_complete:
            logger.debug("Cannot send audio: setup not complete")
            return False

        try:
            # Encode audio as base64
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            msg = {
                "realtimeInput": {
                    "mediaChunks": [
                        {
                            "mimeType": "audio/pcm;rate=16000",
                            "data": audio_b64,
                        }
                    ]
                }
            }

            await self._ws.send(json.dumps(msg))

            self._audio_chunks_sent += 1
            self._bytes_sent += len(audio_data)
            self.session.last_audio_sent = datetime.now(timezone.utc)

            return True

        except Exception as e:
            logger.error(f"Error sending audio to Gemini: {e}")
            return False

    async def send_text(self, text: str, end_of_turn: bool = True) -> bool:
        """Send text message to Gemini.

        Args:
            text: Text content to send
            end_of_turn: Whether this completes the user's turn

        Returns:
            True if sent successfully, False otherwise
        """
        if not self._ws or not self.session.connected:
            return False

        try:
            msg = {
                "clientContent": {
                    "turns": [
                        {
                            "role": "user",
                            "parts": [{"text": text}],
                        }
                    ],
                    "turnComplete": end_of_turn,
                }
            }

            await self._ws.send(json.dumps(msg))
            logger.debug(f"Sent text to Gemini: {text[:100]}...")
            return True

        except Exception as e:
            logger.error(f"Error sending text to Gemini: {e}")
            return False

    async def send_image(self, image_data: bytes, mime_type: str = "image/jpeg") -> bool:
        """Send image data to Gemini for visual understanding.

        Images are sent via realtimeInput.mediaChunks (same format as audio).
        Based on LiveKit's google.realtime plugin implementation.

        Args:
            image_data: Image bytes (JPEG recommended, 1024x1024 max)
            mime_type: MIME type of the image (default: image/jpeg)

        Returns:
            True if sent successfully, False otherwise
        """
        if not self._ws or not self.session.connected:
            logger.debug("Cannot send image: not connected")
            return False

        if not self.session.setup_complete:
            logger.debug("Cannot send image: setup not complete")
            return False

        try:
            # Encode image as base64
            image_b64 = base64.b64encode(image_data).decode("utf-8")

            # Use Google SDK format: realtime_input (snake_case!) with media object
            # Found in google/genai/live.py line 338
            msg = {
                "realtime_input": {
                    "media": {
                        "mime_type": mime_type,
                        "data": image_b64,
                    }
                }
            }

            await self._ws.send(json.dumps(msg))
            logger.info(f"Sent image to Gemini: {len(image_data)} bytes")
            return True

        except Exception as e:
            logger.error(f"Error sending image to Gemini: {e}")
            return False

    async def send_tool_response(self, function_responses: list) -> bool:
        """Send tool/function response to Gemini.

        Args:
            function_responses: List of function response objects

        Returns:
            True if sent successfully, False otherwise
        """
        if not self._ws or not self.session.connected:
            return False

        try:
            msg = {
                "toolResponse": {
                    "functionResponses": function_responses
                }
            }

            await self._ws.send(json.dumps(msg))
            logger.debug("Sent tool response to Gemini")
            return True

        except Exception as e:
            logger.error(f"Error sending tool response: {e}")
            return False

    async def disconnect(self) -> None:
        """Disconnect from Gemini."""
        self.session.connected = False
        self.session.setup_complete = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        logger.info(
            f"Disconnected from Gemini. "
            f"Sent: {self._audio_chunks_sent} chunks ({self._bytes_sent} bytes), "
            f"Received: {self._audio_chunks_received} chunks ({self._bytes_received} bytes)"
        )

    def get_stats(self) -> dict:
        """Get client statistics.

        Returns:
            Dictionary with connection and audio statistics
        """
        return {
            "connected": self.session.connected,
            "setup_complete": self.session.setup_complete,
            "is_speaking": self.session.is_speaking,
            "audio_chunks_sent": self._audio_chunks_sent,
            "audio_chunks_received": self._audio_chunks_received,
            "bytes_sent": self._bytes_sent,
            "bytes_received": self._bytes_received,
            "connected_at": (
                self.session.connected_at.isoformat()
                if self.session.connected_at else None
            ),
        }

    async def __aenter__(self) -> "GeminiLiveClient":
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.disconnect()


async def test_gemini_client() -> None:
    """Test Gemini client with a simple text prompt."""
    from .config import get_settings

    settings = get_settings()
    config = settings.gemini

    if not config.api_key:
        print("ERROR: GEMINI_API_KEY environment variable required")
        return

    print("Testing Gemini Live API client...")
    print(f"  Model: {config.model}")
    print(f"  Voice: {config.voice}")

    audio_received = []

    def on_audio(data: bytes):
        audio_received.append(data)
        print(f"  Received audio: {len(data)} bytes")

    def on_text(text: str):
        print(f"  Received text: {text}")

    def on_setup_complete():
        print("  Setup complete!")

    def on_turn_complete():
        print("  Turn complete!")

    client = GeminiLiveClient(config)
    client.on_audio = on_audio
    client.on_text = on_text
    client.on_setup_complete = on_setup_complete
    client.on_turn_complete = on_turn_complete

    if await client.connect():
        print("\nConnected to Gemini!")
        print(f"  Stats: {client.get_stats()}")

        # Wait for setup
        await asyncio.sleep(1)

        if client.is_ready:
            print("\nSending test text prompt...")
            await client.send_text(
                "Hello! Please respond briefly with just 'Test successful'."
            )

            # Wait for response
            print("Waiting for response (5 seconds)...")
            await asyncio.sleep(5)

            print(f"\nTotal audio chunks received: {len(audio_received)}")
            if audio_received:
                total_bytes = sum(len(chunk) for chunk in audio_received)
                print(f"Total audio bytes: {total_bytes}")

        await client.disconnect()
        print(f"\nFinal stats: {client.get_stats()}")
    else:
        print("Failed to connect to Gemini")


if __name__ == "__main__":
    asyncio.run(test_gemini_client())
