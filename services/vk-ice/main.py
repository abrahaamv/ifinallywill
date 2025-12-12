#!/usr/bin/env python3
"""
VK-ICE Service Entry Point

Starts the VK-ICE FastAPI server for ICE credential management.

Usage:
    # Development
    python -m vk_ice.main

    # Production (with uvicorn)
    uvicorn vk_ice.api:app --host 0.0.0.0 --port 3003 --workers 4

    # With environment variables
    VK_ICE_PORT=3003 VK_ICE_LOG_LEVEL=INFO python -m vk_ice.main

Environment Variables:
    VK_ICE_HOST         - Host to bind (default: 0.0.0.0)
    VK_ICE_PORT         - Port to bind (default: 3003)
    VK_ICE_LOG_LEVEL    - Log level (default: INFO)
    VK_ICE_PROVIDERS    - Comma-separated provider list (default: 8x8,kmeet,fallback)
    VK_ICE_CACHE_TTL    - Cache TTL in seconds (default: 3600)
    VK_ICE_WORKERS      - Number of workers (default: 1)
"""

import os
import sys
import logging
import asyncio
from pathlib import Path

import uvicorn

from .config import settings, configure_logging
from .api import create_app
from .engine import IceEngine


def main():
    """Main entry point."""
    # Configure logging
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    logger.info(f"Starting VK-ICE Service v{settings.version}")
    logger.info(f"Host: {settings.host}:{settings.port}")
    logger.info(f"Providers: {settings.providers}")
    logger.info(f"Cache TTL: {settings.cache_ttl}s")

    # Create and run app
    app = create_app()

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        workers=settings.workers if settings.workers > 1 else None,
        log_level=settings.log_level.lower(),
        access_log=True,
    )


async def async_main():
    """Async main for programmatic use."""
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    engine = IceEngine(
        providers=settings.providers,
        cache_ttl=settings.cache_ttl,
    )

    async with engine:
        logger.info("IceEngine started")

        # Keep running
        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            logger.info("Shutdown requested")


def cli():
    """CLI entry point with argument parsing."""
    import argparse

    parser = argparse.ArgumentParser(
        description="VK-ICE - VisualKit ICE Credential Service",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Start server
    vk-ice

    # Start with custom port
    vk-ice --port 8080

    # Start with specific providers
    vk-ice --providers 8x8,fallback

    # Get credentials (CLI mode)
    vk-ice get --provider 8x8

    # Health check
    vk-ice health
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Server command (default)
    server_parser = subparsers.add_parser("serve", help="Start the API server")
    server_parser.add_argument("--host", default=settings.host, help="Host to bind")
    server_parser.add_argument("--port", type=int, default=settings.port, help="Port to bind")
    server_parser.add_argument("--workers", type=int, default=1, help="Number of workers")
    server_parser.add_argument("--providers", help="Comma-separated provider list")

    # Get credentials command
    get_parser = subparsers.add_parser("get", help="Get ICE credentials")
    get_parser.add_argument("--provider", help="Specific provider to use")
    get_parser.add_argument("--format", choices=["json", "rtc"], default="json", help="Output format")

    # Health check command
    subparsers.add_parser("health", help="Check provider health")

    # Version command
    subparsers.add_parser("version", help="Show version")

    args = parser.parse_args()

    if args.command == "version":
        print(f"VK-ICE v{settings.version}")
        sys.exit(0)

    elif args.command == "get":
        asyncio.run(_cli_get_credentials(args))

    elif args.command == "health":
        asyncio.run(_cli_health_check())

    elif args.command == "serve" or args.command is None:
        # Update settings from args
        if hasattr(args, "host") and args.host:
            settings.host = args.host
        if hasattr(args, "port") and args.port:
            settings.port = args.port
        if hasattr(args, "providers") and args.providers:
            settings.providers = args.providers.split(",")

        main()


async def _cli_get_credentials(args):
    """CLI command to get credentials."""
    import json

    configure_logging("WARNING")

    engine = IceEngine(providers=settings.providers)
    await engine.start()

    try:
        config = await engine.get_credentials(provider=args.provider)

        if args.format == "rtc":
            output = config.to_rtc_configuration()
        else:
            output = config.to_dict()

        print(json.dumps(output, indent=2))

    finally:
        await engine.stop()


async def _cli_health_check():
    """CLI command for health check."""
    import json

    configure_logging("WARNING")

    engine = IceEngine(providers=settings.providers)
    await engine.start()

    try:
        health = await engine.health_check()
        print(json.dumps(health, indent=2))

    finally:
        await engine.stop()


if __name__ == "__main__":
    cli()
