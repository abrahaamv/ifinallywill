#!/usr/bin/env python3
"""
Agent Monitoring & Observability
================================

Production logging and monitoring aligned with 11-OBSERVABILITY.md.
Provides structured logging, performance metrics, and error tracking.
"""

import logging
import sys
import time
from typing import Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
from contextlib import contextmanager

# Configure root logger for the agent
def setup_monitoring(
    log_level: str = "INFO",
    log_format: str = "json",
    enable_performance_tracking: bool = True
) -> logging.Logger:
    """
    Setup centralized monitoring for the agent

    Aligned with 11-OBSERVABILITY.md:
    - Structured logging with context
    - Performance metrics tracking
    - Error tracking and alerting
    - Production-ready observability
    """

    # Create root logger
    logger = logging.getLogger("livekit-agent")
    logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers
    logger.handlers.clear()

    # Console handler with appropriate formatting
    console_handler = logging.StreamHandler(sys.stdout)

    if log_format == "json":
        # Structured JSON logging for production
        formatter = JSONFormatter()
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Log startup
    logger.info("Agent monitoring initialized", extra={
        "log_level": log_level,
        "log_format": log_format,
        "performance_tracking": enable_performance_tracking
    })

    return logger


class JSONFormatter(logging.Formatter):
    """
    JSON log formatter for structured logging

    Outputs logs in JSON format for easy parsing by log aggregation systems
    (Prometheus, Grafana, ELK stack, etc.)
    """

    def format(self, record: logging.LogRecord) -> str:
        import json

        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "tenant_id"):
            log_data["tenant_id"] = record.tenant_id
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        if hasattr(record, "room_name"):
            log_data["room_name"] = record.room_name

        # Add any custom fields from extra parameter
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName',
                          'levelname', 'lineno', 'module', 'msecs', 'message',
                          'pathname', 'process', 'processName', 'relativeCreated',
                          'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info']:
                if not key.startswith('_'):
                    log_data[key] = value

        return json.dumps(log_data)


@dataclass
class PerformanceMetrics:
    """
    Performance metrics tracking for agent operations

    Tracks timing, resource usage, and operation counts
    for monitoring and optimization.
    """

    operation: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def complete(self, **metadata):
        """Mark operation complete and calculate duration"""
        self.end_time = time.time()
        self.duration_ms = (self.end_time - self.start_time) * 1000
        self.metadata.update(metadata)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging"""
        return {
            "operation": self.operation,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata
        }


@contextmanager
def track_performance(logger: logging.Logger, operation: str, **metadata):
    """
    Context manager for tracking operation performance

    Usage:
        with track_performance(logger, "vision_api_call", frames=5):
            result = await call_vision_api(frames)
    """

    metrics = PerformanceMetrics(operation=operation, metadata=metadata)

    try:
        yield metrics
    finally:
        metrics.complete()

        # Log performance metrics
        logger.info(
            f"Performance: {operation}",
            extra={
                "performance": metrics.to_dict(),
                **metadata
            }
        )

        # Warn on slow operations (>1000ms)
        if metrics.duration_ms and metrics.duration_ms > 1000:
            logger.warning(
                f"Slow operation detected: {operation}",
                extra={
                    "duration_ms": metrics.duration_ms,
                    "threshold_ms": 1000,
                    **metadata
                }
            )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module

    Usage:
        logger = get_logger(__name__)
        logger.info("Module started")
    """
    return logging.getLogger(f"livekit-agent.{name}")


class AgentMetrics:
    """
    Agent-wide metrics tracking

    Provides counters and gauges for monitoring agent health:
    - Session counts
    - API call counts
    - Error rates
    - Resource usage
    """

    def __init__(self):
        self.sessions_started = 0
        self.sessions_ended = 0
        self.api_calls = {
            "vision": 0,
            "llm": 0,
            "stt": 0,
            "tts": 0,
            "knowledge": 0
        }
        self.errors = {
            "vision": 0,
            "llm": 0,
            "stt": 0,
            "tts": 0,
            "knowledge": 0,
            "backend": 0
        }
        self.total_cost_usd = 0.0

    def increment_session_started(self):
        """Increment session started counter"""
        self.sessions_started += 1

    def increment_session_ended(self):
        """Increment session ended counter"""
        self.sessions_ended += 1

    def increment_api_call(self, service: str):
        """Increment API call counter for service"""
        if service in self.api_calls:
            self.api_calls[service] += 1

    def increment_error(self, service: str):
        """Increment error counter for service"""
        if service in self.errors:
            self.errors[service] += 1

    def add_cost(self, cost_usd: float):
        """Add to total cost tracking"""
        self.total_cost_usd += cost_usd

    def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics as dictionary"""
        return {
            "sessions": {
                "started": self.sessions_started,
                "ended": self.sessions_ended,
                "active": self.sessions_started - self.sessions_ended
            },
            "api_calls": self.api_calls,
            "errors": self.errors,
            "total_cost_usd": round(self.total_cost_usd, 4)
        }


# Global metrics instance
_agent_metrics = AgentMetrics()

def get_metrics() -> AgentMetrics:
    """Get global metrics instance"""
    return _agent_metrics
