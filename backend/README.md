# Meteora Backend API

Express + PostgreSQL + Redis backend for the Meteora DeFi application.

## Quick Start

### 1. Start Services with Docker

```bash
# From project root
docker-compose up -d

# Check services are running
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 2. Install Dependencies (for local development)

```bash
cd backend
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your RPC endpoints and configuration
```

### 4. Run Database Migrations

```bash
# Apply schema
docker-compose exec postgres psql -U meteora -d meteora -f /docker-entrypoint-initdb.d/001_create_schema.sql
```

### 5. Start Development Server

```bash
npm run dev
```

Backend will run on http://localhost:4000

## API Endpoints

### Health Check
```
GET /health
```

### Referrals
```
GET    /api/referrals/leaderboard          # Top referrers
GET    /api/referrals/:wallet/stats        # User referral stats
POST   /api/referrals                      # Create referral relationship
GET    /api/referrals/validate/:code       # Validate referral code
```

### Users
```
GET    /api/users/:wallet                  # User profile
POST   /api/users/:wallet                  # Create/update user
GET    /api/users/:wallet/tier             # Tier information
GET    /api/users/:wallet/transactions     # Transaction history
```

### Pools
```
GET    /api/pools                          # All pools (cached)
GET    /api/pools/:id                      # Specific pool
GET    /api/pools/trending                 # Trending pools
```

### Analytics
```
GET    /api/analytics/platform             # Platform-wide stats
GET    /api/analytics/referrals            # Referral analytics
```

## Architecture

```
backend/
├── src/
│   ├── config/         # Database, Redis, RPC config
│   ├── controllers/    # Request handlers
│   ├── models/         # Database models
│   ├── services/       # Business logic
│   ├── middleware/     # Auth, rate limiting
│   ├── routes/         # Express routes
│   ├── utils/          # Helpers
│   └── server.ts       # Main entry point
├── migrations/         # SQL migrations
└── Dockerfile
```

## Environment Variables

See `.env.example` for all required environment variables.

## Database Schema

- **users**: Wallet addresses, tiers, stats
- **referrals**: Referral relationships
- **referral_transactions**: Individual earnings
- **user_transactions**: Complete TX history
- **pools**: Cached pool data
- **tier_history**: Tier progression tracking

## Redis Cache Strategy

- Pool data: 60s TTL
- Token prices: 15s TTL
- User sessions: 1h TTL
- Rate limits: 1m window
- Leaderboards: 5m TTL

## Development

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build TypeScript
npm run start    # Start production server
npm run migrate  # Run migrations
```

## Production Deployment

### Railway

1. Create new project on Railway
2. Add PostgreSQL addon
3. Add Redis addon
4. Connect GitHub repo
5. Set environment variables
6. Deploy

### Manual

1. Build Docker image: `docker build -t meteora-backend .`
2. Push to registry
3. Deploy with environment variables
4. Run migrations
5. Start containers

## Testing

```bash
# Test health endpoint
curl http://localhost:4000/health

# Test referral leaderboard
curl http://localhost:4000/api/referrals/leaderboard

# Test user profile (replace with real wallet)
curl http://localhost:4000/api/users/YOUR_WALLET_ADDRESS
```

## Next Steps

1. **Implement remaining API controllers** (see TODOs in source files)
2. **Add authentication middleware** (wallet signature verification)
3. **Implement rate limiting** per user tier
4. **Build RPC proxy** with failover logic
5. **Add data migration scripts** from localStorage to PostgreSQL
6. **Create admin dashboard** for monitoring
7. **Set up monitoring** (health checks, logs, metrics)
8. **Configure backups** for PostgreSQL

## Troubleshooting

**Database connection fails:**
```bash
# Check Postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

**Redis connection fails:**
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

**Backend crashes on start:**
```bash
# Check logs
docker-compose logs backend

# Rebuild
docker-compose up --build backend
```

## License

Proprietary - Meteora DeFi Application
