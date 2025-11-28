#!/bin/bash
# =============================================================================
# First-Time Server Setup Script
# Run this once on a fresh server to install all dependencies
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         AI Assistant Platform - Server Setup                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider creating a non-root user.${NC}"
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    echo -e "${RED}Cannot detect OS. This script supports Ubuntu/Debian.${NC}"
    exit 1
fi

echo -e "${GREEN}Detected OS: $OS $VERSION${NC}"
echo ""

# =============================================================================
# Step 1: System Update
# =============================================================================
echo -e "${BLUE}[1/7] Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
echo -e "${BLUE}[2/7] Installing dependencies...${NC}"
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    wget \
    htop \
    nano \
    ufw

# =============================================================================
# Step 3: Install Docker
# =============================================================================
echo -e "${BLUE}[3/7] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}Docker is already installed.${NC}"
    docker --version
else
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed successfully.${NC}"
fi

# =============================================================================
# Step 4: Install Cloudflared
# =============================================================================
echo -e "${BLUE}[4/7] Installing Cloudflared...${NC}"

if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}Cloudflared is already installed.${NC}"
    cloudflared --version
else
    # Download and install cloudflared
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    echo -e "${GREEN}Cloudflared installed successfully.${NC}"
fi

# =============================================================================
# Step 5: Configure Firewall
# =============================================================================
echo -e "${BLUE}[5/7] Configuring firewall...${NC}"

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP (for local testing only, Cloudflare tunnel handles external)
sudo ufw allow 80/tcp

# Allow LiveKit ports (only needed if not using tunnel for LiveKit)
# sudo ufw allow 7880/tcp
# sudo ufw allow 7881/tcp
# sudo ufw allow 50000:50060/udp

# Enable firewall
sudo ufw --force enable
echo -e "${GREEN}Firewall configured.${NC}"

# =============================================================================
# Step 6: Create Project Directory
# =============================================================================
echo -e "${BLUE}[6/7] Setting up project directory...${NC}"

PROJECT_DIR="$HOME/platform"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Project directory already exists at $PROJECT_DIR${NC}"
else
    echo -e "${YELLOW}Please clone your repository to $PROJECT_DIR${NC}"
    echo "Run: git clone https://github.com/yourusername/platform.git $PROJECT_DIR"
fi

# =============================================================================
# Step 7: Generate Secrets
# =============================================================================
echo -e "${BLUE}[7/7] Generating secure secrets...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"

    # Generate secure passwords
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    REDIS_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    SESSION_SECRET=$(openssl rand -base64 48)

    # Update .env with generated passwords
    sed -i "s/your-secure-database-password-change-this/$DB_PASS/g" "$DEPLOY_DIR/.env"
    sed -i "s/your-secure-redis-password-change-this/$REDIS_PASS/g" "$DEPLOY_DIR/.env"
    sed -i "s/your-session-secret-at-least-32-characters-long/$SESSION_SECRET/g" "$DEPLOY_DIR/.env"

    echo -e "${GREEN}Generated secure passwords in .env${NC}"
    echo -e "${YELLOW}Remember to add your API keys to .env!${NC}"
else
    echo -e "${YELLOW}.env already exists, skipping secret generation.${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Next steps:"
echo ""
echo "1. Log out and back in (for Docker group permissions)"
echo "   Or run: newgrp docker"
echo ""
echo "2. Configure your environment:"
echo "   cd $DEPLOY_DIR"
echo "   nano .env"
echo ""
echo "3. Set up Cloudflare Tunnel:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create ai-platform"
echo "   # Copy the tunnel token to .env"
echo ""
echo "4. Deploy the platform:"
echo "   ./scripts/deploy.sh"
echo ""
echo -e "${YELLOW}See docs/SETUP.md for detailed instructions.${NC}"
