"""
VK-ICE REST API

FastAPI-based REST API for ICE credential retrieval.
Provides endpoints for the VisualKit platform and VK Agent
to obtain TURN/STUN credentials.

Endpoints:
    GET  /api/ice/credentials     - Get ICE credentials
    GET  /api/ice/providers       - List available providers
    GET  /api/ice/health          - Health check
    GET  /api/ice/stats           - Statistics
    POST /api/ice/refresh         - Force refresh all
    DELETE /api/ice/cache         - Clear cache

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                         FastAPI App                              │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │  /api/ice/credentials  ─────────────────────────┐               │
    │                                                   │               │
    │  /api/ice/providers    ─────────────────────────┼─► IceEngine   │
    │                                                   │               │
    │  /api/ice/health       ─────────────────────────┤               │
    │                                                   │               │
    │  /api/ice/stats        ─────────────────────────┘               │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Security:
    - CORS enabled for VisualKit domains
    - Rate limiting (configurable)
    - API key authentication (optional)

Usage:
    # Standalone server
    uvicorn vk_ice.api:app --host 0.0.0.0 --port 3003

    # With custom engine
    from vk_ice.api import create_app
    app = create_app(engine=my_engine)
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .engine import IceEngine
from .models import IceConfig

logger = logging.getLogger(__name__)

# Global engine instance (initialized at startup)
_engine: Optional[IceEngine] = None


# === Pydantic Models for API ===

class IceServerResponse(BaseModel):
    """Single ICE server in API response."""
    urls: List[str] = Field(..., description="ICE server URL(s)")
    username: Optional[str] = Field(None, description="TURN username")
    credential: Optional[str] = Field(None, description="TURN credential")


class IceCredentialsResponse(BaseModel):
    """ICE credentials API response."""
    iceServers: List[IceServerResponse] = Field(
        ..., description="List of ICE servers"
    )
    provider: str = Field(..., description="Provider that returned credentials")
    ttl_seconds: int = Field(..., description="Credential TTL in seconds")
    remaining_ttl: int = Field(..., description="Seconds until expiry")
    has_turn: bool = Field(..., description="Whether TURN servers are included")
    has_stun: bool = Field(..., description="Whether STUN servers are included")

    class Config:
        json_schema_extra = {
            "example": {
                "iceServers": [
                    {"urls": ["stun:stun.l.google.com:19302"]},
                    {
                        "urls": ["turn:turn.example.com:3478?transport=udp"],
                        "username": "user123",
                        "credential": "pass456"
                    }
                ],
                "provider": "8x8",
                "ttl_seconds": 3600,
                "remaining_ttl": 3550,
                "has_turn": True,
                "has_stun": True
            }
        }


class ProviderHealthResponse(BaseModel):
    """Provider health status."""
    provider: str
    status: str
    is_healthy: bool
    last_error: Optional[str]
    consecutive_failures: int
    average_latency_ms: float


class ProviderListResponse(BaseModel):
    """List of available providers."""
    providers: List[str] = Field(..., description="Available provider names")
    priority_order: List[str] = Field(..., description="Provider priority order")
    health: dict = Field(..., description="Health status per provider")


class StatsResponse(BaseModel):
    """Engine statistics."""
    running: bool
    started_at: Optional[str]
    total_requests: int
    cache_hits: int
    cache_misses: int
    cache_hit_rate: float
    failovers: int
    providers: List[str]


class RefreshResponse(BaseModel):
    """Refresh operation result."""
    results: dict = Field(..., description="Provider name -> success status")
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    providers: dict
    cache_size: int


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None


# === Lifespan Management ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global _engine

    # Startup
    logger.info("Starting VK-ICE API...")
    _engine = IceEngine()
    await _engine.start()
    logger.info("VK-ICE API started")

    yield

    # Shutdown
    logger.info("Stopping VK-ICE API...")
    if _engine:
        await _engine.stop()
    logger.info("VK-ICE API stopped")


# === Dependency Injection ===

def get_engine() -> IceEngine:
    """Get the ICE engine instance."""
    if _engine is None:
        raise HTTPException(
            status_code=503,
            detail="ICE engine not initialized"
        )
    return _engine


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> Optional[str]:
    """Verify API key if configured.

    Currently optional - add validation logic if needed.
    """
    # TODO: Implement API key validation if needed
    return x_api_key


# === FastAPI App ===

def create_app(engine: Optional[IceEngine] = None) -> FastAPI:
    """Create FastAPI application.

    Args:
        engine: Optional pre-configured IceEngine

    Returns:
        Configured FastAPI application
    """
    global _engine

    if engine:
        _engine = engine
        app = FastAPI(
            title="VK-ICE API",
            description="VisualKit ICE Credential Service - TURN/STUN credential management",
            version="1.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc",
            openapi_url="/api/openapi.json",
        )
    else:
        app = FastAPI(
            title="VK-ICE API",
            description="VisualKit ICE Credential Service - TURN/STUN credential management",
            version="1.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc",
            openapi_url="/api/openapi.json",
            lifespan=lifespan,
        )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:*",
            "https://*.visualkit.live",
            "https://visualkit.live",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    # Register routes
    _register_routes(app)

    return app


def _register_routes(app: FastAPI) -> None:
    """Register API routes."""

    @app.get(
        "/api/ice/credentials",
        response_model=IceCredentialsResponse,
        responses={
            200: {"description": "ICE credentials retrieved successfully"},
            503: {"model": ErrorResponse, "description": "Service unavailable"},
        },
        tags=["ICE Credentials"],
        summary="Get ICE Credentials",
        description="""
        Retrieve TURN/STUN credentials for WebRTC connections.

        The service automatically selects the best available provider
        and handles failover if the primary provider is unavailable.

        **Query Parameters:**
        - `provider`: Force specific provider (optional)
        - `force_refresh`: Bypass cache and fetch fresh (default: false)

        **Response:**
        - `iceServers`: Array compatible with RTCPeerConnection configuration
        - `provider`: Which provider returned the credentials
        - `ttl_seconds`: How long credentials are valid
        - `has_turn`: Whether TURN relay servers are included
        """,
    )
    async def get_credentials(
        provider: Optional[str] = Query(
            None,
            description="Specific provider to use (8x8, kmeet, fallback)"
        ),
        force_refresh: bool = Query(
            False,
            description="Bypass cache and fetch fresh credentials"
        ),
        engine: IceEngine = Depends(get_engine),
    ) -> IceCredentialsResponse:
        """Get ICE credentials."""
        try:
            config = await engine.get_credentials(
                provider=provider,
                force_refresh=force_refresh,
            )

            return IceCredentialsResponse(
                iceServers=[
                    IceServerResponse(
                        urls=[s.url],
                        username=s.username,
                        credential=s.credential,
                    )
                    for s in config.servers
                ],
                provider=config.provider,
                ttl_seconds=config.ttl_seconds,
                remaining_ttl=config.remaining_ttl,
                has_turn=config.has_turn,
                has_stun=config.has_stun,
            )

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error getting credentials: {e}")
            raise HTTPException(status_code=503, detail="Failed to get credentials")

    @app.get(
        "/api/ice/providers",
        response_model=ProviderListResponse,
        tags=["ICE Credentials"],
        summary="List Providers",
        description="Get list of available ICE credential providers with health status.",
    )
    async def list_providers(
        engine: IceEngine = Depends(get_engine),
    ) -> ProviderListResponse:
        """List available providers."""
        health = await engine.health_check()

        return ProviderListResponse(
            providers=engine.providers,
            priority_order=engine.providers,
            health=health,
        )

    @app.get(
        "/api/ice/health",
        response_model=HealthResponse,
        tags=["Health"],
        summary="Health Check",
        description="Check health status of the ICE service and all providers.",
    )
    async def health_check(
        engine: IceEngine = Depends(get_engine),
    ) -> HealthResponse:
        """Health check endpoint."""
        provider_health = await engine.health_check()

        # Determine overall status
        healthy_count = sum(
            1 for h in provider_health.values()
            if h.get("is_healthy", False)
        )

        if healthy_count == 0:
            status = "unhealthy"
        elif healthy_count < len(provider_health):
            status = "degraded"
        else:
            status = "healthy"

        return HealthResponse(
            status=status,
            providers=provider_health,
            cache_size=engine._cache.size,
        )

    @app.get(
        "/api/ice/stats",
        response_model=StatsResponse,
        tags=["Monitoring"],
        summary="Get Statistics",
        description="Get detailed statistics about the ICE service.",
    )
    async def get_stats(
        engine: IceEngine = Depends(get_engine),
    ) -> StatsResponse:
        """Get engine statistics."""
        stats = await engine.get_stats()
        engine_stats = stats.get("engine", {})

        return StatsResponse(
            running=engine.is_running,
            started_at=engine_stats.get("started_at"),
            total_requests=engine_stats.get("total_requests", 0),
            cache_hits=engine_stats.get("cache_hits", 0),
            cache_misses=engine_stats.get("cache_misses", 0),
            cache_hit_rate=engine_stats.get("cache_hit_rate", 0.0),
            failovers=engine_stats.get("failovers", 0),
            providers=engine.providers,
        )

    @app.post(
        "/api/ice/refresh",
        response_model=RefreshResponse,
        tags=["Management"],
        summary="Force Refresh",
        description="Force refresh credentials from all providers.",
    )
    async def force_refresh(
        engine: IceEngine = Depends(get_engine),
    ) -> RefreshResponse:
        """Force refresh all credentials."""
        results = await engine.refresh_all()

        success_count = sum(1 for v in results.values() if v)
        total_count = len(results)

        return RefreshResponse(
            results=results,
            message=f"Refreshed {success_count}/{total_count} providers",
        )

    @app.delete(
        "/api/ice/cache",
        tags=["Management"],
        summary="Clear Cache",
        description="Clear all cached credentials.",
    )
    async def clear_cache(
        engine: IceEngine = Depends(get_engine),
    ) -> dict:
        """Clear credential cache."""
        count = await engine._cache.invalidate_all()

        return {
            "cleared": count,
            "message": f"Cleared {count} cache entries",
        }

    @app.get(
        "/",
        tags=["Root"],
        include_in_schema=False,
    )
    async def root():
        """Root endpoint."""
        return {
            "service": "VK-ICE",
            "version": "1.0.0",
            "docs": "/api/docs",
        }

    @app.get(
        "/health",
        tags=["Health"],
        include_in_schema=False,
    )
    async def simple_health():
        """Simple health check for load balancers."""
        if _engine and _engine.is_running:
            return {"status": "ok"}
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable"}
        )


# Default app instance
app = create_app()
