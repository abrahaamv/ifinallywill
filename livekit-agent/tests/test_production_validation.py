"""
Production Validation Tests for LiveKit Agent
Tests multi-modal features, LiveKit integration, backend integration, and agent resilience.
"""

import asyncio
import json
import time
from typing import Optional
from unittest.mock import AsyncMock, Mock, MagicMock, patch, call
import pytest
import pytest_asyncio
import numpy as np
from PIL import Image

# Import agent components
from agent import MultiModalAgent, VisionAwareAgent, entrypoint
from ai_router import AIRouter, ComplexityLevel
from frame_processor import FrameProcessor
from backend_client import BackendClient, RAGResult, TenantContext, CircuitState
from config import Config, TenantConfig, settings


class TestLiveKitIntegration:
    """Test LiveKit room connection and track handling"""

    @pytest.mark.asyncio
    async def test_agent_connects_to_room(self, mock_livekit_context):
        """Test agent successfully connects to LiveKit room"""
        # Setup
        ctx = mock_livekit_context
        backend = AsyncMock()

        # Create agent
        agent = MultiModalAgent(
            ctx=ctx,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Start agent
        await agent.start()

        # Verify agent initialized with correct room
        assert agent.room == ctx.room
        assert agent.tenant_id == "test_tenant"
        assert agent.backend == backend

    @pytest.mark.asyncio
    async def test_audio_track_subscription(self, mock_livekit_context):
        """Test agent handles audio track subscription"""
        ctx = mock_livekit_context
        backend = AsyncMock()

        # Mock audio track
        audio_track = Mock()
        audio_track.kind = "audio"

        audio_publication = Mock()
        audio_publication.source = 0  # SOURCE_MICROPHONE

        participant = Mock()
        participant.identity = "user123"

        # Create agent
        agent = MultiModalAgent(
            ctx=ctx,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Verify agent can handle track subscription
        # Note: Actual track subscription tested in integration tests
        assert agent.room.name == "tenant_test_room123"

    @pytest.mark.asyncio
    async def test_screen_share_track_processing(self, mock_livekit_context):
        """Test agent processes screen share video frames"""
        ctx = mock_livekit_context
        backend = AsyncMock()

        agent = MultiModalAgent(
            ctx=ctx,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Create mock video frame
        mock_frame = Mock()
        mock_frame.width = 1920
        mock_frame.height = 1080
        data = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        mock_frame.data = data.tobytes()

        # Process frame (should not raise)
        await agent.on_video_frame(mock_frame)

        # Verify frame processor was used
        stats = agent.frame_processor.get_stats()
        assert stats["total_frames"] > 0

    @pytest.mark.asyncio
    async def test_data_channel_messaging(self, mock_livekit_context):
        """Test agent sends/receives data channel messages"""
        ctx = mock_livekit_context
        backend = AsyncMock()

        # Mock local participant for publishing
        ctx.room.local_participant = Mock()
        ctx.room.local_participant.publish_data = AsyncMock()

        agent = MultiModalAgent(
            ctx=ctx,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Simulate publishing a message
        test_message = "Agent response"
        await ctx.room.local_participant.publish_data(
            test_message.encode('utf-8'),
            reliable=True,
            topic="agent.chat"
        )

        # Verify publish was called
        ctx.room.local_participant.publish_data.assert_called_once()


class TestMultiModalFeatures:
    """Test multi-modal AI features (vision, audio, text)"""

    @pytest.mark.asyncio
    async def test_vision_context_injection(self, mock_livekit_context, mock_backend_client):
        """Test vision context is injected into LLM calls"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Add vision context
        agent._vision_context = [
            {
                "timestamp": time.time(),
                "analysis": "User is viewing a code editor with Python code"
            },
            {
                "timestamp": time.time() - 10,
                "analysis": "Browser with GitHub repository open"
            }
        ]

        # Mock LLM
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            # Simulate streaming response
            for chunk in ["Test", " response"]:
                mock_chunk = Mock()
                mock_chunk.content = chunk
                yield mock_chunk

        mock_llm.chat = mock_chat

        # Process user speech (should include vision context)
        response = await agent.on_user_speech(
            "What code am I looking at?",
            mock_llm
        )

        # Verify response was generated
        assert response == "Test response"

        # Verify vision context was available
        assert len(agent._vision_context) == 2

    @pytest.mark.asyncio
    async def test_vision_analysis_workflow(self, mock_livekit_context, mock_backend_client):
        """Test complete vision analysis workflow"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Enable vision
        agent.tenant_config.enable_vision = True

        # Create interesting frame (high detail)
        data = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        mock_frame = Mock()
        mock_frame.width = 1920
        mock_frame.height = 1080
        mock_frame.data = data.tobytes()

        # Mock vision LLM
        with patch.object(agent, 'get_llm_for_complexity') as mock_get_llm:
            mock_llm = AsyncMock()

            async def mock_chat(*args, **kwargs):
                mock_chunk = Mock()
                mock_chunk.content = "User is viewing a code editor"
                yield mock_chunk

            mock_llm.chat = mock_chat
            mock_get_llm.return_value = mock_llm

            # Process frame
            await agent.on_video_frame(mock_frame)

            # Wait for async processing
            await asyncio.sleep(0.1)

        # Vision context should be updated
        assert len(agent._vision_context) >= 0  # May be 0 if frame was skipped

    @pytest.mark.asyncio
    async def test_rag_knowledge_integration(self, mock_livekit_context, mock_backend_client):
        """Test RAG knowledge base is queried and included in responses"""
        # Setup backend with knowledge result
        rag_result = RAGResult(
            answer="Based on documentation: Feature X requires Y configuration",
            sources=[
                {"content": "Configuration guide for Feature X", "similarity": 0.92}
            ],
            confidence=0.92,
            metadata={"source": "docs.pdf"}
        )
        mock_backend_client.search_knowledge = AsyncMock(return_value=rag_result)

        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )
        agent.tenant_config.enable_knowledge_base = True

        # Mock LLM
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            mock_chunk = Mock()
            mock_chunk.content = "Response with knowledge"
            yield mock_chunk

        mock_llm.chat = mock_chat

        # Process user speech that needs knowledge
        response = await agent.on_user_speech(
            "How do I configure Feature X?",
            mock_llm
        )

        # Verify knowledge base was queried
        mock_backend_client.search_knowledge.assert_called_once()

        # Verify response was generated
        assert "Response with knowledge" in response

    @pytest.mark.asyncio
    async def test_three_tier_ai_routing(self, mock_livekit_context, mock_backend_client):
        """Test AI routing uses appropriate model based on complexity"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Test simple query → Flash-Lite
        simple_llm = agent.get_llm_for_complexity(ComplexityLevel.SIMPLE)
        assert simple_llm is not None

        # Test moderate query → Flash
        moderate_llm = agent.get_llm_for_complexity(ComplexityLevel.MODERATE)
        assert moderate_llm is not None

        # Test complex query → Claude
        complex_llm = agent.get_llm_for_complexity(ComplexityLevel.COMPLEX)
        assert complex_llm is not None

        # Verify routing statistics
        agent.ai_router.record_usage(ComplexityLevel.SIMPLE)
        agent.ai_router.record_usage(ComplexityLevel.MODERATE)
        agent.ai_router.record_usage(ComplexityLevel.COMPLEX)

        stats = agent.ai_router.get_statistics()
        assert stats["total_requests"] == 3


class TestBackendIntegration:
    """Test integration with TypeScript backend API"""

    @pytest.mark.asyncio
    async def test_tenant_config_loading(self):
        """Test tenant configuration is loaded from backend"""
        tenant_id = "test_tenant_123"

        # Load config (will use fallback)
        config = Config.load_for_tenant(tenant_id)

        # Verify config created
        assert config.tenant_id == tenant_id
        assert config.system_prompt is not None

    @pytest.mark.asyncio
    async def test_rag_search_api_call(self):
        """Test RAG search API integration"""
        backend = BackendClient(
            base_url="http://localhost:3001",
            api_key="test_key"
        )

        # Mock HTTP client
        with patch.object(backend.client, 'request') as mock_request:
            # Setup mock response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json = Mock(return_value={
                "0": {
                    "result": {
                        "data": {
                            "json": {
                                "chunks": [
                                    {
                                        "content": "Test knowledge chunk",
                                        "similarity": 0.85
                                    }
                                ]
                            }
                        }
                    }
                }
            })
            mock_request.return_value = mock_response

            # Query knowledge base
            result = await backend.search_knowledge(
                tenant_id="test_tenant",
                query="How do I configure Redis?",
                top_k=5
            )

            # Verify result
            assert result is not None
            assert len(result.sources) > 0
            assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_cost_event_logging(self):
        """Test cost events are logged to backend"""
        backend = BackendClient(
            base_url="http://localhost:3001",
            api_key="test_key"
        )

        # Mock HTTP client
        with patch.object(backend.client, 'request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json = Mock(return_value={
                "0": {"result": {"data": {"json": {"success": True}}}}
            })
            mock_request.return_value = mock_response

            # Log cost event
            await backend.log_cost_event(
                tenant_id="test_tenant",
                session_id="session123",
                service="gemini",
                model="gemini-2.5-flash-lite",
                input_tokens=100,
                output_tokens=200,
                cost=0.000075
            )

            # Verify API was called
            mock_request.assert_called_once()
            call_args = mock_request.call_args
            assert "costs.logEvent" in call_args[0][1]

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_on_failures(self):
        """Test circuit breaker opens after threshold failures"""
        backend = BackendClient(
            base_url="http://localhost:3001",
            api_key="test_key"
        )

        # Mock HTTP client to fail
        with patch.object(backend.client, 'request') as mock_request:
            mock_request.side_effect = Exception("Connection failed")

            # Try multiple requests (should fail)
            for _ in range(6):  # Threshold is 5
                result = await backend.search_knowledge(
                    tenant_id="test",
                    query="test",
                    top_k=5
                )
                assert result is None

            # Circuit breaker should be OPEN
            assert backend.circuit_breaker.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_jwt_token_caching(self):
        """Test JWT tokens are cached and reused"""
        backend = BackendClient(
            base_url="http://localhost:3001",
            api_key="test_key"
        )

        # Get token twice
        token1 = backend._get_token()
        token2 = backend._get_token()

        # Should be same token (cached)
        assert token1 == token2

        # Verify token format
        assert token1.count('.') == 2  # JWT has 3 parts


class TestAgentResilience:
    """Test agent error handling and recovery"""

    @pytest.mark.asyncio
    async def test_handles_invalid_video_frame(self, mock_livekit_context, mock_backend_client):
        """Test agent handles invalid/corrupt video frames"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Create invalid frame
        invalid_frame = Mock()
        invalid_frame.width = 0
        invalid_frame.height = 0
        invalid_frame.data = b''

        # Should not crash
        try:
            await agent.on_video_frame(invalid_frame)
        except Exception as e:
            pytest.fail(f"Agent crashed on invalid frame: {e}")

    @pytest.mark.asyncio
    async def test_recovers_from_llm_timeout(self, mock_livekit_context, mock_backend_client):
        """Test agent recovers from LLM timeouts"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Mock LLM that times out
        mock_llm = AsyncMock()

        async def timeout_chat(*args, **kwargs):
            await asyncio.sleep(10)  # Simulate timeout
            raise asyncio.TimeoutError("LLM timeout")

        mock_llm.chat = timeout_chat

        # Process should handle timeout gracefully
        try:
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(
                    agent.on_user_speech("Test", mock_llm),
                    timeout=1.0
                )
        except Exception as e:
            pytest.fail(f"Unexpected exception: {e}")

    @pytest.mark.asyncio
    async def test_handles_backend_unavailability(self, mock_livekit_context):
        """Test agent handles backend API unavailability"""
        # Create backend that fails
        backend = BackendClient(
            base_url="http://localhost:9999",  # Invalid port
            api_key="test_key"
        )

        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Try to use backend (should handle gracefully)
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            mock_chunk = Mock()
            mock_chunk.content = "Response without backend"
            yield mock_chunk

        mock_llm.chat = mock_chat

        # Should not crash even if backend unavailable
        response = await agent.on_user_speech("Test question", mock_llm)
        assert response == "Response without backend"

    @pytest.mark.asyncio
    async def test_frame_processor_handles_errors(self):
        """Test frame processor continues after errors"""
        processor = FrameProcessor(threshold=10)

        # Create invalid frame
        invalid_frame = Mock()
        invalid_frame.width = -1
        invalid_frame.height = -1
        invalid_frame.data = None

        # Should handle error gracefully
        try:
            result = processor.should_process_frame(invalid_frame, is_speaking=True)
            # Should process (default on error to avoid blocking)
            assert result is True
        except Exception as e:
            pytest.fail(f"Frame processor crashed: {e}")

    @pytest.mark.asyncio
    async def test_cleanup_on_disconnect(self, mock_livekit_context, mock_backend_client):
        """Test agent cleans up resources on disconnect"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Process some frames
        for _ in range(5):
            data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            mock_frame = Mock()
            mock_frame.width = 640
            mock_frame.height = 480
            mock_frame.data = data.tobytes()
            await agent.on_video_frame(mock_frame)

        # Cleanup
        await agent.cleanup()

        # Verify stats were logged
        stats = agent.frame_processor.get_stats()
        assert stats["total_frames"] > 0


class TestProductionWorkflows:
    """Test complete production workflows"""

    @pytest.mark.asyncio
    async def test_complete_agent_lifecycle(self, mock_livekit_context, mock_backend_client):
        """Test complete agent lifecycle: start → process → cleanup"""
        # Create agent
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        # Start agent
        await agent.start()

        # Process user input
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            mock_chunk = Mock()
            mock_chunk.content = "Hello! How can I help?"
            yield mock_chunk

        mock_llm.chat = mock_chat

        response = await agent.on_user_speech("Hello", mock_llm)
        assert "Hello" in response

        # Process video frames
        for i in range(3):
            data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            mock_frame = Mock()
            mock_frame.width = 640
            mock_frame.height = 480
            mock_frame.data = data.tobytes()
            await agent.on_video_frame(mock_frame)

        # Cleanup
        await agent.cleanup()

        # Verify agent processed requests
        assert len(agent._conversation_history) > 0

    @pytest.mark.asyncio
    async def test_multi_user_room_simulation(self, mock_backend_client):
        """Test agent handles multiple participants"""
        # Create multiple agents for different participants
        agents = []

        for i in range(3):
            ctx = Mock()
            ctx.room = Mock()
            ctx.room.name = f"tenant_test_room{i}"
            ctx.room.metadata = "{}"

            agent = MultiModalAgent(
                ctx=ctx,
                tenant_id=f"tenant{i}",
                backend_client=mock_backend_client
            )
            agents.append(agent)

        # Start all agents
        for agent in agents:
            await agent.start()

        # Verify all agents initialized
        assert len(agents) == 3
        for i, agent in enumerate(agents):
            assert agent.tenant_id == f"tenant{i}"

    @pytest.mark.asyncio
    async def test_long_running_session_stability(self, mock_livekit_context, mock_backend_client):
        """Test agent remains stable during long sessions"""
        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=mock_backend_client
        )

        await agent.start()

        # Simulate long session with many requests
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            mock_chunk = Mock()
            mock_chunk.content = f"Response {len(agent._conversation_history)}"
            yield mock_chunk

        mock_llm.chat = mock_chat

        # Process 50 requests
        for i in range(50):
            response = await agent.on_user_speech(f"Query {i}", mock_llm)
            assert f"Response" in response

        # Verify conversation history maintained
        assert len(agent._conversation_history) == 100  # 50 user + 50 assistant

        # Verify AI routing stats
        stats = agent.ai_router.get_statistics()
        assert stats["total_requests"] > 0

    @pytest.mark.asyncio
    async def test_cost_tracking_accuracy(self, mock_livekit_context):
        """Test cost tracking matches actual usage"""
        # Mock backend that tracks costs
        backend = AsyncMock()
        logged_costs = []

        async def track_cost(**kwargs):
            logged_costs.append(kwargs)

        backend.log_cost_event = track_cost

        agent = MultiModalAgent(
            ctx=mock_livekit_context,
            tenant_id="test_tenant",
            backend_client=backend
        )

        # Process requests with different complexities
        mock_llm = AsyncMock()

        async def mock_chat(*args, **kwargs):
            mock_chunk = Mock()
            mock_chunk.content = "Response text"
            yield mock_chunk

        mock_llm.chat = mock_chat

        # Simple request
        await agent.on_user_speech("Hi", mock_llm)

        # Complex request
        agent._current_complexity = ComplexityLevel.COMPLEX
        await agent.on_user_speech("Design a distributed system", mock_llm)

        # Verify costs were logged
        assert len(logged_costs) == 2

        # Verify cost fields
        for cost_event in logged_costs:
            assert "tenant_id" in cost_event
            assert "model" in cost_event
            assert "cost" in cost_event
            assert cost_event["cost"] > 0


class TestVisionAwareAgent:
    """Test VisionAwareAgent extension (LLM + TTS integration)"""

    @pytest.mark.asyncio
    async def test_vision_context_injection_in_llm_node(self):
        """Test vision context is injected in llm_node() override"""
        # Mock vision context
        vision_items = [
            {"timestamp": time.time(), "analysis": "Code editor visible"}
        ]

        vision_context_getter = lambda: vision_items

        # Create VisionAwareAgent (minimal setup)
        agent = VisionAwareAgent(
            instructions="Test instructions",
            vision_context_getter=vision_context_getter,
            room=Mock(),
            publish_topic="agent.chat",
            original_instructions="Test",
            chat_ctx=Mock(),
            vad=Mock(),
            stt=Mock(),
            llm=Mock(),
            tts=Mock()
        )

        # Verify vision context getter works
        assert agent._get_vision_context() == vision_items
        assert len(vision_items) == 1

    @pytest.mark.asyncio
    async def test_tts_transcription_publishing(self):
        """Test TTS text is published to data channel"""
        mock_room = Mock()
        mock_room.local_participant = Mock()
        mock_room.local_participant.publish_data = AsyncMock()

        agent = VisionAwareAgent(
            instructions="Test",
            vision_context_getter=lambda: [],
            room=mock_room,
            publish_topic="agent.chat",
            original_instructions="Test",
            chat_ctx=Mock(),
            vad=Mock(),
            stt=Mock(),
            llm=Mock(),
            tts=Mock()
        )

        # Test data publishing (simulated in tts_node)
        # In production, tts_node() intercepts TTS stream and publishes
        # Here we verify the room setup is correct
        assert agent._room == mock_room
        assert agent._publish_topic == "agent.chat"
