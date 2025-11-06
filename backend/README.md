# Meteora Backend API

Backend service for MetaTools with PostgreSQL storage and Redis caching.

## Quick Start

```bash
cd backend
npm install
npm run dev  # Starts on port 4000
```

## Setup PostgreSQL & Redis

```bash
# Create database
createdb meteora

# Run migrations
psql -d meteora -f migrations/001_create_pools_table.sql

# Start Redis
redis-server
```

## Key API Endpoints

- `GET /api/pools/top?limit=100` - Top pools by TVL
- `GET /api/pools/search/:tokenCA` - Search pools by token
- `POST /api/pools/sync` - Trigger full pool sync (admin)

## Features

✅ Stores ALL 100k+ Meteora pools in PostgreSQL
✅ Redis caching for <50ms response times  
✅ Auto-sync every 30 minutes via cron
✅ Fast token CA search with indexed queries

See full documentation in comments.
