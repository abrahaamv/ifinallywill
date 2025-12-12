"""
VK-Agent REST API Server

Optional HTTP API for monitoring and control of the voice agent.
Provides endpoints for:
- Health checks
- Status monitoring
- Configuration
- Runtime control

Usage:
    # Run standalone API server
    python -m vk_agent.api --port 3004

    # Or use programmatically
    from vk_agent.api import create_app
    app = create_app(bridge)
    uvicorn.run(app, host="0.0.0.0", port=3004)
"""

import asyncio
import base64
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import Settings, get_settings, configure_logging
from .bridge import AgentBridge

logger = logging.getLogger(__name__)


# Request/Response models
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str


class StatusResponse(BaseModel):
    """Detailed status response."""
    state: str
    running: bool
    gemini_speaking: bool
    janus: dict
    gemini: dict
    audio: dict
    rtp: dict
    stats: dict


class TextRequest(BaseModel):
    """Text message request."""
    text: str
    end_of_turn: bool = True


class ScreenFrameRequest(BaseModel):
    """Screen frame request for visual input."""
    image: str  # Base64 encoded image data
    mime_type: str = "image/jpeg"  # JPEG format, max 1024x1024 recommended


class MessageResponse(BaseModel):
    """Generic message response."""
    success: bool
    message: str


# Global bridge instance
_bridge: Optional[AgentBridge] = None
_bridge_task: Optional[asyncio.Task] = None


def get_bridge() -> AgentBridge:
    """Get the global bridge instance."""
    if _bridge is None:
        raise HTTPException(status_code=503, detail="Bridge not initialized")
    return _bridge


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan handler for startup/shutdown."""
    global _bridge, _bridge_task

    settings = get_settings()
    _bridge = AgentBridge(settings)

    # Start bridge
    if await _bridge.start():
        logger.info("Bridge started via API server")
        _bridge_task = asyncio.create_task(_bridge.run_until_stopped())
    else:
        logger.error("Failed to start bridge")

    yield

    # Cleanup
    if _bridge_task:
        _bridge_task.cancel()
        try:
            await _bridge_task
        except asyncio.CancelledError:
            pass

    if _bridge:
        await _bridge.stop()
        logger.info("Bridge stopped via API server")


def create_app(bridge: Optional[AgentBridge] = None) -> FastAPI:
    """Create FastAPI application.

    Args:
        bridge: Optional pre-configured bridge instance

    Returns:
        FastAPI application
    """
    global _bridge

    settings = get_settings()

    app = FastAPI(
        title="VK-Agent API",
        description="Voice AI Agent - Janus-Gemini Bridge",
        version=settings.version,
        lifespan=lifespan if bridge is None else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Set bridge if provided
    if bridge:
        _bridge = bridge

    # Routes
    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health_check():
        """Health check endpoint."""
        return HealthResponse(
            status="healthy" if _bridge and _bridge.is_running else "degraded",
            version=settings.version,
        )

    @app.get("/status", response_model=StatusResponse, tags=["Status"])
    async def get_status():
        """Get detailed bridge status."""
        bridge = get_bridge()
        status = bridge.get_status()
        return StatusResponse(**status)

    @app.get("/stats", tags=["Status"])
    async def get_stats():
        """Get bridge statistics."""
        bridge = get_bridge()
        return bridge.stats.to_dict()

    @app.post("/text", response_model=MessageResponse, tags=["Control"])
    async def send_text(request: TextRequest):
        """Send text message to Gemini."""
        bridge = get_bridge()

        if not bridge.gemini_client or not bridge.gemini_client.is_ready:
            raise HTTPException(status_code=503, detail="Gemini not ready")

        success = await bridge.gemini_client.send_text(
            request.text,
            end_of_turn=request.end_of_turn,
        )

        return MessageResponse(
            success=success,
            message="Text sent" if success else "Failed to send",
        )

    @app.post("/screen", response_model=MessageResponse, tags=["Control"])
    async def send_screen_frame(request: ScreenFrameRequest):
        """Send screen frame to Gemini for visual understanding."""
        bridge = get_bridge()

        if not bridge.gemini_client or not bridge.gemini_client.is_ready:
            raise HTTPException(status_code=503, detail="Gemini not ready")

        try:
            # Decode base64 image
            image_data = base64.b64decode(request.image)

            success = await bridge.gemini_client.send_image(
                image_data,
                mime_type=request.mime_type,
            )

            return MessageResponse(
                success=success,
                message=f"Screen frame sent ({len(image_data)} bytes)" if success else "Failed to send",
            )
        except Exception as e:
            logger.error(f"Error processing screen frame: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/mute", response_model=MessageResponse, tags=["Control"])
    async def mute_agent(muted: bool = True):
        """Mute or unmute the agent in Janus."""
        bridge = get_bridge()

        if not bridge.janus_client or not bridge.janus_client.is_ready:
            raise HTTPException(status_code=503, detail="Janus not ready")

        success = await bridge.janus_client.mute(muted)

        return MessageResponse(
            success=success,
            message=f"Agent {'muted' if muted else 'unmuted'}",
        )

    @app.post("/stop", response_model=MessageResponse, tags=["Control"])
    async def stop_bridge(background_tasks: BackgroundTasks):
        """Stop the bridge gracefully."""
        bridge = get_bridge()

        async def do_stop():
            await bridge.stop()

        background_tasks.add_task(do_stop)

        return MessageResponse(
            success=True,
            message="Stop initiated",
        )

    @app.get("/config", tags=["Config"])
    async def get_config():
        """Get current configuration (excludes secrets)."""
        return settings.to_dict()

    return app


def main():
    """Run the API server standalone."""
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="VK-Agent API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    parser.add_argument("--port", type=int, default=3004, help="Port to bind")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    settings = get_settings()
    if args.verbose:
        settings.log_level = "DEBUG"

    configure_logging(settings.log_level)

    logger.info(f"Starting VK-Agent API on {args.host}:{args.port}")

    app = create_app()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
