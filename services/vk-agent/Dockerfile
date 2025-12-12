# VK-Agent Dockerfile
# Multi-stage build for minimal production image

# ============================================================
# Build stage: Install dependencies
# ============================================================
FROM python:3.11-slim as builder

# Install build dependencies for opuslib
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libopus-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================
# Production stage: Minimal runtime image
# ============================================================
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopus0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN useradd --create-home --shell /bin/bash vkagent
USER vkagent
WORKDIR /home/vkagent/app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=vkagent:vkagent src/ ./src/

# Environment defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VK_AGENT_LOG_LEVEL=INFO

# Expose ports
# 5004/udp - RTP audio
# 3004/tcp - API server (optional)
EXPOSE 5004/udp
EXPOSE 3004/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3004/health')" || exit 1

# Default command: run the API server (which also starts the bridge)
ENTRYPOINT ["python", "-m", "src.api"]
CMD ["--host", "0.0.0.0", "--port", "3004"]
