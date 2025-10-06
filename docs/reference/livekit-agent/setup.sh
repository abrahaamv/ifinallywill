#!/bin/bash

# AI Assistant Platform - Production Agent Setup Script
# Sets up Python virtual environment and installs dependencies

set -e  # Exit on error

echo "🚀 Setting up AI Assistant Platform - Production Agent"
echo "=================================================="

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.10"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
    echo "❌ Error: Python 3.10+ required. Found: $python_version"
    exit 1
fi

echo "✅ Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env: cp .env.example .env"
echo "2. Fill in your API keys in .env"
echo "3. Start the agent: ./start.sh"
echo ""
echo "Documentation:"
echo "- docs/SETUP.md - Setup guide"
echo "- docs/INTEGRATION_GUIDE.md - Backend integration"
echo "- .env.example - Configuration reference"
