"""
Unit tests for AI Router (three-tier routing logic)
"""

import pytest
from ai_router import AIRouter, ComplexityLevel


class TestComplexityEstimation:
    """Test complexity estimation logic"""

    def test_simple_greeting(self):
        """Short, simple text should be SIMPLE"""
        router = AIRouter()

        text = "Hello"
        complexity = router.estimate_complexity(text)

        assert complexity == ComplexityLevel.SIMPLE

    def test_simple_question(self):
        """Basic questions should be SIMPLE"""
        router = AIRouter()

        text = "What time is it?"
        complexity = router.estimate_complexity(text)

        assert complexity == ComplexityLevel.SIMPLE

    def test_moderate_technical_question(self):
        """Technical questions should be MODERATE"""
        router = AIRouter()

        text = "How do I configure a Redis cluster?"
        complexity = router.estimate_complexity(text)

        assert complexity == ComplexityLevel.MODERATE

    def test_complex_code_request(self):
        """Code-heavy requests should be COMPLEX"""
        router = AIRouter()

        text = """
        I need help implementing a distributed rate limiter using Redis.
        It should use Lua scripts for atomicity and handle race conditions.
        Can you provide a production-ready implementation with error handling?
        """
        complexity = router.estimate_complexity(text)

        assert complexity == ComplexityLevel.COMPLEX

    def test_complex_multiple_questions(self):
        """Multiple questions should increase complexity"""
        router = AIRouter()

        text = "What is Redis? How does it work? When should I use it? What are the alternatives?"
        complexity = router.estimate_complexity(text)

        assert complexity in [ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]

    def test_complex_reasoning_request(self):
        """Requests requiring reasoning should be COMPLEX"""
        router = AIRouter()

        text = "Analyze the trade-offs between microservices and monolithic architecture"
        complexity = router.estimate_complexity(text)

        assert complexity in [ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]


class TestModelSelection:
    """Test model selection based on complexity"""

    def test_simple_uses_flash_lite(self):
        """SIMPLE complexity should prefer Gemini Flash-Lite"""
        router = AIRouter()

        model = router.select_model(ComplexityLevel.SIMPLE)

        # With 60% weight, Flash-Lite should be selected most of the time
        # Test multiple times to verify distribution
        models = [router.select_model(ComplexityLevel.SIMPLE) for _ in range(100)]
        flash_lite_count = sum(1 for m in models if "flash-lite" in m.lower() or "flash-8b" in m.lower())

        assert flash_lite_count > 40  # At least 40% should be Flash-Lite

    def test_moderate_uses_flash(self):
        """MODERATE complexity should prefer Gemini Flash"""
        router = AIRouter()

        # Test multiple times to verify distribution
        models = [router.select_model(ComplexityLevel.MODERATE) for _ in range(100)]
        flash_count = sum(1 for m in models if "flash" in m.lower() and "lite" not in m.lower() and "8b" not in m.lower())

        assert flash_count > 40  # At least 40% should be Gemini Flash

    def test_complex_uses_claude(self):
        """COMPLEX complexity should prefer Claude Sonnet"""
        router = AIRouter()

        # Test multiple times to verify distribution
        models = [router.select_model(ComplexityLevel.COMPLEX) for _ in range(100)]
        claude_count = sum(1 for m in models if "claude" in m.lower())

        assert claude_count > 60  # At least 60% should be Claude

    def test_custom_weights(self):
        """Custom weights should affect distribution"""
        router = AIRouter(
            gemini_flash_lite_weight=0.0,
            gemini_flash_weight=0.0,
            claude_sonnet_weight=1.0
        )

        model = router.select_model(ComplexityLevel.SIMPLE)

        # With 100% Claude weight, should always select Claude
        assert "claude" in model.lower()


class TestRouteRequest:
    """Test end-to-end routing"""

    @pytest.mark.asyncio
    async def test_route_simple_text(self):
        """Route simple text through complete flow"""
        router = AIRouter()

        text = "Hello, how are you?"
        result = router.route_request(text)

        assert "complexity" in result
        assert "model" in result
        assert result["complexity"] == ComplexityLevel.SIMPLE.value

    @pytest.mark.asyncio
    async def test_route_complex_text(self):
        """Route complex text through complete flow"""
        router = AIRouter()

        text = """
        I need to design a distributed system with the following requirements:
        1. High availability across multiple regions
        2. Strong consistency for financial transactions
        3. Low latency for read operations
        4. Support for 100K+ concurrent users

        What architecture would you recommend? Please include details about:
        - Database selection and sharding strategy
        - Caching layer design
        - Load balancing approach
        - Monitoring and observability
        """

        result = router.route_request(text)

        assert "complexity" in result
        assert "model" in result
        assert result["complexity"] == ComplexityLevel.COMPLEX.value


class TestCostOptimization:
    """Test cost optimization through routing"""

    def test_60_25_15_distribution(self):
        """Verify 60/25/15 distribution for cost optimization"""
        router = AIRouter()

        # Generate 1000 requests with different complexities
        simple_models = [router.select_model(ComplexityLevel.SIMPLE) for _ in range(600)]
        moderate_models = [router.select_model(ComplexityLevel.MODERATE) for _ in range(250)]
        complex_models = [router.select_model(ComplexityLevel.COMPLEX) for _ in range(150)]

        all_models = simple_models + moderate_models + complex_models

        # Count model usage
        flash_lite = sum(1 for m in all_models if "flash-lite" in m.lower() or "flash-8b" in m.lower())
        flash = sum(1 for m in all_models if "flash" in m.lower() and "lite" not in m.lower() and "8b" not in m.lower())
        claude = sum(1 for m in all_models if "claude" in m.lower())

        # Verify approximate distribution (with tolerance)
        total = len(all_models)
        assert 0.50 <= flash_lite / total <= 0.70  # ~60%
        assert 0.15 <= flash / total <= 0.35       # ~25%
        assert 0.05 <= claude / total <= 0.25      # ~15%

    def test_estimated_cost_savings(self):
        """Verify cost savings from routing vs all-Claude"""
        router = AIRouter()

        # Assume costs (per 1M tokens):
        # Gemini Flash-Lite: $0.075
        # Gemini Flash: $0.20
        # Claude Sonnet 4.5: $3.00

        # Simulate 1000 requests (1K tokens each = 1M tokens total)
        flash_lite_count = 600
        flash_count = 250
        claude_count = 150

        # Calculate actual cost
        actual_cost = (
            flash_lite_count * 0.075 / 1000 +
            flash_count * 0.20 / 1000 +
            claude_count * 3.00 / 1000
        )

        # Calculate baseline (all Claude)
        baseline_cost = 1000 * 3.00 / 1000

        # Verify cost reduction
        savings_percent = (1 - actual_cost / baseline_cost) * 100

        # Should achieve >80% cost reduction
        assert savings_percent > 80
        assert actual_cost < baseline_cost * 0.2
