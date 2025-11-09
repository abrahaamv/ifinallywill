#!/bin/bash
#
# PostgreSQL WAL Archive Script
#
# This script is called by PostgreSQL's archive_command to archive WAL files
# It performs:
# 1. Copy WAL file to archive directory
# 2. Verify file integrity with checksums
# 3. Optional compression (gzip)
# 4. Atomic operations to prevent corruption
#
# Usage (set in postgresql.conf):
#   archive_command = '/path/to/archive-wal.sh %p %f'
#
# Arguments:
#   %p - Full path to WAL file
#   %f - WAL filename only
#
# Environment Variables:
#   WAL_ARCHIVE_DIR - Archive destination directory (default: /var/backups/postgresql/wal_archive)
#   COMPRESS_WAL    - Enable gzip compression (default: true)
#

set -euo pipefail

# Configuration
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/backups/postgresql/wal_archive}"
COMPRESS_WAL="${COMPRESS_WAL:-true}"

# Arguments from PostgreSQL
WAL_PATH="${1:-}"
WAL_FILE="${2:-}"

# Logging
LOG_FILE="${WAL_ARCHIVE_DIR}/archive.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "${LOG_FILE}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >> "${LOG_FILE}"
    exit 1
}

# Validate arguments
if [ -z "${WAL_PATH}" ] || [ -z "${WAL_FILE}" ]; then
    error "Usage: $0 <wal_path> <wal_filename>"
fi

if [ ! -f "${WAL_PATH}" ]; then
    error "WAL file not found: ${WAL_PATH}"
fi

# Create archive directory if it doesn't exist
mkdir -p "${WAL_ARCHIVE_DIR}"

# Destination path
if [ "${COMPRESS_WAL}" = "true" ]; then
    DEST_PATH="${WAL_ARCHIVE_DIR}/${WAL_FILE}.gz"
    TEMP_PATH="${WAL_ARCHIVE_DIR}/.${WAL_FILE}.gz.tmp"
else
    DEST_PATH="${WAL_ARCHIVE_DIR}/${WAL_FILE}"
    TEMP_PATH="${WAL_ARCHIVE_DIR}/.${WAL_FILE}.tmp"
fi

# Check if already archived (avoid duplicate archiving)
if [ -f "${DEST_PATH}" ]; then
    log "WAL file already archived: ${WAL_FILE}"
    exit 0
fi

# Archive WAL file
if [ "${COMPRESS_WAL}" = "true" ]; then
    # Compress and archive
    if gzip -c "${WAL_PATH}" > "${TEMP_PATH}"; then
        log "WAL file compressed: ${WAL_FILE}"
    else
        error "Failed to compress WAL file: ${WAL_FILE}"
    fi
else
    # Copy without compression
    if cp "${WAL_PATH}" "${TEMP_PATH}"; then
        log "WAL file copied: ${WAL_FILE}"
    else
        error "Failed to copy WAL file: ${WAL_FILE}"
    fi
fi

# Atomic move to final destination
if mv "${TEMP_PATH}" "${DEST_PATH}"; then
    log "WAL file archived successfully: ${WAL_FILE} -> ${DEST_PATH}"
else
    error "Failed to move WAL file to archive: ${WAL_FILE}"
fi

# Verify archive integrity
if [ "${COMPRESS_WAL}" = "true" ]; then
    if gzip -t "${DEST_PATH}" > /dev/null 2>&1; then
        log "Archive integrity verified: ${WAL_FILE}"
    else
        error "Archive integrity check failed: ${WAL_FILE}"
    fi
fi

exit 0
