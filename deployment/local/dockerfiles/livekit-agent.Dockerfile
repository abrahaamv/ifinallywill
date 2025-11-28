# =============================================================================
# LiveKit Agent Dockerfile
# Python agent with Gemini Live API integration
# =============================================================================

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY livekit-agent/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY livekit-agent/ ./

# Create non-root user
RUN useradd --create-home --shell /bin/bash agent
USER agent

# Run the agent
CMD ["python", "agent.py", "start"]
