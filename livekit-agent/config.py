"""
Configuration management for LiveKit agent
Loads tenant-specific settings and environment variables
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass, field
from pydantic_settings import BaseSettings, SettingsConfigDict
import httpx

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Environment-based configuration"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # LiveKit Configuration
    livekit_url: str = "ws://localhost:7880"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # Backend API
    backend_url: str = "http://localhost:3001"
    backend_api_key: str = ""

    # Database
    database_url: str = "postgresql://platform:platform_dev_password@localhost:5432/platform"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # AI Providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    deepgram_api_key: str = ""
    cartesia_api_key: str = ""  # Cartesia TTS (primary)
    voyage_api_key: str = ""

    # Agent Configuration
    worker_port: int = 8081
    num_idle_processes: int = 2
    max_concurrent_rooms: int = 15

    # Frame Processing
    frame_similarity_threshold: int = 10
    active_fps: float = 30.0
    idle_fps: float = 5.0

    # Vision
    proactive_vision_analysis: bool = True  # Enable screen share vision analysis
    frame_resize_width: int = 1024
    frame_resize_height: int = 1024
    frame_jpeg_quality: int = 85

    # Cost Optimization
    enable_prompt_caching: bool = True
    enable_frame_deduplication: bool = True
    enable_adaptive_fps: bool = True


# Global settings instance
settings = Settings()


@dataclass
class TenantConfig:
    """Per-tenant configuration loaded from backend API"""

    tenant_id: str

    # Agent Personality
    system_prompt: Optional[str] = None
    greeting_message: Optional[str] = None

    # TTS Settings (Cartesia defaults)
    tts_voice_id: str = "a0e99841-438c-4a64-b679-ae501e7d6091"  # Barbershop Man (American)
    tts_model: str = "sonic-2"  # Cartesia Sonic model
    tts_streaming_latency: int = 3

    # AI Routing
    gemini_flash_lite_weight: float = 0.60
    gemini_flash_weight: float = 0.25
    claude_sonnet_weight: float = 0.15

    # Rate Limits
    rate_limit_tier: str = "pro"
    max_requests_per_minute: int = 500

    # Feature Flags
    enable_vision: bool = True
    enable_knowledge_base: bool = True
    enable_function_calling: bool = True

    # Cost Limits
    max_cost_per_session: float = 10.0
    cost_alert_threshold: float = 8.0


class Config:
    """Configuration manager with backend integration"""

    _cache: dict[str, TenantConfig] = {}

    @classmethod
    def load_for_tenant(cls, tenant_id: str) -> TenantConfig:
        """
        Load configuration for specific tenant
        Caches result for 5 minutes
        """
        # Check cache
        if tenant_id in cls._cache:
            return cls._cache[tenant_id]

        # Try to fetch from backend API synchronously (for non-async context)
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    f"{settings.backend_url}/api/trpc/tenants.getAgentConfig",
                    params={"input": {"json": {"tenantId": tenant_id}}},
                    headers={
                        "Authorization": f"Bearer {settings.backend_api_key}",
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    result = data.get("result", {}).get("data", {}).get("json", {})

                    if result:
                        config = TenantConfig(
                            tenant_id=tenant_id,
                            system_prompt=result.get("systemPrompt"),
                            greeting_message=result.get("greetingMessage"),
                            tts_voice_id=result.get("ttsVoiceId", "a0e99841-438c-4a64-b679-ae501e7d6091"),
                            tts_model=result.get("ttsModel", "sonic-2"),
                            enable_vision=result.get("enableVision", True),
                            enable_knowledge_base=result.get("enableKnowledgeBase", True),
                        )
                        cls._cache[tenant_id] = config
                        logger.info(f"Loaded tenant config for {tenant_id} from backend")
                        return config

        except Exception as e:
            logger.warning(f"Failed to fetch tenant config from backend: {e}")

        # Fallback to default config
        config = TenantConfig(
            tenant_id=tenant_id,
            system_prompt=f"You are an AI assistant for tenant {tenant_id}."
        )
        cls._cache[tenant_id] = config
        return config

    @classmethod
    async def fetch_from_backend(cls, tenant_id: str) -> TenantConfig:
        """
        Fetch tenant configuration from backend API
        Async version for use in async contexts
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.backend_url}/api/trpc/tenants.getAgentConfig",
                    params={"input": {"json": {"tenantId": tenant_id}}},
                    headers={
                        "Authorization": f"Bearer {settings.backend_api_key}",
                        "Content-Type": "application/json"
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    result = data.get("result", {}).get("data", {}).get("json", {})

                    if result:
                        config = TenantConfig(
                            tenant_id=tenant_id,
                            system_prompt=result.get("systemPrompt"),
                            greeting_message=result.get("greetingMessage"),
                            tts_voice_id=result.get("ttsVoiceId", "a0e99841-438c-4a64-b679-ae501e7d6091"),
                            tts_model=result.get("ttsModel", "sonic-2"),
                            enable_vision=result.get("enableVision", True),
                            enable_knowledge_base=result.get("enableKnowledgeBase", True),
                        )
                        cls._cache[tenant_id] = config
                        logger.info(f"Loaded tenant config for {tenant_id} from backend (async)")
                        return config

        except Exception as e:
            logger.warning(f"Failed to fetch tenant config from backend (async): {e}")

        # Fallback to default config
        config = TenantConfig(tenant_id=tenant_id)
        cls._cache[tenant_id] = config
        return config

    @classmethod
    def clear_cache(cls, tenant_id: Optional[str] = None):
        """Clear configuration cache"""
        if tenant_id:
            cls._cache.pop(tenant_id, None)
        else:
            cls._cache.clear()


# Export commonly used items
__all__ = ["settings", "Config", "TenantConfig"]
