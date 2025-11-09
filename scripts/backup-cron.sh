#!/bin/bash
#
# Cron Job Setup for Automated PostgreSQL Backups
#
# This script sets up automated daily backups at 2:00 AM
#
# Usage:
#   sudo ./backup-cron.sh install   # Install cron job
#   sudo ./backup-cron.sh remove    # Remove cron job
#   sudo ./backup-cron.sh status    # Show cron job status
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-postgres.sh"
CRON_USER="postgres"
CRON_TIME="0 2 * * *"  # 2:00 AM daily

install_cron() {
    echo "Installing PostgreSQL backup cron job..."

    # Verify backup script exists
    if [ ! -f "${BACKUP_SCRIPT}" ]; then
        echo "ERROR: Backup script not found: ${BACKUP_SCRIPT}"
        exit 1
    fi

    # Create environment file for cron job
    cat > /tmp/backup-cron-env <<EOF
# PostgreSQL Backup Environment Variables
PGHOST=localhost
PGPORT=5432
PGUSER=platform
PGDATABASE=platform
PGPASSWORD=platform_dev_password
BACKUP_DIR=/var/backups/postgresql
WAL_ARCHIVE_DIR=/var/backups/postgresql/wal_archive
RETENTION_DAYS=7
PATH=/usr/local/bin:/usr/bin:/bin
EOF

    # Install cron job for postgres user
    (crontab -u ${CRON_USER} -l 2>/dev/null || true; cat <<CRON
# PostgreSQL Automated Daily Backup (2:00 AM)
# Source environment variables and run backup script
${CRON_TIME} . /tmp/backup-cron-env && ${BACKUP_SCRIPT} base >> /var/backups/postgresql/cron.log 2>&1
CRON
    ) | crontab -u ${CRON_USER} -

    echo "Cron job installed successfully"
    echo "Schedule: Daily at 2:00 AM"
    echo "User: ${CRON_USER}"
    echo "Backup script: ${BACKUP_SCRIPT}"
    echo ""
    echo "To view cron jobs: sudo crontab -u ${CRON_USER} -l"
    echo "To view backup logs: tail -f /var/backups/postgresql/backup.log"
}

remove_cron() {
    echo "Removing PostgreSQL backup cron job..."

    # Remove cron job
    crontab -u ${CRON_USER} -l 2>/dev/null | \
        grep -v "backup-postgres.sh" | \
        crontab -u ${CRON_USER} - || true

    # Remove environment file
    rm -f /tmp/backup-cron-env

    echo "Cron job removed successfully"
}

show_status() {
    echo "=== PostgreSQL Backup Cron Status ==="
    echo ""
    echo "Cron jobs for ${CRON_USER}:"
    crontab -u ${CRON_USER} -l 2>/dev/null | grep -E "backup-postgres|^#" || echo "No backup cron jobs found"
    echo ""
    echo "Recent backup logs:"
    if [ -f /var/backups/postgresql/backup.log ]; then
        tail -20 /var/backups/postgresql/backup.log
    else
        echo "No backup logs found"
    fi
}

# Main execution
case "${1:-}" in
    install)
        install_cron
        ;;
    remove)
        remove_cron
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {install|remove|status}"
        echo ""
        echo "Commands:"
        echo "  install - Install automated daily backup cron job"
        echo "  remove  - Remove backup cron job"
        echo "  status  - Show cron job status and recent logs"
        exit 1
        ;;
esac
