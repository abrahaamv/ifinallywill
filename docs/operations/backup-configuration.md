# PostgreSQL Backup Configuration Guide

**Status**: Production-Ready Scripts Available
**Priority**: CRITICAL - Required before production deployment
**Estimated Setup Time**: 1-2 hours

---

## Overview

Automated PostgreSQL backup system with:
- **Full base backups** using `pg_basebackup`
- **WAL (Write-Ahead Log) archiving** for point-in-time recovery
- **Automatic retention management** (7-day default)
- **Backup verification** and integrity checks
- **Monitoring and alerting** capabilities

## Quick Start

### 1. Prerequisites

```bash
# Verify PostgreSQL client tools installed
which pg_basebackup pg_dump psql

# Create backup directories
sudo mkdir -p /var/backups/postgresql/wal_archive
sudo chown -R postgres:postgres /var/backups/postgresql
sudo chmod 750 /var/backups/postgresql
```

### 2. Configure Environment

Create `/etc/postgresql-backup.env`:

```bash
# PostgreSQL Connection
export PGHOST=localhost
export PGPORT=5432
export PGUSER=platform_service
export PGDATABASE=platform
export PGPASSWORD=your_secure_password_here

# Backup Configuration
export BACKUP_DIR=/var/backups/postgresql
export WAL_ARCHIVE_DIR=/var/backups/postgresql/wal_archive
export RETENTION_DAYS=7

# Optional: Cloud Storage (S3, GCS, Azure)
# export BACKUP_UPLOAD_ENABLED=true
# export S3_BUCKET=my-backups
# export AWS_REGION=us-east-1
```

**Security**: Restrict permissions
```bash
sudo chmod 600 /etc/postgresql-backup.env
sudo chown postgres:postgres /etc/postgresql-backup.env
```

### 3. Test Manual Backup

```bash
# Source environment
source /etc/postgresql-backup.env

# Run backup
./scripts/backup-postgres.sh base

# Verify backup created
ls -lh /var/backups/postgresql/
```

### 4. Install Automated Backups

```bash
# Install daily cron job (2:00 AM)
sudo ./scripts/backup-cron.sh install

# Verify installation
sudo ./scripts/backup-cron.sh status
```

---

## Backup Scripts

### Available Scripts

1. **`backup-postgres.sh`** (6.9KB)
   - Full base backup with `pg_basebackup`
   - Backup verification
   - Retention management
   - Usage: `./backup-postgres.sh [base|verify|cleanup]`

2. **`backup-cron.sh`** (3.0KB)
   - Cron job installation/removal
   - Status monitoring
   - Usage: `./backup-cron.sh [install|remove|status]`

3. **`restore-postgres.sh`** (6.5KB)
   - Point-in-time recovery
   - Backup restoration
   - Usage: `./restore-postgres.sh <backup_name> [target_time]`

4. **`archive-wal.sh`** (2.7KB)
   - WAL archiving script
   - Called automatically by PostgreSQL
   - Configured in `postgresql.conf`

### Script Features

**Backup Script**:
- ✅ Connection verification before backup
- ✅ Compressed backups (gzip)
- ✅ Backup metadata (JSON)
- ✅ Size calculation and logging
- ✅ Automatic cleanup of old backups
- ✅ Integrity verification

**Cron Script**:
- ✅ Easy installation/removal
- ✅ Environment variable management
- ✅ Status monitoring
- ✅ Log viewing

**Restore Script**:
- ✅ Point-in-time recovery (PITR)
- ✅ Backup listing
- ✅ Recovery validation
- ✅ Safety checks before restore

---

## Configuration Details

### PostgreSQL WAL Archiving

Add to `postgresql.conf`:

```conf
# WAL Archiving Configuration
wal_level = replica
archive_mode = on
archive_command = '/path/to/scripts/archive-wal.sh %p %f'
archive_timeout = 300  # Archive every 5 minutes

# Backup Settings
max_wal_senders = 5
max_replication_slots = 5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Backup Retention

**Default**: 7 days (configurable via `RETENTION_DAYS`)

**Retention Strategy**:
- Daily backups: Keep last 7 days
- Weekly backups: Keep last 4 weeks (manual)
- Monthly backups: Keep last 12 months (manual)

**Custom Retention**:
```bash
export RETENTION_DAYS=14  # Keep 14 days
```

### Cloud Upload (Optional)

**AWS S3 Example**:
```bash
# Install AWS CLI
sudo apt install awscli

# Configure credentials
aws configure

# Enable upload in backup script
export BACKUP_UPLOAD_ENABLED=true
export S3_BUCKET=my-platform-backups
export AWS_REGION=us-east-1
```

**Google Cloud Storage Example**:
```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Configure bucket
export GCS_BUCKET=gs://my-platform-backups
```

---

## Monitoring and Alerts

### Backup Health Checks

**Manual Check**:
```bash
# View recent backups
ls -lh /var/backups/postgresql/

# Check backup logs
tail -50 /var/backups/postgresql/backup.log

# Verify latest backup
./scripts/backup-postgres.sh verify
```

**Automated Monitoring** (see `backup-monitoring.sh` below):
```bash
# Add to crontab for hourly checks
0 * * * * /path/to/scripts/backup-monitoring.sh
```

### Alert Configuration

**Email Alerts** (using `mail` or `sendmail`):
```bash
# Install mail utilities
sudo apt install mailutils

# Test email
echo "Test alert" | mail -s "Backup Test" admin@yourcompany.com
```

**Slack/Discord Webhooks**:
```bash
# Add to backup scripts
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

send_alert() {
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$1\"}" \
        "$WEBHOOK_URL"
}
```

---

## Testing and Validation

### 1. Test Backup Creation

```bash
# Create test backup
source /etc/postgresql-backup.env
./scripts/backup-postgres.sh base

# Verify files created
ls -lh /var/backups/postgresql/backup_$(date +%Y%m%d)*

# Check backup metadata
cat /var/backups/postgresql/backup_$(date +%Y%m%d)*/backup_metadata.json
```

### 2. Test Backup Restoration

**CAUTION**: Test on non-production database first!

```bash
# List available backups
./scripts/restore-postgres.sh list

# Restore latest backup
./scripts/restore-postgres.sh backup_20250109_020000

# Verify restoration
psql -U platform -d platform -c "SELECT COUNT(*) FROM tenants;"
```

### 3. Test Point-in-Time Recovery

```bash
# Restore to specific timestamp
./scripts/restore-postgres.sh backup_20250109_020000 "2025-01-09 14:30:00"

# Verify recovery point
psql -U platform -d platform -c "SELECT NOW();"
```

### 4. Monthly Restoration Test

**Recommended**: Perform full restoration test monthly

```bash
#!/bin/bash
# Monthly backup test script

# 1. Create test database
createdb platform_restore_test

# 2. Restore latest backup to test database
PGDATABASE=platform_restore_test ./scripts/restore-postgres.sh <latest_backup>

# 3. Verify data integrity
psql -d platform_restore_test -c "
  SELECT
    (SELECT COUNT(*) FROM tenants) as tenant_count,
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM sessions) as session_count;
"

# 4. Cleanup
dropdb platform_restore_test

echo "Monthly restore test completed successfully"
```

---

## Troubleshooting

### Common Issues

**1. Permission Denied**
```bash
# Fix ownership
sudo chown -R postgres:postgres /var/backups/postgresql

# Fix permissions
sudo chmod 750 /var/backups/postgresql
sudo chmod 640 /var/backups/postgresql/*.log
```

**2. Connection Failed**
```bash
# Verify PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U platform -d platform -c "SELECT 1"

# Check pg_hba.conf for authentication
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep platform
```

**3. Insufficient Disk Space**
```bash
# Check available space
df -h /var/backups

# Clean old backups manually
./scripts/backup-postgres.sh cleanup

# Adjust retention
export RETENTION_DAYS=3
```

**4. Cron Job Not Running**
```bash
# Check cron service
sudo systemctl status cron

# View cron logs
sudo journalctl -u cron -n 50

# Verify cron job
sudo crontab -u postgres -l
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Backup scripts reviewed and tested
- [ ] Environment file created (`/etc/postgresql-backup.env`)
- [ ] Backup directories created with correct permissions
- [ ] PostgreSQL WAL archiving configured
- [ ] Manual backup tested successfully
- [ ] Restoration tested successfully
- [ ] Disk space verified (3x database size minimum)

### Deployment

- [ ] Cron job installed (`backup-cron.sh install`)
- [ ] First automated backup completed successfully
- [ ] Backup logs verified (no errors)
- [ ] Cloud upload configured (if applicable)
- [ ] Monitoring/alerting configured
- [ ] Documentation shared with team

### Post-Deployment

- [ ] Daily backup verification (first week)
- [ ] Weekly restoration test
- [ ] Monthly full restoration test
- [ ] Disk space monitoring configured
- [ ] Alert thresholds tested
- [ ] Runbook created for restore procedures

---

## Backup SLAs

### Recovery Objectives

- **RTO (Recovery Time Objective)**: < 1 hour
- **RPO (Recovery Point Objective)**: < 5 minutes (with WAL archiving)
- **Backup Frequency**: Daily (2:00 AM) + continuous WAL archiving
- **Retention**: 7 days local, 30 days cloud (recommended)

### Backup Windows

- **Daily Backup**: 2:00 AM - 3:00 AM (low traffic period)
- **WAL Archiving**: Continuous (every 5 minutes or 16MB)
- **Cleanup**: Daily after backup completion

---

## Security Best Practices

1. **Encryption**:
   - Encrypt backups at rest
   - Use encrypted cloud storage
   - Encrypt database credentials

2. **Access Control**:
   - Restrict backup directory permissions (750)
   - Use service accounts for backups
   - Audit backup access logs

3. **Credential Management**:
   - Use `.pgpass` file instead of plaintext passwords
   - Rotate backup credentials regularly
   - Use IAM roles for cloud uploads (avoid access keys)

4. **Compliance**:
   - Document retention policies
   - Implement data lifecycle policies
   - Ensure backup location compliance (GDPR, etc.)

---

## Additional Resources

- **PostgreSQL Backup Documentation**: https://www.postgresql.org/docs/current/backup.html
- **Point-in-Time Recovery**: https://www.postgresql.org/docs/current/continuous-archiving.html
- **pg_basebackup**: https://www.postgresql.org/docs/current/app-pgbasebackup.html

---

**Last Updated**: 2025-01-09
**Next Review**: Before production deployment
**Owner**: Infrastructure/DevOps Team
