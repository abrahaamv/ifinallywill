"""
AI Provider Manager - Singleton pattern with tenant-aware rate limiting
Manages connections to OpenAI, Anthropic, and Google AI providers
"""

import logging
from typing import Optional

from anthropic import AsyncAnthropic
from google.generativeai import GenerativeModel
from openai import AsyncOpenAI

from config import settings
from .distributed_limiter import DistributedRateLimiter

logger = logging.getLogger(__name__)


class TenantTier:
    """Tenant tier rate limits (requests per minute)"""
    FREE = 10
    STARTER = 50
    PRO = 500
    ENTERPRISE = 5000


class AIProviderManager:
    """
    Singleton manager for AI provider connections

    Features:
    - Connection pooling for OpenAI, Anthropic, Google
    - Tenant-aware rate limiting with Redis coordination
    - Automatic retry with exponential backoff
    - Cost tracking and usage monitoring

    Architecture:
    - Singleton pattern ensures one instance per worker process
    - Shared across all rooms in the same worker
    - Distributed rate limiting across multiple workers via Redis
    """

    _instance: Optional["AIProviderManager"] = None

    def __new__(cls):
        """Singleton pattern - only one instance per worker process"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize provider connections and rate limiters"""
        if self._initialized:
            return

        # OpenAI client with connection pooling
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            max_retries=3,
            timeout=30.0
        ) if settings.openai_api_key else None

        # Anthropic client with connection pooling
        self.anthropic = AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            max_retries=3,
            timeout=30.0
        ) if settings.anthropic_api_key else None

        # Google Generative AI client
        # Note: google-generativeai doesn't have built-in connection pooling
        # Each request creates a new connection
        self.google_api_key = settings.google_api_key if settings.google_api_key else None

        # Distributed rate limiters (Redis-backed)
        self.rate_limiters: dict[str, DistributedRateLimiter] = {}

        self._initialized = True
        logger.info("AI Provider Manager initialized (singleton)")

    def get_rate_limiter(self, tenant_id: str, tier: str = "pro") -> DistributedRateLimiter:
        """
        Get or create rate limiter for tenant

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier (free, starter, pro, enterprise)

        Returns:
            DistributedRateLimiter instance for tenant
        """
        if tenant_id not in self.rate_limiters:
            # Map tier to rate limit
            rate_limits = {
                "free": TenantTier.FREE,
                "starter": TenantTier.STARTER,
                "pro": TenantTier.PRO,
                "enterprise": TenantTier.ENTERPRISE
            }

            max_requests = rate_limits.get(tier.lower(), TenantTier.PRO)

            # Create distributed rate limiter
            self.rate_limiters[tenant_id] = DistributedRateLimiter(
                redis_url=settings.redis_url,
                key_prefix=f"rate_limit:tenant:{tenant_id}",
                max_requests=max_requests,
                window_seconds=60  # 1 minute window
            )

            logger.info(f"Rate limiter created for tenant {tenant_id}: {max_requests} req/min")

        return self.rate_limiters[tenant_id]

    async def check_rate_limit(self, tenant_id: str, tier: str = "pro") -> bool:
        """
        Check if tenant has exceeded rate limit

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier

        Returns:
            True if request is allowed, False if rate limited
        """
        limiter = self.get_rate_limiter(tenant_id, tier)
        return await limiter.check_rate_limit()

    async def get_wait_time(self, tenant_id: str, tier: str = "pro") -> float:
        """
        Get wait time until rate limit resets

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier

        Returns:
            Seconds to wait until next request is allowed
        """
        limiter = self.get_rate_limiter(tenant_id, tier)
        return await limiter.get_wait_time()

    def get_openai_client(self) -> Optional[AsyncOpenAI]:
        """
        Get OpenAI client

        Returns:
            AsyncOpenAI client or None if not configured
        """
        if not self.openai:
            logger.warning("OpenAI client not configured")
        return self.openai

    def get_anthropic_client(self) -> Optional[AsyncAnthropic]:
        """
        Get Anthropic client

        Returns:
            AsyncAnthropic client or None if not configured
        """
        if not self.anthropic:
            logger.warning("Anthropic client not configured")
        return self.anthropic

    def get_google_model(self, model_name: str = "gemini-2.5-flash") -> Optional[GenerativeModel]:
        """
        Get Google Generative AI model

        Args:
            model_name: Model identifier

        Returns:
            GenerativeModel instance or None if not configured
        """
        if not self.google_api_key:
            logger.warning("Google API key not configured")
            return None

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.google_api_key)
            return genai.GenerativeModel(model_name)
        except Exception as e:
            logger.error(f"Failed to create Google model: {e}")
            return None

    async def openai_completion(
        self,
        tenant_id: str,
        tier: str,
        model: str,
        messages: list[dict],
        **kwargs
    ) -> Optional[dict]:
        """
        OpenAI completion with rate limiting

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier
            model: Model name (gpt-4o-mini, gpt-4o)
            messages: Chat messages
            **kwargs: Additional parameters

        Returns:
            Completion response or None if rate limited/error
        """
        # Check rate limit
        if not await self.check_rate_limit(tenant_id, tier):
            wait_time = await self.get_wait_time(tenant_id, tier)
            logger.warning(f"Rate limit exceeded for tenant {tenant_id}, wait {wait_time:.1f}s")
            return None

        # Get client
        client = self.get_openai_client()
        if not client:
            return None

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            return response.model_dump()
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
            return None

    async def anthropic_completion(
        self,
        tenant_id: str,
        tier: str,
        model: str,
        messages: list[dict],
        system: Optional[str] = None,
        **kwargs
    ) -> Optional[dict]:
        """
        Anthropic completion with rate limiting

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier
            model: Model name (claude-sonnet-4-5)
            messages: Chat messages
            system: System prompt
            **kwargs: Additional parameters

        Returns:
            Completion response or None if rate limited/error
        """
        # Check rate limit
        if not await self.check_rate_limit(tenant_id, tier):
            wait_time = await self.get_wait_time(tenant_id, tier)
            logger.warning(f"Rate limit exceeded for tenant {tenant_id}, wait {wait_time:.1f}s")
            return None

        # Get client
        client = self.get_anthropic_client()
        if not client:
            return None

        try:
            response = await client.messages.create(
                model=model,
                messages=messages,
                system=system,
                **kwargs
            )
            return response.model_dump()
        except Exception as e:
            logger.error(f"Anthropic completion error: {e}")
            return None

    async def google_completion(
        self,
        tenant_id: str,
        tier: str,
        model_name: str,
        prompt: str,
        **kwargs
    ) -> Optional[str]:
        """
        Google Generative AI completion with rate limiting

        Args:
            tenant_id: Tenant identifier
            tier: Tenant tier
            model_name: Model name (gemini-2.5-flash-lite, gemini-2.5-flash)
            prompt: User prompt
            **kwargs: Additional parameters

        Returns:
            Generated text or None if rate limited/error
        """
        # Check rate limit
        if not await self.check_rate_limit(tenant_id, tier):
            wait_time = await self.get_wait_time(tenant_id, tier)
            logger.warning(f"Rate limit exceeded for tenant {tenant_id}, wait {wait_time:.1f}s")
            return None

        # Get model
        model = self.get_google_model(model_name)
        if not model:
            return None

        try:
            response = await model.generate_content_async(prompt, **kwargs)
            return response.text
        except Exception as e:
            logger.error(f"Google completion error: {e}")
            return None

    async def cleanup(self):
        """Cleanup resources"""
        # Close rate limiter connections
        for limiter in self.rate_limiters.values():
            await limiter.close()

        # Close OpenAI client
        if self.openai:
            await self.openai.close()

        # Close Anthropic client
        if self.anthropic:
            await self.anthropic.close()

        logger.info("AI Provider Manager cleaned up")


# Global singleton instance
provider_manager = AIProviderManager()
