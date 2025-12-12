"""
Test LiveKit's Gemini Live API Integration

This uses LiveKit's official google.realtime.RealtimeModel plugin
instead of manually calling the Gemini API.

Purpose: Test if LiveKit's integration provides:
1. Faster audio responses (200-500ms vs 2-5s)
2. Automatic video handling
3. Natural interruptions
4. Smoother real-time experience

Replaces manual STT → LLM → TTS pipeline with native Gemini Live API.
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.plugins import google

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def entrypoint(ctx: JobContext):
    """
    Test entrypoint using LiveKit's Gemini integration

    This replaces our custom VisionAwareAgent with LiveKit's
    native Gemini Live API integration.
    """
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Connect to room - subscribe to audio AND video
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    logger.info("✅ Connected to room")

    # Create AgentSession with Gemini Live API
    # This replaces our manual STT → LLM → TTS pipeline
    logger.info("Creating AgentSession with Gemini Live API...")

    from livekit.agents import voice

    session = voice.AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.0-flash-exp",
            voice="Puck",  # Voice option
            temperature=0.8,
            instructions=(
                "You are a helpful AI assistant with vision capabilities. "
                "You can see the user's screen share and answer questions about it. "
                "When the user shares their screen, describe what you see briefly. "
                "If you see a chess game, offer to suggest moves. "
                "Be concise and conversational."
            ),
        ),
    )

    logger.info("✅ AgentSession created with Gemini Live API")

    # Start the session
    # LiveKit will automatically handle:
    # - Audio input/output (no need for Deepgram/Cartesia)
    # - Video input (automatically from room tracks)
    # - VAD (built-in turn detection)
    # - Interruptions (native support)
    await session.start(room=ctx.room)

    logger.info("✅ Session started - Gemini Live API active")
    logger.info("📹 Video tracks will be automatically processed by Gemini")
    logger.info("🎤 Audio streaming with <500ms latency expected")

    # Monitor video track subscriptions
    video_track_count = [0]

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Monitor video track subscriptions"""
        logger.info(f"Track subscribed: {track.kind} from {participant.identity}")

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            video_track_count[0] += 1
            logger.info(f"📹 Video track #{video_track_count[0]} - Gemini should now see this!")

            # Check if it's screen share
            if publication.source == 3:  # SOURCE_SCREENSHARE
                logger.info("🖥️  Screen share detected - Gemini Live API will process this")

    @ctx.room.on("track_unsubscribed")
    def on_track_unsubscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Monitor video track unsubscriptions"""
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            video_track_count[0] -= 1
            logger.info(f"📹 Video track unsubscribed - count now: {video_track_count[0]}")

    # Wait indefinitely - session handles everything
    logger.info("🎬 Agent ready - speak or share your screen!")
    logger.info("📊 Expected latency: 200-500ms (vs current 2-5s)")

    # Keep alive
    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    # Run with: python test_livekit_gemini_integration.py dev
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
