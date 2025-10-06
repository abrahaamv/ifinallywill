"""
AI Provider Abstraction Layer

This package provides a unified interface for all AI services used in the platform:
- Vision providers (Gemini Flash, Claude Sonnet)
- LLM providers (GPT-4o-mini, GPT-4o)
- TTS providers (ElevenLabs, Cartesia)
- Embeddings providers (Voyage Multimodal-3)

Architecture follows the cost-optimized strategy from documentation:
- 85% Gemini Flash / 15% Claude Sonnet for vision (10x cost reduction)
- 70% GPT-4o-mini / 30% GPT-4o for LLM (16x cost reduction)
- ElevenLabs primary / Cartesia fallback for TTS (best emotional warmth)
"""

from .base import (
    VisionProvider,
    LLMProvider,
    TTSProvider,
    EmbeddingsProvider,
    ProviderResponse,
    ProviderError,
)

__all__ = [
    "VisionProvider",
    "LLMProvider",
    "TTSProvider",
    "EmbeddingsProvider",
    "ProviderResponse",
    "ProviderError",
]
