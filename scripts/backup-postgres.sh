#!/bin/bash
#
# PostgreSQL Automated Backup Script with WAL Archiving
#
# This script performs:
# 1. Full base backup using pg_basebackup
# 2. WAL (Write-Ahead Log) archiving for point-in-time recovery
# 3. Automatic backup retention (keeps last 7 daily backups)
# 4. Backup verification and integrity checks
#
# Usage:
#   ./backup-postgres.sh [base|verify|cleanup]
#
# Environment Variables Required:
#   PGHOST          - PostgreSQL host (default: localhost)
#   PGPORT          - PostgreSQL port (default: 5432)
#   PGUSER          - PostgreSQL user (default: platform)
#   PGPASSWORD      - PostgreSQL password
#   BACKUP_DIR      - Backup destination directory (default: /var/backups/postgresql)
#   WAL_ARCHIVE_DIR - WAL archive directory (default: /var/backups/postgresql/wal_archive)
#   RETENTION_DAYS  - Number of days to retain backups (default: 7)
#

set -euo pipefail

# Configuration
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-platform}"
PGDATABASE="${PGDATABASE:-platform}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/backups/postgresql/wal_archive}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Timestamp for backup naming
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${LOG_FILE}" >&2
    exit 1
}

# Create backup directories if they don't exist
mkdir -p "${BACKUP_DIR}" "${WAL_ARCHIVE_DIR}"

# Function: Perform base backup
perform_base_backup() {
    log "Starting PostgreSQL base backup: ${BACKUP_NAME}"

    # Verify PostgreSQL connection
    if ! psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -c "SELECT 1" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL at ${PGHOST}:${PGPORT}"
    fi

    # Create backup using pg_basebackup
    log "Running pg_basebackup..."
    if pg_basebackup \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -D "${BACKUP_PATH}" \
        -Ft \
        -z \
        -P \
        -X stream \
        --checkpoint=fast \
        --label="${BACKUP_NAME}"; then
        log "Base backup completed successfully: ${BACKUP_PATH}"
    else
        error "pg_basebackup failed"
    fi

    # Create backup metadata
    cat > "${BACKUP_PATH}/backup_metadata.json" <<EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "database": "${PGDATABASE}",
  "host": "${PGHOST}",
  "port": ${PGPORT},
  "backup_method": "pg_basebackup",
  "wal_archiving": true,
  "compression": "gzip",
  "completed_at": "$(date -Iseconds)"
}
EOF

    # Calculate backup size
    BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | awk '{print $1}')
    log "Backup size: ${BACKUP_SIZE}"

    # Create checksum for integrity verification
    log "Calculating backup checksum..."
    find "${BACKUP_PATH}" -type f -exec sha256sum {} \; > "${BACKUP_PATH}/checksums.sha256"
    log "Checksum file created: ${BACKUP_PATH}/checksums.sha256"

    # Create symbolic link to latest backup
    rm -f "${BACKUP_DIR}/latest"
    ln -s "${BACKUP_PATH}" "${BACKUP_DIR}/latest"

    log "Base backup completed: ${BACKUP_PATH}"
}

# Function: Verify backup integrity
verify_backup() {
    local VERIFY_PATH="${1:-${BACKUP_DIR}/latest}"

    if [ ! -d "${VERIFY_PATH}" ]; then
        error "Backup path does not exist: ${VERIFY_PATH}"
    fi

    log "Verifying backup integrity: ${VERIFY_PATH}"

    # Verify checksums
    if [ -f "${VERIFY_PATH}/checksums.sha256" ]; then
        if (cd "${VERIFY_PATH}" && sha256sum -c checksums.sha256 --quiet); then
            log "Checksum verification: PASSED"
        else
            error "Checksum verification: FAILED"
        fi
    else
        error "Checksum file not found: ${VERIFY_PATH}/checksums.sha256"
    fi

    # Verify backup metadata
    if [ -f "${VERIFY_PATH}/backup_metadata.json" ]; then
        log "Backup metadata found"
        cat "${VERIFY_PATH}/backup_metadata.json" | tee -a "${LOG_FILE}"
    else
        error "Backup metadata not found: ${VERIFY_PATH}/backup_metadata.json"
    fi

    log "Backup verification completed successfully"
}

# Function: Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days"

    # Find and remove backups older than retention period
    DELETED_COUNT=0
    while IFS= read -r -d '' backup_dir; do
        BACKUP_AGE=$(find "${backup_dir}" -maxdepth 0 -mtime +${RETENTION_DAYS} | wc -l)
        if [ "${BACKUP_AGE}" -gt 0 ]; then
            log "Removing old backup: ${backup_dir}"
            rm -rf "${backup_dir}"
            ((DELETED_COUNT++))
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" -print0)

    log "Removed ${DELETED_COUNT} old backup(s)"

    # Cleanup old WAL files (keep only those needed by latest backup)
    log "Cleaning up old WAL archive files"
    # Note: This is a simple cleanup. In production, use pg_archivecleanup for proper WAL cleanup
    find "${WAL_ARCHIVE_DIR}" -type f -mtime +${RETENTION_DAYS} -delete

    log "Cleanup completed"
}

# Function: Display backup statistics
show_stats() {
    log "=== Backup Statistics ==="

    # Total backup size
    TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | awk '{print $1}')
    log "Total backup size: ${TOTAL_SIZE}"

    # Number of backups
    BACKUP_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" | wc -l)
    log "Number of backups: ${BACKUP_COUNT}"

    # List all backups
    log "Available backups:"
    find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" -printf "%T@ %p\n" | \
        sort -rn | \
        awk '{print $2}' | \
        while read -r backup; do
            SIZE=$(du -sh "${backup}" | awk '{print $1}')
            MTIME=$(stat -c %y "${backup}" | cut -d'.' -f1)
            log "  - $(basename ${backup}) (${SIZE}, ${MTIME})"
        done

    # WAL archive size
    WAL_SIZE=$(du -sh "${WAL_ARCHIVE_DIR}" | awk '{print $1}')
    log "WAL archive size: ${WAL_SIZE}"

    log "======================="
}

# Main execution
case "${1:-base}" in
    base)
        perform_base_backup
        verify_backup "${BACKUP_PATH}"
        cleanup_old_backups
        show_stats
        ;;
    verify)
        verify_backup "${2:-${BACKUP_DIR}/latest}"
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    stats)
        show_stats
        ;;
    *)
        echo "Usage: $0 [base|verify|cleanup|stats]"
        echo ""
        echo "Commands:"
        echo "  base    - Perform full base backup (default)"
        echo "  verify  - Verify backup integrity"
        echo "  cleanup - Remove old backups beyond retention period"
        echo "  stats   - Show backup statistics"
        exit 1
        ;;
esac

log "Backup script completed successfully"
exit 0
