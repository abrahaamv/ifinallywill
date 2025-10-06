# Database Setup Instructions

> **Operational Guide**: How to set up PostgreSQL and Redis locally or via Docker.
>
> **Related Documentation**:
> - `../reference/database.md` - Schema reference and migration details
> - `../reference/rls-policies.md` - RLS security model and policy structure
> - `../reference/migrations.md` - Complete migration history and execution order

**Status**: ✅ Phase 2 complete - All migrations (001-005) ready to apply

---

## Local PostgreSQL Setup (Debian with sysvinit)

Since you have PostgreSQL 15.13 already installed, here's how to set it up for the platform:

### 1. Create PostgreSQL User and Database

```bash
# Switch to postgres user
sudo su - postgres

# Create the platform user
createuser -P platform
# When prompted, enter password: platform_dev_password

# Create the platform database
createdb -O platform platform

# Grant necessary permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE platform TO platform;"

# Exit postgres user
exit
```

### 2. Enable pgvector Extension

```bash
sudo su - postgres
psql -d platform -c "CREATE EXTENSION IF NOT EXISTS vector;"
exit
```

### 3. Fix Peer Authentication

```bash
# Edit pg_hba.conf to change authentication method
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Find this line:
# local   all             all                                     peer

# Change it to:
local   all             all                                     md5

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Restart PostgreSQL
sudo /etc/init.d/postgresql restart
```

### 4. Test Connection

```bash
# Test connection with the platform user
psql -U platform -d platform -c "SELECT version();"
# Enter password when prompted: platform_dev_password
```

### 5. Push Schema and Apply RLS Policies

> **Complete Phase 2 Migration Sequence** (001-005)

```bash
# From project root
cd /home/abrahaam/Documents/GitHub/platform

# 1. Push schema to database (creates 15 tables)
pnpm db:push

# 2. Apply RLS policies (multi-tenant security)
# Note: Migration 003 is the active policy set (supersedes 001-002)
psql -U platform -d platform -f packages/db/migrations/001_enable_rls.sql
psql -U platform -d platform -f packages/db/migrations/002_fix_rls_policies.sql
psql -U platform -d platform -f packages/db/migrations/003_fix_rls_empty_string.sql

# 3. Seed demo data (requires temporary RLS disable)
psql -U platform -d platform -f packages/db/migrations/004_seed_helper.sql
pnpm db:seed
psql -U platform -d platform -f packages/db/migrations/005_restore_force_rls.sql
```

**What This Does**:
- **001-003**: Enables FORCE RLS on 14 tenant-scoped tables (56 policies total)
- **003**: Creates helper function `get_current_tenant_id()` for edge cases
- **004**: Temporarily disables FORCE RLS to allow seeding
- **005**: Restores FORCE RLS after seeding (CRITICAL for security!)

**Result**: Demo tenant created with admin user (admin@acme.com / password123)

See `../reference/migrations.md` for detailed migration documentation.

### 6. Verify RLS Policies

```bash
# Comprehensive verification
psql -U platform -d platform << 'EOF'
-- 1. Check RLS status (should show FORCE enabled on 14 tables)
SELECT
  c.relname as table_name,
  CASE WHEN c.relrowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_enabled,
  CASE WHEN c.relforcerowsecurity THEN 'FORCE' ELSE 'Standard' END as rls_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relname;

-- 2. Count policies (should be 56+)
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

-- 3. Verify demo tenant created
SELECT id, name, plan FROM tenants;

-- 4. Verify demo user created
SELECT id, email, role FROM users;
EOF
```

**Expected Results**:
- 14 tables with RLS `Enabled` and `FORCE` mode
- 56+ total policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
- 1 tenant: "Acme Corporation" (business plan)
- 1 user: "admin@acme.com" (owner role)

See `../reference/rls-policies.md` for complete RLS documentation.

## Alternative: Docker Compose Setup

If you prefer Docker (requires Docker daemon running):

```bash
# Start PostgreSQL + Redis
pnpm db:up

# Wait for health check
docker ps --filter "name=platform-postgres"

# Push schema (creates 15 tables)
pnpm db:push

# Apply RLS policies (complete Phase 2 sequence)
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/001_enable_rls.sql
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/002_fix_rls_policies.sql
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/003_fix_rls_empty_string.sql

# Seed demo data (with temporary RLS disable/restore)
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/004_seed_helper.sql
pnpm db:seed
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/005_restore_force_rls.sql

# Verify setup
docker exec -i platform-postgres psql -U platform -d platform -c "SELECT COUNT(*) FROM tenants;"
# Should return: count = 1
```

## Redis Setup

### Install Redis (if not installed)

```bash
sudo apt-get update
sudo apt-get install redis-server
```

### Configure Redis

```bash
# Edit redis.conf
sudo nano /etc/redis/redis.conf

# Add/modify:
requirepass platform_redis_password

# Restart redis (sysvinit)
sudo /etc/init.d/redis-server restart
```

### Test Redis Connection

```bash
redis-cli
AUTH platform_redis_password
PING
# Should return PONG
```

## Troubleshooting

### Connection Refused

Check if PostgreSQL is listening on localhost:

```bash
sudo netstat -nltp | grep 5432
```

If not listening on 127.0.0.1, edit postgresql.conf:

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf

# Ensure:
listen_addresses = 'localhost'

# Restart
sudo /etc/init.d/postgresql restart
```

## Next Steps

Once the database is running:

1. ✅ Schema pushed (`pnpm db:push`)
2. ✅ RLS policies applied (migrations 001-005)
3. ✅ Demo data seeded
4. ✅ Tenant isolation verified

**Phase 2 Status**: ✅ COMPLETE (2025-10-06)

Continue with **Phase 3: Backend APIs** (Weeks 5-7) - See `../guides/roadmap.md` for implementation details.

---

## Related Documentation

- **Schema Reference**: `../reference/database.md` - Complete schema documentation
- **RLS Security**: `../reference/rls-policies.md` - Multi-tenant isolation implementation
- **Migration Details**: `../reference/migrations.md` - Complete migration history
- **Quick Start**: `../getting-started/quick-start.md` - Full setup guide
