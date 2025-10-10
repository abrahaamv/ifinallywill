"""
Backend API Client with JWT authentication, circuit breaker, and retry logic
Integrates with TypeScript Fastify + tRPC backend for tenant context, RAG, and cost tracking
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Any, Optional

import httpx
import jwt
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


class CircuitBreaker:
    """
    Simple circuit breaker implementation
    Prevents cascading failures by opening circuit after threshold failures
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        success_threshold: int = 2
    ):
        """
        Initialize circuit breaker

        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds before attempting recovery
            success_threshold: Successful requests needed to close circuit
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None

    def call_allowed(self) -> bool:
        """Check if call is allowed through circuit"""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if recovery timeout elapsed
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit breaker entering HALF_OPEN state")
                return True
            return False

        # HALF_OPEN state - allow calls through
        return True

    def record_success(self):
        """Record successful call"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker CLOSED - service recovered")
        else:
            # Reset failure count on success
            self.failure_count = 0

    def record_failure(self):
        """Record failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(
                f"Circuit breaker OPEN - {self.failure_count} failures"
            )


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
    Async HTTP client for TypeScript Fastify + tRPC backend

    Features:
    - JWT authentication with token caching (55min TTL)
    - Exponential backoff retries (3 attempts)
    - Circuit breaker pattern for fault tolerance
    - Connection pooling (max 50 connections)
    - HTTP/2 support for better performance

    Endpoints:
    - POST /trpc/livekit.joinRoom - Get room access token
    - POST /trpc/chat.sendMessage - Execute RAG query
    - POST /trpc/knowledge.query - Direct RAG query
    - GET /trpc/tenants.getSettings - Tenant configuration
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        max_retries: int = 3,
        timeout: float = 10.0
    ):
        """
        Initialize backend client

        Args:
            base_url: Backend API base URL (e.g., http://localhost:3001)
            api_key: JWT signing key for service-to-service auth
            max_retries: Maximum retry attempts for failed requests
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.max_retries = max_retries

        # HTTP client with connection pooling
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout, connect=5.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
            http2=True  # Enable HTTP/2 for better performance
        )

        # JWT token cache (55min TTL, refresh before 60min expiry)
        self._token: Optional[str] = None
        self._token_expires_at: float = 0

        # Circuit breaker for fault tolerance
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60.0
        )

        logger.info(f"Backend client initialized: {self.base_url}")

    def _get_token(self) -> str:
        """
        Generate JWT token for service-to-service authentication
        Caches token for 55 minutes (refresh before 60min expiry)

        Returns:
            JWT token string
        """
        current_time = time.time()

        # Return cached token if still valid
        if self._token and current_time < self._token_expires_at:
            return self._token

        # Generate new token
        payload = {
            "sub": "livekit-agent",
            "service": True,
            "iat": int(current_time),
            "exp": int(current_time + 3600)  # 60 minute expiry
        }

        self._token = jwt.encode(payload, self.api_key, algorithm="HS256")
        self._token_expires_at = current_time + 3300  # Refresh at 55min
        logger.debug("Generated new JWT token")

        return self._token

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Optional[httpx.Response]:
        """
        Execute HTTP request with exponential backoff retry

        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL (relative to base_url)
            **kwargs: Additional arguments passed to httpx

        Returns:
            Response object or None on failure
        """
        # Check circuit breaker
        if not self.circuit_breaker.call_allowed():
            logger.warning("Circuit breaker OPEN - request blocked")
            return None

        last_exception = None

        for attempt in range(self.max_retries):
            try:
                # Add JWT token to headers
                headers = kwargs.get("headers", {})
                headers["Authorization"] = f"Bearer {self._get_token()}"
                kwargs["headers"] = headers

                # Execute request
                response = await self.client.request(method, url, **kwargs)

                # Check status code
                if response.status_code < 500:
                    # Success or client error (don't retry)
                    self.circuit_breaker.record_success()
                    return response

                # Server error - retry
                logger.warning(
                    f"Request failed with {response.status_code}, "
                    f"attempt {attempt + 1}/{self.max_retries}"
                )

            except httpx.TimeoutException as e:
                logger.warning(f"Request timeout, attempt {attempt + 1}/{self.max_retries}")
                last_exception = e

            except httpx.RequestError as e:
                logger.warning(
                    f"Request error: {e}, attempt {attempt + 1}/{self.max_retries}"
                )
                last_exception = e

            # Exponential backoff: 0.5s, 1s, 2s
            if attempt < self.max_retries - 1:
                await asyncio.sleep(0.5 * (2 ** attempt))

        # All retries failed
        self.circuit_breaker.record_failure()
        logger.error(f"Request failed after {self.max_retries} attempts: {last_exception}")
        return None

    async def get(self, url: str, **kwargs) -> Optional[dict]:
        """
        Execute GET request

        Args:
            url: Request URL (relative to base_url)
            **kwargs: Additional arguments passed to httpx

        Returns:
            JSON response or None on failure
        """
        response = await self._request_with_retry("GET", url, **kwargs)
        return response.json() if response and response.status_code == 200 else None

    async def post(self, url: str, **kwargs) -> Optional[dict]:
        """
        Execute POST request

        Args:
            url: Request URL (relative to base_url)
            **kwargs: Additional arguments passed to httpx

        Returns:
            JSON response or None on failure
        """
        response = await self._request_with_retry("POST", url, **kwargs)
        return response.json() if response and response.status_code == 200 else None

    async def get_tenant_context(
        self,
        tenant_id: str
    ) -> Optional[TenantContext]:
        """
        Fetch tenant configuration and settings

        Args:
            tenant_id: Tenant identifier

        Returns:
            TenantContext if found, None otherwise
        """
        try:
            # tRPC batch request format
            payload = {
                "0": {
                    "json": {"tenantId": tenant_id}
                }
            }

            result = await self.post("/trpc/tenants.getSettings", json=payload)

            if result and "0" in result and "result" in result["0"]:
                data = result["0"]["result"]["data"]["json"]
                return TenantContext(**data)

            logger.warning(f"Tenant context not found: {tenant_id}")
            return None

        except Exception as e:
            logger.error(f"Failed to fetch tenant context: {e}")
            return None

    async def search_knowledge(
        self,
        tenant_id: str,
        query: str,
        top_k: int = 5
    ) -> Optional[RAGResult]:
        """
        Query tenant's knowledge base using RAG

        Args:
            tenant_id: Tenant identifier
            query: User question
            top_k: Number of results to return

        Returns:
            RAGResult with answer and sources, or None on error
        """
        try:
            # tRPC batch request format
            payload = {
                "0": {
                    "json": {
                        "tenantId": tenant_id,
                        "sessionId": "agent-session",
                        "message": query,
                        "useKnowledge": True,
                        "topK": top_k
                    }
                }
            }

            result = await self.post("/trpc/chat.sendMessage", json=payload)

            if result and "0" in result and "result" in result["0"]:
                data = result["0"]["result"]["data"]["json"]

                return RAGResult(
                    answer=data.get("response", ""),
                    sources=data.get("sources", []),
                    confidence=data.get("confidence", 0.0),
                    metadata=data.get("metadata", {})
                )

            return None

        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return None

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """
        Fetch user profile information

        Args:
            user_id: User identifier

        Returns:
            User profile dict or None
        """
        try:
            payload = {
                "0": {
                    "json": {"userId": user_id}
                }
            }

            result = await self.post("/trpc/users.getProfile", json=payload)

            if result and "0" in result:
                return result["0"]["result"]["data"]["json"]

            return None

        except Exception as e:
            logger.error(f"Failed to fetch user profile: {e}")
            return None

    async def create_task(
        self,
        tenant_id: str,
        user_id: str,
        title: str,
        description: str
    ) -> Optional[str]:
        """
        Create task in user's task list

        Args:
            tenant_id: Tenant identifier
            user_id: User identifier
            title: Task title
            description: Task description

        Returns:
            Task ID if created, None otherwise
        """
        try:
            payload = {
                "0": {
                    "json": {
                        "tenantId": tenant_id,
                        "userId": user_id,
                        "title": title,
                        "description": description
                    }
                }
            }

            result = await self.post("/trpc/tasks.create", json=payload)

            if result and "0" in result:
                return result["0"]["result"]["data"]["json"]["id"]

            return None

        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            return None

    async def log_insight(
        self,
        tenant_id: str,
        user_id: str,
        content: str,
        category: str
    ) -> bool:
        """
        Log AI insight for user

        Args:
            tenant_id: Tenant identifier
            user_id: User identifier
            content: Insight content
            category: Insight category

        Returns:
            True if logged successfully, False otherwise
        """
        try:
            payload = {
                "0": {
                    "json": {
                        "tenantId": tenant_id,
                        "userId": user_id,
                        "content": content,
                        "category": category
                    }
                }
            }

            result = await self.post("/trpc/insights.create", json=payload)
            return bool(result and "0" in result)

        except Exception as e:
            logger.error(f"Failed to log insight: {e}")
            return False

    async def log_cost_event(
        self,
        tenant_id: str,
        session_id: str,
        service: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost: float
    ):
        """
        Track AI usage for billing

        Args:
            tenant_id: Tenant identifier
            session_id: Session identifier
            service: AI provider (gemini, claude, gpt4o, etc.)
            model: Model name
            input_tokens: Input tokens consumed
            output_tokens: Output tokens consumed
            cost: Estimated cost in USD
        """
        try:
            payload = {
                "0": {
                    "json": {
                        "tenantId": tenant_id,
                        "sessionId": session_id,
                        "service": service,
                        "model": model,
                        "inputTokens": input_tokens,
                        "outputTokens": output_tokens,
                        "cost": cost
                    }
                }
            }

            result = await self.post("/trpc/costs.logEvent", json=payload)

            if not result:
                logger.warning("Failed to log cost event")

        except Exception as e:
            logger.error(f"Failed to log cost event: {e}")

    async def close(self):
        """Close HTTP client and cleanup resources"""
        await self.client.aclose()
        logger.info("Backend client closed")


# Export
__all__ = ["BackendClient", "TenantContext", "RAGResult", "CircuitBreaker"]
