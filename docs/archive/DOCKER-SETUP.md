# Docker Development Setup

## Architecture

- **Docker Containers:** PostgreSQL, Redis, Backend API
- **Local Development:** Frontend (Next.js) running natively with hot-reload

## Prerequisites

```bash
# Install Docker and Docker Compose
docker --version
docker-compose --version

# Ensure ports are available
# 3000 - Frontend (Next.js)
# 4000 - Backend API
# 5432 - PostgreSQL
# 6379 - Redis
```

## Quick Start

### 1. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env if needed (defaults should work)
nano .env
```

### 2. Start Docker Services

```bash
# Start postgres, redis, and backend
docker-compose up --build

# Or run in background
docker-compose up -d
```

### 3. Start Frontend Locally

```bash
# In a separate terminal
npm install
npm run dev
```

Frontend will be available at: http://localhost:3000

---

## tmux Terminal Layout

### Setup tmux Session

```bash
# Create new tmux session
tmux new -s meteora

# Window 0: Docker Services
docker-compose up

# Split window horizontally (Ctrl+b, ")
# Window 1: Frontend Dev Server
npm run dev

# Split window vertically (Ctrl+b, %)
# Window 2: Logs & Monitoring
docker-compose logs -f backend

# Create another window (Ctrl+b, c)
# Window 3: Commands/Git
# Ready for git commands, testing, etc.
```

### tmux Quick Reference

```bash
# Navigation
Ctrl+b "     # Split horizontal
Ctrl+b %     # Split vertical
Ctrl+b arrow # Switch pane
Ctrl+b c     # New window
Ctrl+b n/p   # Next/previous window
Ctrl+b d     # Detach session

# Reattach to session
tmux attach -t meteora

# List sessions
tmux ls
```

---

## Alternative: Manual 4-Pane Setup

```bash
#!/bin/bash
# setup-tmux.sh - Automated tmux layout

tmux new-session -d -s meteora

# Window 0: Docker services
tmux rename-window -t meteora:0 'docker'
tmux send-keys -t meteora:0 'docker-compose up' C-m

# Window 1: Frontend
tmux new-window -t meteora:1 -n 'frontend'
tmux send-keys -t meteora:1 'npm run dev' C-m

# Window 2: Backend logs
tmux new-window -t meteora:2 -n 'logs'
tmux send-keys -t meteora:2 'docker-compose logs -f backend' C-m

# Window 3: Commands
tmux new-window -t meteora:3 -n 'shell'

# Attach to session
tmux attach -t meteora
```

Make executable and run:
```bash
chmod +x setup-tmux.sh
./setup-tmux.sh
```

---

## Docker Commands

### Service Management

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Check service status
docker-compose ps
```

### Database Management

```bash
# Access PostgreSQL
docker exec -it meteora-postgres psql -U meteora -d meteora

# Common SQL commands
\dt              # List tables
\d table_name    # Describe table
SELECT * FROM ...

# Backup database
docker exec meteora-postgres pg_dump -U meteora meteora > backup.sql

# Restore database
docker exec -i meteora-postgres psql -U meteora meteora < backup.sql
```

### Redis Management

```bash
# Access Redis CLI
docker exec -it meteora-redis redis-cli

# Common Redis commands
KEYS *           # List all keys
GET key_name     # Get value
DEL key_name     # Delete key
FLUSHALL         # Clear all data
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (DELETES DATA!)
docker-compose down -v

# Remove all unused containers/images
docker system prune -a
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using a port
lsof -i :3000
lsof -i :4000
lsof -i :5432

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker-compose ps

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Backend Not Starting

```bash
# View backend logs
docker-compose logs -f backend

# Rebuild backend
docker-compose up --build backend

# Check if migrations ran
docker-compose logs postgres | grep "CREATE"
```

### Frontend Can't Connect to Backend

```bash
# Verify backend is running
curl http://localhost:4000/health

# Check .env file
cat .env | grep BACKEND_URL

# Should be: NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## Development Workflow

### Typical Daily Workflow

```bash
# Morning: Start everything
tmux attach -t meteora  # Or create new session

# Window 0: Start Docker
docker-compose up

# Window 1: Start Frontend
npm run dev

# Work on features...
# Frontend auto-reloads on file changes
# Backend auto-reloads via nodemon

# Evening: Stop everything
docker-compose down
```

### Testing Backend Changes

```bash
# Backend changes auto-reload via volume mount
# Check logs to see restart
docker-compose logs -f backend

# If needed, rebuild
docker-compose up --build backend
```

### Database Migrations

```bash
# Run migrations (if backend has them)
docker exec -it meteora-backend npm run migrate

# Or access postgres directly
docker exec -it meteora-postgres psql -U meteora -d meteora
```

---

## Network Access

| Service    | URL                          | Description          |
|------------|------------------------------|----------------------|
| Frontend   | http://localhost:3000        | Next.js Dev Server   |
| Backend    | http://localhost:4000        | Express API          |
| PostgreSQL | postgresql://localhost:5432  | Database             |
| Redis      | redis://localhost:6379       | Cache/Queue          |

---

## Performance Notes

### Why Frontend Runs Locally?

1. **Fast Hot Reload** - No Docker overhead
2. **Native Browser DevTools** - Full debugging
3. **Better DX** - Faster file watching
4. **Easy Debugging** - Direct access to React DevTools

### When to Use Full Docker?

For **production builds** or **CI/CD**, use the production Dockerfile:

```bash
# Build production image (future)
docker build -t meteora-frontend:prod -f Dockerfile.prod .

# Run production container
docker run -p 3000:3000 meteora-frontend:prod
```

---

## Summary

**Perfect Development Setup:**

```
┌─────────────────────────────────────┐
│  tmux session: meteora              │
├─────────────────┬───────────────────┤
│ Window 0:       │ Window 1:         │
│ docker-compose  │ npm run dev       │
│ (postgres/      │ (frontend)        │
│  redis/backend) │                   │
├─────────────────┼───────────────────┤
│ Window 2:       │ Window 3:         │
│ docker logs -f  │ git/commands      │
│ backend         │                   │
└─────────────────┴───────────────────┘
```

Happy coding!
