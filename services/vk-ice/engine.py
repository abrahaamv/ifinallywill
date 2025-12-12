"""
VK-ICE Engine

The central orchestrator for ICE credential management.
Coordinates multiple providers with intelligent failover,
caching, and health monitoring.

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                         IceEngine                                │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  ┌───────────────────────────────────────────────────────────┐  │
    │  │                  IceCredentialCache                        │  │
    │  │  - Per-provider caching                                    │  │
    │  │  - TTL-based expiration                                    │  │
    │  │  - Background refresh                                      │  │
    │  └───────────────────────────────────────────────────────────┘  │
    │                              │                                   │
    │              ┌───────────────┼───────────────┐                  │
    │              │               │               │                  │
    │              ▼               ▼               ▼                  │
    │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
    │  │ X8x8Provider  │ │ KMeetProvider │ │FallbackProvider│         │
    │  │ (Priority 1)  │ │ (Priority 2)  │ │ (Priority 3)  │         │
    │  └───────────────┘ └───────────────┘ └───────────────┘         │
    │                                                                  │
    │  Failover Logic:                                                 │
    │  1. Try provider in priority order                              │
    │  2. On failure, wait failover_delay, try next                   │
    │  3. Return stale cache if all fail                              │
    │  4. Return public STUN as absolute fallback                     │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Usage:
    >>> engine = IceEngine()
    >>> await engine.start()
    >>>
    >>> # Get credentials (automatic failover)
    >>> config = await engine.get_credentials()
    >>>
    >>> # Use in WebRTC
    >>> rtc_config = config.to_rtc_configuration()
    >>>
    >>> await engine.stop()
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Type

from .models import IceConfig, FALLBACK_CONFIG
from .cache import IceCredentialCache
from .providers import (
    IceProvider,
    X8x8Provider,
    KMeetProvider,
    FallbackProvider,
    PROVIDER_REGISTRY,
    DEFAULT_PROVIDER_ORDER,
)

logger = logging.getLogger(__name__)


@dataclass
class FailoverConfig:
    """Configuration for provider failover behavior.

    Attributes:
        max_retries_per_provider: Retries before moving to next provider
        failover_delay: Seconds to wait between provider attempts
        prefer_cached: Return stale cache if all providers fail
        parallel_fetch: Try providers in parallel (not implemented)
    """
    max_retries_per_provider: int = 2
    failover_delay: float = 0.5
    prefer_cached: bool = True
    parallel_fetch: bool = False  # Reserved for future use


@dataclass
class EngineStats:
    """Aggregate statistics for the ICE engine.

    Attributes:
        total_requests: Total get_credentials calls
        cache_hits: Requests served from cache
        cache_misses: Cache misses requiring provider fetch
        failovers: Times primary provider failed
        started_at: When engine was started
    """
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    failovers: int = 0
    started_at: Optional[datetime] = None

    @property
    def cache_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        if self.total_requests == 0:
            return 0.0
        return self.cache_hits / self.total_requests

    def to_dict(self) -> dict:
        return {
            "total_requests": self.total_requests,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(self.cache_hit_rate, 4),
            "failovers": self.failovers,
            "started_at": self.started_at.isoformat() if self.started_at else None,
        }


class IceEngine:
    """Central orchestrator for ICE credential management.

    The IceEngine coordinates multiple providers to ensure reliable
    ICE credential availability with intelligent failover and caching.

    Features:
        - Multi-provider support with priority ordering
        - Automatic failover on provider failure
        - TTL-based credential caching
        - Health monitoring per provider
        - Statistics tracking
        - Graceful degradation to public STUN

    Example:
        >>> engine = IceEngine(
        ...     providers=["8x8", "kmeet", "fallback"],
        ...     cache_ttl=3600,
        ... )
        >>> await engine.start()
        >>>
        >>> # Simple credential retrieval
        >>> config = await engine.get_credentials()
        >>>
        >>> # Force specific provider
        >>> config = await engine.get_credentials(provider="kmeet")
        >>>
        >>> # Bypass cache
        >>> config = await engine.get_credentials(force_refresh=True)
        >>>
        >>> await engine.stop()

    Provider Priority:
        Providers are tried in order until one succeeds:
        1. 8x8 (Brave Talk) - Global, 35 PoPs
        2. KMeet - EU backup, Swiss privacy
        3. Fallback - Public STUN only

    Thread Safety:
        All methods are async and thread-safe. The engine uses
        per-provider locks to prevent concurrent fetches.
    """

    def __init__(
        self,
        providers: Optional[List[str]] = None,
        cache_ttl: int = 3600,
        failover_config: Optional[FailoverConfig] = None,
    ):
        """Initialize the ICE engine.

        Args:
            providers: Provider names in priority order (default: all)
            cache_ttl: Default cache TTL in seconds
            failover_config: Failover behavior configuration
        """
        self._provider_names = providers or DEFAULT_PROVIDER_ORDER
        self._cache_ttl = cache_ttl
        self._failover_config = failover_config or FailoverConfig()

        self._providers: Dict[str, IceProvider] = {}
        self._cache = IceCredentialCache(
            default_ttl=cache_ttl,
            refresh_before_expiry=300,  # 5 minutes
            max_entries=len(self._provider_names) * 2,
        )
        self._stats = EngineStats()

        self._running = False
        self._lock = asyncio.Lock()

        logger.info(
            f"IceEngine created with providers: {self._provider_names}, "
            f"cache_ttl={cache_ttl}s"
        )

    async def start(self) -> None:
        """Start the ICE engine.

        Initializes all providers and prepares the engine for requests.
        Should be called before any get_credentials() calls.
        """
        if self._running:
            logger.warning("IceEngine already running")
            return

        logger.info("Starting IceEngine...")

        # Initialize providers
        for name in self._provider_names:
            provider_class = PROVIDER_REGISTRY.get(name)
            if provider_class:
                provider = provider_class()
                try:
                    await provider.initialize()
                    self._providers[name] = provider
                    logger.info(f"Provider initialized: {name}")
                except Exception as e:
                    logger.error(f"Failed to initialize provider {name}: {e}")
            else:
                logger.warning(f"Unknown provider: {name}")

        if not self._providers:
            logger.error("No providers initialized!")
            # Always ensure fallback is available
            fallback = FallbackProvider()
            await fallback.initialize()
            self._providers["fallback"] = fallback

        self._stats.started_at = datetime.now(timezone.utc)
        self._running = True

        logger.info(
            f"IceEngine started with {len(self._providers)} providers: "
            f"{list(self._providers.keys())}"
        )

    async def stop(self) -> None:
        """Stop the ICE engine.

        Cleans up all providers and releases resources.
        """
        if not self._running:
            return

        logger.info("Stopping IceEngine...")

        # Cleanup providers
        for name, provider in self._providers.items():
            try:
                await provider.cleanup()
                logger.debug(f"Provider cleaned up: {name}")
            except Exception as e:
                logger.error(f"Error cleaning up provider {name}: {e}")

        # Cleanup cache
        await self._cache.cleanup()

        self._providers.clear()
        self._running = False

        logger.info("IceEngine stopped")

    async def get_credentials(
        self,
        provider: Optional[str] = None,
        force_refresh: bool = False,
    ) -> IceConfig:
        """Get ICE credentials with automatic failover.

        This is the main method for retrieving credentials. It handles:
        - Cache lookup (unless force_refresh)
        - Provider failover on failure
        - Fallback to stale cache or public STUN

        Args:
            provider: Specific provider to use (bypasses priority order)
            force_refresh: Bypass cache and fetch fresh credentials

        Returns:
            IceConfig with TURN/STUN servers

        Behavior:
            1. If provider specified, use only that provider
            2. If cached credentials exist and valid, return them
            3. Try providers in priority order
            4. On all failures, return stale cache if available
            5. As last resort, return public STUN servers
        """
        self._stats.total_requests += 1

        # Specific provider requested
        if provider:
            return await self._get_from_provider(provider, force_refresh)

        # Try cache first (unless force_refresh)
        if not force_refresh:
            for name in self._provider_names:
                cached = await self._cache.get(name)
                if cached:
                    self._stats.cache_hits += 1
                    logger.debug(f"Cache hit for {name}")
                    return cached

        self._stats.cache_misses += 1

        # Try providers in priority order
        last_error: Optional[Exception] = None
        first_attempt = True

        for name in self._provider_names:
            if name not in self._providers:
                continue

            if not first_attempt:
                self._stats.failovers += 1
                await asyncio.sleep(self._failover_config.failover_delay)

            first_attempt = False

            try:
                config = await self._cache.get_or_refresh(
                    name,
                    self._providers[name].get_credentials,
                    force_refresh=force_refresh,
                )
                logger.info(f"Credentials obtained from {name}")
                return config

            except Exception as e:
                last_error = e
                logger.warning(f"Provider {name} failed: {e}")
                continue

        # All providers failed
        logger.error(f"All providers failed. Last error: {last_error}")

        # Try stale cache
        if self._failover_config.prefer_cached:
            stale = await self._cache.get_any_valid()
            if stale:
                logger.warning(f"Returning stale cache from {stale.provider}")
                return stale

        # Absolute fallback
        logger.warning("Returning public STUN fallback")
        return FALLBACK_CONFIG

    async def _get_from_provider(
        self,
        provider_name: str,
        force_refresh: bool,
    ) -> IceConfig:
        """Get credentials from a specific provider.

        Args:
            provider_name: Name of the provider
            force_refresh: Bypass cache

        Returns:
            IceConfig from the specified provider

        Raises:
            ValueError: If provider not found
            Exception: If provider fails
        """
        if provider_name not in self._providers:
            available = list(self._providers.keys())
            raise ValueError(
                f"Provider '{provider_name}' not found. "
                f"Available: {available}"
            )

        return await self._cache.get_or_refresh(
            provider_name,
            self._providers[provider_name].get_credentials,
            force_refresh=force_refresh,
        )

    async def get_redundant_credentials(
        self,
        providers: Optional[List[str]] = None,
        merge: bool = True,
    ) -> IceConfig:
        """Get credentials from multiple providers for redundancy.

        Fetches from multiple providers in parallel and optionally
        merges the results into a single configuration.

        Args:
            providers: Provider names to query (default: first two)
            merge: Merge results into single config (default: True)

        Returns:
            IceConfig with servers from multiple providers
        """
        target_providers = providers or self._provider_names[:2]

        # Fetch in parallel
        tasks = []
        for name in target_providers:
            if name in self._providers:
                tasks.append(
                    self._cache.get_or_refresh(
                        name,
                        self._providers[name].get_credentials,
                    )
                )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter successful results
        configs = [r for r in results if isinstance(r, IceConfig)]

        if not configs:
            logger.warning("No providers succeeded for redundant fetch")
            return FALLBACK_CONFIG

        if not merge or len(configs) == 1:
            return configs[0]

        # Merge configurations
        merged = configs[0]
        for config in configs[1:]:
            merged = merged.merge_with(config)

        logger.info(
            f"Merged credentials from {len(configs)} providers: "
            f"{merged.provider}"
        )
        return merged

    async def refresh_all(self) -> Dict[str, bool]:
        """Force refresh credentials from all providers.

        Returns:
            Dictionary of provider name -> success status
        """
        results = {}

        for name, provider in self._providers.items():
            try:
                await self._cache.get_or_refresh(
                    name,
                    provider.get_credentials,
                    force_refresh=True,
                )
                results[name] = True
                logger.info(f"Refreshed credentials from {name}")
            except Exception as e:
                results[name] = False
                logger.error(f"Failed to refresh {name}: {e}")

        return results

    async def health_check(self) -> Dict[str, dict]:
        """Check health of all providers.

        Returns:
            Dictionary of provider name -> health info
        """
        health = {}

        for name, provider in self._providers.items():
            health[name] = provider.health.to_dict()

        return health

    async def get_stats(self) -> dict:
        """Get engine statistics.

        Returns:
            Dictionary with engine and cache stats
        """
        return {
            "engine": self._stats.to_dict(),
            "cache": self._cache.stats.to_dict(),
            "providers": {
                name: provider.stats.to_dict()
                for name, provider in self._providers.items()
            },
        }

    @property
    def is_running(self) -> bool:
        """Check if engine is running."""
        return self._running

    @property
    def providers(self) -> List[str]:
        """Get list of active provider names."""
        return list(self._providers.keys())

    def get_provider(self, name: str) -> Optional[IceProvider]:
        """Get a specific provider instance.

        Args:
            name: Provider name

        Returns:
            IceProvider instance or None
        """
        return self._providers.get(name)

    async def __aenter__(self) -> "IceEngine":
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.stop()
