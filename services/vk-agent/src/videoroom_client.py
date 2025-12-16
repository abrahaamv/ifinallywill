"""
VK-Agent Janus VideoRoom Client

Connects to Janus Gateway VideoRoom plugin as a subscriber to receive
video streams (screen shares) from meeting participants.

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                     VideoRoomClient                              │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  WebSocket Connection:                                           │
    │    1. Create session                                             │
    │    2. Attach VideoRoom plugin                                    │
    │    3. Join room as subscriber                                    │
    │    4. Subscribe to publisher video feeds                         │
    │    5. Handle WebRTC offer/answer (simplified, no ICE)            │
    │                                                                  │
    │  Video Flow:                                                     │
    │    Publisher (Browser) → Janus VideoRoom → VK-Agent (Subscriber) │
    │    VK-Agent extracts frames → Gemini Live API                    │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

For video reception, VK-Agent subscribes as a "subscriber" handle that
receives forwarded RTP video streams.
"""

import asyncio
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Callable, List, Dict, Any, Tuple

import websockets
from websockets.client import WebSocketClientProtocol

logger = logging.getLogger(__name__)


class VideoRoomConfig:
    """Configuration for VideoRoom client."""

    def __init__(
        self,
        ws_url: str = "ws://127.0.0.1:8188",
        room_id: int = 5679,
        display_name: str = "VK-Agent",
        rtp_video_port: int = 5006,
        rtp_video_host: str = "127.0.0.1",
    ):
        self.ws_url = ws_url
        self.room_id = room_id
        self.display_name = display_name
        self.rtp_video_port = rtp_video_port
        self.rtp_video_host = rtp_video_host


class Publisher:
    """Represents a publisher in the VideoRoom."""

    def __init__(self, id: int, display: str = "", audio_codec: str = "", video_codec: str = ""):
        self.id = id
        self.display = display
        self.audio_codec = audio_codec
        self.video_codec = video_codec
        self.subscribed = False


class VideoRoomClient:
    """Janus VideoRoom client for subscribing to video streams.

    This client joins a VideoRoom as a subscriber to receive video
    streams from publishers (browser users sharing their screens).
    """

    def __init__(self, config: VideoRoomConfig):
        """Initialize VideoRoom client.

        Args:
            config: VideoRoom configuration
        """
        self.config = config

        # WebSocket connection
        self._ws: Optional[WebSocketClientProtocol] = None

        # Session state
        self.session_id: Optional[int] = None
        self.handle_id: Optional[int] = None  # Handle for VideoRoom plugin
        self.rtp_stream_ids: Dict[int, int] = {}  # publisher_id -> stream_id for RTP forwarding

        # Room state
        self.joined = False
        self.publishers: Dict[int, Publisher] = {}
        self.subscribed_feed: Optional[int] = None

        # RTP info for receiving video
        self.rtp_video_port: Optional[int] = None

        # Background tasks
        self._keepalive_task: Optional[asyncio.Task] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._running = False

        # Pending transactions
        self._transactions: Dict[str, asyncio.Future] = {}

        # Callbacks
        self.on_publisher_joined: Optional[Callable[[Publisher], None]] = None
        self.on_publisher_left: Optional[Callable[[int], None]] = None
        self.on_video_ready: Optional[Callable[[int, int], None]] = None  # (port, ssrc)

    def _generate_transaction(self) -> str:
        """Generate a unique transaction ID."""
        return secrets.token_hex(6)

    async def start(self) -> bool:
        """Start the VideoRoom client.

        Returns:
            True if successfully connected and joined room
        """
        try:
            logger.info(f"Starting VideoRoom client for room {self.config.room_id}...")

            # Connect WebSocket
            self._ws = await websockets.connect(
                self.config.ws_url,
                subprotocols=["janus-protocol"],
                ping_interval=25,
                ping_timeout=20,
            )
            logger.info(f"Connected to Janus at {self.config.ws_url}")

            # Create session
            await self._create_session()

            # Attach to VideoRoom plugin
            await self._attach_plugin()

            # Join room as subscriber-only (no publishing)
            await self._join_room()

            # Start background tasks
            self._running = True
            self._keepalive_task = asyncio.create_task(self._keepalive_loop())
            self._receive_task = asyncio.create_task(self._receive_loop())

            logger.info(f"VideoRoom client started. Session={self.session_id}, Handle={self.handle_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to start VideoRoom client: {e}")
            return False

    async def stop(self):
        """Stop the VideoRoom client."""
        self._running = False

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

        if self._ws:
            await self._ws.close()
            self._ws = None

        logger.info("VideoRoom client stopped")

    async def _send(self, message: dict) -> dict:
        """Send a message and wait for response.

        During startup (before receive loop is running), we receive inline.
        After startup, responses come through the receive loop.
        """
        if not self._ws:
            raise RuntimeError("WebSocket not connected")

        transaction = self._generate_transaction()
        message["transaction"] = transaction

        if self.session_id and "session_id" not in message:
            message["session_id"] = self.session_id

        # Send message
        await self._ws.send(json.dumps(message))
        logger.debug(f"Sent: {message.get('janus')} transaction={transaction}")

        # If receive loop is running, use futures
        if self._running:
            future = asyncio.get_event_loop().create_future()
            self._transactions[transaction] = future
            try:
                response = await asyncio.wait_for(future, timeout=10.0)
                return response
            except asyncio.TimeoutError:
                self._transactions.pop(transaction, None)
                raise TimeoutError(f"Request timed out: {message.get('janus')}")

        # During startup, receive inline
        try:
            async with asyncio.timeout(10.0):
                got_ack = False
                while True:
                    raw = await self._ws.recv()
                    data = json.loads(raw)
                    logger.debug(f"Received: {data.get('janus')} transaction={data.get('transaction')}")

                    # Check transaction match
                    if data.get("transaction") != transaction:
                        # Not our message, skip (could be keepalive response etc)
                        continue

                    # Handle ack - wait for actual event to follow
                    if data.get("janus") == "ack":
                        got_ack = True
                        continue

                    # For "success" responses (create, attach), return immediately
                    if data.get("janus") == "success":
                        return data

                    # For "event" responses (message), return after ack
                    if data.get("janus") == "event":
                        return data

                    # For errors, return immediately
                    if data.get("janus") == "error":
                        return data

                    # Unknown response type, return it
                    logger.warning(f"Unknown Janus response type: {data.get('janus')}")
                    return data
        except asyncio.TimeoutError:
            raise TimeoutError(f"Request timed out: {message.get('janus')}")

    async def _create_session(self):
        """Create a Janus session."""
        response = await self._send({"janus": "create"})

        if response.get("janus") == "success":
            self.session_id = response["data"]["id"]
            logger.info(f"Created Janus session: {self.session_id}")
        else:
            raise RuntimeError(f"Failed to create session: {response}")

    async def _attach_plugin(self):
        """Attach to VideoRoom plugin."""
        response = await self._send({
            "janus": "attach",
            "plugin": "janus.plugin.videoroom",
        })

        if response.get("janus") == "success":
            self.handle_id = response["data"]["id"]
            logger.info(f"Attached to VideoRoom: {self.handle_id}")
        else:
            raise RuntimeError(f"Failed to attach: {response}")

    async def _join_room(self):
        """Join the VideoRoom as a publisher to receive events about other publishers.

        We join as a publisher (but don't actually publish) so we can:
        1. See existing publishers
        2. Receive events when new publishers join
        Then we can subscribe to their video feeds.
        """
        # First check if room exists, create if needed
        response = await self._send({
            "janus": "message",
            "handle_id": self.handle_id,
            "body": {
                "request": "exists",
                "room": self.config.room_id,
            }
        })

        plugindata = response.get("plugindata", {}).get("data", {})
        if not plugindata.get("exists", False):
            logger.info(f"Room {self.config.room_id} doesn't exist, creating...")
            response = await self._send({
                "janus": "message",
                "handle_id": self.handle_id,
                "body": {
                    "request": "create",
                    "room": self.config.room_id,
                    "description": "VK-Agent Video Room",
                    "publishers": 10,
                    "bitrate": 2000000,
                    "videocodec": "vp8,h264",
                    "audiocodec": "opus",
                    "notify_joining": True,
                }
            })
            logger.info(f"Room created: {response}")

        # Join as publisher to see other publishers and receive events
        response = await self._send({
            "janus": "message",
            "handle_id": self.handle_id,
            "body": {
                "request": "join",
                "ptype": "publisher",
                "room": self.config.room_id,
                "display": self.config.display_name,
            }
        })

        if response.get("janus") == "event":
            plugindata = response.get("plugindata", {}).get("data", {})

            if plugindata.get("videoroom") == "joined":
                self.joined = True
                logger.info(f"Joined VideoRoom {self.config.room_id} as publisher (receive-only)")

                # Check for existing publishers
                if "publishers" in plugindata:
                    for pub in plugindata["publishers"]:
                        publisher = Publisher(
                            id=pub["id"],
                            display=pub.get("display", ""),
                            audio_codec=pub.get("audio_codec", ""),
                            video_codec=pub.get("video_codec", ""),
                        )
                        self.publishers[pub["id"]] = publisher
                        logger.info(f"Found existing publisher: {publisher.display} (ID: {publisher.id})")
                        if self.on_publisher_joined:
                            self.on_publisher_joined(publisher)
            else:
                logger.warning(f"Unexpected join response: {plugindata}")
                self.joined = True
        else:
            logger.warning(f"Join returned non-event: {response}")
            self.joined = True

    async def subscribe_to_publisher(self, publisher_id: int) -> bool:
        """Set up RTP forwarding for a publisher's video stream.

        Uses Janus VideoRoom RTP forwarding to receive the publisher's
        video stream without full WebRTC negotiation.

        Args:
            publisher_id: The publisher's feed ID to forward

        Returns:
            True if RTP forwarding was set up successfully
        """
        if not self.joined:
            logger.error("Not joined to room yet")
            return False

        if publisher_id not in self.publishers:
            logger.error(f"Unknown publisher: {publisher_id}")
            return False

        publisher = self.publishers[publisher_id]
        if publisher.subscribed:
            logger.info(f"Already subscribed to publisher {publisher_id}")
            return True

        logger.info(f"Setting up RTP forward for publisher {publisher_id} ({publisher.display})...")

        # Use RTP forwarding directly - no WebRTC subscription needed
        # This forwards the publisher's raw RTP stream to our port
        response = await self._send({
            "janus": "message",
            "handle_id": self.handle_id,
            "body": {
                "request": "rtp_forward",
                "room": self.config.room_id,
                "publisher_id": publisher_id,
                "host": self.config.rtp_video_host,
                "video_port": self.config.rtp_video_port,
                "video_pt": 96,  # VP8 payload type
                "admin_key": "videoroom_admin_secret",
            }
        })

        logger.info(f"RTP forward response: {response}")

        # Handle both "success" and "event" response types
        if response.get("janus") in ("event", "success"):
            plugindata = response.get("plugindata", {}).get("data", {})

            if plugindata.get("videoroom") == "rtp_forward":
                # Success - get the stream info
                rtp_stream = plugindata.get("rtp_stream", {})
                video_stream_id = rtp_stream.get("video_stream_id")

                self.subscribed_feed = publisher_id
                self.publishers[publisher_id].subscribed = True
                self.rtp_video_port = self.config.rtp_video_port

                # Store stream_id for later cleanup
                if video_stream_id:
                    self.rtp_stream_ids[publisher_id] = video_stream_id

                logger.info(
                    f"RTP forward configured for {publisher.display}: "
                    f"host={self.config.rtp_video_host}, port={self.rtp_video_port}, stream_id={video_stream_id}"
                )

                if self.on_video_ready:
                    self.on_video_ready(self.rtp_video_port, video_stream_id or 0)

                return True

            elif plugindata.get("error_code"):
                error = plugindata.get("error", "Unknown error")
                error_code = plugindata.get("error_code")
                logger.error(f"RTP forward failed: {error} (code {error_code})")
                return False

        logger.error(f"Unexpected RTP forward response: {response}")
        return False

    async def stop_rtp_forward(self, publisher_id: int, stream_id: int) -> bool:
        """Stop RTP forwarding for a publisher.

        Args:
            publisher_id: The publisher's feed ID
            stream_id: The stream ID returned from rtp_forward

        Returns:
            True if successfully stopped
        """
        response = await self._send({
            "janus": "message",
            "handle_id": self.handle_id,
            "body": {
                "request": "stop_rtp_forward",
                "room": self.config.room_id,
                "publisher_id": publisher_id,
                "stream_id": stream_id,
                "admin_key": "videoroom_admin_secret",
            }
        })

        if response.get("janus") == "event":
            plugindata = response.get("plugindata", {}).get("data", {})
            if plugindata.get("videoroom") == "stop_rtp_forward":
                logger.info(f"Stopped RTP forward for publisher {publisher_id}")
                if publisher_id in self.publishers:
                    self.publishers[publisher_id].subscribed = False
                return True

        logger.error(f"Failed to stop RTP forward: {response}")
        return False

    async def _keepalive_loop(self):
        """Send keepalive messages to maintain session."""
        while self._running:
            try:
                await asyncio.sleep(25)
                if self._ws and self.session_id:
                    await self._ws.send(json.dumps({
                        "janus": "keepalive",
                        "session_id": self.session_id,
                        "transaction": self._generate_transaction(),
                    }))
            except Exception as e:
                if self._running:
                    logger.error(f"Keepalive error: {e}")
                break

    async def _receive_loop(self):
        """Receive and process WebSocket messages."""
        while self._running and self._ws:
            try:
                message = await self._ws.recv()
                data = json.loads(message)
                await self._handle_message(data)
            except websockets.exceptions.ConnectionClosed:
                logger.info("WebSocket connection closed")
                break
            except Exception as e:
                if self._running:
                    logger.error(f"Receive error: {e}")

    async def _handle_message(self, message: dict):
        """Handle incoming WebSocket message."""
        transaction = message.get("transaction")
        janus_type = message.get("janus")

        # Handle transaction response
        if transaction and transaction in self._transactions:
            future = self._transactions.pop(transaction)
            if not future.done():
                future.set_result(message)
            return

        # Handle events
        if janus_type == "event":
            await self._handle_event(message)
        elif janus_type == "webrtcup":
            logger.info("WebRTC connection established")
        elif janus_type == "hangup":
            logger.info("WebRTC connection closed")
        elif janus_type == "detached":
            logger.info("Plugin handle detached")

    async def _handle_event(self, message: dict):
        """Handle VideoRoom event."""
        plugindata = message.get("plugindata", {}).get("data", {})
        videoroom = plugindata.get("videoroom")

        if videoroom == "event":
            # Publisher events
            if "publishers" in plugindata:
                for pub in plugindata["publishers"]:
                    if pub["id"] not in self.publishers:
                        publisher = Publisher(
                            id=pub["id"],
                            display=pub.get("display", ""),
                            audio_codec=pub.get("audio_codec", ""),
                            video_codec=pub.get("video_codec", ""),
                        )
                        self.publishers[pub["id"]] = publisher
                        logger.info(f"Publisher joined: {publisher.display} (ID: {publisher.id})")
                        if self.on_publisher_joined:
                            self.on_publisher_joined(publisher)

            if "unpublished" in plugindata:
                pub_id = plugindata["unpublished"]
                if pub_id in self.publishers:
                    del self.publishers[pub_id]
                    logger.info(f"Publisher left: {pub_id}")
                    if self.on_publisher_left:
                        self.on_publisher_left(pub_id)

            if "leaving" in plugindata:
                pub_id = plugindata["leaving"]
                if pub_id in self.publishers:
                    del self.publishers[pub_id]
                    logger.info(f"Publisher leaving: {pub_id}")
                    if self.on_publisher_left:
                        self.on_publisher_left(pub_id)

        elif videoroom == "destroyed":
            logger.warning("VideoRoom was destroyed")
            self.joined = False

    async def request_keyframe(self, publisher_id: Optional[int] = None) -> bool:
        """Request a keyframe from a publisher.

        This sends a request to Janus to tell the publisher to send a keyframe.
        For RTP forwarding, we use the 'configure' request with 'keyframe' parameter.

        Args:
            publisher_id: Publisher to request keyframe from (uses subscribed feed if None)

        Returns:
            True if request was sent
        """
        pub_id = publisher_id or self.subscribed_feed
        if not pub_id:
            logger.warning("No publisher to request keyframe from")
            return False

        if pub_id not in self.publishers:
            logger.warning(f"Unknown publisher {pub_id}")
            return False

        try:
            # In VideoRoom, we can't directly request keyframes for RTP forwarding.
            # But we can use listforwarders to get info and potentially restart the forward.
            # The workaround is to stop and restart the RTP forward, which triggers a keyframe.
            stream_id = self.rtp_stream_ids.get(pub_id)
            if stream_id:
                logger.info(f"Requesting keyframe by restarting RTP forward for publisher {pub_id}")
                # Stop and restart the forward
                await self.stop_rtp_forward(pub_id, stream_id)
                await asyncio.sleep(0.1)  # Brief delay
                return await self.subscribe_to_publisher(pub_id)

            logger.warning(f"No stream ID for publisher {pub_id}")
            return False
        except Exception as e:
            logger.error(f"Failed to request keyframe: {e}")
            return False

    @property
    def is_connected(self) -> bool:
        """Check if connected to Janus."""
        return self._ws is not None and self.session_id is not None

    @property
    def is_subscribed(self) -> bool:
        """Check if subscribed to a video feed."""
        return self.subscribed_feed is not None
