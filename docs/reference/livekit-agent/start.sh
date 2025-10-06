#!/bin/bash

# AI Assistant Platform - Production Agent Start Script
# Starts the LiveKit agent with proper environment and monitoring

set -e  # Exit on error

echo "🚀 Starting AI Assistant Platform Agent"
echo "========================================"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure your API keys"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Error: Virtual environment not found"
    echo "Please run ./setup.sh first"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Load environment variables
echo "Loading environment variables..."
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=(
    "LIVEKIT_URL"
    "LIVEKIT_API_KEY"
    "LIVEKIT_API_SECRET"
    "OPENAI_API_KEY"
    "DEEPGRAM_API_KEY"
    "API_BASE_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please configure these variables in your .env file"
    exit 1
fi

echo "✅ All required environment variables set"
echo ""
echo "Configuration:"
echo "  LiveKit URL: $LIVEKIT_URL"
echo "  Backend API: $API_BASE_URL"
echo "  Environment: ${AGENT_ENV:-development}"
echo ""

# Start the agent
echo "Starting agent..."
echo "Press Ctrl+C to stop"
echo ""

python agent.py
