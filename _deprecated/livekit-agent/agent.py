"""
LiveKit Multi-Modal AI Agent - Gemini Live API Integration
Simplified implementation using LiveKit's official Gemini plugin

Features:
- Native Gemini Live API integration via livekit-plugins-google
- Sub-500ms audio latency (vs 2-5s with manual STT→LLM→TTS)
- Automatic video processing from room tracks
- Built-in interruption support
- RAG integration via function calling
- ~95% less code than manual implementation

Replaces:
- Manual STT (Deepgram) → LLM (GPT/Claude/Gemini) → TTS (Cartesia)
- FrameProcessor (pHash, deduplication)
- AIRouter (tier selection)
- VisionAwareAgent (manual context injection)

With:
- google.realtime.RealtimeModel (handles everything)
- Function tools for RAG knowledge base queries
"""

import asyncio
import logging
import os
from typing import Optional

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
from livekit.agents.llm import function_tool
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


def create_rag_tool(backend: BackendClient, tenant_id: str):
    """
    Create a RAG search function tool with access to backend and tenant context.

    This factory pattern allows the function tool to access the backend client
    and tenant_id without global variables.
    """

    @function_tool
    async def search_knowledge_base(
        query: str,
        top_k: int = 5
    ) -> str:
        """
        Search the knowledge base for relevant information about the user's question.

        Use this tool when the user asks questions that might be answered by:
        - Company documentation or policies
        - Product information or features
        - FAQs or help articles
        - Technical specifications
        - Procedures or how-to guides

        Do NOT use this for:
        - General conversation or greetings
        - Questions about what's on the screen (use vision instead)
        - Math calculations or logic puzzles
        - Personal opinions or creative tasks

        Args:
            query: The search query extracted from user's question
            top_k: Number of results to retrieve (default 5)

        Returns:
            Relevant context from the knowledge base, or a message if nothing found
        """
        logger.info(f"🔍 RAG query: '{query}' (top_k={top_k})")

        try:
            result = await backend.search_knowledge(
                tenant_id=tenant_id,
                query=query,
                top_k=top_k
            )

            if result and result.sources:
                logger.info(f"✅ RAG found {len(result.sources)} sources (confidence: {result.confidence:.2f})")

                # Format context for Gemini
                context_parts = [
                    "Here is relevant information from the knowledge base:\n"
                ]

                for i, source in enumerate(result.sources[:top_k], 1):
                    content = source.get("content", "")[:500]  # Limit content length
                    doc_title = source.get("documentTitle", "Unknown")
                    context_parts.append(f"[{i}] From '{doc_title}':\n{content}\n")
                    # Debug: log first source details
                    if i == 1:
                        logger.info(f"📄 First source title: '{doc_title}'")
                        logger.info(f"📄 First source content preview: '{content[:100]}...'")

                final_context = "\n".join(context_parts)
                logger.info(f"📤 Returning {len(final_context)} chars to Gemini")
                return final_context
            else:
                logger.info("❌ RAG found no relevant results")
                return "No relevant information found in the knowledge base for this question."

        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return f"Unable to search knowledge base: {str(e)}"

    return search_knowledge_base


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

    # Add RAG instructions if knowledge base is enabled
    rag_instructions = ""
    enable_rag = getattr(tenant_config, 'enable_knowledge_base', True)  # Default to enabled
    if enable_rag:
        rag_instructions = """

KNOWLEDGE BASE ACCESS:
You have access to a knowledge base through the search_knowledge_base tool.

IMPORTANT - How to use the knowledge base:
1. When users ask questions about the product, company, or documentation, ALWAYS use the search_knowledge_base tool first
2. When the tool returns information, you MUST use that information to answer the user's question
3. The tool results are YOUR source of truth - treat them as factual information you can share
4. Summarize and explain the information from the tool results in a helpful, conversational way
5. If the tool returns "No relevant information found", ONLY THEN say you don't have that information

DO NOT say "I don't have information about that" when the tool HAS returned relevant results.
DO use the tool results to provide a complete, helpful answer.
"""

    # Add conversation history context if available
    history_context = ""
    if tenant_config.conversation_history:
        history_context = "\n\n[Previous conversation context - for continuity]:\n"
        for msg in tenant_config.conversation_history[-5:]:  # Last 5 messages
            role_label = "User" if msg.role == "user" else "Assistant"
            history_context += f"{role_label}: {msg.content[:100]}...\n"
        history_context += "\n[Continue the conversation naturally from this context]\n"

    full_instructions = system_instructions + rag_instructions + history_context

    logger.info("Creating Agent with Gemini Live API...")
    logger.info(f"Model: gemini-2.0-flash-live-001")
    logger.info(f"Voice: Puck")
    logger.info(f"RAG enabled: {enable_rag}")
    logger.info(f"Instructions: {full_instructions[:100]}...")

    # Create RAG tool if enabled
    tools = []
    if enable_rag:
        rag_tool = create_rag_tool(backend, tenant_id)
        tools.append(rag_tool)
        logger.info("📚 RAG tool registered: search_knowledge_base")

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
        tools=tools if tools else None,  # Pass tools only if we have any
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
    if enable_rag:
        logger.info("   - Ask factual questions to test RAG integration")

    # Cost tracking note
    logger.info("💰 Cost tracking: Using Gemini Live API pricing")
    logger.info("   - Input: $0.075/1M tokens")
    logger.info("   - Output: $0.30/1M tokens")
    logger.info("   - Audio: Native (no separate STT/TTS costs)")
    if enable_rag:
        logger.info("   - RAG: ~200-500ms added latency when knowledge base is queried")

    # Keep alive - session handles everything
    while True:
        await asyncio.sleep(60)
        logger.debug("Agent still running...")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
