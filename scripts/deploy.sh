#!/bin/bash

################################################################################
# AI Platform - Automated GCP Deployment Script
#
# Industry-standard deployment automation for staging environment
# Usage: ./deploy.sh
#
# Prerequisites:
# - GCP account with billing enabled
# - gcloud CLI installed and authenticated
# - Docker installed locally
# - API keys for AI providers (will be prompted)
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Progress tracking
TOTAL_STEPS=50
CURRENT_STEP=0

progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local percent=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo -e "${BLUE}[${CURRENT_STEP}/${TOTAL_STEPS}]${NC} (${percent}%) $1"
}

################################################################################
# ROLLBACK MECHANISM
################################################################################

# State tracking for created resources
CREATED_VPC=false
CREATED_SUBNET=false
CREATED_GLOBAL_IP=false
CREATED_FIREWALLS=()
CREATED_SQL_INSTANCE=false
CREATED_SQL_DATABASE=false
CREATED_SQL_USER=false
CREATED_REDIS=false
CREATED_SECRETS=()
CREATED_VPC_CONNECTOR=false
CREATED_CLOUD_RUN_SERVICES=()
CREATED_LIVEKIT_INSTANCE=false

# Cleanup function for rollback on error
cleanup_on_error() {
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo ""
        log_error "Deployment failed with exit code $exit_code"
        echo ""

        read -p "Do you want to rollback and delete all created resources? (y/n): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_warning "Rolling back deployment..."
            perform_cleanup
        else
            log_info "Skipping rollback. Resources remain deployed."
            log_info "To manually clean up, run: ./scripts/destroy.sh"
        fi
    fi
}

# Perform cleanup/rollback (deletes resources in reverse creation order)
perform_cleanup() {
    log_info "Starting cleanup process..."

    # Delete Cloud Run services
    for service in "${CREATED_CLOUD_RUN_SERVICES[@]}"; do
        log_info "Deleting Cloud Run service: $service"
        gcloud run services delete "$service" --region="$REGION" --quiet 2>/dev/null || true
    done

    # Delete LiveKit instance
    if [ "$CREATED_LIVEKIT_INSTANCE" = true ]; then
        log_info "Deleting LiveKit compute instance..."
        gcloud compute instances delete livekit-server --zone="$ZONE" --quiet 2>/dev/null || true
    fi

    # Delete VPC Connector
    if [ "$CREATED_VPC_CONNECTOR" = true ]; then
        log_info "Deleting VPC connector..."
        gcloud compute networks vpc-access connectors delete ai-platform-connector \
            --region="$REGION" --quiet 2>/dev/null || true
    fi

    # Delete Secrets
    for secret in "${CREATED_SECRETS[@]}"; do
        log_info "Deleting secret: $secret"
        gcloud secrets delete "$secret" --quiet 2>/dev/null || true
    done

    # Delete Redis instance
    if [ "$CREATED_REDIS" = true ]; then
        log_info "Deleting Redis instance..."
        gcloud redis instances delete ai-platform-redis --region="$REGION" --quiet 2>/dev/null || true
    fi

    # Delete SQL database and user
    if [ "$CREATED_SQL_USER" = true ]; then
        log_info "Deleting SQL user..."
        gcloud sql users delete platform_service --instance=ai-platform-db --quiet 2>/dev/null || true
    fi

    if [ "$CREATED_SQL_DATABASE" = true ]; then
        log_info "Deleting SQL database..."
        gcloud sql databases delete platform --instance=ai-platform-db --quiet 2>/dev/null || true
    fi

    # Delete SQL instance
    if [ "$CREATED_SQL_INSTANCE" = true ]; then
        log_info "Deleting Cloud SQL instance..."
        gcloud sql instances delete ai-platform-db --quiet 2>/dev/null || true
    fi

    # Delete firewall rules
    for rule in "${CREATED_FIREWALLS[@]}"; do
        log_info "Deleting firewall rule: $rule"
        gcloud compute firewall-rules delete "$rule" --quiet 2>/dev/null || true
    done

    # Delete global IP address
    if [ "$CREATED_GLOBAL_IP" = true ]; then
        log_info "Deleting global IP address..."
        gcloud compute addresses delete google-managed-services-ai-platform-vpc \
            --global --quiet 2>/dev/null || true
    fi

    # Delete subnet
    if [ "$CREATED_SUBNET" = true ]; then
        log_info "Deleting subnet..."
        gcloud compute networks subnets delete ai-platform-subnet \
            --region="$REGION" --quiet 2>/dev/null || true
    fi

    # Delete VPC network
    if [ "$CREATED_VPC" = true ]; then
        log_info "Deleting VPC network..."
        gcloud compute networks delete ai-platform-vpc --quiet 2>/dev/null || true
    fi

    log_success "Cleanup completed"
}

# Set trap to call cleanup on error
trap cleanup_on_error EXIT

################################################################################
# STEP 1: Prerequisites Check
################################################################################

log_info "Starting AI Platform deployment automation..."
echo ""

progress "Checking prerequisites..."

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install from https://cloud.google.com/sdk/docs/install"
    exit 1
fi
log_success "gcloud CLI found"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install from https://docs.docker.com/get-docker/"
    exit 1
fi
log_success "Docker found"

# Check Docker daemon
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker and try again."
    log_info "Try: sudo systemctl start docker"
    log_info "Or start Docker Desktop if using macOS/Windows"
    exit 1
fi
log_success "Docker daemon is running"

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi
log_success "gcloud authenticated"

################################################################################
# STEP 2: Configuration Input
################################################################################

echo ""
log_info "=== Configuration Setup ==="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    log_error ".env.local file not found!"
    echo ""
    log_info "Please create .env.local with all required API keys:"
    log_info "  1. Copy template: cp .env.example .env.local"
    log_info "  2. Edit .env.local with your actual credentials"
    echo ""
    log_info "Required variables (see .env.example for complete list):"
    log_info "  - OPENAI_API_KEY"
    log_info "  - ANTHROPIC_API_KEY"
    log_info "  - GOOGLE_API_KEY"
    log_info "  - COHERE_API_KEY"
    log_info "  - DEEPGRAM_API_KEY"
    log_info "  - ELEVENLABS_API_KEY"
    log_info "  - VOYAGE_API_KEY"
    log_info "  - SENDGRID_API_KEY or MAILGUN_API_KEY"
    log_info "  - TWILIO_ACCOUNT_SID or AWS_ACCESS_KEY_ID"
    echo ""
    exit 1
fi

log_success ".env.local found"

# Load configuration from .env.local
log_info "Loading configuration from .env.local..."
set +u  # Temporarily disable undefined variable check
source .env.local
set -u  # Re-enable undefined variable check

# Set empty defaults for alternative providers (prevents unbound variable errors)
AWS_SNS_REGION="${AWS_SNS_REGION:-}"
AWS_SNS_SENDER_ID="${AWS_SNS_SENDER_ID:-}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
MAILGUN_API_KEY="${MAILGUN_API_KEY:-}"
MAILGUN_DOMAIN="${MAILGUN_DOMAIN:-}"
MAILGUN_FROM_EMAIL="${MAILGUN_FROM_EMAIL:-}"
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}"
TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER:-}"
SENDGRID_API_KEY="${SENDGRID_API_KEY:-}"
SENDGRID_FROM_EMAIL="${SENDGRID_FROM_EMAIL:-noreply@platform.com}"
SENDGRID_FROM_NAME="${SENDGRID_FROM_NAME:-AI Platform}"

# Validate required API keys
REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "GOOGLE_API_KEY"
    "COHERE_API_KEY"
    "DEEPGRAM_API_KEY"
    "ELEVENLABS_API_KEY"
    "VOYAGE_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

# Validate email provider (at least one required)
if [ -z "${SENDGRID_API_KEY}" ] && [ -z "${MAILGUN_API_KEY}" ]; then
    MISSING_VARS+=("SENDGRID_API_KEY or MAILGUN_API_KEY")
fi

# Validate SMS provider (at least one required)
if [ -z "${TWILIO_ACCOUNT_SID}" ] && [ -z "${AWS_ACCESS_KEY_ID}" ]; then
    MISSING_VARS+=("TWILIO_ACCOUNT_SID or AWS_ACCESS_KEY_ID")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing required variables in .env.local:"
    for var in "${MISSING_VARS[@]}"; do
        log_error "  - $var"
    done
    echo ""
    log_info "Please edit .env.local and add all required variables"
    log_info "See .env.example for reference"
    exit 1
fi

log_success "All required API keys found in .env.local"

# Load existing config if available
CONFIG_FILE=".deploy.config"
if [ -f "$CONFIG_FILE" ]; then
    log_info "Found existing GCP configuration. Loading..."
    source "$CONFIG_FILE"

    echo "Current GCP configuration:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Zone: $ZONE"
    echo ""
    read -p "Use existing GCP configuration? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm "$CONFIG_FILE"
    fi
fi

# Prompt for GCP configuration if not loaded
if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    log_info "=== GCP Configuration ==="
    read -p "Enter GCP Project ID (e.g., ai-platform-staging): " PROJECT_ID
    read -p "Enter Region (e.g., us-central1): " REGION
    read -p "Enter Zone (e.g., us-central1-a): " ZONE

    echo ""
    log_info "=== Database Configuration ==="
    read -sp "Enter PostgreSQL root password (secure): " DB_ROOT_PASSWORD
    echo ""
    read -sp "Enter PostgreSQL app password (secure): " DB_APP_PASSWORD
    echo ""

    echo ""
    log_info "=== Session Configuration ==="
    log_info "Generating secure session secret..."
    SESSION_SECRET=$(openssl rand -base64 32)
    log_success "Session secret generated"

    echo ""
    log_info "=== LiveKit Configuration ==="
    log_info "Generating LiveKit credentials..."
    LIVEKIT_API_KEY="API$(openssl rand -hex 16)"
    LIVEKIT_API_SECRET=$(openssl rand -base64 32)
    log_success "LiveKit credentials generated"

    # Save GCP configuration (API keys already loaded from .env.local)
    cat > "$CONFIG_FILE" << EOF
PROJECT_ID="$PROJECT_ID"
REGION="$REGION"
ZONE="$ZONE"
DB_ROOT_PASSWORD="$DB_ROOT_PASSWORD"
DB_APP_PASSWORD="$DB_APP_PASSWORD"
SESSION_SECRET="$SESSION_SECRET"
OPENAI_API_KEY="$OPENAI_API_KEY"
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
GOOGLE_AI_API_KEY="$GOOGLE_API_KEY"
COHERE_API_KEY="$COHERE_API_KEY"
DEEPGRAM_API_KEY="$DEEPGRAM_API_KEY"
ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY"
VOYAGE_API_KEY="$VOYAGE_API_KEY"
LIVEKIT_API_KEY="$LIVEKIT_API_KEY"
LIVEKIT_API_SECRET="$LIVEKIT_API_SECRET"
SENDGRID_API_KEY="$SENDGRID_API_KEY"
SENDGRID_FROM_EMAIL="$SENDGRID_FROM_EMAIL"
SENDGRID_FROM_NAME="$SENDGRID_FROM_NAME"
MAILGUN_API_KEY="$MAILGUN_API_KEY"
MAILGUN_DOMAIN="$MAILGUN_DOMAIN"
MAILGUN_FROM_EMAIL="$MAILGUN_FROM_EMAIL"
TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"
TWILIO_PHONE_NUMBER="$TWILIO_PHONE_NUMBER"
AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
AWS_SNS_REGION="$AWS_SNS_REGION"
AWS_SNS_SENDER_ID="$AWS_SNS_SENDER_ID"
EOF

    log_success "Configuration saved to $CONFIG_FILE"
fi

################################################################################
# STEP 3: GCP Project Setup
################################################################################

echo ""
log_info "=== GCP Project Setup ==="
echo ""

progress "Setting GCP project..."
gcloud config set project "$PROJECT_ID" 2>&1 | grep -v "WARNING" || true

progress "Enabling required APIs (this may take 2-3 minutes)..."
gcloud services enable \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  storage-api.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet

log_success "APIs enabled"

################################################################################
# STEP 4: Networking Setup
################################################################################

echo ""
log_info "=== Networking Setup ==="
echo ""

progress "Creating VPC network..."
if ! gcloud compute networks describe ai-platform-vpc &> /dev/null; then
    gcloud compute networks create ai-platform-vpc \
      --subnet-mode=custom \
      --bgp-routing-mode=regional \
      --quiet
    CREATED_VPC=true
    log_success "VPC network created"
else
    log_warning "VPC network already exists, skipping..."
fi

progress "Creating subnet..."
if ! gcloud compute networks subnets describe ai-platform-subnet --region="$REGION" &> /dev/null; then
    gcloud compute networks subnets create ai-platform-subnet \
      --network=ai-platform-vpc \
      --region="$REGION" \
      --range=10.0.0.0/20 \
      --enable-private-ip-google-access \
      --quiet
    CREATED_SUBNET=true
    log_success "Subnet created"
else
    log_warning "Subnet already exists, skipping..."
fi

progress "Creating VPC peering for Cloud SQL..."
if ! gcloud compute addresses describe google-managed-services-ai-platform-vpc --global &> /dev/null; then
    gcloud compute addresses create google-managed-services-ai-platform-vpc \
      --global \
      --purpose=VPC_PEERING \
      --prefix-length=16 \
      --network=ai-platform-vpc \
      --quiet

    gcloud services vpc-peerings connect \
      --service=servicenetworking.googleapis.com \
      --ranges=google-managed-services-ai-platform-vpc \
      --network=ai-platform-vpc \
      --quiet

    CREATED_GLOBAL_IP=true
    log_success "VPC peering created"
else
    log_warning "VPC peering already exists, skipping..."
fi

progress "Creating firewall rules..."
# Internal traffic
if ! gcloud compute firewall-rules describe allow-internal &> /dev/null; then
    gcloud compute firewall-rules create allow-internal \
      --network=ai-platform-vpc \
      --allow=tcp,udp,icmp \
      --source-ranges=10.0.0.0/20 \
      --quiet
    CREATED_FIREWALLS+=("allow-internal")
fi

# SSH access
if ! gcloud compute firewall-rules describe allow-ssh &> /dev/null; then
    gcloud compute firewall-rules create allow-ssh \
      --network=ai-platform-vpc \
      --allow=tcp:22 \
      --source-ranges=0.0.0.0/0 \
      --quiet
    CREATED_FIREWALLS+=("allow-ssh")
fi

# HTTP/HTTPS
if ! gcloud compute firewall-rules describe allow-http-https &> /dev/null; then
    gcloud compute firewall-rules create allow-http-https \
      --network=ai-platform-vpc \
      --allow=tcp:80,tcp:443 \
      --source-ranges=0.0.0.0/0 \
      --quiet
    CREATED_FIREWALLS+=("allow-http-https")
fi

# WebRTC for LiveKit
if ! gcloud compute firewall-rules describe allow-webrtc &> /dev/null; then
    gcloud compute firewall-rules create allow-webrtc \
      --network=ai-platform-vpc \
      --allow=udp:50000-60000 \
      --source-ranges=0.0.0.0/0 \
      --quiet
    CREATED_FIREWALLS+=("allow-webrtc")
fi

log_success "Firewall rules created"

################################################################################
# STEP 5: Database Setup (Cloud SQL PostgreSQL)
################################################################################

echo ""
log_info "=== Database Setup ==="
echo ""

progress "Creating Cloud SQL PostgreSQL instance (this takes 10-15 minutes)..."
if ! gcloud sql instances describe ai-platform-db &> /dev/null; then
    gcloud sql instances create ai-platform-db \
      --database-version=POSTGRES_16 \
      --tier=db-custom-2-7680 \
      --region="$REGION" \
      --network=projects/$PROJECT_ID/global/networks/ai-platform-vpc \
      --no-assign-ip \
      --database-flags=max_connections=200 \
      --quiet

    CREATED_SQL_INSTANCE=true
    log_success "Cloud SQL instance created"

    progress "Setting PostgreSQL root password..."
    gcloud sql users set-password postgres \
      --instance=ai-platform-db \
      --password="$DB_ROOT_PASSWORD" \
      --quiet

    progress "Creating application database..."
    gcloud sql databases create platform \
      --instance=ai-platform-db \
      --quiet
    CREATED_SQL_DATABASE=true

    progress "Creating application user..."
    gcloud sql users create platform_service \
      --instance=ai-platform-db \
      --password="$DB_APP_PASSWORD" \
      --quiet
    CREATED_SQL_USER=true
else
    log_warning "Cloud SQL instance already exists, skipping..."
fi

progress "Getting database connection details..."
DB_PRIVATE_IP=$(gcloud sql instances describe ai-platform-db \
  --format="get(ipAddresses[0].ipAddress)")
DATABASE_URL="postgresql://platform_service:${DB_APP_PASSWORD}@${DB_PRIVATE_IP}:5432/platform"

log_info "Database Private IP: $DB_PRIVATE_IP"

################################################################################
# STEP 6: Redis Setup (MemoryStore)
################################################################################

echo ""
log_info "=== Redis Setup ==="
echo ""

progress "Creating Redis instance (this takes 5-10 minutes)..."
if ! gcloud redis instances describe ai-platform-redis --region="$REGION" &> /dev/null; then
    gcloud redis instances create ai-platform-redis \
      --size=1 \
      --region="$REGION" \
      --redis-version=redis_7_2 \
      --network=projects/$PROJECT_ID/global/networks/ai-platform-vpc \
      --tier=basic \
      --quiet

    CREATED_REDIS=true
    log_success "Redis instance created"
else
    log_warning "Redis instance already exists, skipping..."
fi

progress "Getting Redis connection details..."
REDIS_HOST=$(gcloud redis instances describe ai-platform-redis \
  --region="$REGION" \
  --format="get(host)")
REDIS_PORT=$(gcloud redis instances describe ai-platform-redis \
  --region="$REGION" \
  --format="get(port)")
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"

log_info "Redis Host: $REDIS_HOST"

################################################################################
# STEP 7: Secret Manager
################################################################################

echo ""
log_info "=== Secret Manager Setup ==="
echo ""

progress "Storing secrets in Secret Manager..."

# Database URL
if ! gcloud secrets describe database-url &> /dev/null; then
    echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=- --quiet
    CREATED_SECRETS+=("database-url")
fi

# Redis URL
if ! gcloud secrets describe redis-url &> /dev/null; then
    echo -n "$REDIS_URL" | gcloud secrets create redis-url --data-file=- --quiet
    CREATED_SECRETS+=("redis-url")
fi

# Session Secret
if ! gcloud secrets describe session-secret &> /dev/null; then
    echo -n "$SESSION_SECRET" | gcloud secrets create session-secret --data-file=- --quiet
    CREATED_SECRETS+=("session-secret")
fi

# AI Provider Keys (Phase 5 + Phase 10)
if ! gcloud secrets describe openai-api-key &> /dev/null; then
    echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=- --quiet
    CREATED_SECRETS+=("openai-api-key")
fi

if ! gcloud secrets describe anthropic-api-key &> /dev/null; then
    echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key --data-file=- --quiet
    CREATED_SECRETS+=("anthropic-api-key")
fi

if ! gcloud secrets describe google-ai-api-key &> /dev/null; then
    echo -n "$GOOGLE_AI_API_KEY" | gcloud secrets create google-ai-api-key --data-file=- --quiet
    CREATED_SECRETS+=("google-ai-api-key")
fi

if ! gcloud secrets describe cohere-api-key &> /dev/null; then
    echo -n "$COHERE_API_KEY" | gcloud secrets create cohere-api-key --data-file=- --quiet
    CREATED_SECRETS+=("cohere-api-key")
fi

if ! gcloud secrets describe deepgram-api-key &> /dev/null; then
    echo -n "$DEEPGRAM_API_KEY" | gcloud secrets create deepgram-api-key --data-file=- --quiet
    CREATED_SECRETS+=("deepgram-api-key")
fi

if ! gcloud secrets describe elevenlabs-api-key &> /dev/null; then
    echo -n "$ELEVENLABS_API_KEY" | gcloud secrets create elevenlabs-api-key --data-file=- --quiet
    CREATED_SECRETS+=("elevenlabs-api-key")
fi

if ! gcloud secrets describe voyage-api-key &> /dev/null; then
    echo -n "$VOYAGE_API_KEY" | gcloud secrets create voyage-api-key --data-file=- --quiet
    CREATED_SECRETS+=("voyage-api-key")
fi

# Communication Provider Keys (Phase 11 - Email/SMS verification)
if [ -n "$SENDGRID_API_KEY" ]; then
    if ! gcloud secrets describe sendgrid-api-key &> /dev/null; then
        echo -n "$SENDGRID_API_KEY" | gcloud secrets create sendgrid-api-key --data-file=- --quiet
        CREATED_SECRETS+=("sendgrid-api-key")
    fi
fi

if [ -n "$MAILGUN_API_KEY" ]; then
    if ! gcloud secrets describe mailgun-api-key &> /dev/null; then
        echo -n "$MAILGUN_API_KEY" | gcloud secrets create mailgun-api-key --data-file=- --quiet
        CREATED_SECRETS+=("mailgun-api-key")
    fi
fi

if [ -n "$TWILIO_AUTH_TOKEN" ]; then
    if ! gcloud secrets describe twilio-auth-token &> /dev/null; then
        echo -n "$TWILIO_AUTH_TOKEN" | gcloud secrets create twilio-auth-token --data-file=- --quiet
        CREATED_SECRETS+=("twilio-auth-token")
    fi
fi

if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    if ! gcloud secrets describe aws-secret-access-key &> /dev/null; then
        echo -n "$AWS_SECRET_ACCESS_KEY" | gcloud secrets create aws-secret-access-key --data-file=- --quiet
        CREATED_SECRETS+=("aws-secret-access-key")
    fi
fi

# LiveKit Keys
if ! gcloud secrets describe livekit-api-key &> /dev/null; then
    echo -n "$LIVEKIT_API_KEY" | gcloud secrets create livekit-api-key --data-file=- --quiet
    CREATED_SECRETS+=("livekit-api-key")
fi

if ! gcloud secrets describe livekit-api-secret &> /dev/null; then
    echo -n "$LIVEKIT_API_SECRET" | gcloud secrets create livekit-api-secret --data-file=- --quiet
    CREATED_SECRETS+=("livekit-api-secret")
fi

log_success "Secrets stored (15+ secrets configured)"

################################################################################
# STEP 8: Database Schema Deployment
################################################################################

echo ""
log_info "=== Database Schema Deployment ==="
echo ""

progress "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

progress "Installing project dependencies..."
pnpm install --frozen-lockfile

progress "Running database migrations..."
export DATABASE_URL="$DATABASE_URL"
pnpm db:push

progress "Validating database schema..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')
if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -lt 28 ]; then
    log_error "Expected 28+ tables, found $TABLE_COUNT"
    log_info "This indicates database migration failed or is incomplete"
    exit 1
fi

POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
if [ -z "$POLICY_COUNT" ] || [ "$POLICY_COUNT" -lt 76 ]; then
    log_warning "Expected 76+ RLS policies, found $POLICY_COUNT"
    log_info "Some RLS policies may be missing - review database migrations"
fi

log_success "Database schema deployed ($TABLE_COUNT tables, $POLICY_COUNT RLS policies)"

################################################################################
# STEP 9: Build Docker Images
################################################################################

echo ""
log_info "=== Building Docker Images ==="
echo ""

progress "Building project..."
pnpm build

progress "Building API server Docker image..."
docker build -t gcr.io/$PROJECT_ID/api-server:latest -f packages/api/Dockerfile .

progress "Building Realtime server Docker image..."
docker build -t gcr.io/$PROJECT_ID/realtime-server:latest -f packages/realtime/Dockerfile .

progress "Building Dashboard Docker image..."
docker build -t gcr.io/$PROJECT_ID/dashboard:latest -f apps/dashboard/Dockerfile .

log_success "Docker images built"

################################################################################
# STEP 10: Push Images to GCR
################################################################################

echo ""
log_info "=== Pushing Images to Google Container Registry ==="
echo ""

progress "Configuring Docker for GCR..."
gcloud auth configure-docker gcr.io --quiet

progress "Pushing API server image..."
docker push gcr.io/$PROJECT_ID/api-server:latest

progress "Pushing Realtime server image..."
docker push gcr.io/$PROJECT_ID/realtime-server:latest

progress "Pushing Dashboard image..."
docker push gcr.io/$PROJECT_ID/dashboard:latest

log_success "Images pushed to GCR"

################################################################################
# STEP 11: VPC Access Connector
################################################################################

echo ""
log_info "=== VPC Access Connector for Cloud Run ==="
echo ""

progress "Creating VPC Access Connector..."
if ! gcloud compute networks vpc-access connectors describe ai-platform-connector --region="$REGION" &> /dev/null; then
    gcloud compute networks vpc-access connectors create ai-platform-connector \
      --region="$REGION" \
      --network=ai-platform-vpc \
      --range=10.8.0.0/28 \
      --quiet
    CREATED_VPC_CONNECTOR=true
    log_success "VPC Access Connector created"
else
    log_warning "VPC Access Connector already exists, skipping..."
fi

################################################################################
# STEP 12: Deploy to Cloud Run
################################################################################

echo ""
log_info "=== Deploying to Cloud Run ==="
echo ""

progress "Deploying API server..."
# Build secrets string with all AI providers
SECRETS="DATABASE_URL=database-url:latest"
SECRETS="$SECRETS,REDIS_URL=redis-url:latest"
SECRETS="$SECRETS,SESSION_SECRET=session-secret:latest"
SECRETS="$SECRETS,OPENAI_API_KEY=openai-api-key:latest"
SECRETS="$SECRETS,ANTHROPIC_API_KEY=anthropic-api-key:latest"
SECRETS="$SECRETS,GOOGLE_AI_API_KEY=google-ai-api-key:latest"
SECRETS="$SECRETS,COHERE_API_KEY=cohere-api-key:latest"
SECRETS="$SECRETS,DEEPGRAM_API_KEY=deepgram-api-key:latest"
SECRETS="$SECRETS,ELEVENLABS_API_KEY=elevenlabs-api-key:latest"
SECRETS="$SECRETS,VOYAGE_API_KEY=voyage-api-key:latest"
SECRETS="$SECRETS,LIVEKIT_API_KEY=livekit-api-key:latest"
SECRETS="$SECRETS,LIVEKIT_API_SECRET=livekit-api-secret:latest"

# Add optional communication provider secrets if they exist
if gcloud secrets describe sendgrid-api-key &> /dev/null; then
    SECRETS="$SECRETS,SENDGRID_API_KEY=sendgrid-api-key:latest"
fi
if gcloud secrets describe mailgun-api-key &> /dev/null; then
    SECRETS="$SECRETS,MAILGUN_API_KEY=mailgun-api-key:latest"
fi
if gcloud secrets describe twilio-auth-token &> /dev/null; then
    SECRETS="$SECRETS,TWILIO_AUTH_TOKEN=twilio-auth-token:latest"
fi
if gcloud secrets describe aws-secret-access-key &> /dev/null; then
    SECRETS="$SECRETS,AWS_SECRET_ACCESS_KEY=aws-secret-access-key:latest"
fi

gcloud run deploy api-server \
  --image=gcr.io/$PROJECT_ID/api-server:latest \
  --region="$REGION" \
  --platform=managed \
  --vpc-connector=ai-platform-connector \
  --set-env-vars="NODE_ENV=production,PORT=3001" \
  --set-secrets="$SECRETS" \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=10 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --quiet

CREATED_CLOUD_RUN_SERVICES+=("api-server")

progress "Deploying Realtime server..."
gcloud run deploy realtime-server \
  --image=gcr.io/$PROJECT_ID/realtime-server:latest \
  --region="$REGION" \
  --platform=managed \
  --vpc-connector=ai-platform-connector \
  --set-env-vars="NODE_ENV=production,PORT=3002" \
  --set-secrets="REDIS_URL=redis-url:latest" \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

CREATED_CLOUD_RUN_SERVICES+=("realtime-server")

progress "Deploying Dashboard..."
gcloud run deploy dashboard \
  --image=gcr.io/$PROJECT_ID/dashboard:latest \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --quiet

CREATED_CLOUD_RUN_SERVICES+=("dashboard")

log_success "Services deployed to Cloud Run"

progress "Getting service URLs..."
API_URL=$(gcloud run services describe api-server --region="$REGION" --format="get(status.url)")
REALTIME_URL=$(gcloud run services describe realtime-server --region="$REGION" --format="get(status.url)")
DASHBOARD_URL=$(gcloud run services describe dashboard --region="$REGION" --format="get(status.url)")

################################################################################
# STEP 13: Deploy LiveKit Server (GCE)
################################################################################

echo ""
log_info "=== Deploying LiveKit Server ==="
echo ""

progress "Creating LiveKit startup script..."
cat > /tmp/livekit-startup.sh << 'SCRIPT_EOF'
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create LiveKit directory
mkdir -p /opt/livekit
cd /opt/livekit

# Create docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.9'

services:
  livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
      - "50000-60000:50000-60000/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    networks:
      - livekit

  redis:
    image: redis:7.4-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - livekit

networks:
  livekit:
    driver: bridge

volumes:
  redis_data:
COMPOSE_EOF

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me)

# Create livekit.yaml
cat > livekit.yaml << LIVEKIT_EOF
port: 7880
bind_addresses:
  - "0.0.0.0"

rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true

redis:
  address: redis:6379

keys:
  LIVEKIT_API_KEY_PLACEHOLDER: LIVEKIT_API_SECRET_PLACEHOLDER

room:
  auto_create: true
  empty_timeout: 300
  max_participants: 20

logging:
  level: info
LIVEKIT_EOF

# Start LiveKit
docker-compose up -d

# Wait for LiveKit to start
sleep 30

# Check if LiveKit is running
if docker-compose ps | grep -q "Up"; then
    echo "LiveKit server started successfully"
else
    echo "LiveKit server failed to start"
    exit 1
fi
SCRIPT_EOF

# Replace placeholders in startup script
sed -i "s/LIVEKIT_API_KEY_PLACEHOLDER/${LIVEKIT_API_KEY}/g" /tmp/livekit-startup.sh
sed -i "s/LIVEKIT_API_SECRET_PLACEHOLDER/${LIVEKIT_API_SECRET}/g" /tmp/livekit-startup.sh

progress "Creating LiveKit GCE instance (this takes 5-10 minutes)..."
if ! gcloud compute instances describe livekit-server --zone="$ZONE" &> /dev/null; then
    gcloud compute instances create livekit-server \
      --zone="$ZONE" \
      --machine-type=e2-standard-4 \
      --network=ai-platform-vpc \
      --subnet=ai-platform-subnet \
      --image-family=ubuntu-2204-lts \
      --image-project=ubuntu-os-cloud \
      --boot-disk-size=50GB \
      --boot-disk-type=pd-ssd \
      --tags=livekit-server \
      --metadata-from-file=startup-script=/tmp/livekit-startup.sh \
      --quiet

    CREATED_LIVEKIT_INSTANCE=true
    log_success "LiveKit instance created"
else
    log_warning "LiveKit instance already exists, skipping..."
fi

progress "Waiting for LiveKit to start (60 seconds)..."
sleep 60

progress "Getting LiveKit external IP..."
LIVEKIT_IP=$(gcloud compute instances describe livekit-server \
  --zone="$ZONE" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

LIVEKIT_URL="ws://${LIVEKIT_IP}:7880"

log_info "LiveKit URL: $LIVEKIT_URL"

################################################################################
# STEP 14: Deploy Python LiveKit Agent
################################################################################

echo ""
log_info "=== Deploying Python LiveKit Agent ==="
echo ""

progress "Creating Python agent startup script..."
cat > /tmp/agent-startup.sh << 'AGENT_EOF'
#!/bin/bash

# Install Python 3.11
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.11 python3.11-venv python3.11-dev git

# Create agent directory
mkdir -p /opt/livekit-agent
cd /opt/livekit-agent

# Copy agent files (will be uploaded separately)
# For now, create placeholder
touch agent.py requirements.txt

# Create systemd service
cat > /etc/systemd/system/livekit-agent.service << 'SERVICE_EOF'
[Unit]
Description=LiveKit Python Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/livekit-agent
Environment="PATH=/opt/livekit-agent/venv/bin"
ExecStart=/opt/livekit-agent/venv/bin/python agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable service (will start after agent files are uploaded)
systemctl daemon-reload
systemctl enable livekit-agent

echo "Python agent setup complete"
AGENT_EOF

progress "Uploading agent startup script..."
gcloud compute scp /tmp/agent-startup.sh livekit-server:/tmp/ --zone="$ZONE" --quiet

progress "Executing agent setup..."
gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo bash /tmp/agent-startup.sh" --quiet

progress "Uploading Python agent code..."
gcloud compute scp --recurse livekit-agent/ livekit-server:/opt/ --zone="$ZONE" --quiet

progress "Installing agent dependencies..."
gcloud compute ssh livekit-server --zone="$ZONE" --command="cd /opt/livekit-agent && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt" --quiet

progress "Creating agent .env file..."
gcloud compute ssh livekit-server --zone="$ZONE" --command="cat > /opt/livekit-agent/.env << EOF
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
API_URL=${API_URL}
EOF" --quiet

progress "Starting Python agent..."
gcloud compute ssh livekit-server --zone="$ZONE" --command="sudo systemctl start livekit-agent" --quiet

log_success "Python LiveKit agent deployed"

################################################################################
# STEP 15: Validation
################################################################################

echo ""
log_info "=== Running Validation Checks ==="
echo ""

progress "Checking API server health..."
if curl -s "$API_URL/health" | grep -q "ok"; then
    log_success "API server is healthy"
else
    log_error "API server health check failed"
fi

progress "Checking Realtime server health..."
if curl -s "$REALTIME_URL/health" | grep -q "ok"; then
    log_success "Realtime server is healthy"
else
    log_error "Realtime server health check failed"
fi

progress "Checking Dashboard..."
if curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL" | grep -q "200"; then
    log_success "Dashboard is accessible"
else
    log_error "Dashboard is not accessible"
fi

progress "Checking LiveKit server..."
if curl -s -o /dev/null -w "%{http_code}" "http://${LIVEKIT_IP}:7880/" | grep -q "200\|404"; then
    log_success "LiveKit server is running"
else
    log_error "LiveKit server is not accessible"
fi

################################################################################
# DEPLOYMENT SUMMARY
################################################################################

echo ""
echo "================================================================================"
echo "                    🎉 DEPLOYMENT COMPLETE! 🎉"
echo "================================================================================"
echo ""
echo "Your AI Platform is now live on GCP!"
echo ""
echo "📍 Service URLs:"
echo "  Dashboard:       $DASHBOARD_URL"
echo "  API Server:      $API_URL"
echo "  Realtime Server: $REALTIME_URL"
echo "  LiveKit Server:  $LIVEKIT_URL"
echo ""
echo "🔑 Credentials:"
echo "  LiveKit API Key:    $LIVEKIT_API_KEY"
echo "  LiveKit API Secret: $LIVEKIT_API_SECRET"
echo "  Database URL:       $DATABASE_URL"
echo "  Redis URL:          $REDIS_URL"
echo ""
echo "💾 Configuration saved to: $CONFIG_FILE"
echo ""
echo "📊 Infrastructure:"
echo "  Project ID:   $PROJECT_ID"
echo "  Region:       $REGION"
echo "  Zone:         $ZONE"
echo "  DB Private IP: $DB_PRIVATE_IP"
echo "  Redis Host:   $REDIS_HOST"
echo "  LiveKit IP:   $LIVEKIT_IP"
echo ""
echo "✅ Next Steps:"
echo "  1. Visit the dashboard: $DASHBOARD_URL"
echo "  2. Create your first tenant account"
echo "  3. Upload knowledge documents"
echo "  4. Test AI chat functionality"
echo "  5. Test video escalation with LiveKit"
echo ""
echo "💰 Estimated Monthly Cost: \$125-200"
echo ""
echo "📚 Documentation:"
echo "  - Phase 9 Readiness: docs/adr/PHASE_9_READINESS.md"
echo "  - Personal Guide: DEPLOYMENT_GUIDE_PERSONAL.md"
echo "  - Full Documentation: docs/"
echo ""
echo "🔧 Management Commands:"
echo "  - View logs:  ./scripts/logs.sh"
echo "  - Scale services: ./scripts/scale.sh"
echo "  - Destroy infrastructure: ./scripts/destroy.sh"
echo ""
echo "================================================================================"

# Save deployment summary
cat > deployment-summary.txt << EOF
AI Platform Deployment Summary
Generated: $(date)

Service URLs:
- Dashboard: $DASHBOARD_URL
- API Server: $API_URL
- Realtime Server: $REALTIME_URL
- LiveKit Server: $LIVEKIT_URL

Credentials:
- LiveKit API Key: $LIVEKIT_API_KEY
- LiveKit API Secret: $LIVEKIT_API_SECRET
- Database URL: $DATABASE_URL
- Redis URL: $REDIS_URL

Infrastructure:
- Project ID: $PROJECT_ID
- Region: $REGION
- Zone: $ZONE
- DB Private IP: $DB_PRIVATE_IP
- Redis Host: $REDIS_HOST
- LiveKit IP: $LIVEKIT_IP
EOF

log_success "Deployment summary saved to deployment-summary.txt"

# Clean up temporary files
rm -f /tmp/livekit-startup.sh /tmp/agent-startup.sh

echo ""
log_success "All done! Your platform is ready to use. 🚀"
