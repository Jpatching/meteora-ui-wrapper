# Backend Implementation Guide

## ✅ What's Been Created

### Backend Foundation
- ✅ Directory structure (`backend/src/`)
- ✅ package.json with all dependencies
- ✅ TypeScript configuration
- ✅ PostgreSQL schema (complete)
- ✅ Docker Compose setup (Postgres + Redis + Backend)
- ✅ Environment configuration (.env.example)
- ✅ README with quick start guide

### Database Schema (COMPLETE)
- ✅ 6 tables: users, referrals, referral_transactions, user_transactions, pools, tier_history
- ✅ All indexes for performance
- ✅ Views for analytics (leaderboard, platform stats)
- ✅ Triggers for auto-updating timestamps

## 🚧 What Needs to Be Implemented

### 1. Backend Core (Priority 1 - Essential)

#### `backend/src/config/database.ts`
```typescript
import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await db.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}
```

#### `backend/src/config/redis.ts`
```typescript
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

export const CACHE_TTL = {
  POOL_DATA: 60,          // 60 seconds
  TOKEN_PRICE: 15,        // 15 seconds
  USER_SESSION: 3600,     // 1 hour
  LEADERBOARD: 300,       // 5 minutes
  USER_STATS: 120,        // 2 minutes
};
```

#### `backend/src/server.ts` (Minimal Version)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// TODO: Add routes
// app.use('/api/referrals', referralRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/pools', poolRoutes);

const PORT = process.env.BACKEND_PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
```

### 2. Frontend Integration (Priority 2)

#### Add Sidebar Link
File: `src/components/layout/Sidebar.tsx`

Find the Analytics section and add:
```typescript
{
  title: 'Analytics',
  icon: '/analytics-icon.svg',
  items: [
    { name: 'Public Pools', href: '/analytics/pools' },
    { name: 'Positions', href: '/analytics/positions' },
    { name: 'Referrals', href: '/analytics/referrals' }, // ADD THIS
  ],
}
```

#### Create Referral Dashboard Page
File: `src/app/analytics/referrals/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { ReferralDisplay } from '@/components/ui/ReferralDisplay';
import { useReferral } from '@/contexts/ReferralContext';

export default function ReferralDashboardPage() {
  const { publicKey } = useWallet();
  const { referralCode, referralEarnings } = useReferral();

  if (!publicKey) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔗</span>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-foreground-muted">
              Connect your wallet to view your referral dashboard
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Referral Dashboard
          </h1>
          <p className="text-foreground-muted">
            Earn 10% of platform fees from users you refer
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Total Earnings</div>
              <div className="text-3xl font-bold text-success font-mono">
                {referralEarnings?.toFixed(4) || '0.0000'} SOL
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Active Referrals</div>
              <div className="text-3xl font-bold text-primary">
                0
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-foreground-muted mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-foreground">
                0%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <ReferralDisplay />
            <p className="text-sm text-foreground-muted mt-4">
              Share this link with friends. When they use your link and make transactions,
              you'll earn 10% of the platform fees automatically.
            </p>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Analytics (Coming Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-foreground-muted">
                Detailed analytics, leaderboards, and tier progression will be available
                once the backend is fully deployed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Earnings Chart
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Leaderboard
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Tier System
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Transaction History
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
```

### 3. API Implementation Roadmap

#### Controllers to Implement
1. `backend/src/controllers/referrals.ts` - Referral CRUD operations
2. `backend/src/controllers/users.ts` - User management
3. `backend/src/controllers/pools.ts` - Pool caching
4. `backend/src/controllers/transactions.ts` - TX tracking
5. `backend/src/controllers/analytics.ts` - Stats aggregation

#### Services to Implement
1. `backend/src/services/referralService.ts` - Business logic
2. `backend/src/services/tierService.ts` - Tier progression
3. `backend/src/services/cacheService.ts` - Redis operations
4. `backend/src/services/rpcService.ts` - RPC proxy/failover

#### Middleware to Implement
1. `backend/src/middleware/auth.ts` - Wallet signature verification
2. `backend/src/middleware/rateLimit.ts` - Rate limiting per tier
3. `backend/src/middleware/errorHandler.ts` - Global error handling

## 🚀 Quick Start

### 1. Start Backend Services

```bash
# From project root
docker-compose up -d

# Check services
docker-compose ps

# Apply database schema
docker-compose exec postgres psql -U meteora -d meteora -f /docker-entrypoint-initdb.d/001_create_schema.sql
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Start Backend Server

```bash
# Development with hot reload
npm run dev

# Backend runs on http://localhost:4000
```

### 4. Test Backend

```bash
# Test health endpoint
curl http://localhost:4000/health

# Should return:
# {"status":"ok","timestamp":"2025-11-03T...","environment":"development"}
```

### 5. Add Frontend Dashboard

1. Create `src/app/analytics/referrals/page.tsx` (use code above)
2. Edit `src/components/layout/Sidebar.tsx` (add referrals link)
3. Restart Next.js dev server
4. Navigate to `/analytics/referrals`

## 📝 Implementation Checklist

### Phase 1: Foundation (DONE ✅)
- [x] Database schema
- [x] Docker Compose setup
- [x] Package.json and dependencies
- [x] TypeScript configuration
- [x] Environment variables

### Phase 2: Backend Core (TODO)
- [ ] Database connection (`config/database.ts`)
- [ ] Redis connection (`config/redis.ts`)
- [ ] Express server setup (`server.ts`)
- [ ] Error handling middleware
- [ ] Logging utility

### Phase 3: Referral System (TODO)
- [ ] Referral controller
- [ ] Referral service
- [ ] API routes
- [ ] Cache layer
- [ ] Earnings calculation

### Phase 4: User Management (TODO)
- [ ] User controller
- [ ] User service
- [ ] Tier service
- [ ] Tier progression logic
- [ ] Rate limiting

### Phase 5: Frontend (TODO)
- [ ] Referral dashboard page
- [ ] Sidebar navigation link
- [ ] Backend API client
- [ ] Analytics components
- [ ] Charts (earnings, growth)

### Phase 6: Advanced Features (TODO)
- [ ] RPC proxy with failover
- [ ] Pool caching system
- [ ] Leaderboard with Redis
- [ ] Real-time updates
- [ ] Admin dashboard

### Phase 7: Production (TODO)
- [ ] Deploy to Railway
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Load testing
- [ ] Security audit

## 🎯 Next Immediate Steps

1. **Create minimal server.ts** - Get health endpoint running
2. **Add sidebar link** - Make referral dashboard accessible
3. **Create dashboard page** - Basic UI using existing context
4. **Implement first API endpoint** - /api/referrals/leaderboard
5. **Connect frontend to backend** - Create API client utility

## 📚 Resources

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/docs/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Railway Deployment](https://docs.railway.app/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## 🆘 Support

If you encounter issues:
1. Check Docker logs: `docker-compose logs -f`
2. Verify database connection: `docker-compose exec postgres psql -U meteora`
3. Test Redis: `docker-compose exec redis redis-cli ping`
4. Review backend logs: `docker-compose logs backend`

## 📄 License

Proprietary - Meteora DeFi Application
