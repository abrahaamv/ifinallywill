"""
Vision Provider with Cost-Optimized Routing

Implements 85/15 split between Gemini Flash and Claude Sonnet based on complexity:
- Gemini Flash 2.5: Routine analysis (85% of frames, $0.10/1M tokens)
- Claude 3.5 Sonnet: Complex reasoning (15% of frames, $3/1M tokens)

Cost Impact: 10x reduction vs GPT-4o-only approach
Expected Cost: ~$0.50/1M tokens average (vs $2.50/1M for GPT-4o)
"""

import base64
import time
import logging
from typing import Optional, Dict, Any
from PIL import Image
import io

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("google-generativeai not installed. Install with: pip install google-generativeai>=0.8.0")

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logging.warning("anthropic not installed. Install with: pip install anthropic>=0.39.0")

from .base import VisionProvider, ProviderResponse, ProviderTier, ProviderError
from ..routing.complexity import VisionComplexityScorer

logger = logging.getLogger(__name__)


class GeminiFlashVision(VisionProvider):
    """
    Google Gemini Flash 2.5 vision provider (ROUTINE tier).

    Optimized for:
    - UI element detection
    - Button/menu identification
    - Simple object recognition
    - Form field analysis
    - Basic screen understanding

    Cost: $0.10 per 1M tokens
    Latency: 250-400ms
    Use case: 85% of frames
    """

    def __init__(self, api_key: str):
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package required. Install with: pip install google-generativeai>=0.8.0")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.cost_per_million_tokens = 0.10

    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        complexity_score: float,
        max_tokens: int = 500,
    ) -> ProviderResponse:
        """Analyze image using Gemini Flash"""
        start_time = time.time()

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))

            # Generate content
            response = self.model.generate_content([prompt, image])

            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            tokens_used = response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else max_tokens
            cost_usd = (tokens_used / 1_000_000) * self.cost_per_million_tokens

            return ProviderResponse(
                success=True,
                content=response.text,
                provider_name="gemini_flash",
                provider_tier=ProviderTier.ROUTINE,
                tokens_used=tokens_used,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                metadata={
                    "model": "gemini-2.0-flash-exp",
                    "complexity_score": complexity_score,
                }
            )

        except Exception as e:
            logger.error(f"Gemini Flash vision error: {str(e)}")
            raise ProviderError(
                message=str(e),
                provider_name="gemini_flash",
                tier=ProviderTier.ROUTINE
            )

    def get_tier(self) -> ProviderTier:
        return ProviderTier.ROUTINE


class ClaudeSonnetVision(VisionProvider):
    """
    Anthropic Claude 3.5 Sonnet vision provider (PREMIUM tier).

    Optimized for:
    - Multi-step process analysis
    - Complex chart interpretation
    - Code/debugging analysis
    - Comparative analysis
    - Edge case reasoning

    Cost: $3.00 per 1M tokens (with prompt caching potential)
    Latency: 400-800ms
    Use case: 15% of frames
    """

    def __init__(self, api_key: str):
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("anthropic package required. Install with: pip install anthropic>=0.39.0")

        self.client = Anthropic(api_key=api_key)
        self.cost_per_million_tokens = 3.00

    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        complexity_score: float,
        max_tokens: int = 500,
    ) -> ProviderResponse:
        """Analyze image using Claude Sonnet"""
        start_time = time.time()

        try:
            # Convert to base64
            image_b64 = base64.b64encode(image_data).decode('utf-8')

            # Create message
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=max_tokens,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ],
                }]
            )

            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            tokens_used = message.usage.input_tokens + message.usage.output_tokens
            cost_usd = (tokens_used / 1_000_000) * self.cost_per_million_tokens

            return ProviderResponse(
                success=True,
                content=message.content[0].text,
                provider_name="claude_sonnet",
                provider_tier=ProviderTier.PREMIUM,
                tokens_used=tokens_used,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                metadata={
                    "model": "claude-3-5-sonnet-20241022",
                    "complexity_score": complexity_score,
                    "stop_reason": message.stop_reason,
                }
            )

        except Exception as e:
            logger.error(f"Claude Sonnet vision error: {str(e)}")
            raise ProviderError(
                message=str(e),
                provider_name="claude_sonnet",
                tier=ProviderTier.PREMIUM
            )

    def get_tier(self) -> ProviderTier:
        return ProviderTier.PREMIUM


class VisionRouter:
    """
    Smart vision provider router with complexity-based selection.

    Routes frames to optimal provider:
    - Complexity < 0.7 → Gemini Flash (85% expected)
    - Complexity >= 0.7 → Claude Sonnet (15% expected)

    Includes fallback logic and usage tracking.
    """

    COMPLEXITY_THRESHOLD = 0.7  # Matches documentation spec

    def __init__(
        self,
        gemini_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
    ):
        self.complexity_scorer = VisionComplexityScorer()

        # Initialize providers
        self.gemini = None
        self.claude = None

        if gemini_api_key and GEMINI_AVAILABLE:
            self.gemini = GeminiFlashVision(gemini_api_key)
            logger.info("Gemini Flash vision provider initialized")

        if anthropic_api_key and ANTHROPIC_AVAILABLE:
            self.claude = ClaudeSonnetVision(anthropic_api_key)
            logger.info("Claude Sonnet vision provider initialized")

        if not self.gemini and not self.claude:
            logger.warning("No vision providers available. Install required packages.")

        # Usage tracking
        self.usage_stats = {
            "gemini_count": 0,
            "claude_count": 0,
            "total_cost": 0.0,
        }

    async def analyze(
        self,
        image_data: bytes,
        prompt: str,
        frame_metadata: Optional[Dict] = None,
        force_provider: Optional[str] = None,
    ) -> ProviderResponse:
        """
        Analyze image with optimal provider based on complexity.

        Args:
            image_data: Raw image bytes
            prompt: Analysis prompt
            frame_metadata: Optional metadata for complexity scoring
            force_provider: Optional override ("gemini" or "claude")

        Returns:
            ProviderResponse with analysis
        """
        # Assess complexity
        complexity_result = self.complexity_scorer.assess(prompt, frame_metadata)
        logger.info(f"Vision complexity: {complexity_result.explanation}")

        # Determine provider
        use_premium = complexity_result.score >= self.COMPLEXITY_THRESHOLD

        # Allow manual override
        if force_provider:
            use_premium = force_provider.lower() == "claude"

        # Select provider with fallback
        if use_premium and self.claude:
            provider = self.claude
            self.usage_stats["claude_count"] += 1
        elif not use_premium and self.gemini:
            provider = self.gemini
            self.usage_stats["gemini_count"] += 1
        elif self.gemini:
            # Fallback to Gemini if Claude unavailable
            provider = self.gemini
            self.usage_stats["gemini_count"] += 1
            logger.info("Falling back to Gemini (Claude unavailable)")
        elif self.claude:
            # Fallback to Claude if Gemini unavailable
            provider = self.claude
            self.usage_stats["claude_count"] += 1
            logger.info("Falling back to Claude (Gemini unavailable)")
        else:
            raise ProviderError(
                message="No vision providers available",
                provider_name="vision_router",
                tier=ProviderTier.ROUTINE
            )

        # Analyze image
        result = await provider.analyze_image(
            image_data=image_data,
            prompt=prompt,
            complexity_score=complexity_result.score,
        )

        # Track costs
        if result.cost_usd:
            self.usage_stats["total_cost"] += result.cost_usd

        return result

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics for monitoring"""
        total_requests = self.usage_stats["gemini_count"] + self.usage_stats["claude_count"]
        return {
            **self.usage_stats,
            "total_requests": total_requests,
            "gemini_percentage": (self.usage_stats["gemini_count"] / total_requests * 100) if total_requests > 0 else 0,
            "claude_percentage": (self.usage_stats["claude_count"] / total_requests * 100) if total_requests > 0 else 0,
            "avg_cost_per_request": (self.usage_stats["total_cost"] / total_requests) if total_requests > 0 else 0,
        }
