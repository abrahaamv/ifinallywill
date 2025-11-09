#!/bin/bash
#
# PostgreSQL Backup Monitoring and Health Check Script
#
# This script monitors backup health and sends alerts for:
# 1. Missing or failed backups
# 2. Old backups (> 24 hours)
# 3. Disk space issues
# 4. Backup size anomalies
#
# Usage:
#   ./backup-monitoring.sh [--email admin@example.com] [--webhook https://hooks.slack.com/...]
#
# Recommended: Run hourly via cron
#   0 * * * * /path/to/backup-monitoring.sh --email admin@example.com
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
LOG_FILE="${BACKUP_DIR}/monitoring.log"
MAX_BACKUP_AGE_HOURS=26  # Alert if backup older than 26 hours
MIN_DISK_SPACE_GB=20     # Alert if less than 20GB free
MIN_BACKUP_SIZE_MB=10    # Alert if backup smaller than 10MB

# Alert configuration (can be overridden via command line)
EMAIL_ALERT=""
WEBHOOK_URL=""
ALERT_LEVEL="WARNING"  # INFO, WARNING, CRITICAL

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --email)
            EMAIL_ALERT="$2"
            shift 2
            ;;
        --webhook)
            WEBHOOK_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# Alert function
send_alert() {
    local level="$1"
    local message="$2"
    local color="${3:-#FFA500}"  # Default: orange

    log "${level}: ${message}"

    # Email alert
    if [ -n "${EMAIL_ALERT}" ]; then
        echo "${message}" | mail -s "[${level}] PostgreSQL Backup Alert" "${EMAIL_ALERT}" 2>/dev/null || true
    fi

    # Webhook alert (Slack/Discord format)
    if [ -n "${WEBHOOK_URL}" ]; then
        local payload
        payload=$(cat <<EOF
{
  "text": "${level}: PostgreSQL Backup Alert",
  "attachments": [
    {
      "color": "${color}",
      "text": "${message}",
      "footer": "Backup Monitoring",
      "ts": $(date +%s)
    }
  ]
}
EOF
        )
        curl -X POST -H 'Content-type: application/json' \
            --data "${payload}" \
            "${WEBHOOK_URL}" 2>/dev/null || true
    fi
}

# Check if backup directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    send_alert "CRITICAL" "Backup directory does not exist: ${BACKUP_DIR}" "#FF0000"
    exit 1
fi

# Health checks
ERRORS=0
WARNINGS=0

log "=== Starting Backup Health Check ==="

# 1. Check latest backup age
log "Checking latest backup age..."
LATEST_BACKUP=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')

if [ -z "${LATEST_BACKUP}" ]; then
    send_alert "CRITICAL" "No backups found in ${BACKUP_DIR}" "#FF0000"
    ((ERRORS++))
else
    BACKUP_AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "${LATEST_BACKUP}") ))
    BACKUP_AGE_HOURS=$(( BACKUP_AGE_SECONDS / 3600 ))

    log "Latest backup: ${LATEST_BACKUP}"
    log "Backup age: ${BACKUP_AGE_HOURS} hours"

    if [ ${BACKUP_AGE_HOURS} -gt ${MAX_BACKUP_AGE_HOURS} ]; then
        send_alert "CRITICAL" "Latest backup is ${BACKUP_AGE_HOURS} hours old (threshold: ${MAX_BACKUP_AGE_HOURS}h)" "#FF0000"
        ((ERRORS++))
    elif [ ${BACKUP_AGE_HOURS} -gt 24 ]; then
        send_alert "WARNING" "Latest backup is ${BACKUP_AGE_HOURS} hours old" "#FFA500"
        ((WARNINGS++))
    else
        log "✓ Backup age is acceptable"
    fi
fi

# 2. Check backup size
if [ -n "${LATEST_BACKUP}" ] && [ -d "${LATEST_BACKUP}" ]; then
    log "Checking backup size..."
    BACKUP_SIZE_KB=$(du -sk "${LATEST_BACKUP}" | awk '{print $1}')
    BACKUP_SIZE_MB=$((BACKUP_SIZE_KB / 1024))

    log "Backup size: ${BACKUP_SIZE_MB} MB"

    if [ ${BACKUP_SIZE_MB} -lt ${MIN_BACKUP_SIZE_MB} ]; then
        send_alert "CRITICAL" "Backup size (${BACKUP_SIZE_MB}MB) is suspiciously small (threshold: ${MIN_BACKUP_SIZE_MB}MB)" "#FF0000"
        ((ERRORS++))
    else
        log "✓ Backup size is acceptable"
    fi

    # Check for metadata file
    if [ ! -f "${LATEST_BACKUP}/backup_metadata.json" ]; then
        send_alert "WARNING" "Backup metadata file missing in ${LATEST_BACKUP}" "#FFA500"
        ((WARNINGS++))
    else
        log "✓ Backup metadata found"
    fi
fi

# 3. Check disk space
log "Checking disk space..."
AVAILABLE_SPACE_KB=$(df -k "${BACKUP_DIR}" | tail -1 | awk '{print $4}')
AVAILABLE_SPACE_GB=$((AVAILABLE_SPACE_KB / 1024 / 1024))

log "Available disk space: ${AVAILABLE_SPACE_GB} GB"

if [ ${AVAILABLE_SPACE_GB} -lt ${MIN_DISK_SPACE_GB} ]; then
    send_alert "CRITICAL" "Low disk space: ${AVAILABLE_SPACE_GB}GB available (threshold: ${MIN_DISK_SPACE_GB}GB)" "#FF0000"
    ((ERRORS++))
elif [ ${AVAILABLE_SPACE_GB} -lt $((MIN_DISK_SPACE_GB * 2)) ]; then
    send_alert "WARNING" "Disk space running low: ${AVAILABLE_SPACE_GB}GB available" "#FFA500"
    ((WARNINGS++))
else
    log "✓ Disk space is sufficient"
fi

# 4. Check backup count and retention
log "Checking backup retention..."
BACKUP_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "backup_*" 2>/dev/null | wc -l)

log "Total backups: ${BACKUP_COUNT}"

if [ ${BACKUP_COUNT} -eq 0 ]; then
    send_alert "CRITICAL" "No backups found in ${BACKUP_DIR}" "#FF0000"
    ((ERRORS++))
elif [ ${BACKUP_COUNT} -lt 3 ]; then
    send_alert "WARNING" "Only ${BACKUP_COUNT} backup(s) available (recommend 7+ for proper retention)" "#FFA500"
    ((WARNINGS++))
else
    log "✓ Backup count is acceptable"
fi

# 5. Check backup log for errors
if [ -f "${BACKUP_DIR}/backup.log" ]; then
    log "Checking backup logs for errors..."
    ERROR_COUNT=$(grep -c "ERROR:" "${BACKUP_DIR}/backup.log" 2>/dev/null || echo "0")

    if [ ${ERROR_COUNT} -gt 0 ]; then
        RECENT_ERROR=$(grep "ERROR:" "${BACKUP_DIR}/backup.log" | tail -1)
        send_alert "WARNING" "Found ${ERROR_COUNT} error(s) in backup log. Recent: ${RECENT_ERROR}" "#FFA500"
        ((WARNINGS++))
    else
        log "✓ No errors in backup log"
    fi
fi

# 6. Check WAL archiving
if [ -d "${BACKUP_DIR}/wal_archive" ]; then
    log "Checking WAL archive..."
    WAL_COUNT=$(find "${BACKUP_DIR}/wal_archive" -type f -name "*.wal" -o -name "*gz" 2>/dev/null | wc -l)

    log "WAL files archived: ${WAL_COUNT}"

    if [ ${WAL_COUNT} -eq 0 ]; then
        send_alert "WARNING" "No WAL files found in archive (continuous backup may not be working)" "#FFA500"
        ((WARNINGS++))
    else
        log "✓ WAL archiving is active"
    fi
fi

# Summary
log "=== Health Check Complete ==="
log "Errors: ${ERRORS}, Warnings: ${WARNINGS}"

if [ ${ERRORS} -eq 0 ] && [ ${WARNINGS} -eq 0 ]; then
    log "✓ All backup health checks passed"
    exit 0
elif [ ${ERRORS} -gt 0 ]; then
    log "✗ Health check failed with ${ERRORS} error(s) and ${WARNINGS} warning(s)"
    exit 1
else
    log "⚠ Health check completed with ${WARNINGS} warning(s)"
    exit 0
fi
