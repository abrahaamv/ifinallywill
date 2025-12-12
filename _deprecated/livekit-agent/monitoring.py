"""
Metrics Collection and Monitoring
Tracks performance metrics and exports to Prometheus format
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RequestMetrics:
    """Metrics for a single request"""
    timestamp: float
    tenant_id: str
    model: str
    input_tokens: int
    output_tokens: int
    cost: float
    latency_ms: float
    success: bool
    error: Optional[str] = None


@dataclass
class FrameMetrics:
    """Metrics for frame processing"""
    total_frames: int = 0
    processed_frames: int = 0
    skipped_frames: int = 0
    deduplication_rate: float = 0.0
    avg_processing_time_ms: float = 0.0


class MetricsCollector:
    """
    Centralized metrics collection for monitoring

    Tracks:
    - AI request counts by model and tenant
    - Token usage and costs
    - Frame processing statistics
    - Latency and error rates
    - Rate limiting events

    Export formats:
    - Prometheus exposition format
    - JSON for backend API
    - Structured logs
    """

    def __init__(self):
        """Initialize metrics collector"""
        # Request counters
        self.request_count: dict[str, int] = defaultdict(int)
        self.error_count: dict[str, int] = defaultdict(int)

        # Token usage
        self.total_tokens: dict[str, int] = defaultdict(int)
        self.total_cost: dict[str, float] = defaultdict(float)

        # Latency tracking
        self.latencies: dict[str, list[float]] = defaultdict(list)
        self.max_latency_samples = 1000  # Keep last 1000 samples per model

        # Frame processing
        self.frame_metrics = FrameMetrics()

        # Rate limiting
        self.rate_limit_hits: dict[str, int] = defaultdict(int)

        # Start time for uptime calculation
        self.start_time = time.time()

        logger.info("Metrics collector initialized")

    def record_request(
        self,
        tenant_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost: float,
        latency_ms: float,
        success: bool = True,
        error: Optional[str] = None
    ):
        """
        Record AI request metrics

        Args:
            tenant_id: Tenant identifier
            model: Model name
            input_tokens: Input tokens used
            output_tokens: Output tokens used
            cost: Estimated cost in USD
            latency_ms: Request latency in milliseconds
            success: Whether request succeeded
            error: Error message if failed
        """
        # Key format: tenant_id:model
        key = f"{tenant_id}:{model}"

        # Increment counters
        self.request_count[key] += 1
        if not success:
            self.error_count[key] += 1

        # Track tokens and cost
        total_tokens = input_tokens + output_tokens
        self.total_tokens[key] += total_tokens
        self.total_cost[key] += cost

        # Track latency
        if len(self.latencies[key]) >= self.max_latency_samples:
            # Remove oldest sample
            self.latencies[key].pop(0)
        self.latencies[key].append(latency_ms)

        logger.debug(
            f"Request recorded: {key}, "
            f"tokens: {total_tokens}, "
            f"cost: ${cost:.6f}, "
            f"latency: {latency_ms:.1f}ms, "
            f"success: {success}"
        )

    def record_frame_processing(
        self,
        total_frames: int,
        processed_frames: int,
        skipped_frames: int,
        processing_time_ms: float
    ):
        """
        Record frame processing metrics

        Args:
            total_frames: Total frames received
            processed_frames: Frames processed
            skipped_frames: Frames skipped (deduplication)
            processing_time_ms: Average processing time per frame
        """
        self.frame_metrics.total_frames = total_frames
        self.frame_metrics.processed_frames = processed_frames
        self.frame_metrics.skipped_frames = skipped_frames

        if total_frames > 0:
            self.frame_metrics.deduplication_rate = (skipped_frames / total_frames) * 100

        self.frame_metrics.avg_processing_time_ms = processing_time_ms

        logger.debug(
            f"Frame metrics: {processed_frames}/{total_frames} processed, "
            f"{self.frame_metrics.deduplication_rate:.1f}% deduplication"
        )

    def record_rate_limit_hit(self, tenant_id: str):
        """
        Record rate limit hit

        Args:
            tenant_id: Tenant identifier
        """
        self.rate_limit_hits[tenant_id] += 1
        logger.warning(f"Rate limit hit recorded for tenant: {tenant_id}")

    def get_summary(self) -> dict:
        """
        Get metrics summary

        Returns:
            Dictionary with aggregated metrics
        """
        uptime_seconds = time.time() - self.start_time

        # Aggregate by tenant
        tenant_stats = defaultdict(lambda: {
            "requests": 0,
            "errors": 0,
            "tokens": 0,
            "cost": 0.0
        })

        for key in self.request_count.keys():
            tenant_id, model = key.split(":", 1)
            tenant_stats[tenant_id]["requests"] += self.request_count[key]
            tenant_stats[tenant_id]["errors"] += self.error_count[key]
            tenant_stats[tenant_id]["tokens"] += self.total_tokens[key]
            tenant_stats[tenant_id]["cost"] += self.total_cost[key]

        # Calculate average latencies
        avg_latencies = {}
        for key, latencies in self.latencies.items():
            if latencies:
                avg_latencies[key] = sum(latencies) / len(latencies)

        return {
            "uptime_seconds": uptime_seconds,
            "total_requests": sum(self.request_count.values()),
            "total_errors": sum(self.error_count.values()),
            "total_tokens": sum(self.total_tokens.values()),
            "total_cost": sum(self.total_cost.values()),
            "tenant_stats": dict(tenant_stats),
            "avg_latencies": avg_latencies,
            "frame_processing": {
                "total_frames": self.frame_metrics.total_frames,
                "processed_frames": self.frame_metrics.processed_frames,
                "skipped_frames": self.frame_metrics.skipped_frames,
                "deduplication_rate": f"{self.frame_metrics.deduplication_rate:.1f}%",
                "avg_processing_time_ms": self.frame_metrics.avg_processing_time_ms
            },
            "rate_limit_hits": dict(self.rate_limit_hits)
        }

    def export_prometheus(self) -> str:
        """
        Export metrics in Prometheus exposition format

        Returns:
            Prometheus-formatted metrics string
        """
        lines = []

        # Request counts
        lines.append("# HELP ai_requests_total Total AI requests by tenant and model")
        lines.append("# TYPE ai_requests_total counter")
        for key, count in self.request_count.items():
            tenant_id, model = key.split(":", 1)
            lines.append(
                f'ai_requests_total{{tenant_id="{tenant_id}",model="{model}"}} {count}'
            )

        # Error counts
        lines.append("\n# HELP ai_errors_total Total AI errors by tenant and model")
        lines.append("# TYPE ai_errors_total counter")
        for key, count in self.error_count.items():
            tenant_id, model = key.split(":", 1)
            lines.append(
                f'ai_errors_total{{tenant_id="{tenant_id}",model="{model}"}} {count}'
            )

        # Token usage
        lines.append("\n# HELP ai_tokens_total Total tokens used by tenant and model")
        lines.append("# TYPE ai_tokens_total counter")
        for key, tokens in self.total_tokens.items():
            tenant_id, model = key.split(":", 1)
            lines.append(
                f'ai_tokens_total{{tenant_id="{tenant_id}",model="{model}"}} {tokens}'
            )

        # Cost
        lines.append("\n# HELP ai_cost_total Total cost in USD by tenant and model")
        lines.append("# TYPE ai_cost_total counter")
        for key, cost in self.total_cost.items():
            tenant_id, model = key.split(":", 1)
            lines.append(
                f'ai_cost_total{{tenant_id="{tenant_id}",model="{model}"}} {cost:.6f}'
            )

        # Latency (average)
        lines.append("\n# HELP ai_latency_ms Average request latency in milliseconds")
        lines.append("# TYPE ai_latency_ms gauge")
        for key, latencies in self.latencies.items():
            if latencies:
                tenant_id, model = key.split(":", 1)
                avg_latency = sum(latencies) / len(latencies)
                lines.append(
                    f'ai_latency_ms{{tenant_id="{tenant_id}",model="{model}"}} {avg_latency:.2f}'
                )

        # Frame processing
        lines.append("\n# HELP frame_processing_total Total frames by status")
        lines.append("# TYPE frame_processing_total counter")
        lines.append(f'frame_processing_total{{status="total"}} {self.frame_metrics.total_frames}')
        lines.append(f'frame_processing_total{{status="processed"}} {self.frame_metrics.processed_frames}')
        lines.append(f'frame_processing_total{{status="skipped"}} {self.frame_metrics.skipped_frames}')

        lines.append("\n# HELP frame_deduplication_rate Frame deduplication rate percentage")
        lines.append("# TYPE frame_deduplication_rate gauge")
        lines.append(f'frame_deduplication_rate {self.frame_metrics.deduplication_rate:.2f}')

        # Rate limiting
        lines.append("\n# HELP rate_limit_hits_total Rate limit hits by tenant")
        lines.append("# TYPE rate_limit_hits_total counter")
        for tenant_id, hits in self.rate_limit_hits.items():
            lines.append(f'rate_limit_hits_total{{tenant_id="{tenant_id}"}} {hits}')

        # Uptime
        uptime = time.time() - self.start_time
        lines.append("\n# HELP agent_uptime_seconds Agent uptime in seconds")
        lines.append("# TYPE agent_uptime_seconds gauge")
        lines.append(f'agent_uptime_seconds {uptime:.0f}')

        return "\n".join(lines)

    def reset(self):
        """Reset all metrics (for testing)"""
        self.request_count.clear()
        self.error_count.clear()
        self.total_tokens.clear()
        self.total_cost.clear()
        self.latencies.clear()
        self.frame_metrics = FrameMetrics()
        self.rate_limit_hits.clear()
        self.start_time = time.time()
        logger.info("Metrics reset")


# Global singleton instance
metrics_collector = MetricsCollector()


# Export convenience functions
def record_request(*args, **kwargs):
    """Record AI request metrics"""
    metrics_collector.record_request(*args, **kwargs)


def record_frame_processing(*args, **kwargs):
    """Record frame processing metrics"""
    metrics_collector.record_frame_processing(*args, **kwargs)


def record_rate_limit_hit(*args, **kwargs):
    """Record rate limit hit"""
    metrics_collector.record_rate_limit_hit(*args, **kwargs)


def get_summary() -> dict:
    """Get metrics summary"""
    return metrics_collector.get_summary()


def export_prometheus() -> str:
    """Export Prometheus metrics"""
    return metrics_collector.export_prometheus()
