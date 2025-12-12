"""
VK-ICE Data Models

This module defines all data structures used throughout the VK-ICE service.
Models are designed for:
- Type safety with dataclasses
- JSON serialization for REST API
- Compatibility with WebRTC RTCConfiguration format
- Integration with str0m and other WebRTC libraries

Architecture:
    IceServer → Individual STUN/TURN server configuration
    IceConfig → Collection of servers from a provider
    ProviderHealth → Real-time provider status
    ProviderStats → Aggregate provider metrics
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import json


class IceServerType(Enum):
    """Type of ICE server.

    STUN: Session Traversal Utilities for NAT
        - Used for discovering public IP address
        - No authentication required
        - Stateless, lightweight

    TURN: Traversal Using Relays around NAT
        - Relays media when direct connection fails
        - Requires authentication (username/credential)
        - Stateful, bandwidth-intensive

    TURNS: TURN over TLS
        - TURN with TLS encryption
        - Port 443 (bypasses most firewalls)
        - Higher security, slightly more latency
    """
    STUN = "stun"
    TURN = "turn"
    TURNS = "turns"


class TransportProtocol(Enum):
    """Transport protocol for ICE server connection.

    UDP: User Datagram Protocol (default)
        - Lowest latency
        - May be blocked by some firewalls

    TCP: Transmission Control Protocol
        - Reliable delivery
        - Works through most firewalls

    TLS: Transport Layer Security
        - Encrypted TCP
        - Port 443 (HTTPS port)
        - Best firewall traversal
    """
    UDP = "udp"
    TCP = "tcp"
    TLS = "tls"


class ProviderStatus(Enum):
    """Health status of an ICE credential provider.

    UNKNOWN: Initial state, no health data yet
    HEALTHY: Provider responding normally
    DEGRADED: Some failures, but still functional
    UNHEALTHY: Multiple consecutive failures
    """
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class IceServer:
    """Configuration for a single ICE (STUN/TURN) server.

    This represents one ICE server entry that can be used in
    RTCPeerConnection configuration.

    Attributes:
        type: Server type (STUN, TURN, or TURNS)
        host: Server hostname or IP address
        port: Server port number
        username: Authentication username (TURN only)
        credential: Authentication password (TURN only)
        transport: Transport protocol (UDP, TCP, TLS)
        priority: Server priority (higher = preferred)

    Example:
        >>> server = IceServer(
        ...     type=IceServerType.TURN,
        ...     host="turn.example.com",
        ...     port=3478,
        ...     username="user123",
        ...     credential="pass456",
        ...     transport=TransportProtocol.UDP
        ... )
        >>> server.url
        'turn:turn.example.com:3478?transport=udp'
    """
    type: IceServerType
    host: str
    port: int
    username: Optional[str] = None
    credential: Optional[str] = None
    transport: TransportProtocol = TransportProtocol.UDP
    priority: int = 0

    @property
    def url(self) -> str:
        """Standard RTCIceServer URL format.

        Format: {type}:{host}:{port}[?transport={transport}]

        Examples:
            - stun:stun.l.google.com:19302
            - turn:turn.example.com:3478?transport=udp
            - turns:turn.example.com:5349
        """
        base = f"{self.type.value}:{self.host}:{self.port}"

        # Add transport for TURN servers (not needed for STUN)
        if self.type in (IceServerType.TURN, IceServerType.TURNS):
            if self.transport != TransportProtocol.TLS:
                base += f"?transport={self.transport.value}"

        return base

    @property
    def url_with_credentials(self) -> str:
        """URL with embedded credentials (str0m format).

        Format: {type}:{username}:{credential}@{host}:{port}

        Used by str0m and some server-side WebRTC libraries.
        WARNING: Do not expose this in client-facing APIs.
        """
        if self.username and self.credential:
            return f"{self.type.value}:{self.username}:{self.credential}@{self.host}:{self.port}"
        return self.url

    @property
    def is_turn(self) -> bool:
        """Check if this is a TURN/TURNS server (relay capable)."""
        return self.type in (IceServerType.TURN, IceServerType.TURNS)

    @property
    def is_stun(self) -> bool:
        """Check if this is a STUN server."""
        return self.type == IceServerType.STUN

    def to_dict(self) -> dict:
        """Convert to RTCIceServer dictionary format.

        This format is compatible with browser RTCPeerConnection
        and most WebRTC libraries.

        Returns:
            Dictionary with 'urls' and optional 'username'/'credential'
        """
        result = {"urls": [self.url]}

        if self.username:
            result["username"] = self.username
        if self.credential:
            result["credential"] = self.credential

        return result

    @classmethod
    def from_url(cls, url: str, username: str = None, credential: str = None) -> "IceServer":
        """Parse an ICE server from URL string.

        Args:
            url: ICE server URL (e.g., 'turn:host:port?transport=udp')
            username: Optional authentication username
            credential: Optional authentication credential

        Returns:
            Parsed IceServer instance
        """
        # Parse protocol
        if url.startswith("turns:"):
            server_type = IceServerType.TURNS
            url = url[6:]
        elif url.startswith("turn:"):
            server_type = IceServerType.TURN
            url = url[5:]
        elif url.startswith("stun:"):
            server_type = IceServerType.STUN
            url = url[5:]
        else:
            raise ValueError(f"Invalid ICE URL format: {url}")

        # Parse transport
        transport = TransportProtocol.UDP
        if "?transport=" in url:
            url, transport_str = url.split("?transport=")
            transport = TransportProtocol(transport_str.lower())

        # Parse host:port
        if ":" in url:
            host, port_str = url.rsplit(":", 1)
            port = int(port_str)
        else:
            host = url
            port = 3478 if server_type == IceServerType.TURN else 19302

        return cls(
            type=server_type,
            host=host,
            port=port,
            username=username,
            credential=credential,
            transport=transport,
        )


@dataclass
class IceConfig:
    """Complete ICE configuration from a provider.

    Contains all STUN/TURN servers returned by a provider,
    along with metadata about the credentials.

    Attributes:
        servers: List of ICE servers
        provider: Name of the provider that returned these credentials
        fetched_at: When credentials were fetched
        ttl_seconds: How long credentials are valid (typically 3600)
        metadata: Additional provider-specific data

    Example:
        >>> config = await engine.get_credentials()
        >>> config.has_turn
        True
        >>> config.remaining_ttl
        3550
        >>> rtc_config = config.to_rtc_configuration()
    """
    servers: list[IceServer]
    provider: str
    fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ttl_seconds: int = 3600
    metadata: dict = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        """Check if credentials have exceeded TTL."""
        age = (datetime.now(timezone.utc) - self.fetched_at).total_seconds()
        return age >= self.ttl_seconds

    @property
    def remaining_ttl(self) -> int:
        """Seconds until credentials expire (0 if expired)."""
        age = (datetime.now(timezone.utc) - self.fetched_at).total_seconds()
        remaining = self.ttl_seconds - age
        return max(0, int(remaining))

    @property
    def age_seconds(self) -> float:
        """How old these credentials are in seconds."""
        return (datetime.now(timezone.utc) - self.fetched_at).total_seconds()

    @property
    def stun_servers(self) -> list[IceServer]:
        """Filter for STUN servers only."""
        return [s for s in self.servers if s.is_stun]

    @property
    def turn_servers(self) -> list[IceServer]:
        """Filter for TURN/TURNS servers only."""
        return [s for s in self.servers if s.is_turn]

    @property
    def has_turn(self) -> bool:
        """Check if configuration includes TURN relay servers.

        TURN servers are critical for NAT traversal when direct
        peer-to-peer connection is not possible.
        """
        return any(s.is_turn for s in self.servers)

    @property
    def has_stun(self) -> bool:
        """Check if configuration includes STUN servers."""
        return any(s.is_stun for s in self.servers)

    def to_rtc_configuration(self) -> dict:
        """Convert to RTCPeerConnection configuration format.

        This is the format expected by browser WebRTC APIs and
        most JavaScript WebRTC libraries.

        Returns:
            Dictionary with 'iceServers' array

        Example:
            {
                "iceServers": [
                    {"urls": ["stun:stun.example.com:19302"]},
                    {
                        "urls": ["turn:turn.example.com:3478"],
                        "username": "user",
                        "credential": "pass"
                    }
                ]
            }
        """
        return {
            "iceServers": [server.to_dict() for server in self.servers]
        }

    def to_str0m_config(self) -> list[str]:
        """Convert to str0m WebRTC library format.

        str0m uses URL strings with embedded credentials.

        Returns:
            List of ICE server URL strings
        """
        return [server.url_with_credentials for server in self.servers]

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "servers": [s.to_dict() for s in self.servers],
            "provider": self.provider,
            "fetched_at": self.fetched_at.isoformat(),
            "ttl_seconds": self.ttl_seconds,
            "remaining_ttl": self.remaining_ttl,
            "has_turn": self.has_turn,
            "has_stun": self.has_stun,
            "metadata": self.metadata,
        }

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> "IceConfig":
        """Create IceConfig from dictionary."""
        servers = []
        for s in data.get("servers", []):
            urls = s.get("urls", [])
            if urls:
                server = IceServer.from_url(
                    urls[0],
                    username=s.get("username"),
                    credential=s.get("credential"),
                )
                servers.append(server)

        fetched_at = data.get("fetched_at")
        if isinstance(fetched_at, str):
            fetched_at = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
        elif fetched_at is None:
            fetched_at = datetime.now(timezone.utc)

        return cls(
            servers=servers,
            provider=data.get("provider", "unknown"),
            fetched_at=fetched_at,
            ttl_seconds=data.get("ttl_seconds", 3600),
            metadata=data.get("metadata", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "IceConfig":
        """Deserialize from JSON string."""
        return cls.from_dict(json.loads(json_str))

    def merge_with(self, other: "IceConfig") -> "IceConfig":
        """Merge with another IceConfig, deduplicating servers.

        Useful for redundant credential retrieval from multiple providers.

        Args:
            other: Another IceConfig to merge with

        Returns:
            New IceConfig with combined, deduplicated servers
        """
        seen_urls = set()
        merged_servers = []

        for server in self.servers + other.servers:
            if server.url not in seen_urls:
                seen_urls.add(server.url)
                merged_servers.append(server)

        return IceConfig(
            servers=merged_servers,
            provider=f"{self.provider}+{other.provider}",
            ttl_seconds=min(self.ttl_seconds, other.ttl_seconds),
            metadata={"merged_from": [self.provider, other.provider]},
        )


@dataclass
class ProviderHealth:
    """Health status of an ICE credential provider.

    Tracks recent performance and availability to enable
    intelligent failover decisions.

    Attributes:
        provider_name: Identifier of the provider
        status: Current health status
        last_check: When health was last evaluated
        last_success: When credentials were last successfully fetched
        last_error: Error message from most recent failure
        consecutive_failures: Number of failures in a row
        average_latency_ms: Exponential moving average of fetch latency
    """
    provider_name: str
    status: ProviderStatus = ProviderStatus.UNKNOWN
    last_check: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    average_latency_ms: float = 0.0

    def record_success(self, latency_ms: float) -> None:
        """Record a successful credential fetch.

        Args:
            latency_ms: Time taken to fetch credentials
        """
        now = datetime.now(timezone.utc)
        self.last_check = now
        self.last_success = now
        self.last_error = None
        self.consecutive_failures = 0

        # Exponential moving average (alpha=0.3)
        if self.average_latency_ms == 0:
            self.average_latency_ms = latency_ms
        else:
            self.average_latency_ms = 0.3 * latency_ms + 0.7 * self.average_latency_ms

        self._update_status()

    def record_failure(self, error: str) -> None:
        """Record a failed credential fetch.

        Args:
            error: Error message describing the failure
        """
        self.last_check = datetime.now(timezone.utc)
        self.last_error = error
        self.consecutive_failures += 1
        self._update_status()

    def _update_status(self) -> None:
        """Update health status based on recent history."""
        if self.consecutive_failures == 0:
            self.status = ProviderStatus.HEALTHY
        elif self.consecutive_failures < 3:
            self.status = ProviderStatus.DEGRADED
        else:
            self.status = ProviderStatus.UNHEALTHY

    @property
    def is_healthy(self) -> bool:
        """Check if provider is in healthy or degraded state."""
        return self.status in (ProviderStatus.HEALTHY, ProviderStatus.DEGRADED)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "provider": self.provider_name,
            "status": self.status.value,
            "is_healthy": self.is_healthy,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_error": self.last_error,
            "consecutive_failures": self.consecutive_failures,
            "average_latency_ms": round(self.average_latency_ms, 2),
        }


@dataclass
class ProviderStats:
    """Aggregate statistics for a provider.

    Tracks lifetime metrics for monitoring and debugging.

    Attributes:
        provider_name: Identifier of the provider
        total_requests: Total number of fetch attempts
        successful_requests: Number of successful fetches
        failed_requests: Number of failed fetches
        total_latency_ms: Sum of all successful fetch latencies
        credentials_served: Total number of servers returned
    """
    provider_name: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_latency_ms: float = 0.0
    credentials_served: int = 0

    @property
    def success_rate(self) -> float:
        """Calculate success rate as a percentage (0.0 to 1.0)."""
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests

    @property
    def average_latency_ms(self) -> float:
        """Calculate average latency for successful requests."""
        if self.successful_requests == 0:
            return 0.0
        return self.total_latency_ms / self.successful_requests

    def record_success(self, latency_ms: float, server_count: int) -> None:
        """Record a successful fetch.

        Args:
            latency_ms: Time taken to fetch
            server_count: Number of servers returned
        """
        self.total_requests += 1
        self.successful_requests += 1
        self.total_latency_ms += latency_ms
        self.credentials_served += server_count

    def record_failure(self) -> None:
        """Record a failed fetch."""
        self.total_requests += 1
        self.failed_requests += 1

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "provider": self.provider_name,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": round(self.success_rate, 4),
            "average_latency_ms": round(self.average_latency_ms, 2),
            "credentials_served": self.credentials_served,
        }


# Pre-defined public STUN servers (fallback)
PUBLIC_STUN_SERVERS: list[IceServer] = [
    IceServer(type=IceServerType.STUN, host="stun.l.google.com", port=19302),
    IceServer(type=IceServerType.STUN, host="stun1.l.google.com", port=19302),
    IceServer(type=IceServerType.STUN, host="stun2.l.google.com", port=19302),
    IceServer(type=IceServerType.STUN, host="stun.cloudflare.com", port=3478),
]

# Fallback configuration when all providers fail
FALLBACK_CONFIG = IceConfig(
    servers=PUBLIC_STUN_SERVERS,
    provider="fallback",
    ttl_seconds=60,  # Short TTL to force retry
    metadata={"warning": "All providers failed, using public STUN only"},
)
