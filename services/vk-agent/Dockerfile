FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Opus codec library
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    curl \
    libopus0 \
    libopus-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Environment defaults
ENV VK_AGENT_HOST=0.0.0.0
ENV VK_AGENT_PORT=3004
ENV JANUS_WS_URL=ws://janus:8188
ENV JANUS_ROOM_ID=5679
ENV JANUS_DISPLAY_NAME=Jimmy
ENV AUDIO_SAMPLE_RATE=24000
ENV AUDIO_CHANNELS=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Run the application
CMD ["python", "-m", "src.main"]
