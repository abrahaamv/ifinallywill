#!/usr/bin/env python3
"""
VK-Agent: Janus-Gemini Voice Bridge

Production-grade voice AI agent that bridges Janus AudioBridge
with Google Gemini Live API for real-time conversational AI.

Usage:
    # Basic usage (uses environment variables)
    python -m vk_agent.main

    # With explicit room ID
    python -m vk_agent.main --room 5679

    # Development mode with verbose logging
    python -m vk_agent.main --room 5679 --verbose

    # Full configuration
    python -m vk_agent.main \\
        --room 5679 \\
        --janus-url ws://janus:8188 \\
        --rtp-host 172.19.0.1 \\
        --rtp-port 5004 \\
        --model models/gemini-2.0-flash-exp \\
        --voice Puck \\
        --verbose

Environment Variables:
    GEMINI_API_KEY          - Google AI API key (required)
    VK_AGENT_JANUS_WS_URL   - Janus WebSocket URL
    VK_AGENT_JANUS_ROOM_ID  - AudioBridge room ID
    VK_AGENT_RTP_HOST       - RTP listening host
    VK_AGENT_RTP_PORT       - RTP listening port
    VK_AGENT_LOG_LEVEL      - Logging level
"""

import argparse
import asyncio
import logging
import signal
import sys
from typing import Optional

from .config import Settings, get_settings, configure_logging
from .bridge import AgentBridge

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="VK-Agent: Janus-Gemini Voice Bridge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Janus settings
    parser.add_argument(
        "--room", "-r",
        type=int,
        help="Janus AudioBridge room ID",
    )
    parser.add_argument(
        "--janus-url",
        type=str,
        help="Janus WebSocket URL (ws://host:8188)",
    )
    parser.add_argument(
        "--rtp-host",
        type=str,
        help="Host IP for RTP (Docker gateway or host IP)",
    )
    parser.add_argument(
        "--rtp-port",
        type=int,
        help="RTP listening port",
    )
    parser.add_argument(
        "--display-name",
        type=str,
        default="VKAgent",
        help="Display name in room",
    )

    # Gemini settings
    parser.add_argument(
        "--model",
        type=str,
        help="Gemini model ID (e.g., models/gemini-2.0-flash-exp)",
    )
    parser.add_argument(
        "--voice",
        type=str,
        choices=["Puck", "Aoede", "Charon", "Fenrir", "Kore"],
        help="Gemini voice preset",
    )
    parser.add_argument(
        "--system-prompt",
        type=str,
        help="Custom system instruction for AI",
    )

    # General settings
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging (DEBUG level)",
    )
    parser.add_argument(
        "--debug-audio",
        action="store_true",
        help="Save audio to files for debugging",
    )

    return parser.parse_args()


def apply_args_to_settings(args: argparse.Namespace, settings: Settings) -> None:
    """Apply command line arguments to settings."""
    # Janus settings
    if args.room:
        settings.janus.room_id = args.room
    if args.janus_url:
        settings.janus.websocket_url = args.janus_url
    if args.rtp_host:
        settings.janus.rtp_host = args.rtp_host
    if args.rtp_port:
        settings.janus.rtp_port = args.rtp_port
    if args.display_name:
        settings.janus.display_name = args.display_name

    # Gemini settings
    if args.model:
        settings.gemini.model = args.model
    if args.voice:
        settings.gemini.voice = args.voice
    if args.system_prompt:
        settings.gemini.system_instruction = args.system_prompt

    # General settings
    if args.verbose:
        settings.log_level = "DEBUG"
    if args.debug_audio:
        settings.debug_audio = True


async def run_bridge(settings: Settings) -> int:
    """Run the agent bridge.

    Args:
        settings: Configuration settings

    Returns:
        Exit code (0 for success, 1 for error)
    """
    bridge = AgentBridge(settings)
    stop_event = asyncio.Event()

    # Signal handlers
    def handle_signal(sig: signal.Signals) -> None:
        logger.info(f"Received {sig.name}, shutting down...")
        stop_event.set()

    # Register signal handlers
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_signal, sig)

    try:
        # Start bridge
        if not await bridge.start():
            logger.error("Failed to start bridge")
            return 1

        logger.info("Bridge running. Press Ctrl+C to stop.")

        # Print status periodically
        async def status_loop():
            while not stop_event.is_set():
                await asyncio.sleep(5)  # DEBUG: More frequent status updates
                if bridge.is_running:
                    status = bridge.stats.to_dict()
                    logger.info(
                        f"[STATUS] RTP: recv={status['rtp']['packets_received']}, "
                        f"sent={status['rtp']['packets_sent']} | "
                        f"Gemini: to={status['audio']['chunks_to_gemini']}, "
                        f"from={status['audio']['chunks_from_gemini']} | "
                        f"participants={status['participants_seen']}"
                    )

        status_task = asyncio.create_task(status_loop())

        # Wait for stop signal
        await stop_event.wait()

        # Cleanup
        status_task.cancel()
        try:
            await status_task
        except asyncio.CancelledError:
            pass

        await bridge.stop()
        return 0

    except Exception as e:
        logger.exception(f"Bridge error: {e}")
        await bridge.stop()
        return 1

    finally:
        # Remove signal handlers
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.remove_signal_handler(sig)


def main() -> int:
    """Main entry point.

    Returns:
        Exit code
    """
    # Parse arguments
    args = parse_args()

    # Load settings
    settings = get_settings()
    apply_args_to_settings(args, settings)

    # Configure logging
    configure_logging(settings.log_level)

    # Log configuration
    logger.info("VK-Agent starting...")
    logger.info(f"  Janus URL: {settings.janus.websocket_url}")
    logger.info(f"  Room ID: {settings.janus.room_id}")
    logger.info(f"  RTP: {settings.janus.rtp_host}:{settings.janus.rtp_port}")
    logger.info(f"  Gemini Model: {settings.gemini.model}")
    logger.info(f"  Gemini Voice: {settings.gemini.voice}")
    logger.info(f"  Debug Audio: {settings.debug_audio}")

    # Validate
    errors = settings.validate()
    if errors:
        for error in errors:
            logger.error(f"Configuration error: {error}")
        return 1

    # Run
    return asyncio.run(run_bridge(settings))


if __name__ == "__main__":
    sys.exit(main())
