"""
VK-Agent FastAPI Server
HTTP API for controlling the voice agent bridge
"""

import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import structlog

from .bridge import AgentBridge

logger = structlog.get_logger()


class TextRequest(BaseModel):
    text: str


class ScreenRequest(BaseModel):
    image: str  # Base64 encoded image
    mime_type: str = "image/jpeg"
    prompt: Optional[str] = "What do you see on this screen?"


def create_app(bridge: AgentBridge) -> FastAPI:
    """Create the FastAPI application with routes.

    Args:
        bridge: The AgentBridge instance for voice AI operations
    """
    app = FastAPI(
        title="VK-Agent",
        description="Voice AI Bridge: Janus AudioBridge <-> Gemini Live API",
        version="1.0.0",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy", "version": "1.0.0"}

    @app.get("/status")
    async def status():
        """Get comprehensive bridge status."""
        return bridge.get_status()

    @app.post("/text")
    async def send_text(request: TextRequest):
        """Send text to Gemini for voice response."""
        if not bridge.gemini_client or not bridge.gemini_client.is_ready:
            return {"success": False, "error": "Gemini not ready"}

        try:
            success = await bridge.send_text(request.text)
            if success:
                return {"success": True, "response": "🎤 Responding via voice..."}
            return {"success": False, "error": "Failed to send text"}
        except Exception as e:
            logger.error("Failed to send text", error=str(e))
            return {"success": False, "error": str(e)}

    @app.post("/screen")
    async def send_screen(request: ScreenRequest):
        """Send screen capture to Gemini for visual analysis."""
        if not bridge.gemini_client or not bridge.gemini_client.is_ready:
            return {"success": False, "error": "Gemini not ready"}

        try:
            # Decode base64 image
            image_data = base64.b64decode(request.image)

            # Send image to Gemini
            success = await bridge.gemini_client.send_image(
                image_data=image_data,
                mime_type=request.mime_type,
            )

            if success and request.prompt:
                # Send the prompt after the image
                await bridge.gemini_client.send_text(request.prompt)

            if success:
                return {"success": True, "message": "Screen sent to Gemini"}
            return {"success": False, "error": "Failed to send screen"}
        except Exception as e:
            logger.error("Failed to send screen", error=str(e))
            return {"success": False, "error": str(e)}

    @app.get("/stats")
    async def stats():
        """Get bridge statistics."""
        return {
            "stats": bridge.stats.to_dict() if bridge.stats else {},
            "audio": bridge.audio_processor.get_stats() if bridge.audio_processor else {},
            "gemini": bridge.gemini_client.get_stats() if bridge.gemini_client else {},
        }

    return app
