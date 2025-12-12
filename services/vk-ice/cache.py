"""
VK-ICE Credential Cache

TTL-based in-memory cache for ICE credentials with automatic refresh
and thundering herd prevention.

Features:
- Per-provider credential caching
- Automatic refresh before expiry
- LRU eviction when max entries reached
- Thread-safe async operations
- Statistics tracking

Architecture:
    ┌─────────────────────────────────────────────────────────┐
    │                  IceCredentialCache                      │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  _entries: Dict[provider_name, CacheEntry]        │  │
    │  │  _locks: Dict[provider_name, asyncio.Lock]        │  │
    │  │  _refresh_tasks: Set[asyncio.Task]                │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  get() → Return cached if valid                          │
    │  set() → Store with TTL                                  │
    │  get_or_refresh() → Get or fetch fresh                   │
    │  invalidate() → Remove entry                             │
    └─────────────────────────────────────────────────────────┘
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Callable, Awaitable, Dict, Set

from .models import IceConfig

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Single cache entry with metadata.

    Attributes:
        config: The cached ICE configuration
        created_at: Unix timestamp when cached
        hit_count: Number of times this entry was retrieved
        last_access: Unix timestamp of last access
    """
    config: IceConfig
    created_at: float = field(default_factory=time.time)
    hit_count: int = 0
    last_access: float = field(default_factory=time.time)

    @property
    def age_seconds(self) -> float:
        """How old this cache entry is."""
        return time.time() - self.created_at

    @property
    def is_expired(self) -> bool:
        """Check if the cached credentials have expired."""
        return self.config.is_expired

    @property
    def remaining_ttl(self) -> int:
        """Seconds until this entry expires."""
        return self.config.remaining_ttl

    def touch(self) -> None:
        """Update access time and increment hit count."""
        self.last_access = time.time()
        self.hit_count += 1


@dataclass
class CacheStats:
    """Cache performance statistics.

    Attributes:
        total_gets: Total get() calls
        hits: Successful cache hits
        misses: Cache misses (not found or expired)
        refreshes: Automatic refresh triggers
        evictions: LRU evictions due to max_entries
    """
    total_gets: int = 0
    hits: int = 0
    misses: int = 0
    refreshes: int = 0
    evictions: int = 0

    @property
    def hit_rate(self) -> float:
        """Cache hit rate (0.0 to 1.0)."""
        if self.total_gets == 0:
            return 0.0
        return self.hits / self.total_gets

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "total_gets": self.total_gets,
            "hits": self.hits,
            "misses": self.misses,
            "refreshes": self.refreshes,
            "evictions": self.evictions,
            "hit_rate": round(self.hit_rate, 4),
        }


class IceCredentialCache:
    """TTL-based credential cache with automatic refresh.

    This cache stores ICE credentials per provider with:
    - Automatic expiration based on TTL
    - Proactive refresh before expiry
    - Lock-based thundering herd prevention
    - LRU eviction when max entries reached

    Example:
        >>> cache = IceCredentialCache(
        ...     default_ttl=3600,
        ...     refresh_before_expiry=300,  # Refresh 5 min before expiry
        ...     max_entries=100,
        ... )
        >>>
        >>> # Simple get/set
        >>> await cache.set("8x8", config)
        >>> config = await cache.get("8x8")
        >>>
        >>> # Get with automatic refresh
        >>> config = await cache.get_or_refresh(
        ...     "8x8",
        ...     fetch_func=provider.get_credentials,
        ... )

    Thread Safety:
        All operations are async and use per-provider locks to prevent
        concurrent fetches for the same provider.
    """

    def __init__(
        self,
        default_ttl: int = 3600,
        refresh_before_expiry: int = 300,
        max_entries: int = 100,
    ):
        """Initialize the credential cache.

        Args:
            default_ttl: Default TTL in seconds (1 hour)
            refresh_before_expiry: Trigger refresh this many seconds before expiry
            max_entries: Maximum cached entries (LRU eviction)
        """
        self.default_ttl = default_ttl
        self.refresh_before_expiry = refresh_before_expiry
        self.max_entries = max_entries

        self._entries: Dict[str, CacheEntry] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._refresh_tasks: Set[asyncio.Task] = set()
        self._global_lock = asyncio.Lock()
        self._stats = CacheStats()

        logger.info(
            f"IceCredentialCache initialized: "
            f"ttl={default_ttl}s, refresh_before={refresh_before_expiry}s, "
            f"max_entries={max_entries}"
        )

    async def get(self, provider: str) -> Optional[IceConfig]:
        """Get cached credentials for a provider.

        Returns None if:
        - No entry exists for this provider
        - The cached entry has expired

        Args:
            provider: Provider name (e.g., "8x8", "kmeet")

        Returns:
            Cached IceConfig or None if not found/expired
        """
        self._stats.total_gets += 1

        entry = self._entries.get(provider)

        if entry is None:
            self._stats.misses += 1
            logger.debug(f"Cache miss for {provider}: not found")
            return None

        if entry.is_expired:
            self._stats.misses += 1
            logger.debug(f"Cache miss for {provider}: expired")
            # Don't remove yet - let get_or_refresh handle it
            return None

        entry.touch()
        self._stats.hits += 1
        logger.debug(
            f"Cache hit for {provider}: "
            f"remaining_ttl={entry.remaining_ttl}s, hits={entry.hit_count}"
        )

        return entry.config

    async def set(
        self,
        provider: str,
        config: IceConfig,
        ttl: Optional[int] = None,
    ) -> None:
        """Store credentials in cache.

        Args:
            provider: Provider name
            config: ICE configuration to cache
            ttl: Optional TTL override (uses config.ttl_seconds by default)
        """
        async with self._global_lock:
            # Enforce max entries (LRU eviction)
            if len(self._entries) >= self.max_entries and provider not in self._entries:
                await self._evict_lru()

            # Use provided TTL or config's TTL
            if ttl is not None:
                config = IceConfig(
                    servers=config.servers,
                    provider=config.provider,
                    fetched_at=config.fetched_at,
                    ttl_seconds=ttl,
                    metadata=config.metadata,
                )

            self._entries[provider] = CacheEntry(config=config)

            logger.info(
                f"Cached credentials for {provider}: "
                f"{len(config.servers)} servers, ttl={config.ttl_seconds}s"
            )

    async def get_or_refresh(
        self,
        provider: str,
        fetch_func: Callable[[], Awaitable[IceConfig]],
        force_refresh: bool = False,
    ) -> IceConfig:
        """Get cached credentials or fetch fresh ones.

        This is the primary method for retrieving credentials. It:
        1. Returns cached credentials if valid
        2. Triggers background refresh if approaching expiry
        3. Fetches fresh credentials if cache miss or expired
        4. Uses locks to prevent thundering herd

        Args:
            provider: Provider name
            fetch_func: Async function to fetch fresh credentials
            force_refresh: Bypass cache and fetch fresh

        Returns:
            IceConfig (cached or freshly fetched)

        Raises:
            Exception: If fetch_func fails and no cached data available
        """
        # Fast path: return cached if valid and not forcing refresh
        if not force_refresh:
            entry = self._entries.get(provider)

            if entry and not entry.is_expired:
                entry.touch()
                self._stats.hits += 1

                # Trigger background refresh if approaching expiry
                if entry.remaining_ttl <= self.refresh_before_expiry:
                    self._schedule_background_refresh(provider, fetch_func)

                return entry.config

        # Slow path: need to fetch (with lock)
        self._stats.misses += 1
        lock = await self._get_lock(provider)

        async with lock:
            # Double-check: another coroutine might have refreshed
            if not force_refresh:
                entry = self._entries.get(provider)
                if entry and not entry.is_expired:
                    entry.touch()
                    return entry.config

            # Fetch fresh credentials
            logger.info(f"Fetching fresh credentials for {provider}")
            config = await fetch_func()
            await self.set(provider, config)
            self._stats.refreshes += 1

            return config

    async def get_any_valid(self) -> Optional[IceConfig]:
        """Get any valid cached credentials.

        Useful as a fallback when a specific provider fails.

        Returns:
            Most recently accessed valid IceConfig, or None
        """
        valid_entries = [
            (name, entry) for name, entry in self._entries.items()
            if not entry.is_expired
        ]

        if not valid_entries:
            return None

        # Return most recently accessed
        valid_entries.sort(key=lambda x: x[1].last_access, reverse=True)
        return valid_entries[0][1].config

    async def invalidate(self, provider: str) -> bool:
        """Remove cached credentials for a provider.

        Args:
            provider: Provider name

        Returns:
            True if entry was removed, False if not found
        """
        async with self._global_lock:
            if provider in self._entries:
                del self._entries[provider]
                logger.info(f"Invalidated cache for {provider}")
                return True
            return False

    async def invalidate_all(self) -> int:
        """Remove all cached credentials.

        Returns:
            Number of entries removed
        """
        async with self._global_lock:
            count = len(self._entries)
            self._entries.clear()
            logger.info(f"Invalidated all cache entries ({count} removed)")
            return count

    async def get_all_valid(self) -> Dict[str, IceConfig]:
        """Get all valid cached credentials.

        Returns:
            Dictionary of provider name -> IceConfig
        """
        return {
            name: entry.config
            for name, entry in self._entries.items()
            if not entry.is_expired
        }

    @property
    def stats(self) -> CacheStats:
        """Get cache statistics."""
        return self._stats

    @property
    def size(self) -> int:
        """Current number of cached entries."""
        return len(self._entries)

    def get_entry_info(self, provider: str) -> Optional[dict]:
        """Get detailed info about a cache entry.

        Args:
            provider: Provider name

        Returns:
            Dictionary with entry details, or None if not found
        """
        entry = self._entries.get(provider)
        if entry is None:
            return None

        return {
            "provider": provider,
            "created_at": datetime.fromtimestamp(entry.created_at, tz=timezone.utc).isoformat(),
            "age_seconds": round(entry.age_seconds, 2),
            "remaining_ttl": entry.remaining_ttl,
            "is_expired": entry.is_expired,
            "hit_count": entry.hit_count,
            "last_access": datetime.fromtimestamp(entry.last_access, tz=timezone.utc).isoformat(),
            "server_count": len(entry.config.servers),
            "has_turn": entry.config.has_turn,
        }

    async def _get_lock(self, provider: str) -> asyncio.Lock:
        """Get or create a lock for a provider.

        Ensures only one coroutine fetches credentials for a provider at a time.
        """
        async with self._global_lock:
            if provider not in self._locks:
                self._locks[provider] = asyncio.Lock()
            return self._locks[provider]

    async def _evict_lru(self) -> None:
        """Evict least recently used entry.

        Called when max_entries is reached and a new entry needs to be added.
        """
        if not self._entries:
            return

        # Find LRU entry
        lru_provider = min(
            self._entries.keys(),
            key=lambda p: self._entries[p].last_access
        )

        del self._entries[lru_provider]
        self._stats.evictions += 1
        logger.info(f"Evicted LRU cache entry: {lru_provider}")

    def _schedule_background_refresh(
        self,
        provider: str,
        fetch_func: Callable[[], Awaitable[IceConfig]],
    ) -> None:
        """Schedule a background refresh task.

        This is fire-and-forget - failures are logged but don't affect the caller.
        """
        async def refresh_task():
            try:
                lock = await self._get_lock(provider)
                # Try to acquire lock without blocking
                if lock.locked():
                    logger.debug(f"Background refresh skipped for {provider}: already in progress")
                    return

                async with lock:
                    # Double-check TTL (might have been refreshed)
                    entry = self._entries.get(provider)
                    if entry and entry.remaining_ttl > self.refresh_before_expiry:
                        return

                    logger.info(f"Background refresh triggered for {provider}")
                    config = await fetch_func()
                    await self.set(provider, config)
                    self._stats.refreshes += 1

            except Exception as e:
                logger.warning(f"Background refresh failed for {provider}: {e}")
            finally:
                # Clean up task reference
                self._refresh_tasks.discard(asyncio.current_task())

        # Create and track the task
        task = asyncio.create_task(refresh_task())
        self._refresh_tasks.add(task)

    async def cleanup(self) -> None:
        """Cancel all background tasks and clear cache.

        Call this when shutting down the service.
        """
        # Cancel background refresh tasks
        for task in self._refresh_tasks:
            task.cancel()

        if self._refresh_tasks:
            await asyncio.gather(*self._refresh_tasks, return_exceptions=True)
            self._refresh_tasks.clear()

        # Clear cache
        await self.invalidate_all()
        logger.info("IceCredentialCache cleaned up")
