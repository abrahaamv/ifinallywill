"""
VK-ICE Configuration

Centralized configuration management using environment variables
with sensible defaults.

Environment Variables:
    VK_ICE_HOST         - Server host (default: 0.0.0.0)
    VK_ICE_PORT         - Server port (default: 3003)
    VK_ICE_LOG_LEVEL    - Logging level (default: INFO)
    VK_ICE_PROVIDERS    - Comma-separated providers (default: 8x8,kmeet,fallback)
    VK_ICE_CACHE_TTL    - Cache TTL in seconds (default: 3600)
    VK_ICE_WORKERS      - Number of workers (default: 1)

    # Provider-specific
    VK_ICE_8X8_TENANT   - 8x8 tenant ID (default: auto)
    VK_ICE_KMEET_HOST   - KMeet host (default: kmeet.infomaniak.com)
"""

import os
import logging
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Settings:
    """Application settings."""

    # Server
    host: str = field(default_factory=lambda: os.getenv("VK_ICE_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("VK_ICE_PORT", "3003")))
    workers: int = field(default_factory=lambda: int(os.getenv("VK_ICE_WORKERS", "1")))

    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("VK_ICE_LOG_LEVEL", "INFO"))
    log_format: str = field(
        default_factory=lambda: os.getenv(
            "VK_ICE_LOG_FORMAT",
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    )

    # Cache
    cache_ttl: int = field(default_factory=lambda: int(os.getenv("VK_ICE_CACHE_TTL", "3600")))
    cache_refresh_before: int = field(
        default_factory=lambda: int(os.getenv("VK_ICE_CACHE_REFRESH_BEFORE", "300"))
    )

    # Providers
    providers: List[str] = field(
        default_factory=lambda: os.getenv(
            "VK_ICE_PROVIDERS", "8x8,kmeet,fallback"
        ).split(",")
    )

    # Failover
    failover_delay: float = field(
        default_factory=lambda: float(os.getenv("VK_ICE_FAILOVER_DELAY", "0.5"))
    )
    max_retries: int = field(
        default_factory=lambda: int(os.getenv("VK_ICE_MAX_RETRIES", "3"))
    )

    # 8x8 Provider
    x8x8_tenant: str = field(
        default_factory=lambda: os.getenv(
            "VK_ICE_8X8_TENANT",
            "vpaas-magic-cookie-a4818bd762a044998d717b70ac734cfe"
        )
    )
    x8x8_api_base: str = field(
        default_factory=lambda: os.getenv(
            "VK_ICE_8X8_API_BASE",
            "https://api.nicholasgriffin.workers.dev"
        )
    )

    # KMeet Provider
    kmeet_host: str = field(
        default_factory=lambda: os.getenv("VK_ICE_KMEET_HOST", "kmeet.infomaniak.com")
    )

    # Version
    version: str = "1.0.0"

    def __post_init__(self):
        """Validate settings after initialization."""
        # Ensure providers is a list
        if isinstance(self.providers, str):
            self.providers = self.providers.split(",")

        # Validate log level
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.log_level.upper() not in valid_levels:
            self.log_level = "INFO"
        else:
            self.log_level = self.log_level.upper()

        # Validate port range
        if not 1 <= self.port <= 65535:
            self.port = 3003


# Global settings instance
settings = Settings()


def configure_logging(level: str = None) -> None:
    """Configure application logging.

    Args:
        level: Log level override (default: from settings)
    """
    log_level = level or settings.log_level

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=settings.log_format,
    )

    # Set specific loggers
    logging.getLogger("vk_ice").setLevel(getattr(logging, log_level.upper()))

    # Reduce noise from third-party libraries
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)


def get_settings() -> Settings:
    """Get settings instance (for dependency injection)."""
    return settings
