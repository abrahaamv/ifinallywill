"""
Knowledge Base Connection Pool - PostgreSQL with RLS
Singleton connection pool with tenant isolation via Row-Level Security
"""

import logging
from typing import Optional

import asyncpg

from config import settings

logger = logging.getLogger(__name__)


class KnowledgeBasePool:
    """
    Singleton PostgreSQL connection pool for knowledge base queries

    Architecture:
    - Shared connection pool (10-50 connections)
    - PostgreSQL Row-Level Security (RLS) for tenant isolation
    - Sets app.current_tenant_id session variable for RLS policies
    - Vector similarity search using pgvector extension
    - Connection pooling for better performance

    Security:
    - RLS policies enforce tenant_id filtering
    - Session variable prevents cross-tenant data leakage
    - Connection-level isolation per query
    """

    _instance: Optional["KnowledgeBasePool"] = None
    _pool: Optional[asyncpg.Pool] = None

    def __new__(cls):
        """Singleton pattern - only one pool per worker process"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(
        self,
        min_size: int = 10,
        max_size: int = 50,
        timeout: float = 30.0
    ):
        """
        Initialize connection pool

        Args:
            min_size: Minimum number of connections
            max_size: Maximum number of connections
            timeout: Connection timeout in seconds
        """
        if self._pool is not None:
            logger.warning("Pool already initialized")
            return

        try:
            self._pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=min_size,
                max_size=max_size,
                command_timeout=timeout,
                # Set statement timeout to prevent long-running queries
                server_settings={
                    'statement_timeout': str(int(timeout * 1000))  # Convert to ms
                }
            )

            logger.info(
                f"Knowledge base pool initialized: "
                f"{min_size}-{max_size} connections"
            )

            # Verify pgvector extension
            await self._verify_pgvector()

        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise

    async def _verify_pgvector(self):
        """Verify pgvector extension is installed"""
        try:
            async with self._pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
                )

                if not result:
                    logger.error("pgvector extension not installed")
                    raise RuntimeError("pgvector extension required but not found")

                logger.info("pgvector extension verified")

        except Exception as e:
            logger.error(f"pgvector verification failed: {e}")
            raise

    async def acquire_tenant_connection(self, tenant_id: str):
        """
        Acquire connection with tenant context

        Context manager that sets app.current_tenant_id for RLS policies

        Args:
            tenant_id: Tenant identifier

        Returns:
            Connection context manager

        Example:
            async with pool.acquire_tenant_connection(tenant_id) as conn:
                results = await conn.fetch("SELECT * FROM knowledge_chunks")
                # RLS policies automatically filter by tenant_id
        """
        if self._pool is None:
            raise RuntimeError("Pool not initialized")

        class TenantConnection:
            """Context manager for tenant-scoped connection"""

            def __init__(self, pool, tenant_id):
                self.pool = pool
                self.tenant_id = tenant_id
                self.conn = None

            async def __aenter__(self):
                # Acquire connection from pool
                self.conn = await self.pool.acquire()

                # Set tenant context for RLS
                await self.conn.execute(
                    "SET LOCAL app.current_tenant_id = $1",
                    self.tenant_id
                )

                return self.conn

            async def __aexit__(self, exc_type, exc_val, exc_tb):
                # Release connection back to pool
                if self.conn:
                    await self.pool.release(self.conn)

        return TenantConnection(self._pool, tenant_id)

    async def query_knowledge_base(
        self,
        tenant_id: str,
        query_embedding: list[float],
        top_k: int = 5,
        similarity_threshold: float = 0.7
    ) -> list[dict]:
        """
        Query knowledge base using vector similarity search

        Args:
            tenant_id: Tenant identifier
            query_embedding: Query embedding vector (e.g., from Voyage AI)
            top_k: Number of results to return
            similarity_threshold: Minimum cosine similarity (0.0-1.0)

        Returns:
            List of matching documents with metadata
        """
        try:
            async with self.acquire_tenant_connection(tenant_id) as conn:
                # Vector similarity search using pgvector
                # RLS policies automatically filter by tenant_id
                query = """
                    SELECT
                        kc.id,
                        kc.content,
                        kc.metadata,
                        kd.title as document_title,
                        kd.file_name as document_file_name,
                        -- Cosine similarity (1 - cosine distance)
                        1 - (kc.embedding <=> $1::vector) as similarity
                    FROM knowledge_chunks kc
                    JOIN knowledge_documents kd ON kc.document_id = kd.id
                    WHERE
                        -- RLS policy applies tenant_id filter automatically
                        1 - (kc.embedding <=> $1::vector) >= $2
                    ORDER BY kc.embedding <=> $1::vector
                    LIMIT $3
                """

                # Execute query with parameters
                rows = await conn.fetch(
                    query,
                    query_embedding,
                    similarity_threshold,
                    top_k
                )

                # Convert rows to dictionaries
                results = []
                for row in rows:
                    results.append({
                        "id": row["id"],
                        "content": row["content"],
                        "metadata": row["metadata"],
                        "document_title": row["document_title"],
                        "document_file_name": row["document_file_name"],
                        "similarity": float(row["similarity"])
                    })

                logger.info(
                    f"Knowledge base query: tenant={tenant_id}, "
                    f"results={len(results)}/{top_k}"
                )

                return results

        except Exception as e:
            logger.error(f"Knowledge base query error: {e}")
            return []

    async def get_document_count(self, tenant_id: str) -> int:
        """
        Get number of documents for tenant

        Args:
            tenant_id: Tenant identifier

        Returns:
            Document count
        """
        try:
            async with self.acquire_tenant_connection(tenant_id) as conn:
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM knowledge_documents"
                    # RLS policy applies tenant_id filter automatically
                )
                return count

        except Exception as e:
            logger.error(f"Failed to get document count: {e}")
            return 0

    async def get_chunk_count(self, tenant_id: str) -> int:
        """
        Get number of chunks for tenant

        Args:
            tenant_id: Tenant identifier

        Returns:
            Chunk count
        """
        try:
            async with self.acquire_tenant_connection(tenant_id) as conn:
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM knowledge_chunks"
                    # RLS policy applies tenant_id filter automatically
                )
                return count

        except Exception as e:
            logger.error(f"Failed to get chunk count: {e}")
            return 0

    async def close(self):
        """Close connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("Knowledge base pool closed")


# Global singleton instance
knowledge_base_pool = KnowledgeBasePool()


# Convenience functions
async def initialize_pool(**kwargs):
    """Initialize connection pool"""
    await knowledge_base_pool.initialize(**kwargs)


async def query_knowledge_base(
    tenant_id: str,
    query_embedding: list[float],
    top_k: int = 5,
    similarity_threshold: float = 0.7
) -> list[dict]:
    """Query knowledge base with vector similarity"""
    return await knowledge_base_pool.query_knowledge_base(
        tenant_id,
        query_embedding,
        top_k,
        similarity_threshold
    )


async def get_document_count(tenant_id: str) -> int:
    """Get document count for tenant"""
    return await knowledge_base_pool.get_document_count(tenant_id)


async def get_chunk_count(tenant_id: str) -> int:
    """Get chunk count for tenant"""
    return await knowledge_base_pool.get_chunk_count(tenant_id)
