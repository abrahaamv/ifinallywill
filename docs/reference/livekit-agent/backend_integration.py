#!/usr/bin/env python3
"""
Backend Integration Bridge
==========================

Connects Python LiveKit agent to TypeScript tRPC backend.
Provides type-safe API calls for tenant data, usage tracking, and knowledge search.

This module solves the critical integration gaps identified in iteration.md:
- Tenant context from backend database
- Usage tracking to costEvents table
- Knowledge search via documented RAG system
- Feature flags for progressive rollout
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger("backend-integration")

@dataclass
class TenantContext:
    """Tenant context from backend"""
    id: str
    name: str
    service_tier: str
    api_key: str
    metadata: Dict[str, Any]

@dataclass
class KnowledgeResult:
    """Knowledge search result from backend RAG"""
    id: str
    title: str
    content: str
    score: float
    category: Optional[str] = None

@dataclass
class FeatureFlag:
    """Feature flag state"""
    key: str
    enabled: bool
    targeting: Dict[str, Any]

class BackendClient:
    """
    Client for TypeScript tRPC backend API

    Integrates with documented backend architecture:
    - 03-API-DESIGN.md: tRPC router specifications
    - 04-DATABASE-SCHEMA.md: Database schema
    - 08-AI-INTEGRATION.md: RAG system
    - ARCHITECTURE-IMPROVEMENTS.md: Feature flags
    """

    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        timeout: float = 30.0
    ):
        self.base_url = (base_url or os.getenv('API_BASE_URL', 'http://localhost:3001')).rstrip('/')
        self.api_key = api_key or os.getenv('AGENT_API_KEY')

        # HTTP client with proper headers
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "LiveKit-Agent/1.0"
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=timeout,
            follow_redirects=True
        )

        logger.info(f"Backend client initialized: {self.base_url}")

    async def health_check(self) -> Dict[str, Any]:
        """Check backend health"""
        try:
            response = await self.client.get("/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Backend health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}

    async def get_tenant_by_room(self, room_name: str) -> Optional[TenantContext]:
        """
        Get tenant context from room name

        Calls: /trpc/livekit.getTenantByRoom
        Defined in: 03-API-DESIGN.md (LiveKit Router)
        """
        try:
            response = await self.client.get(
                "/trpc/livekit.getTenantByRoom",
                params={"input": {"json": {"roomName": room_name}}}
            )
            response.raise_for_status()

            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                logger.warning(f"No tenant found for room: {room_name}")
                return None

            return TenantContext(
                id=result["id"],
                name=result["name"],
                service_tier=result.get("serviceTier", "professional"),
                api_key=result.get("apiKey", ""),
                metadata=result.get("metadata", {})
            )

        except Exception as e:
            logger.error(f"Failed to get tenant by room: {e}")
            return None

    async def track_usage(
        self,
        tenant_id: str,
        session_id: Optional[str],
        service: str,
        provider: str,
        tokens_used: Optional[int],
        cost_usd: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Track usage to backend costEvents table

        Calls: /trpc/usage.trackCost
        Defined in: 03-API-DESIGN.md (Usage & Billing Router)
        Schema: 04-DATABASE-SCHEMA.md (costEvents table)
        """
        try:
            payload = {
                "tenantId": tenant_id,
                "sessionId": session_id,
                "service": service,
                "provider": provider,
                "tokensUsed": tokens_used,
                "costUsd": cost_usd,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }

            response = await self.client.post(
                "/trpc/usage.trackCost",
                json={"json": payload}
            )
            response.raise_for_status()

            logger.debug(f"Usage tracked: {service} - ${cost_usd:.4f}")
            return True

        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
            return False

    async def search_knowledge(
        self,
        tenant_id: str,
        query: str,
        limit: int = 5,
        category: Optional[str] = None
    ) -> List[KnowledgeResult]:
        """
        Search knowledge via backend RAG system

        Calls: /trpc/knowledge.search
        Defined in: 03-API-DESIGN.md (Knowledge Processing Router)
        Implementation: 08-AI-INTEGRATION.md (Hybrid Search)
        """
        try:
            payload = {
                "tenantId": tenant_id,
                "query": query,
                "limit": limit
            }

            if category:
                payload["category"] = category

            response = await self.client.post(
                "/trpc/knowledge.search",
                json={"json": payload}
            )
            response.raise_for_status()

            data = response.json()
            results = data.get("result", {}).get("data", [])

            knowledge_results = [
                KnowledgeResult(
                    id=r["id"],
                    title=r["title"],
                    content=r["content"],
                    score=r["score"],
                    category=r.get("category")
                )
                for r in results
            ]

            logger.debug(f"Knowledge search: {len(knowledge_results)} results for '{query}'")
            return knowledge_results

        except Exception as e:
            logger.error(f"Failed to search knowledge: {e}")
            return []

    async def check_feature_flag(
        self,
        flag_key: str,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Check if feature flag is enabled

        Calls: /trpc/featureFlags.isEnabled
        Defined in: ARCHITECTURE-IMPROVEMENTS.md (Section 8: Feature Flags)
        """
        try:
            payload = {
                "flagKey": flag_key,
                "tenantId": tenant_id,
                "userId": user_id,
                "attributes": attributes or {}
            }

            response = await self.client.post(
                "/trpc/featureFlags.isEnabled",
                json={"json": payload}
            )
            response.raise_for_status()

            data = response.json()
            enabled = data.get("result", {}).get("data", False)

            logger.debug(f"Feature flag '{flag_key}': {enabled}")
            return enabled

        except Exception as e:
            logger.error(f"Failed to check feature flag: {e}")
            return False

    async def get_ai_personality(
        self,
        tenant_id: str,
        personality_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get AI personality configuration for tenant

        Calls: /trpc/ai.getPersonality
        Schema: 04-DATABASE-SCHEMA.md (ai_personalities table)
        """
        try:
            payload = {
                "tenantId": tenant_id,
                "personalityId": personality_id
            }

            response = await self.client.post(
                "/trpc/ai.getPersonality",
                json={"json": payload}
            )
            response.raise_for_status()

            data = response.json()
            personality = data.get("result", {}).get("data")

            if personality:
                logger.debug(f"AI personality loaded: {personality.get('name', 'default')}")

            return personality

        except Exception as e:
            logger.error(f"Failed to get AI personality: {e}")
            return None

    async def record_session_event(
        self,
        tenant_id: str,
        session_id: str,
        event_type: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Record session event for analytics

        Calls: /trpc/analytics.recordEvent
        """
        try:
            payload = {
                "tenantId": tenant_id,
                "sessionId": session_id,
                "eventType": event_type,
                "eventData": metadata,
                "timestamp": datetime.utcnow().isoformat()
            }

            response = await self.client.post(
                "/trpc/analytics.recordEvent",
                json={"json": payload}
            )
            response.raise_for_status()

            return True

        except Exception as e:
            logger.error(f"Failed to record session event: {e}")
            return False

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
        logger.info("Backend client closed")

# Global singleton instance
_backend_client: Optional[BackendClient] = None

def get_backend_client() -> BackendClient:
    """Get or create global backend client instance"""
    global _backend_client

    if _backend_client is None:
        _backend_client = BackendClient()

    return _backend_client

async def close_backend_client():
    """Close global backend client"""
    global _backend_client

    if _backend_client:
        await _backend_client.close()
        _backend_client = None
