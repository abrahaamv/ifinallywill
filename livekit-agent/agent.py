"""
LiveKit Multi-Modal Agent (Phase 5 - Week 3)

Real-time AI assistant with:
- 1 FPS screen capture (96% cost reduction vs 30 FPS)
- Voice transcription via Deepgram
- Multi-modal AI processing (vision + voice + text)
- Cost-optimized AI routing ($0.50/1M tokens)
- RAG-enhanced responses with tenant knowledge base
"""

import asyncio
import io
import logging
import os
from collections import deque
from typing import Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import deepgram
from PIL import Image

# Import AI providers and backend client
from ai_providers import (
    TaskComplexity,
    complexity_estimator,
    llm_processor,
    vision_analyzer,
)
from backend_client import BackendClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
SCREEN_CAPTURE_FPS = int(os.getenv("SCREEN_CAPTURE_FPS", "1"))
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/trpc")
ENABLE_COST_TRACKING = os.getenv("ENABLE_COST_TRACKING", "true").lower() == "true"


class MultiModalAgent:
    """
    Multi-modal AI agent for LiveKit rooms

    Capabilities:
    - Screen capture analysis (1 FPS for cost optimization)
    - Voice transcription and understanding
    - Text chat interaction
    - RAG-enhanced responses with tenant knowledge base
    - Cost-optimized AI routing ($0.50/1M tokens)
    """

    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.room = ctx.room
        self.tenant_id: Optional[str] = None
        self.user_id: Optional[str] = None

        # Initialize backend client
        self.backend = BackendClient(BACKEND_API_URL)

        # Initialize Deepgram for voice transcription
        self.stt = deepgram.STT(
            api_key=os.getenv("DEEPGRAM_API_KEY"),
            model="nova-2",
            language="en-US",
        )

        # Conversation context
        self.conversation_history: list[dict[str, str]] = []
        self.screen_frames = deque(maxlen=10)  # Keep last 10 frames for context
        self.current_transcription = ""

        logger.info(f"Agent initialized for room: {self.room.name}")

    async def extract_tenant_context(self):
        """
        Extract tenant and user context from room metadata

        Room name format: tenant_{tenantId}_{roomName}
        """
        try:
            room_name = self.room.name
            if room_name and room_name.startswith("tenant_"):
                parts = room_name.split("_")
                if len(parts) >= 2:
                    self.tenant_id = parts[1]
                    logger.info(f"Extracted tenant context: {self.tenant_id}")

                    # Fetch tenant settings from backend
                    tenant_context = await self.backend.get_tenant_context(
                        self.tenant_id
                    )
                    if tenant_context:
                        logger.info(f"Loaded tenant settings: {tenant_context.name}")

                        # Add custom AI instructions to system context
                        if tenant_context.ai_instructions:
                            self.conversation_history.append({
                                "role": "system",
                                "content": tenant_context.ai_instructions,
                            })

        except Exception as e:
            logger.error(f"Failed to extract tenant context: {e}")

    async def handle_track_subscribed(
        self,
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        """
        Handle new track subscription (audio, video, screen share)
        """
        logger.info(
            f"Track subscribed: {track.kind} from {participant.identity}"
        )

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            if publication.source == rtc.TrackSource.SOURCE_SCREEN_SHARE:
                # Screen share track - enable 1 FPS capture
                await self.process_screen_share(track)
            else:
                # Camera track - log but don't process for cost optimization
                logger.info("Camera track received (not processing)")

        elif track.kind == rtc.TrackKind.KIND_AUDIO:
            # Audio track - transcribe with Deepgram
            await self.process_audio(track)

    async def process_screen_share(self, track: rtc.VideoTrack):
        """
        Process screen share track with 1 FPS sampling

        Cost optimization: 1 FPS = 96% cost reduction vs 30 FPS
        - 1 FPS = 60 frames/minute
        - 30 FPS = 1,800 frames/minute
        """
        logger.info("Processing screen share track (1 FPS)")

        video_stream = rtc.VideoStream(track)
        frame_count = 0

        async for event in video_stream:
            frame_count += 1

            # Sample at 1 FPS (skip frames if receiving faster)
            if frame_count % 30 == 0:  # Assuming 30 FPS input
                frame = event.frame

                # Convert frame to image bytes
                try:
                    # Convert to PIL Image
                    image = frame.convert(rtc.VideoBufferType.RGBA).to_image()
                    pil_image = Image.frombytes(
                        "RGBA",
                        (frame.width, frame.height),
                        bytes(image.data),
                    )

                    # Convert to JPEG bytes
                    buffer = io.BytesIO()
                    pil_image.convert("RGB").save(buffer, format="JPEG", quality=85)
                    image_data = buffer.getvalue()

                    # Store frame in context
                    self.screen_frames.append({
                        "timestamp": asyncio.get_event_loop().time(),
                        "data": image_data,
                        "size": (frame.width, frame.height),
                    })

                    logger.debug(
                        f"Screen frame captured: {frame.width}x{frame.height} "
                        f"({len(image_data)} bytes)"
                    )

                    # Note: Vision analysis triggered on-demand when user asks questions
                    # See handle_text_query() method

                except Exception as e:
                    logger.error(f"Failed to process screen frame: {e}")

    async def process_audio(self, track: rtc.AudioTrack):
        """
        Process audio track with Deepgram transcription
        """
        logger.info("Processing audio track with Deepgram")

        audio_stream = rtc.AudioStream(track)

        try:
            # Stream audio to Deepgram STT
            stt_stream = self.stt.stream()

            async for event in audio_stream:
                # Push audio to Deepgram
                stt_stream.push_frame(event.frame)

                # Check for transcription results
                async for result in stt_stream:
                    if result.alternatives and result.is_final:
                        transcript = result.alternatives[0].transcript
                        if transcript.strip():
                            logger.info(f"Transcribed: {transcript}")
                            self.current_transcription = transcript

                            # Process user query with AI
                            await self.handle_voice_query(transcript)

        except Exception as e:
            logger.error(f"Audio processing error: {e}")

    async def handle_voice_query(self, query: str):
        """
        Process voice query with multi-modal AI

        Flow:
        1. Estimate complexity for AI routing
        2. Check if screen context is available
        3. Query RAG knowledge base if available
        4. Route to appropriate AI provider
        5. Generate response
        6. Track costs
        """
        try:
            # Estimate query complexity
            has_screen = len(self.screen_frames) > 0
            complexity = complexity_estimator.estimate(query, has_visual=has_screen)

            logger.info(f"Processing query (complexity: {complexity.value}): {query}")

            # Build context
            context_parts = []

            # Add conversation history
            context_parts.append("Previous conversation:")
            for msg in self.conversation_history[-5:]:  # Last 5 messages
                context_parts.append(f"{msg['role']}: {msg['content']}")

            # Query RAG if available
            if self.tenant_id:
                rag_result = await self.backend.query_knowledge_base(
                    self.tenant_id, query
                )
                if rag_result:
                    context_parts.append(f"\nKnowledge base: {rag_result.answer}")
                    if rag_result.sources:
                        context_parts.append(f"Sources: {len(rag_result.sources)} documents")

            # Add screen analysis if requested and available
            if has_screen and ("screen" in query.lower() or "see" in query.lower()):
                latest_frame = self.screen_frames[-1]
                vision_result = await vision_analyzer.analyze_screen(
                    latest_frame["data"],
                    f"Context: {' '.join(context_parts)}\n\nQuestion: {query}",
                    complexity=complexity,
                )
                context_parts.append(f"\nScreen analysis: {vision_result.content}")

                # Track vision costs
                if ENABLE_COST_TRACKING and self.tenant_id:
                    await self.backend.track_usage(
                        self.tenant_id,
                        self.user_id,
                        vision_result.provider.value,
                        vision_result.tokens_used,
                        vision_result.cost_estimate,
                    )

            # Generate LLM response
            llm_result = await llm_processor.process(
                query,
                self.conversation_history,
                complexity=complexity,
            )

            # Track LLM costs
            if ENABLE_COST_TRACKING and self.tenant_id:
                await self.backend.track_usage(
                    self.tenant_id,
                    self.user_id,
                    llm_result.provider.value,
                    llm_result.tokens_used,
                    llm_result.cost_estimate,
                )

            # Update conversation history
            self.conversation_history.append({"role": "user", "content": query})
            self.conversation_history.append({"role": "assistant", "content": llm_result.content})

            # Send response to room
            await self.send_message(llm_result.content)

            logger.info(
                f"Response sent - Provider: {llm_result.provider.value}, "
                f"Tokens: {llm_result.tokens_used}, Cost: ${llm_result.cost_estimate:.6f}"
            )

        except Exception as e:
            logger.error(f"Failed to process query: {e}")
            await self.send_message(
                "I'm sorry, I encountered an error processing your request. "
                "Please try again."
            )

    async def send_message(self, message: str):
        """
        Send text message to room
        """
        await self.room.local_participant.publish_data(
            message.encode("utf-8"),
            reliable=True,
        )
        logger.info(f"Sent message: {message[:100]}...")


async def entrypoint(ctx: JobContext):
    """
    Agent entry point - called when agent joins a room
    """
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Initialize agent
    agent = MultiModalAgent(ctx)

    # Extract tenant context from room metadata
    await agent.extract_tenant_context()

    # Connect to room with AutoSubscribe
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Register track subscription handler
    ctx.room.on("track_subscribed", agent.handle_track_subscribed)

    logger.info("Agent ready and listening for tracks")

    # Send welcome message
    await agent.send_message(
        "AI Assistant has joined the meeting. "
        "I can help with screen analysis and voice interaction."
    )


if __name__ == "__main__":
    # Run agent with CLI
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
            ws_url=os.getenv("LIVEKIT_URL"),
        )
    )
