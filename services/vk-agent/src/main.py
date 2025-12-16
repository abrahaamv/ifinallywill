"""
VK-Agent Main Entry Point
Voice AI Bridge: Janus AudioBridge <-> Gemini Live API

Uses the AgentBridge for proper bidirectional audio streaming:
- Janus AudioBridge via WebSocket + RTP
- Gemini Live API via WebSocket
- Opus codec and sample rate conversion
"""

import asyncio
import signal
import sys

import structlog
import uvicorn
from dotenv import load_dotenv

from .api import create_app
from .bridge import AgentBridge
from .config import get_settings, configure_logging

# Load environment variables
load_dotenv()

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    wrapper_class=structlog.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


async def main():
    """Start the VK-Agent service."""
    logger.info("Starting VK-Agent")

    # Load configuration
    settings = get_settings()
    configure_logging(settings.log_level)

    # Validate configuration
    errors = settings.validate()
    if errors:
        for error in errors:
            logger.error(f"Configuration error: {error}")
        sys.exit(1)

    logger.info(
        "Configuration loaded",
        janus_url=settings.janus.websocket_url,
        room_id=settings.janus.room_id,
        display_name=settings.janus.display_name,
        gemini_model=settings.gemini.model,
        gemini_voice=settings.gemini.voice,
    )

    # Create the bridge (main agent orchestrator)
    bridge = AgentBridge(settings)

    # Create API server with bridge
    app = create_app(bridge)

    # Setup signal handlers
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        shutdown_event.set()
        bridge._stop_event.set()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Start API server first (for health checks)
    config = uvicorn.Config(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="warning",  # Reduce uvicorn noise
    )
    server = uvicorn.Server(config)
    server_task = asyncio.create_task(server.serve())

    logger.info(f"API server running on http://{settings.api_host}:{settings.api_port}")

    # Start the bridge (connects to Janus and Gemini)
    if await bridge.start():
        logger.info("Bridge started successfully - ready for voice AI!")

        # Run until shutdown
        try:
            await bridge.run_until_stopped()
        except asyncio.CancelledError:
            pass
    else:
        logger.error("Failed to start bridge")

    # Cleanup
    logger.info("Shutting down VK-Agent...")
    await bridge.stop()
    server.should_exit = True

    try:
        await asyncio.wait_for(server_task, timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("Server shutdown timed out")

    logger.info("VK-Agent stopped")


if __name__ == "__main__":
    asyncio.run(main())
