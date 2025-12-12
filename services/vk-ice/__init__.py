"""
VK-ICE: VisualKit ICE Credential Service

A production-grade TURN/STUN credential extraction and management service
that provides free WebRTC ICE credentials from multiple providers.

Key Features:
- Multi-provider support (8x8/Brave Talk, KMeet, public STUN)
- Automatic failover between providers
- TTL-based credential caching
- Health monitoring and statistics
- REST API for platform integration

Usage:
    from vk_ice import IceEngine

    engine = IceEngine()
    await engine.start()

    # Get credentials with automatic failover
    config = await engine.get_credentials()

    # Use with WebRTC
    rtc_config = config.to_rtc_configuration()

Author: VisualKit Team
License: Proprietary
"""

__version__ = "1.0.0"
__author__ = "VisualKit Team"

from .engine import IceEngine
from .models import (
    IceServer,
    IceConfig,
    IceServerType,
    TransportProtocol,
    ProviderHealth,
    ProviderStatus,
    ProviderStats,
)
from .cache import IceCredentialCache

__all__ = [
    "IceEngine",
    "IceServer",
    "IceConfig",
    "IceServerType",
    "TransportProtocol",
    "ProviderHealth",
    "ProviderStatus",
    "ProviderStats",
    "IceCredentialCache",
]
