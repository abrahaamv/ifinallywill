# Troubleshooting Guide

Common issues and solutions for the local server deployment.

## Quick Diagnostics

```bash
# Check all services
./scripts/status.sh

# View recent logs
./scripts/logs.sh

# Check specific service
docker compose logs api --tail=50
```

## Container Issues

### Container Won't Start

```bash
# Check why it failed
docker compose logs <service-name>

# Check if it's a build issue
docker compose build <service-name>

# Force rebuild
docker compose build --no-cache <service-name>
```

### Out of Memory

```bash
# Check memory usage
docker stats

# If a container is using too much:
# Edit docker-compose.yml and add memory limits:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### Disk Space Full

```bash
# Check disk usage
df -h

# Clean Docker resources
./scripts/cleanup.sh

# Remove old images
docker image prune -a

# Remove volumes (CAREFUL - deletes data!)
docker volume prune
```

## Database Issues

### PostgreSQL Won't Start

```bash
# Check logs
docker compose logs postgres

# Common issues:
# 1. Port already in use
sudo lsof -i :5432

# 2. Corrupted data (last resort - loses data!)
docker compose down
docker volume rm platform-postgres-data
docker compose up -d postgres
```

### Database Connection Failed

```bash
# Test connection from API container
docker compose exec api sh -c "pg_isready -h postgres -U platform"

# Check credentials in .env match
cat .env | grep POSTGRES

# Connect manually
docker compose exec postgres psql -U platform -d platform
```

### Redis Connection Failed

```bash
# Test Redis
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" ping
# Should return: PONG

# Check logs
docker compose logs redis
```

## API Issues

### API Not Responding

```bash
# Check if running
docker compose ps api

# Check logs
docker compose logs api --tail=100

# Test health endpoint
curl http://localhost:3001/health

# Restart
docker compose restart api
```

### API 500 Errors

```bash
# Check logs for stack trace
docker compose logs api --tail=200

# Common causes:
# - Database connection issue
# - Missing environment variable
# - Runtime error

# Check environment
docker compose exec api env | sort
```

## LiveKit Issues

### LiveKit Not Connecting

```bash
# Check LiveKit server
docker compose logs livekit

# Verify keys match
cat .env | grep LIVEKIT

# Test API
curl http://localhost:7880
```

### Audio/Video Not Working

```bash
# Check LiveKit agent
docker compose logs livekit-agent

# Common issues:
# 1. GOOGLE_API_KEY not set (needed for Gemini)
# 2. Network/firewall blocking UDP

# Test from browser console:
# If using tunnel, ensure WebSocket support is enabled
```

### WebRTC Connection Failed

UDP ports (50000-50060) might be blocked:

```bash
# Check if ports are open
sudo ufw status

# If needed, open ports (only for direct connection, not tunnel)
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:50060/udp
```

## Cloudflare Tunnel Issues

### Tunnel Not Connecting

```bash
# Check cloudflared logs
docker compose logs cloudflared

# Common issues:
# 1. Invalid token
# 2. Network blocking port 443 outbound

# Verify token
echo $CLOUDFLARE_TUNNEL_TOKEN | head -c 20
```

### 502 Bad Gateway

```bash
# Service behind tunnel is down
# Check target service is running

# Test nginx
curl http://localhost/health

# Check nginx can reach services
docker compose exec nginx wget -qO- http://api:3001/health
```

### Site Not Loading

1. Check tunnel is connected in Cloudflare Dashboard
2. Verify DNS records exist
3. Check route configuration in tunnel settings
4. Try clearing browser cache

## Network Issues

### Services Can't Communicate

```bash
# Check Docker network
docker network ls
docker network inspect platform-network

# All platform services should be on same network
docker compose ps --format "{{.Name}}: {{.Networks}}"
```

### Port Conflicts

```bash
# Find what's using a port
sudo lsof -i :80
sudo lsof -i :5432

# Kill process using port
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

## Build Issues

### Build Failing

```bash
# Check build logs
docker compose build api 2>&1 | tail -100

# Common issues:
# - npm/pnpm install failing
# - TypeScript errors
# - Missing files

# Clean build
docker compose build --no-cache api
```

### Out of Disk During Build

```bash
# Clean Docker build cache
docker builder prune -f

# Check available space
df -h
```

## Environment Issues

### Missing Environment Variables

```bash
# Check what's set
docker compose exec api env | sort

# Compare with required variables
cat .env.example | grep -v "^#" | grep "="
```

### Wrong Environment Values

```bash
# Common mistake: quotes around values
# WRONG: POSTGRES_PASSWORD="mypass"
# RIGHT: POSTGRES_PASSWORD=mypass

# Reload environment
docker compose down
docker compose up -d
```

## Performance Issues

### High CPU Usage

```bash
# Find the culprit
docker stats

# Common causes:
# - Build running in background
# - Memory pressure causing swap
# - Inefficient queries

# Check system resources
htop
```

### High Memory Usage

```bash
# Check per-container usage
docker stats

# Limit container memory in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

### Slow Response Times

```bash
# Check if it's database
docker compose exec postgres psql -U platform -c "SELECT * FROM pg_stat_activity;"

# Check Redis
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" info stats

# Check API response time
time curl http://localhost/api/health
```

## Recovery Procedures

### Full Reset (Last Resort)

```bash
# Stop everything
./scripts/stop.sh

# Remove all containers and volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Clean Docker
docker system prune -af

# Rebuild everything
./scripts/deploy.sh
```

### Restore from Backup

```bash
# Find backup
ls -la backups/

# Restore PostgreSQL
gunzip -c backups/postgres_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U platform platform

# Restore Redis
docker compose stop redis
docker compose cp backups/redis_YYYYMMDD_HHMMSS.rdb redis:/data/dump.rdb
docker compose start redis
```

## Getting Help

### Collect Debug Info

```bash
# Create debug report
{
  echo "=== Docker Version ==="
  docker --version
  docker compose version

  echo "=== Container Status ==="
  docker compose ps

  echo "=== Recent Logs ==="
  docker compose logs --tail=50

  echo "=== Disk Usage ==="
  df -h
  docker system df

  echo "=== Memory ==="
  free -h
} > debug-report.txt
```

### Where to Ask

1. Check existing docs in `deployment/local/docs/`
2. Search GitHub Issues
3. Ask in project Discord/Slack (if available)
4. Create GitHub Issue with debug report
