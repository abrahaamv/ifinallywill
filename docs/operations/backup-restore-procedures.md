# PostgreSQL Backup and Restore Procedures

**Critical Production Infrastructure** - Database disaster recovery documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backup Configuration](#backup-configuration)
4. [Automated Backups](#automated-backups)
5. [Manual Backup](#manual-backup)
6. [Restore Procedures](#restore-procedures)
7. [Point-in-Time Recovery](#point-in-time-recovery)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This platform implements **PostgreSQL backup strategy with WAL archiving** for:

- **Base Backups**: Full database snapshots using `pg_basebackup`
- **WAL Archiving**: Continuous archiving for point-in-time recovery (PITR)
- **Retention Policy**: 7 days of daily backups
- **Verification**: Automatic checksum validation and integrity checks

### Recovery Time Objective (RTO)

- **Full restore**: ~15-30 minutes (depends on database size)
- **Point-in-time recovery**: +5-10 minutes for WAL replay

### Recovery Point Objective (RPO)

- **Maximum data loss**: 5 minutes (archive_timeout setting)
- **Typical data loss**: <1 minute (active WAL archiving)

---

## Architecture

### Backup Components

```
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │    Data      │    │   WAL Files   │    │  Archive     │ │
│  │  Directory   │───▶│  (16MB each)  │───▶│  Command     │ │
│  └──────────────┘    └───────────────┘    └──────┬───────┘ │
└──────────────────────────────────────────────────│──────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────┐
                                    │  WAL Archive Directory    │
                                    │  /var/backups/postgresql/ │
                                    │  wal_archive/             │
                                    └───────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│               Automated Backup System                        │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │  Cron Job    │───▶│  Backup       │───▶│  Base        │ │
│  │  (2:00 AM)   │    │  Script       │    │  Backups     │ │
│  └──────────────┘    └───────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
/var/backups/postgresql/
├── backup_20250108_020000/          # Base backup (timestamped)
│   ├── base.tar.gz                  # Compressed database files
│   ├── pg_wal.tar.gz                # WAL files at backup time
│   ├── backup_metadata.json         # Backup information
│   └── checksums.sha256             # Integrity checksums
├── backup_20250107_020000/          # Previous day backup
├── latest -> backup_20250108_020000 # Symlink to latest backup
├── wal_archive/                     # WAL archive directory
│   ├── 000000010000000000000001.gz  # Archived WAL files
│   ├── 000000010000000000000002.gz
│   └── archive.log                  # Archive operation logs
├── backup.log                       # Backup operation logs
└── cron.log                         # Cron job execution logs
```

---

## Backup Configuration

### Step 1: PostgreSQL Configuration

Edit `/etc/postgresql/16/main/postgresql.conf` (or Docker configuration):

```conf
# WAL Archiving Configuration
archive_mode = on
archive_command = '/path/to/scripts/archive-wal.sh %p %f'
archive_timeout = 300  # 5 minutes

# WAL Configuration
wal_level = replica
min_wal_size = 512MB
max_wal_size = 2GB

# Logging
log_checkpoints = on
```

**For Docker deployments**, use `scripts/postgresql-backup-config.conf` as reference.

### Step 2: Create Backup Directories

```bash
sudo mkdir -p /var/backups/postgresql/wal_archive
sudo chown -R postgres:postgres /var/backups/postgresql
sudo chmod 0700 /var/backups/postgresql
```

### Step 3: Configure Environment Variables

Create `/etc/postgresql/backup.env`:

```bash
# Database connection
PGHOST=localhost
PGPORT=5432
PGUSER=platform
PGDATABASE=platform
PGPASSWORD=your_production_password

# Backup configuration
BACKUP_DIR=/var/backups/postgresql
WAL_ARCHIVE_DIR=/var/backups/postgresql/wal_archive
RETENTION_DAYS=7
```

**Security**: Ensure this file is readable only by postgres user:
```bash
sudo chown postgres:postgres /etc/postgresql/backup.env
sudo chmod 0600 /etc/postgresql/backup.env
```

### Step 4: Test WAL Archiving

```bash
# Trigger WAL switch to test archiving
psql -U platform -d platform -c "SELECT pg_switch_wal();"

# Check WAL archive directory
ls -lh /var/backups/postgresql/wal_archive/
# Should show .gz files
```

---

## Automated Backups

### Install Cron Job

```bash
# Install automated daily backups (2:00 AM)
sudo scripts/backup-cron.sh install

# Verify installation
sudo scripts/backup-cron.sh status

# View cron jobs
sudo crontab -u postgres -l
```

### Cron Schedule

Default schedule: **Daily at 2:00 AM**

To customize, edit `scripts/backup-cron.sh` and change `CRON_TIME`:

```bash
# Every 6 hours
CRON_TIME="0 */6 * * *"

# Every Sunday at 3:00 AM
CRON_TIME="0 3 * * 0"

# Every day at 2:30 AM
CRON_TIME="30 2 * * *"
```

### Monitor Automated Backups

```bash
# View backup logs (real-time)
tail -f /var/backups/postgresql/backup.log

# View cron execution logs
tail -f /var/backups/postgresql/cron.log

# Check backup statistics
sudo -u postgres scripts/backup-postgres.sh stats
```

---

## Manual Backup

### Full Base Backup

```bash
# Source environment variables
source /etc/postgresql/backup.env

# Run backup
sudo -u postgres scripts/backup-postgres.sh base
```

**Output:**
```
[2025-01-08 14:30:00] Starting PostgreSQL base backup: backup_20250108_143000
[2025-01-08 14:30:05] Running pg_basebackup...
[2025-01-08 14:32:10] Base backup completed successfully
[2025-01-08 14:32:15] Backup size: 2.3G
[2025-01-08 14:32:20] Checksum file created
[2025-01-08 14:32:25] Backup completed: /var/backups/postgresql/backup_20250108_143000
```

### Verify Backup Integrity

```bash
# Verify latest backup
sudo -u postgres scripts/backup-postgres.sh verify

# Verify specific backup
sudo -u postgres scripts/backup-postgres.sh verify /var/backups/postgresql/backup_20250108_143000
```

### Manual Cleanup

```bash
# Remove backups older than retention period
sudo -u postgres scripts/backup-postgres.sh cleanup
```

---

## Restore Procedures

### ⚠️ WARNING

**Restore operations are DESTRUCTIVE**:
- Stops PostgreSQL
- Replaces entire data directory
- Cannot be undone

**Always:**
1. Confirm backup integrity before restore
2. Notify all users of downtime
3. Have rollback plan ready

### Full Database Restore

```bash
# 1. Verify backup integrity
sudo -u postgres scripts/backup-postgres.sh verify /var/backups/postgresql/latest

# 2. Stop application services
sudo systemctl stop platform-api
sudo systemctl stop platform-realtime

# 3. Run restore
sudo scripts/restore-postgres.sh /var/backups/postgresql/latest

# 4. Start application services
sudo systemctl start platform-api
sudo systemctl start platform-realtime
```

### Restore to Specific Backup

```bash
# List available backups
ls -lh /var/backups/postgresql/ | grep backup_

# Restore specific backup
sudo scripts/restore-postgres.sh /var/backups/postgresql/backup_20250107_020000
```

---

## Point-in-Time Recovery (PITR)

Recover database to exact moment in time before data corruption or accidental deletion.

### Use Cases

- Accidental data deletion
- Corrupted transaction rollback
- Recover from ransomware attack
- Compliance requirements (audit trail)

### PITR Procedure

```bash
# Example: Recover to 2025-01-08 12:30:00

# 1. Identify backup before target time
ls -lh /var/backups/postgresql/ | grep backup_

# 2. Restore with recovery target time
sudo scripts/restore-postgres.sh \
  /var/backups/postgresql/backup_20250108_020000 \
  "2025-01-08 12:30:00"
```

**Recovery Process:**
1. Restores base backup from 2:00 AM
2. Replays WAL files from WAL archive
3. Stops at specified timestamp (12:30:00)
4. Promotes database to production

### Find Recovery Target Time

```bash
# View application logs to find exact time
tail -100 /var/log/platform/api.log | grep -E "DELETE|UPDATE"

# Check audit logs
psql -U platform -d platform -c "SELECT * FROM audit_logs WHERE created_at > '2025-01-08 12:00:00' ORDER BY created_at;"
```

---

## Monitoring and Alerts

### Health Checks

```bash
# Check backup age (should be <24 hours)
find /var/backups/postgresql -name "backup_*" -type d -mtime -1

# Check WAL archiving status
psql -U platform -d platform -c "SELECT last_archived_wal, last_archived_time FROM pg_stat_archiver;"

# Check disk space
df -h /var/backups/postgresql
```

### Alert Conditions

Configure monitoring for:

1. **Backup Age** (Critical)
   - Alert if latest backup >24 hours old
   - `find /var/backups/postgresql/latest -mtime +1`

2. **WAL Archive Lag** (Warning)
   - Alert if WAL archiving delayed >10 minutes
   - Query: `SELECT EXTRACT(EPOCH FROM (now() - last_archived_time)) FROM pg_stat_archiver;`

3. **Disk Space** (Critical)
   - Alert if backup volume >85% full
   - `df -h /var/backups/postgresql | awk '{print $5}' | grep -o '[0-9]*'`

4. **Backup Failures** (Critical)
   - Monitor backup logs for ERROR
   - `tail -100 /var/backups/postgresql/backup.log | grep ERROR`

### Example Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/check-backups.sh

# Check backup age
LATEST_BACKUP=$(find /var/backups/postgresql -name "backup_*" -type d -mtime -1 | wc -l)
if [ "$LATEST_BACKUP" -eq 0 ]; then
    echo "CRITICAL: No backup in last 24 hours"
    exit 2
fi

# Check WAL archiving
WAL_AGE=$(psql -U platform -d platform -t -c "SELECT EXTRACT(EPOCH FROM (now() - last_archived_time)) FROM pg_stat_archiver;")
if (( $(echo "$WAL_AGE > 600" | bc -l) )); then
    echo "WARNING: WAL archiving delayed ${WAL_AGE}s"
    exit 1
fi

echo "OK: Backups healthy"
exit 0
```

---

## Troubleshooting

### Archive Command Failing

**Symptom**: WAL files accumulating in `pg_wal/` directory

**Diagnosis:**
```bash
# Check PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-16-main.log | grep archive

# Check archive script logs
sudo tail -100 /var/backups/postgresql/wal_archive/archive.log
```

**Common Fixes:**
1. **Permissions**: `sudo chown postgres:postgres /var/backups/postgresql/wal_archive`
2. **Disk space**: `df -h /var/backups/postgresql`
3. **Script path**: Verify `archive_command` in `postgresql.conf`

### Backup Script Failures

**Symptom**: Cron backups not running

**Diagnosis:**
```bash
# Check cron logs
sudo tail -100 /var/backups/postgresql/cron.log

# Check backup script logs
sudo tail -100 /var/backups/postgresql/backup.log

# Test manual backup
sudo -u postgres scripts/backup-postgres.sh base
```

**Common Fixes:**
1. **Environment variables**: Source `/etc/postgresql/backup.env`
2. **Permissions**: `chmod +x scripts/backup-postgres.sh`
3. **Database connection**: Verify `PGPASSWORD` and network access

### Restore Failures

**Symptom**: Restore script errors

**Diagnosis:**
```bash
# Check restore logs
sudo tail -100 /var/log/postgresql/restore.log

# Verify backup integrity
sudo -u postgres scripts/backup-postgres.sh verify /var/backups/postgresql/latest
```

**Common Fixes:**
1. **Stop PostgreSQL**: `sudo systemctl stop postgresql`
2. **Permissions**: `sudo chown -R postgres:postgres /var/lib/postgresql/data`
3. **Backup corruption**: Use older backup, verify checksums

### Disk Space Exhaustion

**Symptom**: Backups failing due to insufficient disk space

**Immediate Actions:**
```bash
# Check disk usage
df -h /var/backups/postgresql

# Emergency cleanup (keeps last 3 backups)
RETENTION_DAYS=3 sudo -u postgres scripts/backup-postgres.sh cleanup

# Remove old WAL files
find /var/backups/postgresql/wal_archive -mtime +3 -delete
```

**Long-term Solutions:**
1. Increase retention volume size
2. Implement backup compression
3. Offload to S3/object storage
4. Reduce backup frequency

---

## Production Deployment Checklist

- [x] WAL archiving enabled (`archive_mode = on`)
- [x] Archive command configured and tested
- [x] Backup directories created with correct permissions
- [x] Environment variables configured securely
- [x] Automated backups scheduled (cron job)
- [ ] Monitoring alerts configured
- [ ] Restore procedure tested successfully
- [ ] PITR procedure tested successfully
- [ ] Documentation reviewed by operations team
- [ ] Backup/restore runbook added to incident response

---

## Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pg_basebackup Manual](https://www.postgresql.org/docs/current/app-pgbasebackup.html)
- [WAL Archiving Guide](https://www.postgresql.org/docs/current/continuous-archiving.html)
- Platform security requirements: `docs/deployment/SECURITY_REQUIREMENTS.md`

---

**Last Updated**: 2025-01-08
**Reviewed By**: Security Audit Remediation
**Next Review**: Before production deployment
