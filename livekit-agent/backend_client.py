"""
Backend API Client (Phase 5 - Week 3)

Integration with TypeScript backend for:
- Tenant context retrieval
- RAG knowledge base queries
- Usage tracking and cost attribution
"""

import logging
from typing import Any, Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class RAGResult(BaseModel):
    """RAG query result from backend"""

    answer: str
    sources: list[dict[str, Any]]
    confidence: float
    metadata: dict[str, Any]


class TenantContext(BaseModel):
    """Tenant configuration and settings"""

    tenant_id: str
    name: str
    settings: dict[str, Any]
    knowledge_base_enabled: bool
    ai_instructions: Optional[str] = None


class BackendClient:
    """
    Client for TypeScript backend API

    Endpoints:
    - POST /trpc/livekit.joinRoom - Get room access token
    - POST /trpc/chat.sendMessage - Execute RAG query
    - POST /trpc/knowledge.query - Direct RAG query
    - GET /trpc/tenants.getSettings - Tenant configuration
    """

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Backend client initialized: {self.base_url}")

    async def get_tenant_context(
        self, tenant_id: str, auth_token: Optional[str] = None
    ) -> Optional[TenantContext]:
        """
        Fetch tenant configuration and settings

        Args:
            tenant_id: Tenant identifier
            auth_token: Optional authentication token

        Returns:
            TenantContext if found, None otherwise
        """
        try:
            # TODO: Implement when tenant API is available
            # For now, return mock data
            logger.warning(
                f"Using mock tenant context for: {tenant_id}"
            )

            return TenantContext(
                tenant_id=tenant_id,
                name=f"Tenant {tenant_id}",
                settings={},
                knowledge_base_enabled=True,
                ai_instructions="You are a helpful AI assistant.",
            )

        except Exception as e:
            logger.error(f"Failed to fetch tenant context: {e}")
            return None

    async def query_knowledge_base(
        self,
        tenant_id: str,
        query: str,
        auth_token: Optional[str] = None,
    ) -> Optional[RAGResult]:
        """
        Query tenant's knowledge base using RAG

        Args:
            tenant_id: Tenant identifier
            query: User question
            auth_token: Optional authentication token

        Returns:
            RAGResult with answer and sources, or None on error
        """
        try:
            url = f"{self.base_url}/chat.sendMessage"
            headers = {"Content-Type": "application/json"}

            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"

            # tRPC batch request format
            payload = {
                "0": {
                    "json": {
                        "sessionId": "agent-session",
                        "message": query,
                        "useKnowledge": True,
                    }
                }
            }

            response = await self.client.post(
                url, headers=headers, json=payload
            )

            if response.status_code != 200:
                logger.error(
                    f"RAG query failed: {response.status_code} - {response.text}"
                )
                return None

            result = response.json()

            # Extract RAG results from response
            if "0" in result and "result" in result["0"]:
                data = result["0"]["result"]["data"]["json"]

                return RAGResult(
                    answer=data.get("response", ""),
                    sources=data.get("sources", []),
                    confidence=data.get("confidence", 0.0),
                    metadata=data.get("metadata", {}),
                )

            return None

        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return None

    async def track_usage(
        self,
        tenant_id: str,
        user_id: Optional[str],
        provider: str,
        tokens: int,
        cost: float,
    ):
        """
        Track AI usage for billing

        Args:
            tenant_id: Tenant identifier
            user_id: Optional user identifier
            provider: AI provider used (gemini, claude, gpt4o, etc.)
            tokens: Number of tokens consumed
            cost: Estimated cost in USD
        """
        try:
            # TODO: Implement cost tracking endpoint
            logger.info(
                f"Usage tracked - Tenant: {tenant_id}, "
                f"Provider: {provider}, Tokens: {tokens}, Cost: ${cost:.6f}"
            )

        except Exception as e:
            logger.error(f"Failed to track usage: {e}")

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
