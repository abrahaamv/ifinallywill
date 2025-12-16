"""
VK-Agent Voice Agent
Bridges Janus AudioBridge with Gemini Live API
"""

import asyncio
import base64
import json
import os
from typing import Optional

import structlog
import websockets
from google import genai
from google.genai import types

logger = structlog.get_logger()


class VoiceAgent:
    """Voice AI agent connecting Janus AudioBridge to Gemini Live API."""

    def __init__(
        self,
        janus_url: str,
        room_id: int,
        display_name: str,
        gemini_api_key: str,
    ):
        self.janus_url = janus_url
        self.room_id = room_id
        self.display_name = display_name
        self.gemini_api_key = gemini_api_key

        # State
        self.state = "initializing"
        self.running = False
        self.gemini_speaking = False

        # Janus state
        self.janus_ws: Optional[websockets.WebSocketClientProtocol] = None
        self.janus_session_id: Optional[int] = None
        self.janus_handle_id: Optional[int] = None
        self.janus_participant_id: Optional[int] = None
        self.janus_connected = False
        self.janus_ready = False

        # Gemini state
        self.gemini_client: Optional[genai.Client] = None
        self.gemini_session = None
        self.gemini_connected = False
        self.gemini_ready = False

        # Tasks
        self._janus_task: Optional[asyncio.Task] = None
        self._gemini_task: Optional[asyncio.Task] = None

        # Transaction tracking
        self._transaction_counter = 0

    def _gen_transaction(self) -> str:
        """Generate unique transaction ID."""
        self._transaction_counter += 1
        return f"tx{self._transaction_counter}"

    async def run(self):
        """Run the voice agent."""
        self.running = True
        self.state = "connecting"

        try:
            # Initialize Gemini client
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            self.gemini_connected = True
            logger.info("Gemini client initialized")

            # Connect to Janus
            await self._connect_janus()

            # Start Gemini session
            await self._start_gemini_session()

            # Run main loop
            while self.running:
                await asyncio.sleep(1)

        except Exception as e:
            logger.error("Agent error", error=str(e))
            self.state = "error"
        finally:
            await self.stop()

    async def stop(self):
        """Stop the voice agent."""
        self.running = False
        self.state = "stopping"

        # Close Gemini session
        if self.gemini_session:
            try:
                await self.gemini_session.close()
            except Exception as e:
                logger.error("Error closing Gemini session", error=str(e))
            self.gemini_session = None

        # Close Janus connection
        if self.janus_ws:
            try:
                await self.janus_ws.close()
            except Exception as e:
                logger.error("Error closing Janus connection", error=str(e))
            self.janus_ws = None

        self.janus_connected = False
        self.janus_ready = False
        self.gemini_connected = False
        self.gemini_ready = False
        self.state = "stopped"
        logger.info("Voice agent stopped")

    async def _connect_janus(self):
        """Connect to Janus AudioBridge."""
        logger.info(f"Connecting to Janus at {self.janus_url}")

        try:
            self.janus_ws = await websockets.connect(
                self.janus_url,
                subprotocols=["janus-protocol"],
            )
            self.janus_connected = True
            logger.info("Connected to Janus WebSocket")

            # Create session
            await self._janus_send({"janus": "create"})
            response = await self._janus_receive()
            
            if response.get("janus") == "success":
                self.janus_session_id = response.get("data", {}).get("id")
                logger.info(f"Janus session created: {self.janus_session_id}")

            # Attach to AudioBridge
            await self._janus_send({
                "janus": "attach",
                "session_id": self.janus_session_id,
                "plugin": "janus.plugin.audiobridge",
            })
            response = await self._janus_receive()

            if response.get("janus") == "success":
                self.janus_handle_id = response.get("data", {}).get("id")
                logger.info(f"Attached to AudioBridge: {self.janus_handle_id}")

            # Join room
            await self._janus_send({
                "janus": "message",
                "session_id": self.janus_session_id,
                "handle_id": self.janus_handle_id,
                "body": {
                    "request": "join",
                    "room": self.room_id,
                    "display": self.display_name,
                },
            })
            response = await self._janus_receive()

            plugindata = response.get("plugindata", {}).get("data", {})
            if plugindata.get("audiobridge") == "joined":
                self.janus_participant_id = plugindata.get("id")
                self.janus_ready = True
                self.state = "ready"
                logger.info(f"Joined room {self.room_id} as participant {self.janus_participant_id}")

            # Start keepalive
            asyncio.create_task(self._janus_keepalive())

        except Exception as e:
            logger.error("Failed to connect to Janus", error=str(e))
            self.janus_connected = False
            raise

    async def _janus_send(self, message: dict):
        """Send message to Janus."""
        message["transaction"] = self._gen_transaction()
        await self.janus_ws.send(json.dumps(message))

    async def _janus_receive(self) -> dict:
        """Receive message from Janus."""
        response = await self.janus_ws.recv()
        return json.loads(response)

    async def _janus_keepalive(self):
        """Send keepalive messages to Janus."""
        while self.running and self.janus_connected:
            try:
                await asyncio.sleep(25)
                if self.janus_ws and self.janus_session_id:
                    await self._janus_send({
                        "janus": "keepalive",
                        "session_id": self.janus_session_id,
                    })
            except Exception as e:
                logger.error("Keepalive error", error=str(e))
                break

    async def _start_gemini_session(self):
        """Start Gemini Live API session."""
        logger.info("Starting Gemini Live session")

        try:
            model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-live-001")
            
            # Configure the model for voice output
            config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Puck"
                        )
                    )
                ),
            )

            # Start session
            self.gemini_session = self.gemini_client.aio.live.connect(
                model=model,
                config=config,
            )
            await self.gemini_session.__aenter__()
            
            self.gemini_ready = True
            logger.info("Gemini Live session started")

            # Start receiving audio from Gemini
            asyncio.create_task(self._gemini_receive_loop())

        except Exception as e:
            logger.error("Failed to start Gemini session", error=str(e))
            self.gemini_ready = False
            raise

    async def _gemini_receive_loop(self):
        """Receive and process audio from Gemini."""
        try:
            async for response in self.gemini_session.receive():
                # Handle audio data
                if response.data:
                    self.gemini_speaking = True
                    # TODO: Forward audio to Janus
                    logger.debug("Received audio from Gemini")
                
                # Handle end of turn
                if response.server_content and response.server_content.turn_complete:
                    self.gemini_speaking = False
                    logger.debug("Gemini turn complete")

        except Exception as e:
            logger.error("Gemini receive error", error=str(e))

    async def send_text(self, text: str):
        """Send text to Gemini for voice response."""
        if not self.gemini_session:
            raise RuntimeError("Gemini session not ready")

        logger.info(f"Sending text to Gemini: {text[:50]}...")
        await self.gemini_session.send(text, end_of_turn=True)

    async def send_screen(
        self,
        image_base64: str,
        mime_type: str = "image/jpeg",
        prompt: str = "What do you see on this screen?",
    ) -> str:
        """Send screen capture to Gemini for analysis."""
        if not self.gemini_session:
            raise RuntimeError("Gemini session not ready")

        logger.info("Sending screen capture to Gemini")

        # Decode image
        image_data = base64.b64decode(image_base64)

        # Create image part
        image_part = types.Part.from_bytes(
            data=image_data,
            mime_type=mime_type,
        )

        # Send to Gemini
        await self.gemini_session.send([image_part, prompt], end_of_turn=True)

        # Wait for response (simplified - in production would collect full response)
        response_text = ""
        async for response in self.gemini_session.receive():
            if response.text:
                response_text += response.text
            if response.server_content and response.server_content.turn_complete:
                break

        return response_text
