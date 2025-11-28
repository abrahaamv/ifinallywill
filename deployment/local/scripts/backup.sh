#!/bin/bash
# =============================================================================
# Backup Script
# Backup PostgreSQL and Redis data
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$DEPLOY_DIR/backups"

cd "$DEPLOY_DIR"

# Load environment
source .env

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              AI Assistant Platform - Backup                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =============================================================================
# PostgreSQL Backup
# =============================================================================
echo -e "${BLUE}[1/2] Backing up PostgreSQL...${NC}"

PG_BACKUP_FILE="$BACKUP_DIR/postgres_${TIMESTAMP}.sql.gz"

docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-platform}" \
    "${POSTGRES_DB:-platform}" \
    | gzip > "$PG_BACKUP_FILE"

PG_SIZE=$(du -h "$PG_BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✓ PostgreSQL backed up: $PG_BACKUP_FILE ($PG_SIZE)${NC}"

# =============================================================================
# Redis Backup
# =============================================================================
echo -e "${BLUE}[2/2] Backing up Redis...${NC}"

REDIS_BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# Trigger Redis save
docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE >/dev/null 2>&1

# Wait for save to complete
sleep 2

# Copy dump file
docker compose cp redis:/data/dump.rdb "$REDIS_BACKUP_FILE" 2>/dev/null || {
    echo -e "${YELLOW}Note: Redis backup skipped (no dump.rdb)${NC}"
}

if [ -f "$REDIS_BACKUP_FILE" ]; then
    REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Redis backed up: $REDIS_BACKUP_FILE ($REDIS_SIZE)${NC}"
fi

# =============================================================================
# Cleanup Old Backups (keep last 7 days)
# =============================================================================
echo -e "${BLUE}Cleaning up old backups...${NC}"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete 2>/dev/null || true

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Backup Complete!                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Backup location: $BACKUP_DIR"
echo ""
echo "To restore PostgreSQL:"
echo "  gunzip -c $PG_BACKUP_FILE | docker compose exec -T postgres psql -U platform platform"
echo ""
echo "Backups older than 7 days are automatically deleted."
