"""
VK-Agent Janus WebSocket Client

Connects to Janus Gateway AudioBridge plugin as a plain RTP participant,
enabling bidirectional audio streaming without WebRTC complexity.

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                        JanusClient                               │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  WebSocket Connection:                                           │
    │    1. Create session                                             │
    │    2. Attach AudioBridge plugin                                  │
    │    3. Create/join room with generate_offer=true                  │
    │    4. Configure RTP (our address for incoming audio)             │
    │    5. Receive Janus RTP target (where to send audio)             │
    │                                                                  │
    │  Bidirectional RTP Flow:                                         │
    │    Janus → VK-Agent: Mixed room audio on our configured port     │
    │    VK-Agent → Janus: Our audio to Janus's provided port         │
    │                                                                  │
    │  Background Tasks:                                               │
    │    - Keepalive loop (30s interval)                              │
    │    - Message receive loop                                        │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Protocol:
    Uses "janus-protocol" WebSocket subprotocol with JSON messages.
    Transaction IDs track request/response pairs.
"""

import asyncio
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Callable, List, Dict, Any

import websockets
from websockets.client import WebSocketClientProtocol

from .config import JanusConfig
from .models import JanusSession, Participant

logger = logging.getLogger(__name__)


class JanusClient:
    """Janus WebSocket client for AudioBridge plugin.

    Manages the complete lifecycle of a Janus AudioBridge connection:
    - WebSocket connection management
    - Session and plugin handle lifecycle
    - Room creation and joining
    - Plain RTP participant mode (no WebRTC)
    - Participant tracking
    - Keepalive management

    Example:
        >>> client = JanusClient(config)
        >>> client.on_joined = handle_joined
        >>> client.on_participants_changed = handle_participants
        >>>
        >>> if await client.start():
        ...     print(f"Joined as {client.session.participant_id}")
        ...     print(f"Send audio to {client.rtp_target}")
        ...     # ... process audio ...
        ...     await client.stop()
    """

    def __init__(self, config: JanusConfig):
        """Initialize Janus client.

        Args:
            config: Janus configuration with WebSocket URL, room ID, etc.
        """
        self.config = config

        # WebSocket connection
        self._ws: Optional[WebSocketClientProtocol] = None

        # Session state
        self.session = JanusSession(
            room_id=config.room_id,
            display_name=config.display_name,
        )

        # Participants in room
        self._participants: Dict[int, Participant] = {}

        # Background tasks
        self._keepalive_task: Optional[asyncio.Task] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._running = False

        # Callbacks
        self.on_joined: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_participants_changed: Optional[Callable[[List[Participant]], None]] = None
        self.on_error: Optional[Callable[[str], None]] = None

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return self._ws is not None and self.session.connected

    @property
    def is_ready(self) -> bool:
        """Check if client is ready for audio."""
        return self.session.is_ready

    @property
    def rtp_target(self) -> Optional[tuple]:
        """Get RTP target (host, port) for sending audio to Janus."""
        if self.session.rtp_target_ip and self.session.rtp_target_port:
            return (self.session.rtp_target_ip, self.session.rtp_target_port)
        return None

    @property
    def participants(self) -> List[Participant]:
        """Get list of participants in room."""
        return list(self._participants.values())

    def _transaction_id(self) -> str:
        """Generate unique transaction ID for request tracking."""
        return secrets.token_hex(6)

    async def start(self) -> bool:
        """Start client and join room.

        Complete startup sequence:
        1. Connect to Janus WebSocket
        2. Create session
        3. Attach to AudioBridge plugin
        4. Create/join room as plain RTP participant
        5. Start background tasks

        Returns:
            True if successfully joined room, False otherwise
        """
        logger.info(f"Starting Janus client for room {self.config.room_id}...")

        # Step 1: Connect WebSocket
        if not await self._connect():
            return False

        # Step 2: Create session
        if not await self._create_session():
            await self._disconnect()
            return False

        # Step 3: Attach AudioBridge
        if not await self._attach_audiobridge():
            await self._disconnect()
            return False

        # Step 4: Create room (if needed)
        if not await self._create_room():
            logger.warning("Room creation failed, attempting to join anyway")

        # Step 5: Join room as plain RTP
        if not await self._join_room():
            await self._disconnect()
            return False

        # Step 6: Start background tasks
        self._running = True
        self._keepalive_task = asyncio.create_task(self._keepalive_loop())
        self._receive_task = asyncio.create_task(self._receive_loop())

        logger.info(
            f"Janus client started. "
            f"Session={self.session.session_id}, "
            f"Handle={self.session.handle_id}, "
            f"Participant={self.session.participant_id}, "
            f"RTP target={self.rtp_target}"
        )
        return True

    async def stop(self) -> None:
        """Stop client and clean up resources."""
        logger.info("Stopping Janus client...")
        self._running = False

        # Cancel background tasks
        if self._keepalive_task:
            self._keepalive_task.cancel()
            try:
                await self._keepalive_task
            except asyncio.CancelledError:
                pass

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        # Disconnect WebSocket
        await self._disconnect()

        logger.info("Janus client stopped")

    async def _connect(self) -> bool:
        """Connect to Janus WebSocket server."""
        try:
            self._ws = await websockets.connect(
                self.config.websocket_url,
                subprotocols=["janus-protocol"],
                ping_interval=self.config.keepalive_interval,
                ping_timeout=10,
            )
            self.session.connected = True
            self.session.connected_at = datetime.now(timezone.utc)
            logger.info(f"Connected to Janus at {self.config.websocket_url}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to Janus: {e}")
            return False

    async def _disconnect(self) -> None:
        """Disconnect from Janus WebSocket server."""
        self.session.connected = False
        self.session.joined = False

        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

    async def _send(self, message: dict) -> None:
        """Send JSON message to Janus."""
        if self._ws:
            await self._ws.send(json.dumps(message))

    async def _recv(self, timeout: float = 5.0) -> Optional[dict]:
        """Receive JSON message from Janus with timeout."""
        if not self._ws:
            return None

        try:
            data = await asyncio.wait_for(self._ws.recv(), timeout=timeout)
            return json.loads(data)
        except asyncio.TimeoutError:
            return None
        except Exception as e:
            logger.error(f"Receive error: {e}")
            return None

    async def _create_session(self) -> bool:
        """Create a Janus session."""
        msg = {
            "janus": "create",
            "transaction": self._transaction_id(),
        }
        await self._send(msg)

        response = await self._recv()
        if response and response.get("janus") == "success":
            self.session.session_id = response["data"]["id"]
            logger.info(f"Created Janus session: {self.session.session_id}")
            return True

        logger.error(f"Failed to create session: {response}")
        return False

    async def _attach_audiobridge(self) -> bool:
        """Attach to AudioBridge plugin."""
        msg = {
            "janus": "attach",
            "session_id": self.session.session_id,
            "plugin": "janus.plugin.audiobridge",
            "transaction": self._transaction_id(),
        }
        await self._send(msg)

        response = await self._recv()
        if response and response.get("janus") == "success":
            self.session.handle_id = response["data"]["id"]
            logger.info(f"Attached to AudioBridge: {self.session.handle_id}")
            return True

        logger.error(f"Failed to attach to AudioBridge: {response}")
        return False

    async def _create_room(self) -> bool:
        """Create AudioBridge room with plain RTP support."""
        # First try to destroy existing room
        # TODO: Admin key hardcoded for demo - should be configurable
        destroy_msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "destroy",
                "room": self.config.room_id,
                "admin_key": "audiobridge_admin",
            },
        }
        await self._send(destroy_msg)

        # Wait for response (ignore errors - room may not exist)
        for _ in range(5):
            response = await self._recv(timeout=1.0)
            if response:
                if response.get("janus") == "event":
                    break
                elif response.get("janus") == "ack":
                    continue

        # Create room
        # TODO: Admin key hardcoded for demo - should be configurable
        create_msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "create",
                "room": self.config.room_id,
                "description": f"VK-Agent Room {self.config.room_id}",
                "is_private": False,
                "sampling_rate": 48000,
                "audiolevel_event": True,
                "audio_active_packets": 50,
                "audio_level_average": 25,
                "record": False,
                "allow_rtp_participants": True,  # Critical for plain RTP
                "admin_key": "audiobridge_admin",
            },
        }
        await self._send(create_msg)

        response = await self._recv()
        if response:
            plugindata = response.get("plugindata", {}).get("data", {})
            if plugindata.get("audiobridge") == "created":
                logger.info(f"Created room {self.config.room_id}")
                return True
            elif plugindata.get("error_code") == 486:  # Room exists
                logger.info(f"Room {self.config.room_id} already exists")
                return True

        logger.warning(f"Room creation response: {response}")
        return True  # Continue anyway

    async def _join_room(self) -> bool:
        """Join room as plain RTP participant with bidirectional audio.

        Uses generate_offer flow:
        1. Join with generate_offer=true and empty rtp object
        2. Janus returns its RTP port in response
        3. Send configure with our RTP details
        """
        # Join with our RTP details for bidirectional plain RTP
        # Janus will send mixed audio to our IP:port
        join_msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "join",
                "room": self.config.room_id,
                "display": self.config.display_name,
                "muted": False,
                "rtp": {
                    "ip": self.config.rtp_host,
                    "port": self.config.rtp_port,
                    "payload_type": 111,  # Opus
                },
            },
        }
        logger.info(f"Joining room {self.config.room_id} with RTP {self.config.rtp_host}:{self.config.rtp_port}")
        await self._send(join_msg)

        # Wait for join response
        for _ in range(50):  # 5 second timeout
            response = await self._recv(timeout=0.1)
            if not response:
                continue

            janus_type = response.get("janus")

            if janus_type == "event":
                plugindata = response.get("plugindata", {}).get("data", {})
                event_type = plugindata.get("audiobridge")

                # Check for errors
                if plugindata.get("error_code"):
                    logger.error(
                        f"Join error: {plugindata.get('error')} "
                        f"(code: {plugindata.get('error_code')})"
                    )
                    return False

                if event_type == "joined":
                    # DEBUG: Log full join response
                    logger.info(f"Join response plugindata: {plugindata}")

                    self.session.participant_id = plugindata.get("id")
                    self.session.joined = True
                    self.session.joined_at = datetime.now(timezone.utc)

                    # Extract Janus RTP target from response
                    rtp_info = plugindata.get("rtp", {})
                    if rtp_info:
                        self.session.rtp_target_ip = rtp_info.get("ip")
                        self.session.rtp_target_port = rtp_info.get("port")
                        logger.info(
                            f"Janus RTP target: "
                            f"{self.session.rtp_target_ip}:{self.session.rtp_target_port}"
                        )

                    # Track initial participants
                    for p in plugindata.get("participants", []):
                        self._add_participant(p)

                    logger.info(
                        f"Joined room {self.config.room_id} as "
                        f"participant {self.session.participant_id}"
                    )

                    # Send configure with our RTP details
                    if self.session.rtp_target_ip:
                        await self._configure_rtp()

                    # Invoke callback
                    if self.on_joined:
                        callback_data = {
                            "participant_id": self.session.participant_id,
                            "participants": plugindata.get("participants", []),
                            "janus_rtp_target": {
                                "ip": self.session.rtp_target_ip,
                                "port": self.session.rtp_target_port,
                            },
                        }
                        self.on_joined(callback_data)

                    return True

            elif janus_type == "ack":
                continue

        logger.error("Timeout waiting for join response")
        return False

    async def _configure_rtp(self) -> bool:
        """Send configure with our RTP details.

        Tells Janus where to send the room's mixed audio.
        """
        configure_msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "configure",
                "rtp": {
                    "ip": self.config.rtp_host,
                    "port": self.config.rtp_port,
                    "payload_type": 111,  # Opus
                    "audiolevel_ext": 1,
                },
            },
        }
        await self._send(configure_msg)

        logger.info(
            f"Configured RTP: Janus will send to "
            f"{self.config.rtp_host}:{self.config.rtp_port}"
        )

        # Wait for ack/response
        for _ in range(20):
            response = await self._recv(timeout=0.1)
            if response:
                logger.info(f"[JANUS-DEBUG] Configure RTP response: {response}")
                if response.get("janus") == "event":
                    plugindata = response.get("plugindata", {}).get("data", {})
                    if plugindata.get("audiobridge") == "event":
                        logger.info(
                            "[JANUS-DEBUG] Configure RTP completed - "
                            f"Janus should now send mixed audio to {self.config.rtp_host}:{self.config.rtp_port}"
                        )
                        return True

        logger.warning("[JANUS-DEBUG] Configure RTP response timeout - may still work")
        return True

    async def configure_rtp_forwarding(
        self,
        forward_host: str,
        forward_port: int,
        publisher_id: Optional[int] = None,
    ) -> bool:
        """Configure RTP forwarding for a participant.

        This enables receiving a specific participant's audio via RTP.

        Args:
            forward_host: IP to forward audio to
            forward_port: Port to forward audio to
            publisher_id: Participant ID to forward (None = self)

        Returns:
            True if forwarding configured, False otherwise
        """
        target_id = publisher_id or self.session.participant_id

        msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "rtp_forward",
                "room": self.config.room_id,
                "publisher_id": target_id,
                "host": forward_host,
                "port": forward_port,
                "codec": "opus",
                "ptype": 111,
                "ssrc": 12345678,
                "admin_key": "audiobridge_admin",
            },
        }
        await self._send(msg)

        logger.info(
            f"Configured RTP forward: participant {target_id} -> "
            f"{forward_host}:{forward_port}"
        )

        # Wait for response
        for _ in range(20):
            response = await self._recv(timeout=0.1)
            if response:
                logger.info(f"[JANUS-DEBUG] RTP forward response: {response}")
                if response.get("janus") == "event":
                    plugindata = response.get("plugindata", {}).get("data", {})
                    if plugindata.get("audiobridge") == "rtp_forward":
                        logger.info(f"[JANUS-DEBUG] RTP forwarding established: {plugindata}")
                        return True
                    if plugindata.get("error_code"):
                        logger.error(f"RTP forward error: {plugindata}")
                        return False

        return True

    async def mute(self, muted: bool = True) -> bool:
        """Mute or unmute this participant.

        Args:
            muted: True to mute, False to unmute

        Returns:
            True if successful
        """
        msg = {
            "janus": "message",
            "session_id": self.session.session_id,
            "handle_id": self.session.handle_id,
            "transaction": self._transaction_id(),
            "body": {
                "request": "configure",
                "muted": muted,
            },
        }
        await self._send(msg)
        logger.info(f"Participant muted: {muted}")
        return True

    def _add_participant(self, data: dict) -> None:
        """Add or update participant from Janus data."""
        pid = data.get("id")
        if pid:
            self._participants[pid] = Participant(
                id=pid,
                display=data.get("display", "Unknown"),
                muted=data.get("muted", False),
            )

    def _remove_participant(self, pid: int) -> None:
        """Remove participant by ID."""
        if pid in self._participants:
            del self._participants[pid]

    async def _keepalive_loop(self) -> None:
        """Send keepalive messages to maintain session."""
        while self._running and self._ws:
            try:
                msg = {
                    "janus": "keepalive",
                    "session_id": self.session.session_id,
                    "transaction": self._transaction_id(),
                }
                await self._send(msg)
                await asyncio.sleep(self.config.keepalive_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Keepalive error: {e}")
                break

    async def _receive_loop(self) -> None:
        """Process incoming messages from Janus."""
        while self._running and self._ws:
            try:
                data = await self._ws.recv()
                message = json.loads(data)
                await self._handle_message(message)
            except websockets.exceptions.ConnectionClosed:
                logger.info("Janus connection closed")
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Receive loop error: {e}")
                continue

    async def _handle_message(self, data: dict) -> None:
        """Handle incoming Janus message."""
        janus_type = data.get("janus")

        if janus_type == "event":
            plugindata = data.get("plugindata", {}).get("data", {})
            event_type = plugindata.get("audiobridge")

            if event_type == "event":
                # DEBUG: Log all events
                logger.info(f"[JANUS-DEBUG] AudioBridge event: {plugindata}")

                # Participant changes
                if "participants" in plugindata:
                    for p in plugindata["participants"]:
                        logger.info(f"[JANUS-DEBUG] Participant joined: {p}")
                        self._add_participant(p)
                    if self.on_participants_changed:
                        self.on_participants_changed(self.participants)

                if "leaving" in plugindata:
                    pid = plugindata["leaving"]
                    self._remove_participant(pid)
                    logger.info(f"[JANUS-DEBUG] Participant left: {pid}")
                    if self.on_participants_changed:
                        self.on_participants_changed(self.participants)

            elif event_type == "talking":
                pid = plugindata.get("id")
                if pid in self._participants:
                    self._participants[pid].talking = True

            elif event_type == "stopped-talking":
                pid = plugindata.get("id")
                if pid in self._participants:
                    self._participants[pid].talking = False

            elif event_type == "rtp_forward":
                logger.debug(f"RTP forward response: {plugindata}")

            # Log any errors
            if "error" in plugindata or "error_code" in plugindata:
                error_msg = (
                    f"Plugin error: {plugindata.get('error')} "
                    f"(code: {plugindata.get('error_code')})"
                )
                logger.error(error_msg)
                if self.on_error:
                    self.on_error(error_msg)

        elif janus_type == "webrtcup":
            logger.info("WebRTC connection established")

        elif janus_type == "hangup":
            logger.info("Hangup received")

        elif janus_type == "error":
            error = data.get("error", {})
            logger.error(f"Janus error: {error}")
            if self.on_error:
                self.on_error(str(error))

    async def __aenter__(self) -> "JanusClient":
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.stop()


async def test_janus_client() -> None:
    """Test Janus client connectivity."""
    from .config import get_settings

    settings = get_settings()
    config = settings.janus

    print(f"Testing Janus client...")
    print(f"  WebSocket URL: {config.websocket_url}")
    print(f"  Room ID: {config.room_id}")
    print(f"  RTP Host: {config.rtp_host}:{config.rtp_port}")

    def on_joined(data):
        print(f"  Joined callback: {data}")

    def on_participants_changed(participants):
        print(f"  Participants: {[p.display for p in participants]}")

    client = JanusClient(config)
    client.on_joined = on_joined
    client.on_participants_changed = on_participants_changed

    if await client.start():
        print(f"\nConnected successfully!")
        print(f"  Session ID: {client.session.session_id}")
        print(f"  Handle ID: {client.session.handle_id}")
        print(f"  Participant ID: {client.session.participant_id}")
        print(f"  RTP Target: {client.rtp_target}")

        # Keep running for 10 seconds
        print("\nListening for events (10 seconds)...")
        await asyncio.sleep(10)

        await client.stop()
    else:
        print("Failed to connect to Janus")


if __name__ == "__main__":
    asyncio.run(test_janus_client())
