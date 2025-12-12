"""
VK-ICE Base Provider

Abstract base class for all ICE credential providers.
Defines the interface and common functionality.

Provider Lifecycle:
    1. __init__() → Configuration
    2. initialize() → Setup connections/sessions
    3. get_credentials() → Fetch with retry logic
    4. health_check() → Verify provider is working
    5. cleanup() → Release resources

Subclass Implementation:
    class MyProvider(IceProvider):
        provider_name = "my_provider"
        default_ttl = 3600

        async def _fetch_credentials(self) -> IceConfig:
            # Your extraction logic here
            return IceConfig(servers=[...], provider=self.provider_name)
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from typing import Optional

from ..models import IceConfig, ProviderHealth, ProviderStats

logger = logging.getLogger(__name__)


class IceProvider(ABC):
    """Abstract base class for ICE credential providers.

    All providers must inherit from this class and implement
    the _fetch_credentials() method.

    Class Attributes:
        provider_name: Unique identifier for this provider
        default_ttl: Default credential TTL in seconds
        max_retries: Maximum fetch retry attempts
        retry_delay: Seconds between retries

    Instance Attributes:
        health: Current health status
        stats: Aggregate statistics
        _initialized: Whether initialize() has been called

    Example:
        >>> class MyProvider(IceProvider):
        ...     provider_name = "my_provider"
        ...     default_ttl = 3600
        ...
        ...     async def _fetch_credentials(self) -> IceConfig:
        ...         servers = await self._call_my_api()
        ...         return IceConfig(servers=servers, provider=self.provider_name)
        >>>
        >>> provider = MyProvider()
        >>> await provider.initialize()
        >>> config = await provider.get_credentials()
    """

    # Class attributes (override in subclass)
    provider_name: str = "base"
    default_ttl: int = 3600
    max_retries: int = 3
    retry_delay: float = 1.0

    def __init__(self):
        """Initialize provider with default health and stats."""
        self.health = ProviderHealth(provider_name=self.provider_name)
        self.stats = ProviderStats(provider_name=self.provider_name)
        self._initialized = False
        self._cleanup_done = False

    async def initialize(self) -> None:
        """Initialize the provider.

        Override this method to setup connections, sessions,
        or other resources needed for credential fetching.

        Called once before first get_credentials() call.
        """
        if self._initialized:
            return

        logger.info(f"Initializing provider: {self.provider_name}")
        await self._setup()
        self._initialized = True
        logger.info(f"Provider initialized: {self.provider_name}")

    async def _setup(self) -> None:
        """Internal setup hook.

        Override this in subclass for provider-specific initialization.
        """
        pass

    async def cleanup(self) -> None:
        """Release provider resources.

        Override this method to close connections, cancel tasks,
        or clean up other resources.

        Called during service shutdown.
        """
        if self._cleanup_done:
            return

        logger.info(f"Cleaning up provider: {self.provider_name}")
        await self._teardown()
        self._cleanup_done = True
        self._initialized = False
        logger.info(f"Provider cleaned up: {self.provider_name}")

    async def _teardown(self) -> None:
        """Internal teardown hook.

        Override this in subclass for provider-specific cleanup.
        """
        pass

    async def get_credentials(self) -> IceConfig:
        """Fetch ICE credentials with retry logic.

        This is the main public method. It:
        1. Ensures provider is initialized
        2. Attempts to fetch credentials
        3. Retries on failure (up to max_retries)
        4. Updates health and stats

        Returns:
            IceConfig with TURN/STUN servers

        Raises:
            Exception: If all retry attempts fail
        """
        if not self._initialized:
            await self.initialize()

        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            start_time = time.time()

            try:
                logger.debug(
                    f"Fetching credentials from {self.provider_name} "
                    f"(attempt {attempt}/{self.max_retries})"
                )

                config = await self._fetch_credentials()
                latency_ms = (time.time() - start_time) * 1000

                # Validate response
                if not config.servers:
                    raise ValueError("Provider returned empty server list")

                # Update health and stats
                self.health.record_success(latency_ms)
                self.stats.record_success(latency_ms, len(config.servers))

                logger.info(
                    f"Fetched {len(config.servers)} servers from {self.provider_name} "
                    f"(TURN: {config.has_turn}, latency: {latency_ms:.0f}ms)"
                )

                return config

            except Exception as e:
                last_error = e
                latency_ms = (time.time() - start_time) * 1000

                logger.warning(
                    f"Fetch failed for {self.provider_name} "
                    f"(attempt {attempt}/{self.max_retries}): {e}"
                )

                self.health.record_failure(str(e))
                self.stats.record_failure()

                # Wait before retry (unless last attempt)
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay)

        # All retries failed
        error_msg = f"All {self.max_retries} attempts failed for {self.provider_name}"
        logger.error(f"{error_msg}: {last_error}")
        raise Exception(error_msg) from last_error

    @abstractmethod
    async def _fetch_credentials(self) -> IceConfig:
        """Internal method to fetch credentials.

        Implement this in subclass with provider-specific logic.
        Do NOT include retry logic here - it's handled by get_credentials().

        Returns:
            IceConfig with TURN/STUN servers

        Raises:
            Exception: On any failure (will trigger retry)
        """
        pass

    async def health_check(self) -> bool:
        """Check if provider is healthy and responding.

        Performs a lightweight check to verify the provider is working.
        Default implementation attempts to fetch credentials.

        Returns:
            True if healthy, False otherwise
        """
        try:
            # Try to fetch with reduced retries
            original_retries = self.max_retries
            self.max_retries = 1

            try:
                config = await self.get_credentials()
                return config.has_turn or config.has_stun
            finally:
                self.max_retries = original_retries

        except Exception as e:
            logger.warning(f"Health check failed for {self.provider_name}: {e}")
            return False

    def reset_health(self) -> None:
        """Reset health status to initial state.

        Useful after recovering from maintenance or known issues.
        """
        self.health = ProviderHealth(provider_name=self.provider_name)
        logger.info(f"Health reset for {self.provider_name}")

    def reset_stats(self) -> None:
        """Reset statistics to zero.

        Useful for testing or after configuration changes.
        """
        self.stats = ProviderStats(provider_name=self.provider_name)
        logger.info(f"Stats reset for {self.provider_name}")

    @property
    def is_healthy(self) -> bool:
        """Check if provider is in healthy state."""
        return self.health.is_healthy

    @property
    def status_summary(self) -> dict:
        """Get summary of provider status.

        Returns:
            Dictionary with health and stats info
        """
        return {
            "provider": self.provider_name,
            "initialized": self._initialized,
            "health": self.health.to_dict(),
            "stats": self.stats.to_dict(),
        }

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__}("
            f"name={self.provider_name}, "
            f"status={self.health.status.value}, "
            f"success_rate={self.stats.success_rate:.1%})>"
        )
