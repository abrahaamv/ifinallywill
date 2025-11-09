#!/bin/bash
#
# PostgreSQL Restore Script with Point-in-Time Recovery
#
# This script restores PostgreSQL from:
# 1. Base backup (pg_basebackup format)
# 2. WAL archives for point-in-time recovery (PITR)
#
# WARNING: This script will STOP PostgreSQL and REPLACE the data directory
#
# Usage:
#   ./restore-postgres.sh <backup_path> [recovery_target_time]
#
# Examples:
#   # Restore latest backup
#   ./restore-postgres.sh /var/backups/postgresql/latest
#
#   # Restore to specific point in time
#   ./restore-postgres.sh /var/backups/postgresql/backup_20250108_120000 "2025-01-08 12:30:00"
#
# Environment Variables Required:
#   PGDATA          - PostgreSQL data directory (default: /var/lib/postgresql/data)
#   WAL_ARCHIVE_DIR - WAL archive directory (default: /var/backups/postgresql/wal_archive)
#

set -euo pipefail

# Configuration
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/backups/postgresql/wal_archive}"
BACKUP_PATH="${1:-}"
RECOVERY_TARGET_TIME="${2:-}"

# Logging
LOG_FILE="/var/log/postgresql/restore.log"
mkdir -p "$(dirname ${LOG_FILE})"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${LOG_FILE}" >&2
    exit 1
}

# Validate arguments
if [ -z "${BACKUP_PATH}" ]; then
    error "Usage: $0 <backup_path> [recovery_target_time]"
fi

if [ ! -d "${BACKUP_PATH}" ]; then
    error "Backup path does not exist: ${BACKUP_PATH}"
fi

# Display warning
log "=========================================="
log "WARNING: PostgreSQL Restore Operation"
log "=========================================="
log "This will:"
log "  1. STOP PostgreSQL"
log "  2. REPLACE data directory: ${PGDATA}"
log "  3. Restore from: ${BACKUP_PATH}"
if [ -n "${RECOVERY_TARGET_TIME}" ]; then
    log "  4. Recover to: ${RECOVERY_TARGET_TIME}"
else
    log "  4. Recover to: End of WAL"
fi
log "=========================================="
log ""

# Prompt for confirmation (in production, use --force flag to skip)
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# Step 1: Stop PostgreSQL
log "Stopping PostgreSQL..."
if command -v systemctl &> /dev/null; then
    sudo systemctl stop postgresql || error "Failed to stop PostgreSQL"
elif command -v pg_ctl &> /dev/null; then
    pg_ctl stop -D "${PGDATA}" -m fast || error "Failed to stop PostgreSQL"
else
    error "Cannot find systemctl or pg_ctl to stop PostgreSQL"
fi
log "PostgreSQL stopped"

# Step 2: Backup existing data directory
log "Backing up existing data directory..."
if [ -d "${PGDATA}" ]; then
    BACKUP_OLD="${PGDATA}.backup.$(date +%Y%m%d_%H%M%S)"
    sudo mv "${PGDATA}" "${BACKUP_OLD}"
    log "Existing data backed up to: ${BACKUP_OLD}"
else
    log "No existing data directory found"
fi

# Step 3: Create new data directory
log "Creating new data directory: ${PGDATA}"
sudo mkdir -p "${PGDATA}"
sudo chown -R postgres:postgres "${PGDATA}"
sudo chmod 0700 "${PGDATA}"

# Step 4: Extract base backup
log "Extracting base backup..."
if [ -f "${BACKUP_PATH}/base.tar.gz" ]; then
    sudo tar -xzf "${BACKUP_PATH}/base.tar.gz" -C "${PGDATA}"
    log "Base backup extracted"
else
    # Handle pg_basebackup format (multiple tar.gz files)
    for tarfile in "${BACKUP_PATH}"/*.tar.gz; do
        if [ -f "${tarfile}" ]; then
            log "Extracting: $(basename ${tarfile})"
            sudo tar -xzf "${tarfile}" -C "${PGDATA}"
        fi
    done
    log "All backup files extracted"
fi

# Step 5: Configure recovery
log "Configuring recovery settings..."

# Create recovery signal file
sudo touch "${PGDATA}/recovery.signal"

# Create postgresql.auto.conf for recovery settings
cat > /tmp/recovery.conf <<EOF
# Recovery Configuration
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f %p'
recovery_target_action = 'promote'
EOF

# Add point-in-time recovery target if specified
if [ -n "${RECOVERY_TARGET_TIME}" ]; then
    echo "recovery_target_time = '${RECOVERY_TARGET_TIME}'" >> /tmp/recovery.conf
    echo "recovery_target_inclusive = true" >> /tmp/recovery.conf
    log "Point-in-time recovery target set: ${RECOVERY_TARGET_TIME}"
fi

# Move recovery configuration
sudo mv /tmp/recovery.conf "${PGDATA}/postgresql.auto.conf"
sudo chown postgres:postgres "${PGDATA}/postgresql.auto.conf"
sudo chmod 0600 "${PGDATA}/postgresql.auto.conf"

log "Recovery configuration created"

# Step 6: Start PostgreSQL in recovery mode
log "Starting PostgreSQL in recovery mode..."
if command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql || error "Failed to start PostgreSQL"
elif command -v pg_ctl &> /dev/null; then
    sudo -u postgres pg_ctl start -D "${PGDATA}" || error "Failed to start PostgreSQL"
else
    error "Cannot find systemctl or pg_ctl to start PostgreSQL"
fi

log "PostgreSQL started in recovery mode"

# Step 7: Monitor recovery progress
log "Monitoring recovery progress..."
log "Waiting for recovery to complete (this may take several minutes)..."

# Wait for recovery to complete
for i in {1..60}; do
    if [ -f "${PGDATA}/recovery.signal" ]; then
        sleep 5
        log "Recovery in progress... (${i}/60)"
    else
        log "Recovery completed successfully"
        break
    fi

    if [ $i -eq 60 ]; then
        error "Recovery timeout after 5 minutes"
    fi
done

# Step 8: Verify restore
log "Verifying restore..."
if psql -U postgres -d platform -c "SELECT 1" > /dev/null 2>&1; then
    log "Database connection: OK"

    # Get database stats
    DB_SIZE=$(psql -U postgres -d platform -t -c "SELECT pg_size_pretty(pg_database_size('platform'))")
    TABLE_COUNT=$(psql -U postgres -d platform -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

    log "Database size: ${DB_SIZE}"
    log "Table count: ${TABLE_COUNT}"
else
    error "Cannot connect to restored database"
fi

# Step 9: Display recovery summary
log "=========================================="
log "Restore Summary"
log "=========================================="
log "Backup source: ${BACKUP_PATH}"
log "Data directory: ${PGDATA}"
log "WAL archive: ${WAL_ARCHIVE_DIR}"
if [ -n "${RECOVERY_TARGET_TIME}" ]; then
    log "Recovery target: ${RECOVERY_TARGET_TIME}"
else
    log "Recovery target: End of WAL (latest)"
fi
log "Database size: ${DB_SIZE}"
log "Table count: ${TABLE_COUNT}"
log "Old data backup: ${BACKUP_OLD:-none}"
log "=========================================="
log "Restore completed successfully"

exit 0
