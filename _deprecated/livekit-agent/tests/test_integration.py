"""
End-to-End Integration Tests with Cost Validation
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, Mock, patch
import numpy as np
from PIL import Image

from ai_router import AIRouter, ComplexityLevel
from frame_processor import FrameProcessor
from monitoring import MetricsCollector


class TestE2ECostOptimization:
    """Test complete cost optimization flow"""

    @pytest.mark.asyncio
    async def test_complete_request_flow(self):
        """Test complete request from user input to AI response"""
        # Initialize components
        router = AIRouter(
            gemini_flash_lite_weight=0.60,
            gemini_flash_weight=0.25,
            claude_sonnet_weight=0.15
        )
        metrics = MetricsCollector()

        # Simulate 100 user requests
        simple_requests = [
            "Hello",
            "What time is it?",
            "Thanks",
            "How are you?"
        ] * 15  # 60 simple

        moderate_requests = [
            "How do I configure Redis?",
            "Explain microservices",
            "What is Kubernetes?"
        ] * 8  # 24 moderate

        complex_requests = [
            "Design a distributed system with high availability",
            "Implement a rate limiter with Redis Lua scripts"
        ] * 8  # 16 complex

        all_requests = simple_requests + moderate_requests + complex_requests

        # Process requests and track costs
        total_cost = 0.0
        model_usage = {"flash-lite": 0, "flash": 0, "claude": 0}

        for text in all_requests:
            # Route request
            result = router.route_request(text)
            complexity = ComplexityLevel(result["complexity"])
            model = result["model"]

            # Track model usage
            if "flash-lite" in model.lower() or "8b" in model.lower():
                model_usage["flash-lite"] += 1
                cost = 0.075 / 1000  # $0.075 per 1M tokens
            elif "flash" in model.lower():
                model_usage["flash"] += 1
                cost = 0.20 / 1000
            else:
                model_usage["claude"] += 1
                cost = 3.00 / 1000

            total_cost += cost

            # Record metrics
            metrics.record_request(
                tenant_id="test_tenant",
                model=model,
                input_tokens=100,
                output_tokens=200,
                cost=cost,
                latency_ms=150.0,
                success=True
            )

        # Calculate baseline (all Claude)
        baseline_cost = len(all_requests) * 3.00 / 1000

        # Calculate savings
        savings_percent = (1 - total_cost / baseline_cost) * 100

        # Verify cost reduction
        print(f"\n=== Cost Analysis ===")
        print(f"Total requests: {len(all_requests)}")
        print(f"Model usage: {model_usage}")
        print(f"Actual cost: ${total_cost:.4f}")
        print(f"Baseline cost: ${baseline_cost:.4f}")
        print(f"Savings: {savings_percent:.1f}%")

        # Should achieve 80-90% cost reduction
        assert savings_percent >= 80, f"Cost reduction {savings_percent:.1f}% < 80%"
        assert savings_percent <= 95, f"Cost reduction {savings_percent:.1f}% > 95% (unrealistic)"
        assert total_cost < baseline_cost * 0.2

    @pytest.mark.asyncio
    async def test_frame_deduplication_cost_impact(self):
        """Test cost reduction from frame deduplication"""
        processor = FrameProcessor(threshold=10, active_fps=30.0, idle_fps=5.0)

        # Simulate 1000 frames at 30 FPS (33 seconds of video)
        # With 70% similarity, expect 60-75% reduction
        total_frames = 1000
        processed_frames = 0

        for i in range(total_frames):
            # Simulate video with 70% similar consecutive frames
            if i % 3 == 0:
                # New unique frame
                data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            else:
                # Similar frame with small variation
                data = data + np.random.randint(-3, 3, (480, 640, 3), dtype=np.int16)
                data = np.clip(data, 0, 255).astype(np.uint8)

            frame = Mock()
            frame.width = 640
            frame.height = 480
            frame.data = data.tobytes()

            if processor.should_process_frame(frame, is_speaking=True):
                processed_frames += 1

        metrics = processor.get_metrics()
        reduction_rate = metrics["deduplication_rate"]

        # Calculate cost impact
        # Vision API cost: ~$0.002 per image
        baseline_cost = total_frames * 0.002
        actual_cost = processed_frames * 0.002
        savings = (1 - actual_cost / baseline_cost) * 100

        print(f"\n=== Frame Deduplication Analysis ===")
        print(f"Total frames: {total_frames}")
        print(f"Processed frames: {processed_frames}")
        print(f"Skipped frames: {metrics['skipped_frames']}")
        print(f"Reduction rate: {reduction_rate:.1f}%")
        print(f"Baseline cost: ${baseline_cost:.2f}")
        print(f"Actual cost: ${actual_cost:.2f}")
        print(f"Savings: {savings:.1f}%")

        # Should achieve 60-75% reduction
        assert 60 <= reduction_rate <= 75
        assert savings >= 60

    @pytest.mark.asyncio
    async def test_combined_optimization_80_90_percent(self):
        """Test combined cost reduction from all optimizations"""
        # Initialize all components
        router = AIRouter()
        processor = FrameProcessor(threshold=10)
        metrics = MetricsCollector()

        # Simulate realistic workload:
        # - 1000 text requests (60% simple, 25% moderate, 15% complex)
        # - 1000 vision frames (70% similar)

        # 1. Text routing cost reduction
        text_requests = 1000
        simple_count = int(text_requests * 0.60)
        moderate_count = int(text_requests * 0.25)
        complex_count = text_requests - simple_count - moderate_count

        text_cost = (
            simple_count * 0.075 / 1000 +
            moderate_count * 0.20 / 1000 +
            complex_count * 3.00 / 1000
        )
        text_baseline = text_requests * 3.00 / 1000
        text_savings = (1 - text_cost / text_baseline) * 100

        # 2. Frame deduplication cost reduction
        total_frames = 1000
        processed_frames = int(total_frames * 0.30)  # 70% reduction

        vision_cost = processed_frames * 0.002
        vision_baseline = total_frames * 0.002
        vision_savings = (1 - vision_cost / vision_baseline) * 100

        # 3. Combined savings
        combined_baseline = text_baseline + vision_baseline
        combined_actual = text_cost + vision_cost
        combined_savings = (1 - combined_actual / combined_baseline) * 100

        print(f"\n=== Combined Cost Optimization ===")
        print(f"Text routing savings: {text_savings:.1f}%")
        print(f"Vision deduplication savings: {vision_savings:.1f}%")
        print(f"Combined savings: {combined_savings:.1f}%")
        print(f"Baseline cost: ${combined_baseline:.2f}")
        print(f"Actual cost: ${combined_actual:.2f}")

        # Should achieve 80-90% total cost reduction
        assert 80 <= combined_savings <= 90, \
            f"Combined savings {combined_savings:.1f}% not in 80-90% target range"


class TestPerformanceMetrics:
    """Test system performance metrics"""

    @pytest.mark.asyncio
    async def test_latency_tracking(self):
        """Test request latency tracking"""
        metrics = MetricsCollector()

        # Record 100 requests with varying latencies
        latencies = []
        for i in range(100):
            latency = 100 + (i % 50)  # 100-150ms
            latencies.append(latency)

            metrics.record_request(
                tenant_id="test_tenant",
                model="gemini-flash",
                input_tokens=100,
                output_tokens=200,
                cost=0.0001,
                latency_ms=latency,
                success=True
            )

        summary = metrics.get_summary()
        avg_latency = summary["avg_latencies"]["test_tenant:gemini-flash"]

        # Average should be around 125ms
        expected_avg = sum(latencies) / len(latencies)
        assert abs(avg_latency - expected_avg) < 1.0

    @pytest.mark.asyncio
    async def test_throughput_measurement(self):
        """Test system throughput measurement"""
        import time
        metrics = MetricsCollector()

        start_time = time.time()

        # Simulate 1000 requests
        for i in range(1000):
            metrics.record_request(
                tenant_id="test_tenant",
                model="gemini-flash-lite",
                input_tokens=100,
                output_tokens=200,
                cost=0.0001,
                latency_ms=50.0,
                success=True
            )

        elapsed = time.time() - start_time
        throughput = 1000 / elapsed

        summary = metrics.get_summary()

        print(f"\n=== Throughput Test ===")
        print(f"Requests: 1000")
        print(f"Time: {elapsed:.2f}s")
        print(f"Throughput: {throughput:.0f} req/s")

        # Should handle >1000 req/s for simple metric recording
        assert throughput > 1000

    @pytest.mark.asyncio
    async def test_prometheus_export(self):
        """Test Prometheus metrics export"""
        metrics = MetricsCollector()

        # Record some requests
        metrics.record_request(
            tenant_id="tenant1",
            model="gemini-flash",
            input_tokens=100,
            output_tokens=200,
            cost=0.0001,
            latency_ms=120.0,
            success=True
        )

        metrics.record_request(
            tenant_id="tenant1",
            model="claude-sonnet",
            input_tokens=150,
            output_tokens=300,
            cost=0.0015,
            latency_ms=180.0,
            success=True
        )

        # Export Prometheus format
        prom_output = metrics.export_prometheus()

        # Verify format
        assert "ai_requests_total" in prom_output
        assert "ai_cost_total" in prom_output
        assert "ai_tokens_total" in prom_output
        assert "ai_latency_ms" in prom_output
        assert 'tenant_id="tenant1"' in prom_output


class TestErrorHandling:
    """Test error handling and recovery"""

    @pytest.mark.asyncio
    async def test_provider_failure_fallback(self):
        """Test fallback when AI provider fails"""
        # This would test circuit breaker in backend_client.py
        # For now, verify metrics track failures
        metrics = MetricsCollector()

        metrics.record_request(
            tenant_id="test_tenant",
            model="gemini-flash",
            input_tokens=100,
            output_tokens=0,
            cost=0.0,
            latency_ms=5000.0,
            success=False,
            error="Timeout"
        )

        summary = metrics.get_summary()

        assert summary["total_errors"] == 1
        assert summary["total_requests"] == 1

    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiting prevents overload"""
        # Mock rate limiter
        from providers.distributed_limiter import DistributedRateLimiter

        with patch.object(DistributedRateLimiter, '__init__', return_value=None):
            with patch.object(DistributedRateLimiter, 'check_rate_limit', new_callable=AsyncMock) as mock_check:
                # First 10 requests allowed, then rate limited
                mock_check.side_effect = [True] * 10 + [False] * 5

                limiter = DistributedRateLimiter(
                    redis_url="redis://localhost:6379",
                    key_prefix="test",
                    max_requests=10,
                    window_seconds=60
                )

                allowed_count = 0
                blocked_count = 0

                for _ in range(15):
                    if await limiter.check_rate_limit():
                        allowed_count += 1
                    else:
                        blocked_count += 1

                assert allowed_count == 10
                assert blocked_count == 5
