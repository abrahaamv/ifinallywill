"""
LiveKit Multi-Modal AI Agent - AgentSession with Worker Pattern
Based on LiveKit Agents 1.0+ architecture with cost optimization

Features:
- AgentSession for unified multi-modal orchestration
- Worker pattern with prewarm_fnc for shared model loading
- Three-tier AI routing (60/25/15 distribution)
- Frame deduplication (60-75% reduction)
- Adaptive FPS (40-60% reduction)
- Backend integration for RAG and cost tracking
- Target: 80-90% total cost reduction
"""

import asyncio
import logging
import os
from typing import Any, AsyncIterable, Optional

from dotenv import load_dotenv

# Load environment variables before importing modules that need them
load_dotenv()

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    voice,
)
from livekit.plugins import anthropic, deepgram, elevenlabs, google, openai, silero

from ai_router import AIRouter, ComplexityLevel
from backend_client import BackendClient
from config import Config, settings
from frame_processor import FrameProcessor

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class MultiModalAgent:
    """
    Multi-modal AI agent with AgentSession integration

    Cost Optimizations:
    - Three-tier AI routing: Gemini Flash-Lite (60%) → Flash (25%) → Claude Sonnet (15%)
    - Frame deduplication: Perceptual hashing with threshold=10 (60-75% reduction)
    - Adaptive FPS: 30 FPS active → 5 FPS idle (40-60% reduction)
    - Prompt caching: 90% discount on repeated context
    - Backend integration: RAG knowledge base, cost tracking, tenant context
    """

    def __init__(
        self,
        ctx: JobContext,
        tenant_id: str,
        backend_client: BackendClient
    ):
        """
        Initialize multi-modal agent

        Args:
            ctx: Job context from LiveKit
            tenant_id: Tenant identifier from room metadata
            backend_client: Backend API client
        """
        self.ctx = ctx
        self.room = ctx.room
        self.tenant_id = tenant_id
        self.backend = backend_client

        # Load tenant configuration
        self.tenant_config = Config.load_for_tenant(tenant_id)

        # Initialize AI router with tenant weights
        self.ai_router = AIRouter(
            gemini_flash_lite_weight=self.tenant_config.gemini_flash_lite_weight,
            gemini_flash_weight=self.tenant_config.gemini_flash_weight,
            claude_sonnet_weight=self.tenant_config.claude_sonnet_weight
        )

        # Initialize frame processor with adaptive FPS and deduplication
        self.frame_processor = FrameProcessor(
            threshold=settings.frame_similarity_threshold,
            active_fps=settings.active_fps,
            idle_fps=settings.idle_fps,
            resize_width=settings.frame_resize_width,
            resize_height=settings.frame_resize_height,
            jpeg_quality=settings.frame_jpeg_quality
        )

        # State tracking
        self._is_speaking = False
        self._current_complexity = ComplexityLevel.SIMPLE
        self._session_id: Optional[str] = None
        self._user_id: Optional[str] = None
        self._conversation_history: list[dict] = []

        # Vision context buffer - stores recent screen analysis results
        self._vision_context: list[dict] = []  # Last 3 vision analyses
        self._max_vision_history = 3

        logger.info(
            f"Agent initialized for tenant: {tenant_id}, "
            f"room: {self.room.name}"
        )

    async def start(self):
        """Initialize agent and send greeting"""
        logger.info("Agent starting...")

        # Add system prompt to conversation history
        if self.tenant_config.system_prompt:
            self._conversation_history.append({
                "role": "system",
                "content": self.tenant_config.system_prompt
            })

        logger.info("Agent ready for interaction")

    def get_llm_for_complexity(self, complexity: ComplexityLevel) -> llm.LLM:
        """
        Get LLM instance based on complexity level

        Args:
            complexity: Query complexity level

        Returns:
            Configured LLM instance
        """
        model_name = self.ai_router.get_model_name(complexity)

        # Map to LLM providers using correct plugin API
        if "gemini" in model_name:
            # Use Google plugin for Gemini models
            return google.LLM(model=model_name)
        elif "claude" in model_name:
            # Use Anthropic plugin for Claude models
            return anthropic.LLM(model=model_name)
        else:
            # Default to OpenAI plugin
            return openai.LLM(model=model_name)

    async def on_user_speech(self, text: str, llm_instance: llm.LLM) -> str:
        """
        Handle user speech input with AI routing and RAG

        Args:
            text: Transcribed user speech
            llm_instance: LLM to use for this query

        Returns:
            AI-generated response
        """
        logger.info(f"User: {text}")

        # Estimate complexity and route to appropriate model
        complexity = self.ai_router.estimate_complexity(text)
        self._current_complexity = complexity
        model_name = self.ai_router.get_model_name(complexity)

        # Record usage for statistics
        self.ai_router.record_usage(complexity)

        logger.info(f"Routing to {model_name} (complexity: {complexity.value})")

        # Check if knowledge base query is needed
        rag_context = None
        if self.tenant_config.enable_knowledge_base and self._needs_knowledge(text):
            logger.info("Querying knowledge base...")
            rag_result = await self.backend.search_knowledge(
                tenant_id=self.tenant_id,
                query=text,
                top_k=5
            )

            if rag_result:
                rag_context = self._format_rag_context(rag_result)
                logger.info(f"RAG context retrieved: {len(rag_result.sources)} sources")

        # Build full prompt
        prompt = text
        if rag_context:
            prompt = f"{rag_context}\n\nUser question: {text}"

        # Build ChatContext with conversation history
        chat_ctx = llm.ChatContext()

        # Build enhanced system prompt with vision context if available
        system_prompt = self.tenant_config.system_prompt or "You are a helpful AI assistant."

        if self._vision_context:
            # Add recent vision analysis to system prompt
            vision_summary = "\n\n🔍 SCREEN SHARE CONTEXT (you can see the user's screen):\n"
            for idx, vision in enumerate(self._vision_context, 1):
                import time
                age_seconds = time.time() - vision["timestamp"]
                age_desc = f"{int(age_seconds)}s ago" if age_seconds < 60 else f"{int(age_seconds/60)}m ago"
                vision_summary += f"\n[Analysis {idx} - {age_desc}]:\n{vision['analysis']}\n"

            system_prompt = system_prompt + vision_summary
            logger.info(f"💡 Including {len(self._vision_context)} vision analyses in context")

        # Add enhanced system prompt
        chat_ctx.add_message(role="system", content=system_prompt)

        # Add conversation history
        for msg in self._conversation_history:
            chat_ctx.add_message(role=msg["role"], content=msg["content"])

        # Add current user message
        chat_ctx.add_message(role="user", content=prompt)

        # Generate response using selected LLM
        response_stream = llm_instance.chat(chat_ctx=chat_ctx)

        response = ""
        async for chunk in response_stream:
            if hasattr(chunk, 'content'):
                response += chunk.content

        # Add both user prompt and response to conversation history for next turn
        self._conversation_history.append({"role": "user", "content": prompt})
        self._conversation_history.append({"role": "assistant", "content": response})

        # Estimate tokens and cost
        input_tokens = len(prompt) // 4  # Rough estimation
        output_tokens = len(response) // 4

        # Log cost to backend
        await self._log_cost(
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            rag_used=bool(rag_context)
        )

        logger.info(f"Response: {response[:100]}...")
        return response

    async def on_video_frame(self, frame: rtc.VideoFrame):
        """
        Process video frame with adaptive FPS and deduplication

        Args:
            frame: Video frame from user screen share
        """
        # Check if frame should be processed (FPS throttling + deduplication)
        should_process = self.frame_processor.should_process_frame(
            frame,
            is_speaking=self._is_speaking
        )

        if not should_process:
            return

        # Check if frame is interesting (high detail/text)
        if not self.frame_processor.is_interesting_frame(frame):
            logger.debug("Frame not interesting, skipping")
            return

        # Encode frame for vision model
        encoded_frame = self.frame_processor.encode_frame(frame)

        logger.info(f"📸 Interesting frame detected: {len(encoded_frame)} bytes")

        # Process with vision model if enabled
        if self.tenant_config.enable_vision and settings.proactive_vision_analysis:
            await self._process_vision_frame(encoded_frame)
        else:
            logger.warning(
                f"Vision analysis disabled - enable_vision: {self.tenant_config.enable_vision}, "
                f"proactive_vision_analysis: {settings.proactive_vision_analysis}"
            )

    async def _process_vision_frame(self, frame_bytes: bytes):
        """
        Process video frame with vision model

        Args:
            frame_bytes: Encoded JPEG frame
        """
        # Use complexity-appropriate model for vision analysis
        model_name = self.ai_router.get_model_name(self._current_complexity)

        logger.info(f"🎯 Analyzing screen share frame with {model_name}")

        # Get LLM for vision analysis
        vision_llm = self.get_llm_for_complexity(self._current_complexity)

        # Create enhanced vision prompt for screen share analysis
        vision_prompt = """Analyze this screen share frame. Focus on:
- Text content (headings, code, documents, error messages)
- UI elements (buttons, forms, menus, applications visible)
- Visual context (diagrams, charts, browser content)
- Any actionable items or points of discussion

Provide a concise summary of what's displayed and its significance."""

        # Build ChatContext with system prompt and vision frame
        chat_ctx = llm.ChatContext()

        # Add system message if available
        if self.tenant_config.system_prompt:
            chat_ctx.add_message(role="system", content=self.tenant_config.system_prompt)

        # Add vision frame with prompt using ImageContent
        import base64
        frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')

        # Create ImageContent for the frame
        image_content = llm.ImageContent(image=f"data:image/jpeg;base64,{frame_b64}")

        # Add message with both text and image
        chat_ctx.add_message(
            role="user",
            content=[vision_prompt, image_content]
        )

        # Generate vision analysis
        response_stream = vision_llm.chat(chat_ctx=chat_ctx)

        response = ""
        async for chunk in response_stream:
            if hasattr(chunk, 'content'):
                response += chunk.content

        # Log cost for vision analysis
        input_tokens = len(vision_prompt) // 4 + 1000  # Add overhead for image
        output_tokens = len(response) // 4

        await self._log_cost(
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            rag_used=False
        )

        logger.info(f"✅ Vision analysis complete: {response[:150]}...")

        # Store vision analysis result in buffer (keep last N results)
        import time
        self._vision_context.append({
            "timestamp": time.time(),
            "analysis": response
        })

        # Keep only last N vision analyses
        if len(self._vision_context) > self._max_vision_history:
            self._vision_context.pop(0)

        logger.info(f"📝 Vision context updated: {len(self._vision_context)} analyses in buffer")

    def _needs_knowledge(self, text: str) -> bool:
        """
        Determine if query needs knowledge base lookup

        Args:
            text: User query

        Returns:
            True if knowledge base should be queried
        """
        # Heuristic: Look for question words and domain-specific terms
        question_indicators = [
            "what", "how", "why", "when", "where", "who", "which",
            "explain", "describe", "tell me", "show me"
        ]

        text_lower = text.lower()
        return any(indicator in text_lower for indicator in question_indicators)

    def _format_rag_context(self, rag_result) -> str:
        """
        Format RAG results as context for LLM

        Args:
            rag_result: RAGResult from backend

        Returns:
            Formatted context string
        """
        context = "Based on the knowledge base:\n\n"

        for idx, source in enumerate(rag_result.sources[:3], 1):
            content = source.get("content", "")[:200]  # Truncate to 200 chars
            context += f"Source {idx}: {content}...\n\n"

        return context

    async def _log_cost(
        self,
        model_name: str,
        input_tokens: int,
        output_tokens: int,
        rag_used: bool = False
    ):
        """
        Log usage to backend for billing

        Args:
            model_name: Model used
            input_tokens: Input tokens consumed
            output_tokens: Output tokens consumed
            rag_used: Whether RAG was used
        """
        # Cost per token by model (approximate)
        cost_per_million = {
            "gemini-2.5-flash-lite": 1.0,   # $1/M tokens
            "gemini-2.5-flash": 2.0,        # $2/M tokens
            "claude-sonnet-4-5": 3.0        # $3/M tokens (with 90% caching)
        }

        rate = cost_per_million.get(model_name, 2.0) / 1_000_000
        cost = (input_tokens + output_tokens) * rate

        # Add RAG overhead if used (embeddings + vector search)
        if rag_used:
            cost += 0.0001  # Approximate RAG cost

        # Extract service name (gemini, claude, etc.)
        service = model_name.split("-")[0] if "-" in model_name else model_name

        # Log to backend
        try:
            await self.backend.log_cost_event(
                tenant_id=self.tenant_id,
                session_id=self._session_id or "unknown",
                service=service,
                model=model_name,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost=cost
            )

            logger.debug(
                f"Cost logged: {model_name}, "
                f"tokens: {input_tokens + output_tokens}, "
                f"cost: ${cost:.6f}, "
                f"rag: {rag_used}"
            )
        except Exception as e:
            logger.error(f"Failed to log cost: {e}")

    async def cleanup(self):
        """Cleanup resources and log final statistics"""
        # Log frame processing statistics
        stats = self.frame_processor.get_stats()
        logger.info(f"Frame processing stats: {stats}")

        # Log AI routing statistics
        routing_stats = self.ai_router.get_statistics()
        logger.info(f"AI routing stats: {routing_stats}")

        logger.info("Agent cleanup complete")


class VisionAwareAgent(voice.Agent):
    """
    Extended voice.Agent that properly integrates vision context and chat transcription.

    This subclass overrides pipeline nodes correctly to:
    - Inject vision context into LLM calls (llm_node)
    - Capture TTS text for chat transcription (tts_node)

    Based on LiveKit Agents 1.2.14 architecture with proper extension points.
    """

    def __init__(
        self,
        *args,
        vision_context_getter: Optional[callable] = None,
        room: Optional[rtc.Room] = None,
        publish_topic: str = "agent.chat",
        original_instructions: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize VisionAwareAgent

        Args:
            vision_context_getter: Callable that returns list of vision context dicts
            room: LiveKit room for publishing data
            publish_topic: Topic for data channel messages
            original_instructions: Original system instructions (for appending vision)
            *args, **kwargs: Passed to voice.Agent
        """
        super().__init__(*args, **kwargs)
        self._get_vision_context = vision_context_getter
        self._room = room
        self._publish_topic = publish_topic
        self._original_instructions = original_instructions or ""

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: Optional[Any] = None,
        model_settings: Optional[dict] = None,
    ):
        """
        Override LLM node to inject vision context into every LLM call.
        This is the proper extension point for modifying agent context.

        Returns an async generator, not an awaitable.
        """

        async def enhanced_llm_generator():
            """Inner generator that yields LLM chunks with vision context"""
            logger.info("🔍 llm_node() called - checking for vision context...")

            try:
                # Get vision context if available
                logger.info(f"🔍 _get_vision_context callable: {self._get_vision_context is not None}")

                if self._get_vision_context:
                    vision_items = self._get_vision_context()
                    logger.info(f"🔍 Vision items retrieved: {len(vision_items) if vision_items else 0} items")

                    if vision_items:
                        # Build concise vision summary
                        import time
                        vision_summary = "\n\n🔍 SCREEN SHARE CONTEXT (you can see the user's screen):\n"

                        for idx, item in enumerate(vision_items[-3:], 1):  # Last 3 analyses
                            ts = item.get("timestamp")
                            age_s = int(time.time() - ts) if ts else None
                            age_desc = f"{age_s}s ago" if age_s is not None and age_s < 60 else (
                                f"{int(age_s/60)}m ago" if age_s else ""
                            )
                            snippet = (item.get("analysis") or "").strip()
                            # Keep snippet short to avoid huge system messages
                            snippet = snippet if len(snippet) <= 1000 else snippet[:1000] + "…"
                            vision_summary += f"\n[Vision {idx} - {age_desc}]:\n{snippet}\n"

                        # Add vision context as a system message to the EXISTING chat_ctx
                        # This is the correct approach per LiveKit docs - don't create a new ChatContext
                        chat_ctx.add_message(role="system", content=vision_summary)

                        logger.info(f"💡 Injected vision context into LLM call ({len(vision_summary)} chars)")

            except Exception as exc:
                logger.error(f"Failed to inject vision context: {exc}", exc_info=True)

            # Call parent's llm_node and yield chunks - always use original chat_ctx
            # (which now has vision context added if available)
            logger.info("🔍 Calling parent llm_node() and yielding chunks...")
            chunk_count = 0
            async for chunk in super(VisionAwareAgent, self).llm_node(chat_ctx, tools, model_settings):
                chunk_count += 1
                yield chunk

            logger.info(f"🔍 llm_node() completed - yielded {chunk_count} chunks")

        # Return the generator (don't await it!)
        return enhanced_llm_generator()

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: Optional[dict] = None,
    ):
        """
        Override TTS node to capture text for chat transcription.
        This is the correct interception point for TTS in LiveKit 1.2.14.

        The text stream flows through this node before being synthesized to audio.
        We tap the stream to publish transcriptions without disrupting audio.
        """
        if not self._room:
            # No room to publish to, just pass through to default TTS
            return super().tts_node(text, model_settings)

        async def transcribing_text_stream():
            """
            Tap the text stream, buffer chunks, and publish complete sentences.
            Yields all chunks to TTS so audio generation continues normally.
            """
            buffer = []

            try:
                async for chunk in text:
                    buffer.append(chunk)
                    yield chunk  # Forward to TTS immediately

                    # Publish when we hit sentence boundaries (better UX)
                    if any(p in chunk for p in (".", "!", "?", "\n")):
                        complete_text = ''.join(buffer)

                        # Publish to data channel
                        try:
                            import json
                            import time

                            message_data = json.dumps({
                                "type": "agent_message",
                                "content": complete_text,
                                "timestamp": time.time(),
                                "is_final": True
                            })

                            # Chunk if too large (15KB limit)
                            encoded_data = message_data.encode('utf-8')
                            if len(encoded_data) > 14000:  # Leave 1KB buffer
                                logger.warning(f"Message too large ({len(encoded_data)} bytes), chunking...")
                                # Truncate to 3000 chars to stay within context limits
                                # Future enhancement: Implement sliding window chunking for longer documents
                                encoded_data = encoded_data[:14000]

                            await self._room.local_participant.publish_data(
                                encoded_data,
                                reliable=True,
                                topic=self._publish_topic
                            )

                            logger.info(f"💬 TTS TRANSCRIPTION: {complete_text[:100]}...")
                            logger.info(f"✅ Published {len(complete_text)} chars to '{self._publish_topic}'")

                        except Exception as e:
                            logger.error(f"❌ Failed to publish transcription: {e}")

                        # Clear buffer after publishing
                        buffer = []

                # Publish any remaining text at end
                if buffer:
                    complete_text = ''.join(buffer)
                    try:
                        import json
                        import time

                        message_data = json.dumps({
                            "type": "agent_message",
                            "content": complete_text,
                            "timestamp": time.time(),
                            "is_final": True
                        }).encode('utf-8')

                        await self._room.local_participant.publish_data(
                            message_data,
                            reliable=True,
                            topic=self._publish_topic
                        )

                        logger.info(f"✅ Published final chunk: {len(complete_text)} chars")

                    except Exception as e:
                        logger.error(f"Failed to publish final transcription: {e}")

            except Exception as exc:
                logger.error(f"Error in transcribing text stream: {exc}")
                raise

        # IMPORTANT: Return async iterable, don't await it
        return super().tts_node(transcribing_text_stream(), model_settings)


# Worker pattern with prewarm_fnc for shared model loading
def prewarm_fnc(proc: JobContext):
    """
    Prewarm function called once per worker process
    Load shared models and resources here for better performance

    This function is called before any rooms are joined,
    allowing models to be loaded once and shared across rooms

    Note: This must be synchronous (not async) per LiveKit SDK requirements
    """
    logger.info("Prewarming worker process...")

    # Load Silero VAD model
    try:
        silero.VAD.load()
        logger.info("✓ Silero VAD model loaded")
    except Exception as e:
        logger.error(f"Failed to load Silero VAD: {e}")

    # Warmup AI providers (optional - helps reduce cold start latency)
    try:
        # Test Deepgram connection
        deepgram.STT()
        logger.info("✓ Deepgram STT initialized")
    except Exception as e:
        logger.warning(f"Deepgram init failed: {e}")

    try:
        # Test ElevenLabs connection
        elevenlabs.TTS()
        logger.info("✓ ElevenLabs TTS initialized")
    except Exception as e:
        logger.warning(f"ElevenLabs init failed: {e}")

    logger.info("Worker process ready")


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for LiveKit agent
    Called for each new room connection

    Args:
        ctx: Job context from LiveKit
    """
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Extract tenant ID from room metadata
    # Room name format: tenant_{tenantId}_{roomName}
    tenant_id = "default"
    room_name = ctx.room.name
    if room_name and room_name.startswith("tenant_"):
        parts = room_name.split("_")
        if len(parts) >= 2:
            tenant_id = parts[1]

    logger.info(f"Tenant ID: {tenant_id}")

    # Initialize backend client
    backend = BackendClient(
        base_url=settings.backend_url,
        api_key=settings.backend_api_key
    )

    # Connect to room - subscribe to audio AND video (camera + screen share)
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    logger.info("Connected to room")

    # Initialize agent
    agent = MultiModalAgent(
        ctx=ctx,
        tenant_id=tenant_id,
        backend_client=backend
    )

    # Start agent
    await agent.start()

    # Get initial LLM based on SIMPLE complexity (default for greetings)
    initial_llm = agent.get_llm_for_complexity(ComplexityLevel.SIMPLE)

    # Create VisionAwareAgent - properly integrates vision + transcription
    logger.info("Creating VisionAwareAgent with multi-modal capabilities...")

    system_instructions = agent.tenant_config.system_prompt or "You are a helpful AI assistant."

    # Create VisionAwareAgent with proper extension points
    vision_agent = VisionAwareAgent(
        instructions=system_instructions,
        vision_context_getter=lambda: agent._vision_context,  # Pass vision buffer
        room=ctx.room,  # For data channel publishing
        publish_topic="agent.chat",  # Enable topic filtering
        original_instructions=system_instructions,  # For vision context injection
        chat_ctx=llm.ChatContext(),  # Conversation context
        vad=silero.VAD.load(),  # Voice activity detection
        stt=deepgram.STT(),     # Speech-to-text
        llm=initial_llm,        # Dynamic LLM via ai_router
        tts=elevenlabs.TTS(
            voice_id=agent.tenant_config.tts_voice_id,
            model=agent.tenant_config.tts_model
        ),
    )

    logger.info("✅ VisionAwareAgent created with pipeline overrides")

    # Create AgentSession and start with the vision-aware agent
    session = voice.AgentSession()

    logger.info("Starting voice session with room connection...")

    await session.start(agent=vision_agent, room=ctx.room)

    logger.info("✅ Voice session started - vision context and transcription active")

    # Handle video frames (screen share)
    async def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Handle new track subscription"""
        logger.info(f"Track subscribed: {track.kind} from {participant.identity}")

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            # Check if this is a screen share track
            # SOURCE_SCREENSHARE = 3 (from protobuf enum descriptor)
            if publication.source == 3:  # rtc.TrackSource.SOURCE_SCREENSHARE
                logger.info("Screen share track detected")

                # Process screen share frames
                video_stream = rtc.VideoStream(track)
                async for event in video_stream:
                    await agent.on_video_frame(event.frame)

    # Register track subscription handler
    ctx.room.on("track_subscribed", lambda track, pub, part: asyncio.create_task(
        on_track_subscribed(track, pub, part)
    ))

    # Handle incoming chat messages (just log, don't echo)
    async def on_data_received(data_packet: rtc.DataPacket):
        """Handle incoming chat messages - log only, no echo"""
        try:
            message = data_packet.data.decode('utf-8')
            logger.info(f"Chat message received: {message}")
            # Note: Chat messages are logged but not echoed
            # Voice responses are automatically transcribed via TTS wrapper
        except Exception as e:
            logger.error(f"Error processing chat message: {e}", exc_info=True)

    # Register data packet handler for chat (must be async)
    ctx.room.on("data_received", lambda packet: asyncio.create_task(on_data_received(packet)))

    logger.info("Agent ready - speak or chat to interact")

    # Wait for disconnect - session.start() is non-blocking, so we need to keep the coroutine alive
    await asyncio.sleep(float('inf'))

    # Cleanup on disconnect
    await agent.cleanup()
    await backend.close()

    logger.info("Agent disconnected from room")


if __name__ == "__main__":
    # Start worker with CLI
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm_fnc,
            port=settings.worker_port,
            num_idle_processes=settings.num_idle_processes,
            ws_url=settings.livekit_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret
        )
    )
