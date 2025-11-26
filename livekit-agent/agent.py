"""
LiveKit Multi-Modal AI Agent - Gemini Live API Integration
Simplified implementation using LiveKit's official Gemini plugin

Features:
- Native Gemini Live API integration via livekit-plugins-google
- Sub-500ms audio latency (vs 2-5s with manual STT→LLM→TTS)
- Automatic video processing from room tracks
- Built-in interruption support
- ~95% less code than manual implementation

Replaces:
- Manual STT (Deepgram) → LLM (GPT/Claude/Gemini) → TTS (Cartesia)
- FrameProcessor (pHash, deduplication)
- AIRouter (tier selection)
- VisionAwareAgent (manual context injection)

With:
- google.realtime.RealtimeModel (handles everything)
"""

import asyncio
import logging
import os

from dotenv import load_dotenv

# Load environment variables before importing modules that need them
load_dotenv()

from livekit import rtc
from livekit.agents import (
    Agent,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    room_io,
    voice,
)
from livekit.plugins import google
from livekit.plugins.google.beta import realtime

from backend_client import BackendClient
from config import Config, settings

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress verbose debug logs from websockets and httpcore
logging.getLogger("websockets.client").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for LiveKit agent with Gemini Live API

    Room name formats:
    - tenant_{tenantId}_{roomName}: Legacy format, tenant-only context
    - tenant_{tenantId}_session_{sessionId}: Unified widget format with session context
    """
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Extract tenant ID and session ID from room name
    tenant_id = "default"
    session_id = None
    room_name = ctx.room.name

    if room_name:
        parts = room_name.split("_")
        for i, part in enumerate(parts):
            if part == "tenant" and i + 1 < len(parts):
                tenant_id = parts[i + 1]
            elif part == "session" and i + 1 < len(parts):
                session_id = parts[i + 1]

    logger.info(f"Tenant ID: {tenant_id}, Session ID: {session_id}")

    # Initialize backend client
    backend = BackendClient(
        base_url=settings.backend_url,
        api_key=settings.backend_api_key
    )

    # Load configuration - session context takes priority over tenant config
    tenant_config = None
    if session_id:
        logger.info(f"Loading session context for unified widget transition...")
        try:
            tenant_config = await Config.load_for_session(session_id)
            logger.info(
                f"Session context loaded: personality={tenant_config.personality_name}, "
                f"history_messages={len(tenant_config.conversation_history)}"
            )
        except Exception as e:
            logger.warning(f"Failed to load session context, falling back to tenant config: {e}")
            tenant_config = None

    # Fallback to tenant-based config if session config not available
    if tenant_config is None:
        tenant_config = Config.load_for_tenant(tenant_id)
        logger.info(f"Using tenant config for {tenant_id}")

    # Connect to room - subscribe to audio AND video (camera + screen share)
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    logger.info("✅ Connected to room")

    # Build system instructions
    system_instructions = tenant_config.system_prompt or "You are a helpful AI assistant."

    # Add conversation history context if available
    history_context = ""
    if tenant_config.conversation_history:
        history_context = "\n\n[Previous conversation context - for continuity]:\n"
        for msg in tenant_config.conversation_history[-5:]:  # Last 5 messages
            role_label = "User" if msg.role == "user" else "Assistant"
            history_context += f"{role_label}: {msg.content[:100]}...\n"
        history_context += "\n[Continue the conversation naturally from this context]\n"

    full_instructions = system_instructions + history_context

    logger.info("Creating Agent with Gemini Live API...")
    logger.info(f"Model: gemini-2.0-flash-live-001")
    logger.info(f"Voice: Puck")
    logger.info(f"Instructions: {full_instructions[:100]}...")

    # Create Agent with Gemini Live API
    # This replaces the entire manual STT → LLM → TTS pipeline
    agent = Agent(
        instructions=full_instructions,
        llm=realtime.RealtimeModel(
            model="gemini-2.0-flash-live-001",  # Stable Live API model
            voice="Puck",  # Natural voice
            temperature=0.8,
            # modalities defaults to ["AUDIO"] - do NOT add "IMAGE" (that's for OUTPUT)
        ),
    )

    logger.info("✅ Agent created with Gemini Live API")

    # Create session and configure video INPUT
    session = voice.AgentSession()

    logger.info("📹 Enabling video input (1 FPS, ~$0.50/hour screen sharing)")
    logger.info("🎤 Audio streaming with <500ms latency expected")

    # Start the session with video INPUT enabled
    # VIDEO INPUT: RoomOptions(video_input=True) - new API (RoomInputOptions is deprecated)
    # VIDEO OUTPUT: modalities parameter (only "AUDIO" or "TEXT", no "IMAGE")
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            video_input=True,  # THIS enables video INPUT from screen share
        )
    )

    logger.info("✅ Session started - Gemini Live API active")

    # Monitor video track subscriptions for logging
    video_track_count = [0]

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Monitor track subscriptions"""
        logger.info(f"Track subscribed: {track.kind} from {participant.identity}")
        logger.info(f"  Track SID: {track.sid}, Name: {track.name}")
        logger.info(f"  Publication source: {publication.source}")

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            video_track_count[0] += 1
            logger.info(f"📹 Video track #{video_track_count[0]} subscribed")

            # Check if screen share
            if publication.source == 3:  # SOURCE_SCREENSHARE
                logger.info("🖥️  Screen share detected - Gemini Live API will process this")
                logger.info("    Ask the agent about what's on your screen!")

    @ctx.room.on("track_unsubscribed")
    def on_track_unsubscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Monitor track unsubscriptions"""
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            video_track_count[0] -= 1
            logger.info(f"📹 Video track unsubscribed - active count: {video_track_count[0]}")

    @ctx.room.on("track_muted")
    def on_track_muted(participant: rtc.Participant, publication: rtc.TrackPublication):
        """Monitor track mute events"""
        logger.info(f"🔇 Track muted: source={publication.source}")

    @ctx.room.on("track_unmuted")
    def on_track_unmuted(participant: rtc.Participant, publication: rtc.TrackPublication):
        """Monitor track unmute events"""
        logger.info(f"🔊 Track unmuted: source={publication.source}")

    logger.info("🎬 Agent ready!")
    logger.info("   - Speak to test audio latency (<500ms expected)")
    logger.info("   - Share screen to test vision capabilities")
    logger.info("   - Try interrupting mid-sentence")

    # Cost tracking note
    logger.info("💰 Cost tracking: Using Gemini Live API pricing")
    logger.info("   - Input: $0.075/1M tokens")
    logger.info("   - Output: $0.30/1M tokens")
    logger.info("   - Audio: Native (no separate STT/TTS costs)")

    # Keep alive - session handles everything
    while True:
        await asyncio.sleep(60)
        logger.debug("Agent still running...")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
