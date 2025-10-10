"""
Embedding Service with Voyage AI and Redis Caching
Generates embeddings for RAG queries with 24-hour cache TTL
"""

import hashlib
import logging
from typing import Optional

import redis.asyncio as aioredis
import voyageai

from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Embedding generation service with Redis caching

    Architecture:
    - Voyage AI for multimodal embeddings (1024 dimensions)
    - Redis caching with 24-hour TTL
    - Cache key: SHA-256 hash of text
    - Automatic cache invalidation

    Performance:
    - Cache hit: <1ms (Redis lookup)
    - Cache miss: ~50-100ms (Voyage API + Redis write)
    - Cost savings: ~95% with high cache hit rate
    """

    def __init__(self):
        """Initialize embedding service"""
        # Voyage AI client
        self.voyage_client = None
        if settings.voyage_api_key:
            try:
                self.voyage_client = voyageai.Client(api_key=settings.voyage_api_key)
                logger.info("Voyage AI client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Voyage AI: {e}")

        # Redis client for caching (lazy-loaded)
        self._redis: Optional[aioredis.Redis] = None

        # Cache settings
        self.cache_ttl = 86400  # 24 hours
        self.cache_prefix = "embedding:"

    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection"""
        if self._redis is None:
            self._redis = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=False  # Store binary data
            )
            logger.info("Redis client initialized for embeddings")
        return self._redis

    def _cache_key(self, text: str) -> str:
        """
        Generate cache key for text

        Args:
            text: Input text

        Returns:
            Cache key (SHA-256 hash)
        """
        # SHA-256 hash of text (consistent across runs)
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        return f"{self.cache_prefix}{text_hash}"

    async def generate_embedding(
        self,
        text: str,
        model: str = "voyage-multimodal-3"
    ) -> Optional[list[float]]:
        """
        Generate embedding for text with Redis caching

        Args:
            text: Input text
            model: Voyage AI model (voyage-multimodal-3)

        Returns:
            Embedding vector (1024 dimensions) or None on error
        """
        if not self.voyage_client:
            logger.error("Voyage AI client not initialized")
            return None

        try:
            # Check cache first
            cache_key = self._cache_key(text)
            redis = await self._get_redis()

            cached = await redis.get(cache_key)
            if cached:
                # Cache hit - deserialize embedding
                import pickle
                embedding = pickle.loads(cached)
                logger.debug(f"Cache hit for embedding: {len(text)} chars")
                return embedding

            # Cache miss - generate embedding
            logger.debug(f"Generating embedding: {len(text)} chars")

            result = self.voyage_client.embed(
                texts=[text],
                model=model,
                input_type="query"  # For RAG queries
            )

            if not result.embeddings or len(result.embeddings) == 0:
                logger.error("Empty embedding result from Voyage AI")
                return None

            embedding = result.embeddings[0]

            # Store in cache (24h TTL)
            import pickle
            await redis.setex(
                cache_key,
                self.cache_ttl,
                pickle.dumps(embedding)
            )

            logger.debug(f"Embedding cached: {len(embedding)} dimensions")
            return embedding

        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return None

    async def generate_embeddings_batch(
        self,
        texts: list[str],
        model: str = "voyage-multimodal-3"
    ) -> list[Optional[list[float]]]:
        """
        Generate embeddings for multiple texts (with caching)

        Args:
            texts: List of input texts
            model: Voyage AI model

        Returns:
            List of embedding vectors (same order as input)
        """
        if not self.voyage_client:
            logger.error("Voyage AI client not initialized")
            return [None] * len(texts)

        try:
            redis = await self._get_redis()
            results = []
            texts_to_embed = []
            text_indices = []

            # Check cache for each text
            for idx, text in enumerate(texts):
                cache_key = self._cache_key(text)
                cached = await redis.get(cache_key)

                if cached:
                    # Cache hit
                    import pickle
                    results.append(pickle.loads(cached))
                else:
                    # Cache miss - need to embed
                    results.append(None)
                    texts_to_embed.append(text)
                    text_indices.append(idx)

            # Generate embeddings for cache misses
            if texts_to_embed:
                logger.debug(f"Batch embedding: {len(texts_to_embed)}/{len(texts)} texts")

                voyage_result = self.voyage_client.embed(
                    texts=texts_to_embed,
                    model=model,
                    input_type="query"
                )

                # Cache and update results
                import pickle
                for idx, embedding in zip(text_indices, voyage_result.embeddings):
                    results[idx] = embedding

                    # Cache embedding
                    cache_key = self._cache_key(texts[idx])
                    await redis.setex(
                        cache_key,
                        self.cache_ttl,
                        pickle.dumps(embedding)
                    )

            logger.info(
                f"Batch embeddings generated: {len(texts)} total, "
                f"{len(texts_to_embed)} from API, "
                f"{len(texts) - len(texts_to_embed)} from cache"
            )

            return results

        except Exception as e:
            logger.error(f"Batch embedding error: {e}")
            return [None] * len(texts)

    async def clear_cache(self, pattern: str = "*"):
        """
        Clear embedding cache

        Args:
            pattern: Redis key pattern (default: all embeddings)
        """
        try:
            redis = await self._get_redis()

            # Find matching keys
            full_pattern = f"{self.cache_prefix}{pattern}"
            cursor = 0
            deleted = 0

            while True:
                cursor, keys = await redis.scan(
                    cursor,
                    match=full_pattern,
                    count=100
                )

                if keys:
                    deleted += await redis.delete(*keys)

                if cursor == 0:
                    break

            logger.info(f"Cleared {deleted} cached embeddings")

        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

    async def get_cache_stats(self) -> dict:
        """
        Get cache statistics

        Returns:
            Dictionary with cache stats
        """
        try:
            redis = await self._get_redis()

            # Count cached embeddings
            cursor = 0
            count = 0

            while True:
                cursor, keys = await redis.scan(
                    cursor,
                    match=f"{self.cache_prefix}*",
                    count=100
                )

                count += len(keys)

                if cursor == 0:
                    break

            return {
                "cached_embeddings": count,
                "cache_ttl_seconds": self.cache_ttl,
                "cache_prefix": self.cache_prefix
            }

        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {
                "cached_embeddings": 0,
                "cache_ttl_seconds": self.cache_ttl,
                "cache_prefix": self.cache_prefix,
                "error": str(e)
            }

    async def close(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Embedding service closed")


# Global singleton instance
embedding_service = EmbeddingService()


# Convenience functions
async def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate embedding for text"""
    return await embedding_service.generate_embedding(text)


async def generate_embeddings_batch(texts: list[str]) -> list[Optional[list[float]]]:
    """Generate embeddings for multiple texts"""
    return await embedding_service.generate_embeddings_batch(texts)


async def clear_embedding_cache(pattern: str = "*"):
    """Clear embedding cache"""
    await embedding_service.clear_cache(pattern)


async def get_cache_stats() -> dict:
    """Get cache statistics"""
    return await embedding_service.get_cache_stats()
