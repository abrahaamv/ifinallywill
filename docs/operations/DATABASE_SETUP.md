# Database Setup Instructions

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

### 5. Push Schema and Apply RLS

```bash
# From project root
cd /home/abrahaam/Documents/GitHub/platform

# Push schema to database
pnpm db:push

# Apply RLS policies
psql -U platform -d platform -f packages/db/migrations/001_enable_rls.sql

# Seed demo data
pnpm db:seed
```

### 6. Verify RLS Policies

```bash
psql -U platform -d platform << 'EOF'
-- Check that RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should see rowsecurity = true for all tenant-scoped tables
EOF
```

## Alternative: Docker Compose Setup

If you prefer Docker (requires Docker daemon running):

```bash
# Start PostgreSQL + Redis
pnpm db:up

# Wait for health check
docker ps --filter "name=platform-postgres"

# Push schema
pnpm db:push

# Apply RLS
docker exec -i platform-postgres psql -U platform -d platform < packages/db/migrations/001_enable_rls.sql

# Seed data
pnpm db:seed
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
2. ✅ RLS policies applied
3. ✅ Demo data seeded
4. ✅ Verify tenant isolation works

Then continue with Phase 2: Auth.js integration.
