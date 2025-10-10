"""
Distributed Rate Limiter using Redis for cross-worker coordination
Implements sliding window algorithm with sorted sets
"""

import asyncio
import logging
import time
from typing import Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class DistributedRateLimiter:
    """
    Distributed rate limiter using Redis sorted sets

    Algorithm: Sliding window with sorted sets
    - Each request is stored with timestamp as score
    - Old requests are removed based on window
    - Count active requests in current window

    Benefits:
    - Accurate rate limiting across multiple workers
    - Atomic operations using Redis Lua scripts
    - Efficient cleanup of old entries
    - No race conditions
    """

    def __init__(
        self,
        redis_url: str,
        key_prefix: str,
        max_requests: int,
        window_seconds: int = 60
    ):
        """
        Initialize distributed rate limiter

        Args:
            redis_url: Redis connection URL
            key_prefix: Prefix for Redis keys (e.g., "rate_limit:tenant:123")
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds (default: 60)
        """
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self.max_requests = max_requests
        self.window_seconds = window_seconds

        # Redis client (lazy-loaded)
        self._redis: Optional[aioredis.Redis] = None

        # Lua script for atomic rate limit check + increment
        # This ensures no race conditions
        self.lua_script = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max_requests = tonumber(ARGV[3])

        -- Remove old entries outside window
        redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

        -- Count current requests in window
        local current = redis.call('ZCARD', key)

        if current < max_requests then
            -- Add new request with current timestamp
            redis.call('ZADD', key, now, now)
            -- Set expiry on key (cleanup)
            redis.call('EXPIRE', key, window)
            return {1, current + 1}
        else
            return {0, current}
        end
        """

        logger.info(
            f"Rate limiter initialized: {key_prefix}, "
            f"{max_requests} req/{window_seconds}s"
        )

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection"""
        if self._redis is None:
            self._redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis

    async def check_rate_limit(self) -> bool:
        """
        Check if request is allowed under rate limit
        Atomically checks and increments counter

        Returns:
            True if request is allowed, False if rate limited
        """
        try:
            redis = await self._get_redis()

            # Current timestamp (seconds)
            now = time.time()

            # Execute Lua script atomically
            result = await redis.eval(
                self.lua_script,
                1,  # Number of keys
                self.key_prefix,  # KEYS[1]
                now,  # ARGV[1]
                self.window_seconds,  # ARGV[2]
                self.max_requests  # ARGV[3]
            )

            # Result: [allowed (0/1), current_count]
            allowed = bool(result[0])
            current_count = result[1]

            if not allowed:
                logger.warning(
                    f"Rate limit exceeded: {self.key_prefix}, "
                    f"{current_count}/{self.max_requests}"
                )

            return allowed

        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # On error, allow request (fail open)
            return True

    async def get_current_count(self) -> int:
        """
        Get current request count in window

        Returns:
            Number of requests in current window
        """
        try:
            redis = await self._get_redis()

            # Current timestamp
            now = time.time()

            # Remove old entries
            await redis.zremrangebyscore(
                self.key_prefix,
                0,
                now - self.window_seconds
            )

            # Count remaining entries
            count = await redis.zcard(self.key_prefix)
            return count

        except Exception as e:
            logger.error(f"Failed to get current count: {e}")
            return 0

    async def get_wait_time(self) -> float:
        """
        Calculate wait time until rate limit resets

        Returns:
            Seconds to wait until next request is allowed
        """
        try:
            redis = await self._get_redis()

            # Current timestamp
            now = time.time()

            # Get oldest entry in window
            oldest_entries = await redis.zrangebyscore(
                self.key_prefix,
                now - self.window_seconds,
                now,
                start=0,
                num=1,
                withscores=True
            )

            if not oldest_entries:
                return 0.0

            # Oldest entry timestamp
            oldest_time = float(oldest_entries[0][1])

            # Time until oldest entry expires
            wait_time = (oldest_time + self.window_seconds) - now
            return max(0.0, wait_time)

        except Exception as e:
            logger.error(f"Failed to calculate wait time: {e}")
            return 0.0

    async def reset(self):
        """Reset rate limit counter (for testing)"""
        try:
            redis = await self._get_redis()
            await redis.delete(self.key_prefix)
            logger.info(f"Rate limit reset: {self.key_prefix}")
        except Exception as e:
            logger.error(f"Failed to reset rate limit: {e}")

    async def close(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info(f"Rate limiter closed: {self.key_prefix}")


# Example usage and testing
if __name__ == "__main__":
    async def test_rate_limiter():
        """Test rate limiter functionality"""
        limiter = DistributedRateLimiter(
            redis_url="redis://localhost:6379",
            key_prefix="test:rate_limit",
            max_requests=5,
            window_seconds=10
        )

        print("Testing rate limiter: 5 requests per 10 seconds")

        # Test 10 requests
        for i in range(10):
            allowed = await limiter.check_rate_limit()
            current = await limiter.get_current_count()
            wait_time = await limiter.get_wait_time()

            status = "✓ ALLOWED" if allowed else "✗ BLOCKED"
            print(
                f"Request {i+1}: {status}, "
                f"Current: {current}/5, "
                f"Wait: {wait_time:.1f}s"
            )

            await asyncio.sleep(0.1)

        # Wait for window to reset
        print("\nWaiting 10 seconds for window reset...")
        await asyncio.sleep(10)

        # Test again
        print("\nTesting after reset:")
        allowed = await limiter.check_rate_limit()
        current = await limiter.get_current_count()
        print(f"Request: {'✓ ALLOWED' if allowed else '✗ BLOCKED'}, Current: {current}/5")

        await limiter.close()

    # Run test
    asyncio.run(test_rate_limiter())
