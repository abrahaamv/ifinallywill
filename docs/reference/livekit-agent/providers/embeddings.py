"""
Embeddings Provider for RAG Enhancement

Implements Voyage Multimodal-3 for enterprise knowledge search:
- 1024 dimensions for optimal performance
- Multimodal support (text + images)
- Superior semantic understanding
- Cost: $0.10 per 1M tokens

Use Cases:
- Knowledge base search
- Document similarity
- Semantic chunking
- Cross-document connections
"""

import time
import logging
from typing import List, Optional, Dict, Any

try:
    import voyageai
    VOYAGE_AVAILABLE = True
except ImportError:
    VOYAGE_AVAILABLE = False
    logging.warning("voyageai not installed. Install with: pip install voyageai>=0.3.0")

from .base import EmbeddingsProvider, ProviderResponse, ProviderTier, ProviderError

logger = logging.getLogger(__name__)


class VoyageMultimodal3(EmbeddingsProvider):
    """
    Voyage AI Multimodal-3 embeddings provider (STANDARD tier).

    Optimized for:
    - Enterprise knowledge search
    - Semantic document understanding
    - Multi-modal content (text + images)
    - High-quality RAG

    Model: voyage-multimodal-3
    Dimensions: 1024
    Cost: $0.10 per 1M tokens
    Use case: Knowledge base embeddings
    """

    EMBEDDING_DIMENSIONS = 1024
    COST_PER_MILLION_TOKENS = 0.10

    def __init__(self, api_key: str):
        if not VOYAGE_AVAILABLE:
            raise ImportError("voyageai package required. Install with: pip install voyageai>=0.3.0")

        self.client = voyageai.Client(api_key=api_key)
        logger.info("Voyage Multimodal-3 embeddings provider initialized")

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
            ProviderResponse with embeddings array
        """
        start_time = time.time()

        try:
            # Validate input_type
            if input_type not in ["document", "query"]:
                raise ValueError(f"Invalid input_type: {input_type}. Must be 'document' or 'query'")

            # Generate embeddings
            result = self.client.embed(
                texts=texts,
                model="voyage-multimodal-3",
                input_type=input_type,
            )

            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            tokens_used = result.total_tokens
            cost_usd = (tokens_used / 1_000_000) * self.COST_PER_MILLION_TOKENS

            # Extract embeddings
            embeddings = [embedding for embedding in result.embeddings]

            return ProviderResponse(
                success=True,
                content=embeddings,
                provider_name="voyage_multimodal_3",
                provider_tier=ProviderTier.STANDARD,
                tokens_used=tokens_used,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                metadata={
                    "model": "voyage-multimodal-3",
                    "input_type": input_type,
                    "text_count": len(texts),
                    "dimensions": self.EMBEDDING_DIMENSIONS,
                }
            )

        except Exception as e:
            logger.error(f"Voyage embeddings error: {str(e)}")
            raise ProviderError(
                message=str(e),
                provider_name="voyage_multimodal_3",
                tier=ProviderTier.STANDARD
            )

    def get_dimensions(self) -> int:
        """Get embedding dimensions"""
        return self.EMBEDDING_DIMENSIONS

    def get_tier(self) -> ProviderTier:
        return ProviderTier.STANDARD


class EmbeddingsManager:
    """
    Embeddings manager with caching and batch optimization.

    Features:
    - Batch processing for efficiency
    - Simple in-memory cache for repeated queries
    - Usage tracking and cost monitoring
    - Document vs query optimization
    """

    MAX_BATCH_SIZE = 128  # Voyage API limit

    def __init__(self, voyage_api_key: Optional[str] = None):
        self.provider = None

        if voyage_api_key and VOYAGE_AVAILABLE:
            self.provider = VoyageMultimodal3(voyage_api_key)
            logger.info("Embeddings manager initialized with Voyage Multimodal-3")
        else:
            logger.warning("Voyage API key not provided or voyageai package not installed")

        # Simple cache for repeated queries
        self._cache: Dict[str, List[float]] = {}

        # Usage tracking
        self.usage_stats = {
            "embed_count": 0,
            "cache_hits": 0,
            "total_cost": 0.0,
            "document_count": 0,
            "query_count": 0,
        }

    async def embed_documents(
        self,
        texts: List[str],
        use_cache: bool = True,
    ) -> List[List[float]]:
        """
        Embed documents for knowledge base storage.

        Args:
            texts: List of document texts
            use_cache: Whether to use cache for repeated texts

        Returns:
            List of embedding vectors
        """
        if not self.provider:
            raise ProviderError(
                message="Embeddings provider not initialized",
                provider_name="embeddings_manager",
                tier=ProviderTier.STANDARD
            )

        # Check cache
        if use_cache:
            cached_embeddings = []
            uncached_texts = []
            uncached_indices = []

            for i, text in enumerate(texts):
                cache_key = f"doc:{text}"
                if cache_key in self._cache:
                    cached_embeddings.append((i, self._cache[cache_key]))
                    self.usage_stats["cache_hits"] += 1
                else:
                    uncached_texts.append(text)
                    uncached_indices.append(i)

            # If all cached, return immediately
            if not uncached_texts:
                return [emb for _, emb in sorted(cached_embeddings)]

        else:
            uncached_texts = texts
            uncached_indices = list(range(len(texts)))
            cached_embeddings = []

        # Process in batches
        all_embeddings: List[List[float]] = [[] for _ in range(len(texts))]
        for i in range(0, len(uncached_texts), self.MAX_BATCH_SIZE):
            batch = uncached_texts[i:i + self.MAX_BATCH_SIZE]
            batch_indices = uncached_indices[i:i + self.MAX_BATCH_SIZE]

            # Embed batch
            result = await self.provider.embed(batch, input_type="document")

            # Store in result array and cache
            for idx, embedding in zip(batch_indices, result.content):
                all_embeddings[idx] = embedding
                if use_cache:
                    cache_key = f"doc:{texts[idx]}"
                    self._cache[cache_key] = embedding

            # Track usage
            self.usage_stats["embed_count"] += len(batch)
            self.usage_stats["document_count"] += len(batch)
            if result.cost_usd:
                self.usage_stats["total_cost"] += result.cost_usd

        # Add cached embeddings
        for idx, embedding in cached_embeddings:
            all_embeddings[idx] = embedding

        return all_embeddings

    async def embed_query(
        self,
        query: str,
        use_cache: bool = True,
    ) -> List[float]:
        """
        Embed query for knowledge search.

        Args:
            query: Query text
            use_cache: Whether to use cache

        Returns:
            Embedding vector
        """
        if not self.provider:
            raise ProviderError(
                message="Embeddings provider not initialized",
                provider_name="embeddings_manager",
                tier=ProviderTier.STANDARD
            )

        # Check cache
        cache_key = f"query:{query}"
        if use_cache and cache_key in self._cache:
            self.usage_stats["cache_hits"] += 1
            return self._cache[cache_key]

        # Embed query
        result = await self.provider.embed([query], input_type="query")
        embedding = result.content[0]

        # Cache and track
        if use_cache:
            self._cache[cache_key] = embedding

        self.usage_stats["embed_count"] += 1
        self.usage_stats["query_count"] += 1
        if result.cost_usd:
            self.usage_stats["total_cost"] += result.cost_usd

        return embedding

    def clear_cache(self):
        """Clear embedding cache"""
        self._cache.clear()
        logger.info("Embeddings cache cleared")

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics for monitoring"""
        total_requests = self.usage_stats["embed_count"] + self.usage_stats["cache_hits"]
        return {
            **self.usage_stats,
            "total_requests": total_requests,
            "cache_hit_rate": (self.usage_stats["cache_hits"] / total_requests * 100) if total_requests > 0 else 0,
            "avg_cost_per_request": (self.usage_stats["total_cost"] / self.usage_stats["embed_count"]) if self.usage_stats["embed_count"] > 0 else 0,
            "cache_size": len(self._cache),
        }

    def get_dimensions(self) -> int:
        """Get embedding dimensions"""
        if self.provider:
            return self.provider.get_dimensions()
        return 0
