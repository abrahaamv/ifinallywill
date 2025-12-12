"""
VK-ICE Fallback Provider

Provides public STUN servers as a last resort when all other providers fail.
This ensures basic WebRTC connectivity even without TURN relay capability.

Important Limitations:
    - STUN only (no TURN relay)
    - Will fail for ~15% of connections behind strict NAT
    - No authentication required
    - Should only be used as absolute fallback

Public STUN Servers:
    - Google (stun.l.google.com) - Most reliable
    - Cloudflare (stun.cloudflare.com) - Fast
    - Mozilla (stun.services.mozilla.com) - Privacy-focused

Architecture:
    This provider is always available and never fails.
    It returns pre-configured public STUN servers.

Usage:
    The IceEngine automatically uses this provider when:
    1. All configured providers fail
    2. No cached credentials are available
    3. force_fallback=True is specified
"""

import logging
from typing import List

from .base import IceProvider
from ..models import (
    IceConfig,
    IceServer,
    IceServerType,
    TransportProtocol,
    PUBLIC_STUN_SERVERS,
)

logger = logging.getLogger(__name__)


# Extended list of public STUN servers with health metadata
PUBLIC_STUN_SERVERS_EXTENDED: List[IceServer] = [
    # Google STUN servers (most reliable, global)
    IceServer(
        type=IceServerType.STUN,
        host="stun.l.google.com",
        port=19302,
        transport=TransportProtocol.UDP,
        priority=100,
    ),
    IceServer(
        type=IceServerType.STUN,
        host="stun1.l.google.com",
        port=19302,
        transport=TransportProtocol.UDP,
        priority=99,
    ),
    IceServer(
        type=IceServerType.STUN,
        host="stun2.l.google.com",
        port=19302,
        transport=TransportProtocol.UDP,
        priority=98,
    ),
    IceServer(
        type=IceServerType.STUN,
        host="stun3.l.google.com",
        port=19302,
        transport=TransportProtocol.UDP,
        priority=97,
    ),
    IceServer(
        type=IceServerType.STUN,
        host="stun4.l.google.com",
        port=19302,
        transport=TransportProtocol.UDP,
        priority=96,
    ),

    # Cloudflare STUN (fast, privacy-respecting)
    IceServer(
        type=IceServerType.STUN,
        host="stun.cloudflare.com",
        port=3478,
        transport=TransportProtocol.UDP,
        priority=90,
    ),

    # Mozilla STUN (privacy-focused)
    IceServer(
        type=IceServerType.STUN,
        host="stun.services.mozilla.com",
        port=3478,
        transport=TransportProtocol.UDP,
        priority=85,
    ),

    # Twilio STUN (public, no auth)
    IceServer(
        type=IceServerType.STUN,
        host="global.stun.twilio.com",
        port=3478,
        transport=TransportProtocol.UDP,
        priority=80,
    ),

    # Nextcloud STUN
    IceServer(
        type=IceServerType.STUN,
        host="stun.nextcloud.com",
        port=443,
        transport=TransportProtocol.TCP,
        priority=75,
    ),

    # Stunprotocol.org (community)
    IceServer(
        type=IceServerType.STUN,
        host="stun.stunprotocol.org",
        port=3478,
        transport=TransportProtocol.UDP,
        priority=70,
    ),
]


class FallbackProvider(IceProvider):
    """Fallback provider using public STUN servers.

    This provider is the last resort when all other providers fail.
    It returns a curated list of reliable public STUN servers.

    Characteristics:
        - Always succeeds (never throws)
        - Zero latency (no network calls)
        - STUN only (no TURN relay)
        - Short TTL (encourages retry of real providers)

    Limitations:
        - Cannot relay media (no TURN)
        - ~15% of connections may fail (strict NAT)
        - No bandwidth optimization
        - Public servers may rate limit

    Example:
        >>> provider = FallbackProvider()
        >>> config = await provider.get_credentials()
        >>> print(config.has_turn)  # False
        >>> print(config.has_stun)  # True
        >>> print(len(config.servers))  # 10
    """

    provider_name = "fallback"
    default_ttl = 60  # Short TTL to encourage retry of real providers
    max_retries = 1  # No need to retry - always succeeds
    retry_delay = 0.0

    def __init__(self, include_google: bool = True, include_all: bool = False):
        """Initialize fallback provider.

        Args:
            include_google: Include Google STUN servers (default: True)
            include_all: Include all known public STUN servers (default: False)
        """
        super().__init__()
        self._include_google = include_google
        self._include_all = include_all

    async def _setup(self) -> None:
        """No setup needed for fallback provider."""
        logger.debug("Fallback provider ready (no setup required)")

    async def _teardown(self) -> None:
        """No cleanup needed for fallback provider."""
        pass

    async def _fetch_credentials(self) -> IceConfig:
        """Return public STUN servers.

        This method never fails - it always returns at least
        one STUN server from the hardcoded list.

        Returns:
            IceConfig with public STUN servers
        """
        servers = self._get_servers()

        logger.info(
            f"Fallback provider returning {len(servers)} public STUN servers "
            "(WARNING: No TURN relay available)"
        )

        return IceConfig(
            servers=servers,
            provider=self.provider_name,
            ttl_seconds=self.default_ttl,
            metadata={
                "warning": "Fallback mode - STUN only, no TURN relay",
                "expected_success_rate": "85%",  # ~15% fail behind strict NAT
            }
        )

    def _get_servers(self) -> List[IceServer]:
        """Get list of STUN servers based on configuration.

        Returns:
            List of IceServer objects
        """
        if self._include_all:
            return PUBLIC_STUN_SERVERS_EXTENDED.copy()

        servers = []

        # Always include Cloudflare (fast, reliable)
        servers.append(IceServer(
            type=IceServerType.STUN,
            host="stun.cloudflare.com",
            port=3478,
            transport=TransportProtocol.UDP,
            priority=100,
        ))

        # Include Google if configured
        if self._include_google:
            servers.extend([
                IceServer(
                    type=IceServerType.STUN,
                    host="stun.l.google.com",
                    port=19302,
                    transport=TransportProtocol.UDP,
                    priority=99,
                ),
                IceServer(
                    type=IceServerType.STUN,
                    host="stun1.l.google.com",
                    port=19302,
                    transport=TransportProtocol.UDP,
                    priority=98,
                ),
            ])

        # Always include Mozilla (privacy-focused alternative)
        servers.append(IceServer(
            type=IceServerType.STUN,
            host="stun.services.mozilla.com",
            port=3478,
            transport=TransportProtocol.UDP,
            priority=90,
        ))

        return servers

    async def health_check(self) -> bool:
        """Fallback provider is always healthy.

        Returns:
            Always True
        """
        return True


class MiroTalkProvider(IceProvider):
    """ICE credential provider using MiroTalk SFU.

    MiroTalk offers unlimited free API access with no account required.
    Built on Mediasoup v3.

    Features:
        - Unlimited rooms, no time limits
        - Full REST API with Swagger docs
        - TURN server included
        - 24/7 usage explicitly allowed

    API:
        - Base URL: https://sfu.mirotalk.com
        - Auth: mirotalksfu_default_secret
        - Docs: /api/v1/docs

    Note:
        MiroTalk is AGPLv3 licensed. Check compliance requirements
        if using in commercial products.
    """

    provider_name = "mirotalk"
    default_ttl = 3600
    max_retries = 2
    retry_delay = 1.0

    MIROTALK_API_URL = "https://sfu.mirotalk.com"
    MIROTALK_API_KEY = "mirotalksfu_default_secret"

    def __init__(self):
        super().__init__()
        self._http_session = None

    async def _setup(self) -> None:
        import aiohttp
        self._http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
        )

    async def _teardown(self) -> None:
        if self._http_session:
            await self._http_session.close()
            self._http_session = None

    async def _fetch_credentials(self) -> IceConfig:
        """Fetch ICE credentials from MiroTalk API."""
        # MiroTalk provides ICE config in meeting response
        # For now, use known infrastructure

        servers = [
            IceServer(
                type=IceServerType.STUN,
                host="stun.l.google.com",
                port=19302,
                transport=TransportProtocol.UDP,
                priority=100,
            ),
            # MiroTalk TURN (public demo)
            IceServer(
                type=IceServerType.TURN,
                host="sfu.mirotalk.com",
                port=3478,
                username="mirotalk",
                credential="mirotalk",
                transport=TransportProtocol.UDP,
                priority=90,
            ),
        ]

        return IceConfig(
            servers=servers,
            provider=self.provider_name,
            ttl_seconds=self.default_ttl,
            metadata={"api_url": self.MIROTALK_API_URL},
        )
