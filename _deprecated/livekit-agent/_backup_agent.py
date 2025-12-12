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
from livekit.agents.llm import function_tool  # Function calling support (Phase 13+)
from livekit.plugins import anthropic, cartesia, deepgram, google, openai, silero

from ai_router import AIRouter, ComplexityLevel
from backend_client import BackendClient
from config import Config, TenantConfig, settings
from frame_processor import FrameProcessor

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# =============================================================================
# FUNCTION CALLING TOOLS (Phase 13+ - Infrastructure Ready)
# =============================================================================
#
# CURRENT STATUS (Phase 10-12):
# - Core operations (RAG search, cost logging) remain HARDCODED for optimal performance
# - Infrastructure ready for Phase 13+ external integrations
# - New tools added here will be automatically available to LLM
#
# WHEN TO ADD NEW TOOLS:
# - Phase 13+: External integrations (Salesforce, Zendesk, Calendar, Payment)
# - Multi-step workflows requiring conditional execution
# - Agent SDK launch requiring developer-friendly tool definitions
#
# PATTERN FOR NEW TOOLS:
# @function_tool
# async def your_tool_name(
#     param1: str,
#     param2: int = 5
# ) -> str:
#     """
#     Tool description shown to LLM.
#
#     Args:
#         param1: Description of param1
#         param2: Description of param2 with default
#
#     Returns:
#         Description of return value
#     """
#     # Implementation
#     return result
#
# Then pass to VisionAwareAgent: tools=[your_tool_name]
# =============================================================================

# Example placeholder tools for Phase 13+ (currently unused)

# @function_tool
# async def create_zendesk_ticket(
#     subject: str,
#     description: str,
#     priority: str = "normal"
# ) -> str:
#     """
#     Create a support ticket in Zendesk when escalation is needed.
#
#     Args:
#         subject: Ticket subject line
#         description: Detailed problem description
#         priority: Ticket priority (low, normal, high, urgent)
#
#     Returns:
#         Ticket ID and confirmation message
#     """
#     # Phase 13+ implementation
#     logger.info(f"Creating Zendesk ticket: {subject}")
#     # ticket_id = await zendesk_client.create_ticket(...)
#     # return f"Ticket #{ticket_id} created successfully"
#     return "Tool not yet implemented (Phase 13+)"


# @function_tool
# async def schedule_appointment(
#     date: str,
#     time: str,
#     duration_minutes: int = 30
# ) -> str:
#     """
#     Schedule an appointment in the calendar system.
#
#     Args:
#         date: Appointment date (YYYY-MM-DD format)
#         time: Appointment time (HH:MM format, 24-hour)
#         duration_minutes: Meeting duration in minutes
#
#     Returns:
#         Confirmation with appointment details
#     """
#     # Phase 13+ implementation
#     logger.info(f"Scheduling appointment: {date} at {time}")
#     # appointment_id = await calendar_client.create_appointment(...)
#     # return f"Appointment scheduled for {date} at {time}"
#     return "Tool not yet implemented (Phase 13+)"


# @function_tool
# async def update_crm_contact(
#     contact_id: str,
#     field: str,
#     value: str
# ) -> str:
#     """
#     Update contact information in CRM (Salesforce/HubSpot).
#
#     Args:
#         contact_id: Unique contact identifier
#         field: Field to update (email, phone, address, etc.)
#         value: New value for the field
#
#     Returns:
#         Confirmation of update
#     """
#     # Phase 13+ implementation
#     logger.info(f"Updating CRM contact {contact_id}: {field} = {value}")
#     # await crm_client.update_contact(...)
#     # return f"Contact {contact_id} updated successfully"
#     return "Tool not yet implemented (Phase 13+)"


# List of tools to pass to VisionAwareAgent
# Phase 10-12: Empty list (use hardcoded operations)
# Phase 13+: Uncomment tools above and add to this list
AVAILABLE_TOOLS = [
    # Placeholder for Phase 13+ tools
    # create_zendesk_ticket,
    # schedule_appointment,
    # update_crm_contact,
]


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
        backend_client: BackendClient,
        initial_config: Optional[TenantConfig] = None
    ):
        """
        Initialize multi-modal agent

        Args:
            ctx: Job context from LiveKit
            tenant_id: Tenant identifier from room metadata
            backend_client: Backend API client
            initial_config: Pre-loaded tenant/session config (for unified widget transitions)
        """
        self.ctx = ctx
        self.room = ctx.room
        self.tenant_id = tenant_id
        self.backend = backend_client

        # Use provided config or load from tenant
        # initial_config is used when transitioning from chat to video mode
        # It contains conversation history and AI personality from the chat session
        if initial_config:
            self.tenant_config = initial_config
            logger.info(
                f"Using pre-loaded config: personality={initial_config.personality_name}, "
                f"session={initial_config.session_id}"
            )
        else:
            self.tenant_config = Config.load_for_tenant(tenant_id)

        # Initialize AI router with tenant weights
        self.ai_router = AIRouter(
            gemini_flash_lite_weight=self.tenant_config.gemini_flash_lite_weight,
            gemini_flash_weight=self.tenant_config.gemini_flash_weight,
            claude_sonnet_weight=self.tenant_config.claude_sonnet_weight
        )

        # Initialize frame processor with adaptive FPS and deduplication
        # Use realtime_vision_mode settings for faster updates when enabled
        force_capture_interval = (
            settings.realtime_capture_interval
            if settings.realtime_vision_mode
            else settings.normal_capture_interval
        )
        self.frame_processor = FrameProcessor(
            threshold=settings.frame_similarity_threshold,
            active_fps=settings.active_fps,
            idle_fps=settings.idle_fps,
            resize_width=settings.frame_resize_width,
            resize_height=settings.frame_resize_height,
            jpeg_quality=settings.frame_jpeg_quality,
            force_capture_interval=force_capture_interval,
            realtime_mode=settings.realtime_vision_mode
        )

        # Vision-on-speech: capture fresh frame when user speaks
        self._vision_on_speech = settings.vision_on_speech
        self._pending_fresh_capture = False

        # Track if vision analysis is in progress (to avoid overlapping calls)
        self._vision_analysis_in_progress = False

        logger.info(
            f"Frame processor: realtime_mode={settings.realtime_vision_mode}, "
            f"force_capture_interval={force_capture_interval}s, "
            f"vision_on_speech={settings.vision_on_speech}"
        )

        # State tracking
        self._is_speaking = False
        self._current_complexity = ComplexityLevel.SIMPLE
        self._session_id: Optional[str] = None
        self._user_id: Optional[str] = None
        self._conversation_history: list[dict] = []

        # Vision context buffer - stores recent screen analysis results
        # Keep only the latest 1 since we only use the most recent analysis
        # (old analyses can confuse the agent when user changes tabs)
        self._vision_context: list[dict] = []
        self._max_vision_history = 1  # Only keep latest

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

        # Load conversation history from session context (unified widget transition)
        # This ensures the agent continues the conversation seamlessly when
        # transitioning from chat mode to video/screen share mode
        if self.tenant_config.conversation_history:
            for msg in self.tenant_config.conversation_history:
                self._conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
            logger.info(
                f"Loaded {len(self.tenant_config.conversation_history)} messages "
                f"from prior chat session"
            )

        # Store session ID if available
        if self.tenant_config.session_id:
            self._session_id = self.tenant_config.session_id
            logger.info(f"Session ID set: {self._session_id}")

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

    async def trigger_fresh_vision_capture(self):
        """
        Trigger an immediate fresh vision capture.
        Called when user speaks to ensure we have the latest screen content.
        """
        if not self._vision_on_speech:
            return

        logger.info("🎤 User speech detected - triggering fresh vision capture")
        self._pending_fresh_capture = True

        # If we have a recent stored frame, use it immediately
        frame_bytes, age = self.frame_processor.get_latest_frame()
        if frame_bytes and age < 1.0:  # Frame is less than 1 second old
            logger.info(f"📸 Using stored frame (age: {age:.2f}s) for immediate vision analysis")
            if self.tenant_config.enable_vision and settings.proactive_vision_analysis:
                # Use non-blocking version to avoid delaying response
                if not self._vision_analysis_in_progress:
                    asyncio.create_task(self._process_vision_frame_async(frame_bytes))
                else:
                    logger.debug("⏭️ Vision analysis already in progress")
        else:
            logger.info("⏳ Waiting for fresh frame capture...")
            # The next frame that arrives will be processed immediately
            # due to _pending_fresh_capture flag

    async def on_user_speech(self, text: str, llm_instance: llm.LLM) -> str:
        """
        Handle user speech input with AI routing and RAG

        Args:
            text: Transcribed user speech
            llm_instance: LLM to use for this query

        Returns:
            AI-generated response
        """
        # Trigger fresh vision capture before processing speech
        await self.trigger_fresh_vision_capture()

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
            # Add ONLY the LATEST vision analysis to system prompt
            # Old analyses are outdated and can confuse the agent
            import time
            latest_vision = self._vision_context[-1]  # Most recent
            age_seconds = time.time() - latest_vision["timestamp"]
            age_desc = f"{int(age_seconds)}s ago" if age_seconds < 60 else f"{int(age_seconds/60)}m ago"
            snippet = latest_vision['analysis'].strip()
            # Keep snippet reasonable length
            snippet = snippet if len(snippet) <= 1500 else snippet[:1500] + "…"

            # Use consistent marker for vision context (matches llm_node pattern)
            vision_summary = f"\n\n[SYSTEM VISION UPDATE] 🔍 CURRENT SCREEN (captured {age_desc}):\n{snippet}\n"
            vision_summary += "\nIMPORTANT: This is what the user is CURRENTLY viewing. Base your response on THIS screen content, not previous screens."

            system_prompt = system_prompt + vision_summary
            logger.info(f"💡 Including LATEST vision analysis in context (age: {age_desc})")

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
            # LiveKit ChatChunk has delta directly (not choices array)
            if hasattr(chunk, 'delta') and chunk.delta:
                if hasattr(chunk.delta, 'content') and chunk.delta.content:
                    response += chunk.delta.content
            # Fallback: OpenAI-style choices[0].delta.content
            elif hasattr(chunk, 'choices') and chunk.choices:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    response += delta.content
            # Fallback for providers that use direct content attribute
            elif hasattr(chunk, 'content') and chunk.content:
                response += chunk.content
            # Fallback for text/string chunks
            elif hasattr(chunk, 'text') and chunk.text:
                response += chunk.text

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
        # Skip tiny transitional frames (WebRTC sends 8x8 garbage during screen changes)
        if frame.width < 100 or frame.height < 100:
            logger.debug(f"⏭️ Skipping tiny frame: {frame.width}x{frame.height}")
            return

        # ALWAYS store the latest frame for on-demand access (speech-triggered vision)
        # This ensures we have a fresh frame available when the user speaks
        self.frame_processor.store_latest_frame(frame)

        # Check if speech-triggered fresh capture is pending
        if self._pending_fresh_capture and self._vision_on_speech:
            logger.info("🎤 Speech-triggered fresh capture - processing immediately")
            self._pending_fresh_capture = False
            # Force process this frame for immediate vision analysis (non-blocking)
            encoded_frame = self.frame_processor.encode_frame(frame)
            if self.tenant_config.enable_vision and settings.proactive_vision_analysis:
                if not self._vision_analysis_in_progress:
                    asyncio.create_task(self._process_vision_frame_async(encoded_frame))
            return

        # DEBUG: Log frame metadata to track changes
        if os.getenv("DEBUG_SAVE_FRAMES") or os.getenv("DEBUG_FRAME_META"):
            try:
                # Get frame metadata
                width = frame.width
                height = frame.height
                frame_type = frame.type.name if hasattr(frame.type, 'name') else str(frame.type)
                logger.info(
                    f"📐 Frame metadata: {width}x{height}, type={frame_type}, "
                    f"buffer_size={len(frame.data) if hasattr(frame, 'data') else 'N/A'}"
                )
            except Exception as e:
                logger.warning(f"Failed to get frame metadata: {e}")

        # DEBUG: Save frames to disk to verify what we're receiving
        if os.getenv("DEBUG_SAVE_FRAMES"):
            try:
                import time
                debug_dir = "/tmp/livekit_frames"
                os.makedirs(debug_dir, exist_ok=True)
                frame_path = f"{debug_dir}/frame_{int(time.time()*1000)}.jpg"
                encoded = self.frame_processor.encode_frame(frame)
                with open(frame_path, "wb") as f:
                    f.write(encoded)
                logger.info(f"🖼️ DEBUG: Saved frame to {frame_path} ({len(encoded)} bytes)")
            except Exception as e:
                logger.warning(f"Failed to save debug frame: {e}")

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
        # Run NON-BLOCKING to avoid delaying frame capture (fire and forget)
        if self.tenant_config.enable_vision and settings.proactive_vision_analysis:
            if self._vision_analysis_in_progress:
                logger.debug("⏭️ Skipping vision analysis - already in progress")
            else:
                # Fire and forget - don't block frame processing
                asyncio.create_task(self._process_vision_frame_async(encoded_frame))
        else:
            logger.warning(
                f"Vision analysis disabled - enable_vision: {self.tenant_config.enable_vision}, "
                f"proactive_vision_analysis: {settings.proactive_vision_analysis}"
            )

    async def _process_vision_frame_async(self, frame_bytes: bytes):
        """
        Non-blocking wrapper for vision analysis.
        Manages the in-progress flag to prevent overlapping calls.
        """
        if self._vision_analysis_in_progress:
            return

        self._vision_analysis_in_progress = True
        try:
            await self._process_vision_frame(frame_bytes)
        except Exception as e:
            logger.error(f"Vision analysis error: {e}")
        finally:
            self._vision_analysis_in_progress = False

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
        chunk_count = 0
        async for chunk in response_stream:
            chunk_count += 1
            # Debug: Log first chunk structure to understand the format
            if chunk_count == 1:
                logger.debug(f"🔍 Chunk type: {type(chunk).__name__}, attrs: {[a for a in dir(chunk) if not a.startswith('_')]}")

            # LiveKit ChatChunk has delta directly (not choices array)
            if hasattr(chunk, 'delta') and chunk.delta:
                if hasattr(chunk.delta, 'content') and chunk.delta.content:
                    response += chunk.delta.content
            # Fallback: OpenAI-style choices[0].delta.content
            elif hasattr(chunk, 'choices') and chunk.choices:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    response += delta.content
            # Fallback for providers that use direct content attribute
            elif hasattr(chunk, 'content') and chunk.content:
                response += chunk.content
            # Fallback for text/string chunks
            elif hasattr(chunk, 'text') and chunk.text:
                response += chunk.text

        logger.info(f"📊 Processed {chunk_count} chunks, response length: {len(response)} chars")

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
    - Trigger fresh vision capture when user speaks (real-time mode)

    Based on LiveKit Agents 1.2.14 architecture with proper extension points.
    """

    def __init__(
        self,
        *args,
        vision_context_getter: Optional[callable] = None,
        vision_capture_trigger: Optional[callable] = None,
        room: Optional[rtc.Room] = None,
        publish_topic: str = "agent.chat",
        original_instructions: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize VisionAwareAgent

        Args:
            vision_context_getter: Callable that returns list of vision context dicts
            vision_capture_trigger: Async callable to trigger fresh vision capture
            room: LiveKit room for publishing data
            publish_topic: Topic for data channel messages
            original_instructions: Original system instructions (for appending vision)
            *args, **kwargs: Passed to voice.Agent
        """
        super().__init__(*args, **kwargs)
        self._get_vision_context = vision_context_getter
        self._trigger_vision_capture = vision_capture_trigger
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

        IMPORTANT: We must REPLACE old vision context, not accumulate it.
        Otherwise the LLM sees all historical vision contexts and may
        reference outdated screen content.

        Returns an async generator, not an awaitable.
        """

        async def enhanced_llm_generator():
            """Inner generator that yields LLM chunks with vision context"""
            logger.info("🔍 llm_node() called - triggering fresh vision capture...")

            # Trigger fresh vision capture when user speaks (real-time mode)
            # This ensures we get the latest screen content before responding
            if self._trigger_vision_capture:
                try:
                    await self._trigger_vision_capture()
                    # Brief pause to allow vision capture to complete
                    import asyncio
                    await asyncio.sleep(0.1)  # 100ms for capture processing
                except Exception as e:
                    logger.warning(f"Failed to trigger vision capture: {e}")

            try:
                # Get vision context if available
                logger.info(f"🔍 _get_vision_context callable: {self._get_vision_context is not None}")

                if self._get_vision_context:
                    vision_items = self._get_vision_context()
                    logger.info(f"🔍 Vision items retrieved: {len(vision_items) if vision_items else 0} items")

                    if vision_items:
                        # Build concise vision summary - ONLY use the LATEST analysis
                        # Old analyses are outdated and can confuse the agent
                        import time

                        # Get the most recent vision analysis
                        latest_vision = vision_items[-1]  # Most recent
                        ts = latest_vision.get("timestamp")
                        age_s = int(time.time() - ts) if ts else None
                        age_desc = f"{age_s}s ago" if age_s is not None and age_s < 60 else (
                            f"{int(age_s/60)}m ago" if age_s else ""
                        )
                        snippet = (latest_vision.get("analysis") or "").strip()
                        # Keep snippet short to avoid huge system messages
                        snippet = snippet if len(snippet) <= 1500 else snippet[:1500] + "…"

                        vision_summary = f"\n\n🔍 CURRENT SCREEN (captured {age_desc}):\n{snippet}\n"
                        vision_summary += "\nIMPORTANT: This is what the user is CURRENTLY viewing. Base your response on THIS screen content, not previous screens."

                        # CRITICAL FIX: Remove any previous vision context messages
                        # before adding the new one. This prevents accumulation of stale data.
                        # We identify vision context messages by the 🔍 CURRENT SCREEN marker.
                        messages_to_keep = []
                        removed_count = 0

                        # Try multiple attribute names for accessing messages
                        # LiveKit SDK may use 'messages' or '_messages' depending on version
                        # IMPORTANT: Prioritize internal _items over items property
                        # because items property returns a COPY while _items is the actual list
                        messages_attr = None
                        for attr_name in ['_items', 'items', '_messages', 'messages']:
                            if hasattr(chat_ctx, attr_name):
                                messages_attr = attr_name
                                break

                        logger.debug(f"🔍 ChatContext attributes: {[a for a in dir(chat_ctx) if not a.startswith('__')]}")
                        logger.debug(f"🔍 Using messages attribute: {messages_attr}")

                        if messages_attr:
                            current_messages = getattr(chat_ctx, messages_attr, [])
                            msg_count = len(current_messages) if current_messages else 0
                            logger.debug(f"🔍 Current message count: {msg_count}")

                            for msg in current_messages:
                                # Handle different message formats - extract text content
                                content = ""

                                # Try to get content from various possible structures
                                raw_content = None
                                if hasattr(msg, 'content'):
                                    raw_content = msg.content
                                elif hasattr(msg, 'text'):
                                    raw_content = msg.text
                                elif isinstance(msg, dict):
                                    raw_content = msg.get('content') or msg.get('text')

                                # Convert content to searchable string
                                if raw_content is None:
                                    content = str(msg)
                                elif isinstance(raw_content, str):
                                    content = raw_content
                                elif isinstance(raw_content, list):
                                    # Content is a list of content blocks - extract text from each
                                    text_parts = []
                                    for block in raw_content:
                                        if isinstance(block, str):
                                            text_parts.append(block)
                                        elif isinstance(block, dict):
                                            text_parts.append(block.get('text', '') or block.get('content', ''))
                                        elif hasattr(block, 'text'):
                                            text_parts.append(str(block.text) if block.text else '')
                                        elif hasattr(block, 'content'):
                                            text_parts.append(str(block.content) if block.content else '')
                                        else:
                                            text_parts.append(str(block))
                                    content = ' '.join(text_parts)
                                else:
                                    content = str(raw_content)

                                # Skip old vision context messages (they have our marker)
                                has_vision_marker = ("🔍 CURRENT SCREEN" in content or
                                                     "🔍 SCREEN SHARE CONTEXT" in content or
                                                     "[SYSTEM VISION UPDATE]" in content)

                                if has_vision_marker:
                                    removed_count += 1
                                    logger.info(f"🧹 Found old vision context to remove: {content[:80]}...")
                                else:
                                    messages_to_keep.append(msg)

                            if removed_count > 0:
                                # Replace the messages list with filtered version
                                # Use internal _items if available (items might be read-only property)
                                if hasattr(chat_ctx, '_items'):
                                    chat_ctx._items = messages_to_keep
                                else:
                                    setattr(chat_ctx, messages_attr, messages_to_keep)
                                logger.info(f"🧹 Removed {removed_count} old vision context message(s), {len(messages_to_keep)} remaining")
                            else:
                                logger.debug("🔍 No old vision context messages found to remove")
                        else:
                            logger.warning("⚠️ Could not find messages attribute on ChatContext - vision context may accumulate")

                        # Now add the fresh vision context as a user message
                        # Using 'user' role with clear context marker ensures it's visible to LLM
                        # and won't be confused with conversation history
                        chat_ctx.add_message(
                            role="user",
                            content=f"[SYSTEM VISION UPDATE] {vision_summary}"
                        )

                        logger.info(f"💡 Injected LATEST vision context into LLM call ({len(vision_summary)} chars, age: {age_desc})")

            except Exception as exc:
                logger.error(f"Failed to inject vision context: {exc}", exc_info=True)

            # Call parent's llm_node and yield chunks - always use original chat_ctx
            # (which now has the LATEST vision context, not accumulated old ones)
            logger.debug("🔍 Calling parent llm_node() and yielding chunks...")
            chunk_count = 0
            async for chunk in super(VisionAwareAgent, self).llm_node(chat_ctx, tools, model_settings):
                chunk_count += 1
                yield chunk

            logger.debug(f"🔍 llm_node() completed - yielded {chunk_count} chunks")

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
        # Test Cartesia connection (uses CARTESIA_API_KEY env var automatically)
        cartesia.TTS(model="sonic-2")
        logger.info("✓ Cartesia TTS initialized")
    except Exception as e:
        logger.warning(f"Cartesia init failed: {e}")

    logger.info("Worker process ready")


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for LiveKit agent
    Called for each new room connection

    Args:
        ctx: Job context from LiveKit

    Room name formats:
    - tenant_{tenantId}_{roomName}: Legacy format, tenant-only context
    - tenant_{tenantId}_session_{sessionId}: Unified widget format with session context
    """
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Extract tenant ID and session ID from room name
    # Room name format: tenant_{tenantId}_session_{sessionId}
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
    # Session context includes conversation history and AI personality from chat
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
    logger.info("Connected to room")

    # Initialize agent with loaded config
    agent = MultiModalAgent(
        ctx=ctx,
        tenant_id=tenant_config.tenant_id,
        backend_client=backend,
        initial_config=tenant_config,  # Pass loaded config
    )

    # Start agent
    await agent.start()

    # Get initial LLM based on SIMPLE complexity (default for greetings)
    initial_llm = agent.get_llm_for_complexity(ComplexityLevel.SIMPLE)

    # Create VisionAwareAgent - properly integrates vision + transcription
    logger.info("Creating VisionAwareAgent with multi-modal capabilities...")

    system_instructions = agent.tenant_config.system_prompt or "You are a helpful AI assistant."

    # Build chat context with conversation history for seamless transitions
    # When transitioning from chat to video mode, this preserves context
    chat_ctx = llm.ChatContext()

    # Add system prompt
    chat_ctx.add_message(role="system", content=system_instructions)

    # Add prior conversation history from session context
    if tenant_config.conversation_history:
        logger.info(
            f"Pre-loading {len(tenant_config.conversation_history)} messages "
            f"into VisionAwareAgent chat context"
        )
        for msg in tenant_config.conversation_history:
            chat_ctx.add_message(role=msg.role, content=msg.content)

    # Create VisionAwareAgent with proper extension points
    # Phase 10-12: tools=AVAILABLE_TOOLS (empty list - hardcoded operations)
    # Phase 13+: Uncomment tools in AVAILABLE_TOOLS for external integrations
    vision_agent = VisionAwareAgent(
        instructions=system_instructions,
        vision_context_getter=lambda: agent._vision_context,  # Pass vision buffer
        vision_capture_trigger=agent.trigger_fresh_vision_capture,  # Real-time vision refresh
        room=ctx.room,  # For data channel publishing
        publish_topic="agent.chat",  # Enable topic filtering
        original_instructions=system_instructions,  # For vision context injection
        chat_ctx=chat_ctx,  # Pre-populated conversation context
        vad=silero.VAD.load(),  # Voice activity detection
        stt=deepgram.STT(),     # Speech-to-text
        llm=initial_llm,        # Dynamic LLM via ai_router
        tts=cartesia.TTS(
            model=agent.tenant_config.tts_model or "sonic-2",  # Cartesia Sonic model
        ),
        # Function calling infrastructure (Phase 13+ ready)
        # Currently empty - core operations (RAG, cost logging) remain hardcoded
        # Add new integration tools to AVAILABLE_TOOLS list above
        **({} if not AVAILABLE_TOOLS else {"tools": AVAILABLE_TOOLS})
    )

    logger.info(f"✅ VisionAwareAgent created with {len(AVAILABLE_TOOLS)} tools available")

    # Create AgentSession and start with the vision-aware agent
    session = voice.AgentSession()

    logger.info("Starting voice session with room connection...")

    await session.start(agent=vision_agent, room=ctx.room)

    logger.info("✅ Voice session started - vision context and transcription active")

    # Handle video frames (screen share)
    # Track reference for stream state monitoring
    current_screen_track: Optional[rtc.Track] = None
    frame_counter = [0]  # Use list to allow modification in nested function

    async def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Handle new track subscription"""
        nonlocal current_screen_track
        logger.info(f"Track subscribed: {track.kind} from {participant.identity}")
        logger.info(f"  Track SID: {track.sid}, Name: {track.name}")
        logger.info(f"  Track muted: {track.muted}, stream_state: {track.stream_state}")
        logger.info(f"  Publication source: {publication.source}, mime_type: {publication.mime_type if hasattr(publication, 'mime_type') else 'N/A'}")

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            # Check if this is a screen share track
            # SOURCE_SCREENSHARE = 3 (from protobuf enum descriptor)
            if publication.source == 3:  # rtc.TrackSource.SOURCE_SCREENSHARE
                logger.info("🖥️ Screen share track detected - starting frame processing")
                current_screen_track = track

                # Process screen share frames
                video_stream = rtc.VideoStream(track)
                async for event in video_stream:
                    frame_counter[0] += 1

                    # Log stream state periodically (every 30 frames)
                    if frame_counter[0] % 30 == 0:
                        logger.info(
                            f"📊 Frame #{frame_counter[0]} - "
                            f"track.stream_state: {track.stream_state}, "
                            f"track.muted: {track.muted}"
                        )

                    await agent.on_video_frame(event.frame)

    # Track unsubscribed handler to detect screen share changes
    async def on_track_unsubscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant
    ):
        """Handle track unsubscription"""
        nonlocal current_screen_track
        logger.info(f"🔴 Track UNSUBSCRIBED: {track.kind} from {participant.identity}")
        logger.info(f"  Track SID: {track.sid}, Name: {track.name}")
        if current_screen_track and track.sid == current_screen_track.sid:
            logger.info("⚠️ Current screen share track was unsubscribed!")
            current_screen_track = None

    # Track muted handler to detect when screen share is paused
    async def on_track_muted(
        participant: rtc.Participant,
        publication: rtc.TrackPublication
    ):
        """Handle track mute event"""
        logger.info(f"🔇 Track MUTED: source={publication.source}, participant={participant.identity}")

    async def on_track_unmuted(
        participant: rtc.Participant,
        publication: rtc.TrackPublication
    ):
        """Handle track unmute event"""
        logger.info(f"🔊 Track UNMUTED: source={publication.source}, participant={participant.identity}")

    # Register track event handlers
    ctx.room.on("track_subscribed", lambda track, pub, part: asyncio.create_task(
        on_track_subscribed(track, pub, part)
    ))
    ctx.room.on("track_unsubscribed", lambda track, pub, part: asyncio.create_task(
        on_track_unsubscribed(track, pub, part)
    ))
    ctx.room.on("track_muted", lambda part, pub: asyncio.create_task(
        on_track_muted(part, pub)
    ))
    ctx.room.on("track_unmuted", lambda part, pub: asyncio.create_task(
        on_track_unmuted(part, pub)
    ))

    # Capture tenant_id in closure for chat handler
    current_tenant_id = tenant_config.tenant_id

    # Handle incoming chat messages (just log, don't echo)
    async def on_data_received(data_packet: rtc.DataPacket):
        """Handle incoming chat messages with RAG integration"""
        try:
            message = data_packet.data.decode('utf-8')
            logger.info(f"Chat message received: {message}")

            # Query knowledge base using backend RAG system
            logger.info("🔍 Querying knowledge base...")
            rag_query_result = await backend.search_knowledge(
                tenant_id=current_tenant_id,
                query=message,
                top_k=5
            )

            if rag_query_result and rag_query_result.answer:
                # Found relevant knowledge - send RAG-enhanced response
                response_text = rag_query_result.answer
                logger.info(f"✅ RAG response ({rag_query_result.confidence:.2f} confidence): {response_text[:100]}...")

                # Send response back to chat
                await ctx.room.local_participant.publish_data(
                    response_text.encode('utf-8'),
                    topic="agent.chat"
                )
            else:
                logger.info("ℹ️ No relevant knowledge found - agent will respond via voice if user speaks")

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
