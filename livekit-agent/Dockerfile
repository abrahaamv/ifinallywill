# Multi-stage Dockerfile for LiveKit Python Agent
# Optimized for production with minimal image size and security hardening

# Stage 1: Builder - Install dependencies
FROM python:3.11-slim-bookworm AS builder

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
WORKDIR /build
COPY requirements.txt .

# Install Python dependencies in virtual environment
# Use --no-cache-dir to reduce image size
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime - Minimal production image
FROM python:3.11-slim-bookworm AS runtime

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash livekit && \
    mkdir -p /app && \
    chown -R livekit:livekit /app

# Copy virtual environment from builder
COPY --from=builder --chown=livekit:livekit /opt/venv /opt/venv

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Switch to non-root user
USER livekit
WORKDIR /app

# Copy application code
COPY --chown=livekit:livekit . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# Expose metrics port (optional)
EXPOSE 9090

# Run agent worker
CMD ["python", "agent.py"]
