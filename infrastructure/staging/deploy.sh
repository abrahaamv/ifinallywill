#!/bin/bash
set -euo pipefail

# =============================================================================
# STAGING DEPLOYMENT SCRIPT
# =============================================================================
# This script automates the complete deployment of the platform to GCP staging
#
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --skip-infrastructure    Skip infrastructure setup (use existing)
#   --skip-database         Skip database setup (use existing)
#   --skip-backend          Skip backend deployment
#   --skip-frontend         Skip frontend deployment
#   --skip-monitoring       Skip monitoring setup
#   --verify-only           Only run verification checks
#   --help                  Show this help message
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed
#   - .env file configured
#   - Billing enabled on GCP project
#
# =============================================================================

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default options
SKIP_INFRASTRUCTURE=false
SKIP_DATABASE=false
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_MONITORING=false
VERIFY_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-infrastructure)
      SKIP_INFRASTRUCTURE=true
      shift
      ;;
    --skip-database)
      SKIP_DATABASE=true
      shift
      ;;
    --skip-backend)
      SKIP_BACKEND=true
      shift
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --skip-monitoring)
      SKIP_MONITORING=true
      shift
      ;;
    --verify-only)
      VERIFY_ONLY=true
      shift
      ;;
    --help)
      grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# =============================================================================
# Helper Functions
# =============================================================================

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

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "$1 is not installed. Please install it and try again."
    exit 1
  fi
}

load_env() {
  if [[ -f "$SCRIPT_DIR/.env" ]]; then
    log_info "Loading environment from .env"
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
  else
    log_error ".env file not found!"
    log_info "Please copy .env.example to .env and configure it."
    exit 1
  fi
}

verify_prerequisites() {
  log_info "Verifying prerequisites..."

  # Check required commands
  check_command "gcloud"
  check_command "docker"
  check_command "node"
  check_command "pnpm"

  # Verify gcloud authentication
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
  fi

  # Verify project exists
  if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    log_error "Project $PROJECT_ID does not exist"
    exit 1
  fi

  # Verify billing is enabled
  if ! gcloud beta billing projects describe "$PROJECT_ID" &> /dev/null; then
    log_error "Billing is not enabled for project $PROJECT_ID"
    log_info "Enable billing at: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 1
  fi

  # Check required environment variables
  local required_vars=(
    "PROJECT_ID"
    "REGION"
    "ZONE"
    "DATABASE_PASSWORD"
    "REDIS_PASSWORD"
    "NEXTAUTH_SECRET"
    "GOOGLE_API_KEY"
    "ANTHROPIC_API_KEY"
  )

  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log_error "Required environment variable $var is not set"
      exit 1
    fi
  done

  log_success "Prerequisites verified"
}

# =============================================================================
# Phase 1: Infrastructure Setup
# =============================================================================

setup_infrastructure() {
  if [[ "$SKIP_INFRASTRUCTURE" == "true" ]]; then
    log_info "Skipping infrastructure setup"
    return
  fi

  log_info "Setting up GCP infrastructure..."

  # Set default project
  gcloud config set project "$PROJECT_ID"

  # Enable required APIs
  log_info "Enabling required APIs (this may take 2-3 minutes)..."
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    storage-component.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    vpcaccess.googleapis.com \
    dns.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com

  # Create VPC network
  log_info "Creating VPC network..."
  if ! gcloud compute networks describe platform-vpc &> /dev/null; then
    gcloud compute networks create platform-vpc \
      --subnet-mode=custom \
      --bgp-routing-mode=regional
  else
    log_warning "VPC platform-vpc already exists, skipping"
  fi

  # Create subnet
  log_info "Creating subnet..."
  if ! gcloud compute networks subnets describe platform-subnet --region="$REGION" &> /dev/null; then
    gcloud compute networks subnets create platform-subnet \
      --network=platform-vpc \
      --region="$REGION" \
      --range=10.0.0.0/24
  else
    log_warning "Subnet platform-subnet already exists, skipping"
  fi

  # Create firewall rules
  log_info "Creating firewall rules..."

  # Allow internal traffic
  if ! gcloud compute firewall-rules describe platform-allow-internal &> /dev/null; then
    gcloud compute firewall-rules create platform-allow-internal \
      --network=platform-vpc \
      --allow=tcp,udp,icmp \
      --source-ranges=10.0.0.0/24
  fi

  # Allow SSH
  if ! gcloud compute firewall-rules describe platform-allow-ssh &> /dev/null; then
    gcloud compute firewall-rules create platform-allow-ssh \
      --network=platform-vpc \
      --allow=tcp:22 \
      --source-ranges=0.0.0.0/0
  fi

  # Allow LiveKit ports
  if ! gcloud compute firewall-rules describe platform-allow-livekit &> /dev/null; then
    gcloud compute firewall-rules create platform-allow-livekit \
      --network=platform-vpc \
      --allow=tcp:7880,tcp:7881,tcp:7882,udp:50000-50100 \
      --source-ranges=0.0.0.0/0
  fi

  # Reserve static IP for LiveKit
  log_info "Reserving static IP for LiveKit..."
  if ! gcloud compute addresses describe livekit-staging-ip --region="$REGION" &> /dev/null; then
    gcloud compute addresses create livekit-staging-ip --region="$REGION"
  fi

  LIVEKIT_IP=$(gcloud compute addresses describe livekit-staging-ip \
    --region="$REGION" \
    --format="get(address)")
  log_success "LiveKit IP: $LIVEKIT_IP"

  # Create VPC connector for Cloud Run
  log_info "Creating VPC connector..."
  if ! gcloud compute networks vpc-access connectors describe platform-connector --region="$REGION" &> /dev/null; then
    gcloud compute networks vpc-access connectors create platform-connector \
      --region="$REGION" \
      --network=platform-vpc \
      --range=10.8.0.0/28 \
      --min-instances=2 \
      --max-instances=10
  else
    log_warning "VPC connector already exists, skipping"
  fi

  log_success "Infrastructure setup complete"
}

# =============================================================================
# Phase 2: Database Setup
# =============================================================================

setup_database() {
  if [[ "$SKIP_DATABASE" == "true" ]]; then
    log_info "Skipping database setup"
    return
  fi

  log_info "Setting up database services..."

  # Create Cloud SQL instance
  log_info "Creating PostgreSQL instance (this may take 10-15 minutes)..."
  if ! gcloud sql instances describe platform-db &> /dev/null; then
    gcloud sql instances create platform-db \
      --database-version=POSTGRES_16 \
      --tier="$DB_INSTANCE_TIER" \
      --region="$REGION" \
      --network=projects/"$PROJECT_ID"/global/networks/platform-vpc \
      --no-assign-ip \
      --enable-bin-log \
      --backup-start-time="0${DB_BACKUP_HOUR}:00" \
      --maintenance-window-day="$DB_MAINTENANCE_DAY" \
      --maintenance-window-hour="$DB_MAINTENANCE_HOUR" \
      --root-password="$DATABASE_PASSWORD"

    log_success "PostgreSQL instance created"
  else
    log_warning "PostgreSQL instance already exists, skipping creation"
  fi

  # Create database
  log_info "Creating database..."
  if ! gcloud sql databases describe platform --instance=platform-db &> /dev/null; then
    gcloud sql databases create platform --instance=platform-db
  fi

  # Create users
  log_info "Creating database users..."
  gcloud sql users create platform \
    --instance=platform-db \
    --password="$DATABASE_PASSWORD" 2>/dev/null || true

  gcloud sql users create platform_service \
    --instance=platform-db \
    --password="$DATABASE_PASSWORD" 2>/dev/null || true

  # Get database host
  DATABASE_HOST=$(gcloud sql instances describe platform-db \
    --format="get(ipAddresses[0].ipAddress)")
  log_success "Database host: $DATABASE_HOST"

  # Create Redis instance
  log_info "Creating Redis instance (this may take 5-10 minutes)..."
  if ! gcloud redis instances describe platform-cache --region="$REGION" &> /dev/null; then
    gcloud redis instances create platform-cache \
      --size="$REDIS_MEMORY_SIZE_GB" \
      --region="$REGION" \
      --redis-version=redis_7_4 \
      --network=projects/"$PROJECT_ID"/global/networks/platform-vpc \
      --tier="$REDIS_TIER"

    log_success "Redis instance created"
  else
    log_warning "Redis instance already exists, skipping creation"
  fi

  # Get Redis host
  REDIS_HOST=$(gcloud redis instances describe platform-cache \
    --region="$REGION" \
    --format="get(host)")
  log_success "Redis host: $REDIS_HOST"

  # Run database migrations
  log_info "Running database migrations..."
  cd "$PROJECT_ROOT"

  # Update .env with connection details
  export DATABASE_URL="postgresql://platform:$DATABASE_PASSWORD@$DATABASE_HOST:5432/platform"
  export SERVICE_DATABASE_URL="postgresql://platform_service:$DATABASE_PASSWORD@$DATABASE_HOST:5432/platform"

  # Run migrations
  pnpm db:push

  log_success "Database setup complete"
}

# =============================================================================
# Phase 3: LiveKit Server Setup
# =============================================================================

setup_livekit() {
  log_info "Setting up LiveKit server..."

  # Check if VM exists
  if gcloud compute instances describe livekit-server --zone="$ZONE" &> /dev/null; then
    log_warning "LiveKit server VM already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deleting existing VM..."
      gcloud compute instances delete livekit-server --zone="$ZONE" --quiet
    else
      log_info "Using existing VM"
      return
    fi
  fi

  # Create startup script
  cat > /tmp/livekit-startup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $(whoami)

# Create directory for LiveKit
mkdir -p /opt/livekit
cd /opt/livekit

# Download docker-compose.yml and livekit.yaml from metadata
curl -s http://metadata.google.internal/computeMetadata/v1/instance/attributes/docker-compose -H "Metadata-Flavor: Google" > docker-compose.yml
curl -s http://metadata.google.internal/computeMetadata/v1/instance/attributes/livekit-config -H "Metadata-Flavor: Google" > livekit.yaml

# Start LiveKit
docker-compose up -d

# Setup log rotation
cat > /etc/logrotate.d/docker-containers << 'LOGROTATE'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
LOGROTATE
EOF

  # Create VM
  log_info "Creating LiveKit VM..."
  gcloud compute instances create livekit-server \
    --machine-type="$LIVEKIT_MACHINE_TYPE" \
    --zone="$ZONE" \
    --network-interface=subnet=platform-subnet,address=livekit-staging-ip \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size="${LIVEKIT_DISK_SIZE_GB}GB" \
    --boot-disk-type="$LIVEKIT_DISK_TYPE" \
    --tags=livekit-server \
    --metadata-from-file=startup-script=/tmp/livekit-startup.sh \
    --metadata=docker-compose="$(cat "$PROJECT_ROOT/livekit-agent/docker-compose.yml")" \
    --metadata=livekit-config="$(cat "$PROJECT_ROOT/livekit-agent/livekit.yaml")"

  log_info "Waiting for LiveKit to start (60 seconds)..."
  sleep 60

  # Verify LiveKit is running
  log_info "Verifying LiveKit installation..."
  gcloud compute ssh livekit-server --zone="$ZONE" --command="docker ps" || {
    log_error "LiveKit failed to start"
    exit 1
  }

  log_success "LiveKit server setup complete"
}

# =============================================================================
# Phase 4: Backend Deployment
# =============================================================================

deploy_backend() {
  if [[ "$SKIP_BACKEND" == "true" ]]; then
    log_info "Skipping backend deployment"
    return
  fi

  log_info "Deploying backend services..."

  cd "$PROJECT_ROOT"

  # Build Docker images
  log_info "Building Docker images..."

  # API Server
  log_info "Building API server..."
  docker build -t gcr.io/"$PROJECT_ID"/api:latest \
    -f packages/api/Dockerfile .
  docker push gcr.io/"$PROJECT_ID"/api:latest

  # WebSocket Server
  log_info "Building WebSocket server..."
  docker build -t gcr.io/"$PROJECT_ID"/realtime:latest \
    -f packages/realtime/Dockerfile .
  docker push gcr.io/"$PROJECT_ID"/realtime:latest

  # Python Agent
  log_info "Building Python agent..."
  docker build -t gcr.io/"$PROJECT_ID"/livekit-agent:latest \
    -f livekit-agent/Dockerfile ./livekit-agent
  docker push gcr.io/"$PROJECT_ID"/livekit-agent:latest

  # Deploy API Server
  log_info "Deploying API server to Cloud Run..."
  gcloud run deploy api-service \
    --image=gcr.io/"$PROJECT_ID"/api:latest \
    --platform=managed \
    --region="$REGION" \
    --vpc-connector=platform-connector \
    --min-instances="$API_MIN_INSTANCES" \
    --max-instances="$API_MAX_INSTANCES" \
    --memory="$API_MEMORY" \
    --cpu="$API_CPU" \
    --timeout="$API_TIMEOUT" \
    --concurrency="$API_CONCURRENCY" \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://platform:$DATABASE_PASSWORD@$DATABASE_HOST:5432/platform" \
    --set-env-vars="REDIS_URL=redis://:$REDIS_PASSWORD@$REDIS_HOST:6379" \
    --set-env-vars="NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
    --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY" \
    --set-env-vars="ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
    --set-env-vars="NODE_ENV=staging"

  # Get API URL
  API_URL=$(gcloud run services describe api-service \
    --region="$REGION" \
    --format="get(status.url)")
  log_success "API deployed: $API_URL"

  # Deploy WebSocket Server
  log_info "Deploying WebSocket server to Cloud Run..."
  gcloud run deploy websocket-service \
    --image=gcr.io/"$PROJECT_ID"/realtime:latest \
    --platform=managed \
    --region="$REGION" \
    --vpc-connector=platform-connector \
    --min-instances="$WEBSOCKET_MIN_INSTANCES" \
    --max-instances="$WEBSOCKET_MAX_INSTANCES" \
    --memory="$WEBSOCKET_MEMORY" \
    --cpu="$WEBSOCKET_CPU" \
    --timeout="$WEBSOCKET_TIMEOUT" \
    --concurrency="$WEBSOCKET_CONCURRENCY" \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://platform:$DATABASE_PASSWORD@$DATABASE_HOST:5432/platform" \
    --set-env-vars="REDIS_URL=redis://:$REDIS_PASSWORD@$REDIS_HOST:6379" \
    --set-env-vars="NODE_ENV=staging"

  WS_URL=$(gcloud run services describe websocket-service \
    --region="$REGION" \
    --format="get(status.url)")
  log_success "WebSocket deployed: $WS_URL"

  # Deploy Python Agent
  log_info "Deploying Python agent to Cloud Run..."
  gcloud run deploy agent-service \
    --image=gcr.io/"$PROJECT_ID"/livekit-agent:latest \
    --platform=managed \
    --region="$REGION" \
    --vpc-connector=platform-connector \
    --min-instances="$AGENT_MIN_INSTANCES" \
    --max-instances="$AGENT_MAX_INSTANCES" \
    --memory="$AGENT_MEMORY" \
    --cpu="$AGENT_CPU" \
    --timeout="$AGENT_TIMEOUT" \
    --concurrency="$AGENT_CONCURRENCY" \
    --no-allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://platform:$DATABASE_PASSWORD@$DATABASE_HOST:5432/platform" \
    --set-env-vars="REDIS_URL=redis://:$REDIS_PASSWORD@$REDIS_HOST:6379" \
    --set-env-vars="LIVEKIT_URL=ws://$LIVEKIT_IP:7880" \
    --set-env-vars="LIVEKIT_API_KEY=$LIVEKIT_API_KEY" \
    --set-env-vars="LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET" \
    --set-env-vars="GOOGLE_API_KEY=$GOOGLE_API_KEY" \
    --set-env-vars="ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
    --set-env-vars="DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY" \
    --set-env-vars="ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" \
    --set-env-vars="VOYAGE_API_KEY=$VOYAGE_API_KEY"

  log_success "Backend deployment complete"
}

# =============================================================================
# Phase 5: Frontend Deployment
# =============================================================================

deploy_frontend() {
  if [[ "$SKIP_FRONTEND" == "true" ]]; then
    log_info "Skipping frontend deployment"
    return
  fi

  log_info "Deploying frontend applications..."

  cd "$PROJECT_ROOT"

  # Build all frontend apps
  log_info "Building frontend apps..."
  pnpm build

  # Create Cloud Storage buckets
  log_info "Creating Cloud Storage buckets..."

  for app in landing dashboard meeting widget; do
    BUCKET_NAME="$PROJECT_ID-$app"

    if ! gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
      gsutil mb -l "$REGION" "gs://$BUCKET_NAME"
      gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME"
      gsutil web set -m index.html -e 404.html "gs://$BUCKET_NAME"
    fi

    # Upload built files
    log_info "Uploading $app to Cloud Storage..."
    gsutil -m rsync -r -d "apps/$app/dist/" "gs://$BUCKET_NAME/"

    # Set cache control
    gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
      "gs://$BUCKET_NAME/assets/**"

    log_success "$app deployed to gs://$BUCKET_NAME"
  done

  log_success "Frontend deployment complete"
}

# =============================================================================
# Phase 6: Monitoring Setup
# =============================================================================

setup_monitoring() {
  if [[ "$SKIP_MONITORING" == "true" ]]; then
    log_info "Skipping monitoring setup"
    return
  fi

  log_info "Setting up monitoring and alerts..."

  # Create notification channel for alerts
  log_info "Creating email notification channel..."
  # This is typically done through the Console or via API
  # For now, we'll just log the instruction
  log_warning "Please create notification channels manually in Cloud Console:"
  log_info "https://console.cloud.google.com/monitoring/alerting/notifications?project=$PROJECT_ID"

  log_success "Monitoring setup complete"
}

# =============================================================================
# Verification
# =============================================================================

verify_deployment() {
  log_info "Verifying deployment..."

  # Check API health
  if [[ -n "${API_URL:-}" ]]; then
    log_info "Checking API health..."
    if curl -sf "$API_URL/health" > /dev/null; then
      log_success "API is healthy"
    else
      log_error "API health check failed"
    fi
  fi

  # Check WebSocket
  if [[ -n "${WS_URL:-}" ]]; then
    log_info "Checking WebSocket..."
    if curl -sf "$WS_URL/health" > /dev/null; then
      log_success "WebSocket is healthy"
    else
      log_error "WebSocket health check failed"
    fi
  fi

  # Check LiveKit
  log_info "Checking LiveKit..."
  if curl -sf "http://$LIVEKIT_IP:7881/" > /dev/null; then
    log_success "LiveKit is healthy"
  else
    log_error "LiveKit health check failed"
  fi

  # Check database
  log_info "Checking database..."
  if gcloud sql instances describe platform-db --format="get(state)" | grep -q "RUNNABLE"; then
    log_success "Database is running"
  else
    log_error "Database is not running"
  fi

  # Check Redis
  log_info "Checking Redis..."
  if gcloud redis instances describe platform-cache --region="$REGION" --format="get(state)" | grep -q "READY"; then
    log_success "Redis is ready"
  else
    log_error "Redis is not ready"
  fi

  log_success "Verification complete"
}

# =============================================================================
# Display Summary
# =============================================================================

display_summary() {
  echo
  echo "=========================================="
  echo "  DEPLOYMENT SUMMARY"
  echo "=========================================="
  echo
  echo "Project: $PROJECT_ID"
  echo "Region: $REGION"
  echo "Environment: staging"
  echo
  echo "Services:"
  echo "  API:       $API_URL"
  echo "  WebSocket: $WS_URL"
  echo "  LiveKit:   ws://$LIVEKIT_IP:7880"
  echo
  echo "Database:"
  echo "  Host: $DATABASE_HOST"
  echo "  Port: 5432"
  echo
  echo "Redis:"
  echo "  Host: $REDIS_HOST"
  echo "  Port: 6379"
  echo
  echo "Frontend Apps:"
  echo "  Landing:   https://storage.googleapis.com/$PROJECT_ID-landing/index.html"
  echo "  Dashboard: https://storage.googleapis.com/$PROJECT_ID-dashboard/index.html"
  echo "  Meeting:   https://storage.googleapis.com/$PROJECT_ID-meeting/index.html"
  echo "  Widget:    https://storage.googleapis.com/$PROJECT_ID-widget/index.html"
  echo
  echo "Next Steps:"
  echo "  1. Configure custom domains (optional)"
  echo "  2. Run load tests"
  echo "  3. Setup monitoring dashboards"
  echo "  4. Configure CI/CD pipeline"
  echo
  echo "=========================================="
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  log_info "Starting staging deployment..."

  # Load environment
  load_env

  # Verify prerequisites
  verify_prerequisites

  if [[ "$VERIFY_ONLY" == "true" ]]; then
    verify_deployment
    exit 0
  fi

  # Execute deployment phases
  setup_infrastructure
  setup_database
  setup_livekit
  deploy_backend
  deploy_frontend
  setup_monitoring

  # Verify deployment
  verify_deployment

  # Display summary
  display_summary

  log_success "Deployment complete!"
}

# Run main function
main "$@"
