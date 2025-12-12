"""
VK-ICE Credential Providers

This module contains implementations of ICE credential providers.
Each provider knows how to extract TURN/STUN credentials from
a specific source (8x8/Brave Talk, KMeet, etc.).

Provider Architecture:
    ┌─────────────────────────────────────────────────────────┐
    │                   IceProvider (ABC)                      │
    │  - provider_name: str                                    │
    │  - default_ttl: int                                      │
    │  - get_credentials() → IceConfig                         │
    │  - health_check() → bool                                 │
    └─────────────────────────────────────────────────────────┘
                              ▲
                ┌─────────────┼─────────────┐
                │             │             │
    ┌───────────┴───┐ ┌───────┴───────┐ ┌───┴───────────┐
    │ X8x8Provider  │ │ KMeetProvider │ │FallbackProvider│
    │ (Brave Talk)  │ │ (EU Backup)   │ │(Public STUN)  │
    │ XEP-0215      │ │ XEP-0215      │ │ No auth       │
    └───────────────┘ └───────────────┘ └───────────────┘

Available Providers:
    - X8x8Provider: Primary provider using 8x8 JaaS via Brave Talk
    - KMeetProvider: EU-based backup provider
    - FallbackProvider: Public STUN servers (last resort)
"""

from .base import IceProvider
from .x8x8 import X8x8Provider
from .kmeet import KMeetProvider
from .fallback import FallbackProvider

# Provider registry for dynamic instantiation
PROVIDER_REGISTRY = {
    "8x8": X8x8Provider,
    "kmeet": KMeetProvider,
    "fallback": FallbackProvider,
}

# Default provider priority (first = highest priority)
DEFAULT_PROVIDER_ORDER = ["8x8", "kmeet", "fallback"]

__all__ = [
    "IceProvider",
    "X8x8Provider",
    "KMeetProvider",
    "FallbackProvider",
    "PROVIDER_REGISTRY",
    "DEFAULT_PROVIDER_ORDER",
]
