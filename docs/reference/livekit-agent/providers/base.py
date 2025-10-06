"""
Base Provider Interfaces

Abstract base classes defining the contract for all AI providers.
Enables easy provider swapping and testing without code changes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from enum import Enum


class ProviderType(Enum):
    """AI provider types"""
    VISION = "vision"
    LLM = "llm"
    TTS = "tts"
    EMBEDDINGS = "embeddings"


class ProviderTier(Enum):
    """Provider tier for cost optimization"""
    ROUTINE = "routine"  # 70-85% of requests, lowest cost
    STANDARD = "standard"  # 15-30% of requests, moderate cost
    PREMIUM = "premium"  # <5% of requests, highest quality


@dataclass
class ProviderResponse:
    """Standard response format for all providers"""
    success: bool
    content: Any
    provider_name: str
    provider_tier: ProviderTier
    tokens_used: Optional[int] = None
    cost_usd: Optional[float] = None
    latency_ms: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ProviderError(Exception):
    """Base exception for provider errors"""
    def __init__(self, message: str, provider_name: str, tier: ProviderTier):
        self.message = message
        self.provider_name = provider_name
        self.tier = tier
        super().__init__(f"[{provider_name}/{tier.value}] {message}")


class VisionProvider(ABC):
    """Abstract base class for vision analysis providers"""

    @abstractmethod
    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        complexity_score: float,
        max_tokens: int = 500,
    ) -> ProviderResponse:
        """
        Analyze an image and return insights based on prompt.

        Args:
            image_data: Raw image bytes
            prompt: Analysis prompt from user
            complexity_score: 0.0-1.0 score for routing decision
            max_tokens: Maximum tokens for response

        Returns:
            ProviderResponse with analysis text
        """
        pass

    @abstractmethod
    def get_tier(self) -> ProviderTier:
        """Get provider tier for cost tracking"""
        pass


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        complexity_score: float,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        """
        Generate text response based on conversation context.

        Args:
            messages: Conversation history [{"role": "user", "content": "..."}]
            complexity_score: 0.0-1.0 score for routing decision
            max_tokens: Maximum tokens for response
            temperature: Sampling temperature

        Returns:
            ProviderResponse with generated text
        """
        pass

    @abstractmethod
    def get_tier(self) -> ProviderTier:
        """Get provider tier for cost tracking"""
        pass


class TTSProvider(ABC):
    """Abstract base class for text-to-speech providers"""

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        emotion: Optional[str] = None,
    ) -> ProviderResponse:
        """
        Convert text to speech audio.

        Args:
            text: Text to synthesize
            voice_id: Optional voice identifier
            emotion: Optional emotion hint (happy, sad, neutral, etc.)

        Returns:
            ProviderResponse with audio bytes
        """
        pass

    @abstractmethod
    def get_tier(self) -> ProviderTier:
        """Get provider tier for cost tracking"""
        pass


class EmbeddingsProvider(ABC):
    """Abstract base class for embeddings providers"""

    @abstractmethod
    async def embed(
        self,
        texts: List[str],
        input_type: str = "document",
    ) -> ProviderResponse:
        """
        Generate embeddings for text inputs.

        Args:
            texts: List of text strings to embed
            input_type: "document" or "query" for specialized embeddings

        Returns:
            ProviderResponse with embeddings array (shape: [N, dimensions])
        """
        pass

    @abstractmethod
    def get_dimensions(self) -> int:
        """Get embedding dimensions"""
        pass

    @abstractmethod
    def get_tier(self) -> ProviderTier:
        """Get provider tier for cost tracking"""
        pass
