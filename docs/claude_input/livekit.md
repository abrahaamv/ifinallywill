"""
LiveKit Multi-Modal AI Agent with Chat Transcription and Vision Context
Production-ready implementation for LiveKit Agents 1.2.14
"""

import asyncio
import base64
import json
import logging
import time
from typing import Optional, AsyncIterable, Dict, List, Any
from dataclasses import dataclass, field

from livekit import agents, rtc
from livekit.agents import JobContext, AutoSubscribe, llm, stt, tts, vad, voice
from livekit.agents.voice import Agent, AgentSession
from livekit.rtc import VideoFrame, DataPacket

# Import your existing modules
from config import Settings, TenantConfig, get_tenant_config
from ai_router import AIRouter
from frame_processor import FrameProcessor
from backend_client import BackendClient

logger = logging.getLogger(__name__)
settings = Settings()


class VisionContext:
    """Manages vision analysis history with thread-safe operations"""
    
    def __init__(self, max_history: int = 3):
        self._history: List[Dict[str, Any]] = []
        self._max_history = max_history
        self._lock = asyncio.Lock()
    
    async def add_analysis(self, analysis: str) -> None:
        """Add a new vision analysis to the history"""
        async with self._lock:
            self._history.append({
                "timestamp": time.time(),
                "analysis": analysis
            })
            
            if len(self._history) > self._max_history:
                self._history.pop(0)
                
            logger.info(f"📝 Vision context updated: {len(self._history)} analyses in buffer")
    
    async def get_context_summary(self) -> Optional[str]:
        """Get formatted vision context for LLM prompts"""
        async with self._lock:
            if not self._history:
                return None
                
            summary = "\n\n🔍 SCREEN SHARE CONTEXT (you can see the user's screen):\n"
            for idx, vision in enumerate(self._history, 1):
                age_seconds = time.time() - vision["timestamp"]
                age_desc = f"{int(age_seconds)}s ago" if age_seconds < 60 else f"{int(age_seconds/60)}m ago"
                summary += f"\n[Analysis {idx} - {age_desc}]:\n{vision['analysis']}\n"
            
            return summary
    
    async def clear(self) -> None:
        """Clear all vision history"""
        async with self._lock:
            self._history.clear()


class EnhancedVoiceAgent(Agent):
    """
    Extended voice.Agent that properly integrates vision context and chat transcription.
    Subclassing allows us to override pipeline nodes correctly.
    """
    
    def __init__(
        self,
        instructions: str,
        vision_context: VisionContext,
        room: rtc.Room,
        chat_ctx: Optional[llm.ChatContext] = None,
        vad: Optional[vad.VAD] = None,
        stt: Optional[stt.STT] = None,
        llm: Optional[llm.LLM] = None,
        tts: Optional[tts.TTS] = None,
    ):
        super().__init__(
            instructions=instructions,
            chat_ctx=chat_ctx,
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
        )
        self.vision_context = vision_context
        self.room = room
        self._original_instructions = instructions
        
    def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: Optional[llm.LLMTools] = None,
        model_settings: Optional[Dict] = None,
    ) -> AsyncIterable[llm.ChatChunk]:
        """
        Override LLM node to inject vision context into every LLM call.
        This is the proper extension point for modifying agent context.
        """
        
        async def enhanced_llm_node():
            # Get vision context if available
            vision_summary = await self.vision_context.get_context_summary()
            
            if vision_summary:
                # Create enhanced chat context with vision
                enhanced_ctx = llm.ChatContext()
                
                # Add enhanced system prompt with vision context
                enhanced_instructions = self._original_instructions + vision_summary
                enhanced_ctx.add_message(role="system", content=enhanced_instructions)
                
                # Copy all messages except the first system message
                for msg in chat_ctx.messages[1:]:
                    enhanced_ctx.add_message(role=msg.role, content=msg.content)
                
                logger.info(f"💡 Injecting vision context into LLM call ({len(await self.vision_context.get_context_summary())} chars)")
                
                # Use enhanced context for LLM call
                async for chunk in Agent.default.llm_node(self, enhanced_ctx, tools, model_settings):
                    yield chunk
            else:
                # No vision context, use original flow
                async for chunk in Agent.default.llm_node(self, chat_ctx, tools, model_settings):
                    yield chunk
        
        return enhanced_llm_node()
    
    def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: Optional[Dict] = None,
    ) -> AsyncIterable[rtc.AudioFrame]:
        """
        Override TTS node to capture text for chat transcription.
        This is the correct interception point for TTS in LiveKit 1.2.14.
        """
        
        async def transcribing_tts_node():
            # Buffer to collect the complete text
            text_buffer = []
            
            async def text_collector():
                """Collect text chunks and forward them"""
                async for chunk in text:
                    text_buffer.append(chunk)
                    yield chunk
            
            # Process TTS with collected text
            collected_text = text_collector()
            async for audio_frame in Agent.default.tts_node(self, collected_text, model_settings):
                yield audio_frame
            
            # After TTS processing, publish to chat
            if text_buffer:
                complete_text = ''.join(text_buffer)
                logger.info(f"💬 TTS TRANSCRIPTION CAPTURED: {complete_text[:100]}...")
                
                # Publish to data channel for chat
                try:
                    message_data = json.dumps({
                        "type": "agent_message",
                        "content": complete_text,
                        "timestamp": time.time()
                    }).encode('utf-8')
                    
                    await self.room.local_participant.publish_data(
                        message_data,
                        reliable=True,
                        # No topic to match frontend expectations
                    )
                    
                    logger.info(f"✅ CHAT TRANSCRIPTION PUBLISHED ({len(message_data)} bytes)")
                except Exception as e:
                    logger.error(f"❌ Failed to publish chat transcription: {e}")
        
        return transcribing_tts_node()


class MultiModalAgentOrchestrator:
    """
    Orchestrates the multi-modal agent with proper LiveKit integration.
    Manages vision processing, dynamic LLM routing, and agent lifecycle.
    """
    
    def __init__(
        self,
        ctx: JobContext,
        tenant_id: str,
        backend_client: BackendClient,
    ):
        self.ctx = ctx
        self.tenant_id = tenant_id
        self.backend_client = backend_client
        self.tenant_config = get_tenant_config(tenant_id)
        
        # Initialize components
        self.ai_router = AIRouter(
            gemini_flash_lite_weight=self.tenant_config.gemini_flash_lite_weight,
            gemini_flash_weight=self.tenant_config.gemini_flash_weight,
            claude_sonnet_weight=self.tenant_config.claude_sonnet_weight,
        )
        
        self.frame_processor = FrameProcessor(
            similarity_threshold=settings.frame_similarity_threshold,
            active_fps=settings.active_fps,
            idle_fps=settings.idle_fps,
        )
        
        self.vision_context = VisionContext(max_history=3)
        
        # Agent state
        self.voice_agent: Optional[EnhancedVoiceAgent] = None
        self.session: Optional[AgentSession] = None
        self._is_speaking = False
        self._screen_share_track: Optional[rtc.RemoteVideoTrack] = None
        
        # Metrics
        self._start_time = time.time()
        self._frame_count = 0
        self._vision_analysis_count = 0
        
    async def start(self) -> None:
        """Initialize and start the multi-modal agent"""
        try:
            # Connect to room
            await self.ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
            logger.info(f"✅ Connected to room: {self.ctx.room.name}")
            
            # Initialize voice agent with enhanced capabilities
            await self._initialize_voice_agent()
            
            # Set up event handlers
            self._setup_event_handlers()
            
            # Send greeting if configured
            if self.tenant_config.greeting_message:
                await self._send_greeting()
            
            logger.info("✅ Multi-modal agent started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to start agent: {e}")
            raise
    
    async def _initialize_voice_agent(self) -> None:
        """Initialize the enhanced voice agent with all components"""
        
        # Get initial LLM based on complexity estimation
        initial_complexity = "simple"
        initial_llm = self._get_llm_for_complexity(initial_complexity)
        
        # Initialize STT
        if hasattr(agents, 'deepgram'):
            stt_instance = agents.deepgram.STT()
        else:
            logger.warning("Deepgram not available, using default STT")
            stt_instance = stt.STT()
        
        # Initialize VAD
        if hasattr(agents, 'silero'):
            vad_instance = agents.silero.VAD.load()
        else:
            logger.warning("Silero not available, using default VAD")
            vad_instance = vad.VAD()
        
        # Initialize TTS
        if hasattr(agents, 'elevenlabs'):
            tts_instance = agents.elevenlabs.TTS(
                voice_id=self.tenant_config.tts_voice_id,
                model=self.tenant_config.tts_model,
                streaming_latency=self.tenant_config.tts_streaming_latency,
            )
        else:
            logger.warning("ElevenLabs not available, using default TTS")
            tts_instance = tts.TTS()
        
        # Create enhanced voice agent
        self.voice_agent = EnhancedVoiceAgent(
            instructions=self.tenant_config.system_prompt or "You are a helpful AI assistant.",
            vision_context=self.vision_context,
            room=self.ctx.room,
            chat_ctx=llm.ChatContext(),
            vad=vad_instance,
            stt=stt_instance,
            llm=initial_llm,
            tts=tts_instance,
        )
        
        # Start agent session
        self.session = AgentSession()
        await self.session.start(agent=self.voice_agent, room=self.ctx.room)
        
        logger.info("✅ Voice agent initialized and session started")
    
    def _setup_event_handlers(self) -> None:
        """Set up all room event handlers"""
        
        @self.ctx.room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            """Handle track subscription events"""
            logger.info(f"Track subscribed: {track.kind} from {participant.identity}")
            
            if track.kind == rtc.TrackKind.VIDEO and publication.source == rtc.TrackSource.SOURCE_SCREENSHARE:
                logger.info("🖥️ Screen share track detected")
                self._screen_share_track = track
                
                # Start vision processing for screen share
                if isinstance(track, rtc.RemoteVideoTrack):
                    asyncio.create_task(self._process_video_track(track))
        
        @self.ctx.room.on("track_unsubscribed")
        def on_track_unsubscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            """Handle track unsubscription"""
            if track == self._screen_share_track:
                logger.info("🖥️ Screen share stopped")
                self._screen_share_track = None
        
        @self.ctx.room.on("data_received")
        def on_data_received(packet: DataPacket):
            """Handle incoming data channel messages"""
            try:
                text = packet.data.decode('utf-8')
                sender = packet.participant.identity if packet.participant else 'Unknown'
                logger.info(f"📨 Data received from {sender}: {text[:100]}...")
                
                # Handle user chat messages if needed
                # This could trigger additional processing or commands
                
            except Exception as e:
                logger.error(f"Failed to process data packet: {e}")
        
        @self.ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            """Handle participant disconnection"""
            logger.info(f"👤 Participant disconnected: {participant.identity}")
    
    async def _process_video_track(self, track: rtc.RemoteVideoTrack) -> None:
        """Process video frames from screen share"""
        try:
            async for event in rtc.VideoStream(track):
                if isinstance(event, rtc.VideoFrameEvent):
                    await self._on_video_frame(event.frame)
                    
        except Exception as e:
            logger.error(f"Error processing video track: {e}")
    
    async def _on_video_frame(self, frame: VideoFrame) -> None:
        """Process individual video frames with intelligent throttling"""
        self._frame_count += 1
        
        # Apply FPS throttling
        should_process = self.frame_processor.should_process_frame(frame, self._is_speaking)
        if not should_process:
            return
        
        # Check if frame is interesting (avoid duplicates)
        if not self.frame_processor.is_interesting_frame(frame):
            logger.debug(f"Frame {self._frame_count} not interesting, skipping")
            return
        
        # Encode frame for vision processing
        frame_bytes = self.frame_processor.encode_frame(frame)
        logger.info(f"📸 Interesting frame detected: {len(frame_bytes)} bytes")
        
        # Process with vision if enabled
        if self.tenant_config.enable_vision and settings.proactive_vision_analysis:
            await self._analyze_vision_frame(frame_bytes)
    
    async def _analyze_vision_frame(self, frame_bytes: bytes) -> None:
        """Analyze frame with vision model and store context"""
        try:
            # Get appropriate vision-capable LLM
            complexity = "simple"  # Vision analysis is typically simple
            vision_llm = self._get_llm_for_complexity(complexity)
            model_name = self.ai_router.get_model_name(complexity)
            
            logger.info(f"🎯 Analyzing screen share with {model_name}")
            
            # Build vision prompt
            chat_ctx = llm.ChatContext()
            
            # Add system context if available
            if self.tenant_config.system_prompt:
                chat_ctx.add_message(role="system", content=self.tenant_config.system_prompt)
            
            # Create image content
            frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')
            image_content = llm.ImageContent(image=f"data:image/jpeg;base64,{frame_b64}")
            
            vision_prompt = """Analyze this screen share frame. Focus on:
- Text content (headings, code, documents, error messages)
- UI elements (buttons, forms, menus, applications visible)
- Visual context (diagrams, charts, browser content)
- Any actionable items or points of discussion

Provide a concise summary of what's displayed and its significance."""
            
            # Add vision request
            chat_ctx.add_message(role="user", content=[vision_prompt, image_content])
            
            # Generate analysis
            response_stream = vision_llm.chat(chat_ctx=chat_ctx)
            response_text = ""
            async for chunk in response_stream:
                if hasattr(chunk, 'content') and chunk.content:
                    response_text += chunk.content
            
            if response_text:
                logger.info(f"✅ Vision analysis complete: {response_text[:150]}...")
                
                # Store in vision context
                await self.vision_context.add_analysis(response_text)
                self._vision_analysis_count += 1
                
                # Optionally share vision insights proactively (if significant changes detected)
                if self._should_share_vision_insight(response_text):
                    await self._share_vision_insight(response_text)
            
        except Exception as e:
            logger.error(f"❌ Vision analysis failed: {e}")
    
    def _should_share_vision_insight(self, analysis: str) -> bool:
        """Determine if vision analysis contains significant insights to share"""
        # Implement smart logic to avoid interrupting unnecessarily
        significant_keywords = ["error", "warning", "failed", "exception", "important", "critical"]
        return any(keyword in analysis.lower() for keyword in significant_keywords)
    
    async def _share_vision_insight(self, analysis: str) -> None:
        """Proactively share important vision insights"""
        try:
            insight_message = f"I notice something on your screen: {analysis[:200]}..."
            
            # Publish insight to chat
            message_data = json.dumps({
                "type": "vision_insight",
                "content": insight_message,
                "timestamp": time.time()
            }).encode('utf-8')
            
            await self.ctx.room.local_participant.publish_data(
                message_data,
                reliable=True,
            )
            
            logger.info("💡 Shared vision insight with user")
            
        except Exception as e:
            logger.error(f"Failed to share vision insight: {e}")
    
    async def _send_greeting(self) -> None:
        """Send initial greeting message"""
        try:
            greeting_data = json.dumps({
                "type": "greeting",
                "content": self.tenant_config.greeting_message,
                "timestamp": time.time()
            }).encode('utf-8')
            
            await self.ctx.room.local_participant.publish_data(
                greeting_data,
                reliable=True,
            )
            
            logger.info("👋 Greeting sent")
            
        except Exception as e:
            logger.error(f"Failed to send greeting: {e}")
    
    def _get_llm_for_complexity(self, complexity: str) -> llm.LLM:
        """Get appropriate LLM instance based on complexity"""
        model_name = self.ai_router.get_model_name(complexity)
        
        # Import providers dynamically
        if "gemini" in model_name:
            try:
                from livekit.agents import google
                return google.LLM(model=model_name)
            except ImportError:
                logger.warning(f"Google provider not available for {model_name}")
        
        elif "claude" in model_name:
            try:
                from livekit.agents import anthropic
                return anthropic.LLM(model=model_name)
            except ImportError:
                logger.warning(f"Anthropic provider not available for {model_name}")
        
        elif "gpt" in model_name:
            try:
                from livekit.agents import openai
                return openai.LLM(model=model_name)
            except ImportError:
                logger.warning(f"OpenAI provider not available for {model_name}")
        
        # Fallback to a default
        logger.warning(f"Using fallback LLM for {model_name}")
        return llm.LLM()  # Default implementation
    
    async def cleanup(self) -> None:
        """Clean up resources on shutdown"""
        try:
            if self.session:
                await self.session.stop()
            
            await self.vision_context.clear()
            
            logger.info("✅ Agent cleanup complete")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Main entry point
async def entrypoint(ctx: JobContext):
    """
    LiveKit Agents entry point - properly structured for production.
    """
    logger.info(f"🚀 Agent starting for room: {ctx.room.name}")
    
    try:
        # Extract tenant ID from room name
        tenant_id = extract_tenant_id_from_room_name(ctx.room.name)
        
        # Initialize backend client
        backend_client = BackendClient(
            base_url=settings.backend_url,
            api_key=settings.backend_api_key,
        )
        
        # Create and start orchestrator
        orchestrator = MultiModalAgentOrchestrator(
            ctx=ctx,
            tenant_id=tenant_id,
            backend_client=backend_client,
        )
        
        await orchestrator.start()
        
        # Keep agent running
        logger.info("✅ Agent ready - speak or share your screen to interact")
        
        # Wait for room to disconnect
        @ctx.room.on("disconnected")
        def on_disconnected():
            logger.info("Room disconnected, shutting down agent")
            asyncio.create_task(orchestrator.cleanup())
        
        # Keep the agent running
        await asyncio.Event().wait()
        
    except Exception as e:
        logger.error(f"❌ Agent failed: {e}", exc_info=True)
        raise


def extract_tenant_id_from_room_name(room_name: str) -> str:
    """Extract tenant ID from room name format: tenant_{id}_{roomName}"""
    parts = room_name.split('_')
    if len(parts) >= 3 and parts[0] == 'tenant':
        return parts[1]
    return "default"


# Register the agent
if __name__ == "__main__":
    agents.run(entrypoint)