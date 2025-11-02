import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { db, closeDatabase } from './config/database';
import { redis, closeRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import referralRoutes from './routes/referrals';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import poolsRoutes from './routes/pools';
import { startCronJobs } from './services/cronService';
import { syncAllPools } from './services/poolSyncService';
import { runMigrations } from './migrations';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Parse FRONTEND_URL as comma-separated list or use default array
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');

    // Test Redis connection
    await redis.ping();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/referrals', referralRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pools', poolsRoutes);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log('🚀 Backend server running');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

  // Run database migrations first
  try {
    await runMigrations();
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    console.error('⚠️ Server may not function properly');
  }

  // Start cron jobs for pool syncing
  startCronJobs();

  // Check if database has pools, if not, trigger initial sync
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM pools');
    const poolCount = parseInt(result.rows[0]?.count || '0');

    if (poolCount === 0) {
      console.log('🔄 Database is empty - triggering initial pool sync...');
      console.log('⏳ This will take 30-60 seconds...');

      // Run sync in background so server starts immediately
      syncAllPools()
        .then((result) => {
          console.log('✅ Initial pool sync complete:', result);
          console.log('🎉 Ready to serve pool data!');
        })
        .catch((error) => {
          console.error('❌ Initial pool sync failed:', error);
          console.error('💡 You can manually trigger sync via: POST /api/pools/sync');
        });
    } else {
      console.log(`✅ Database has ${poolCount} pools - ready to serve!`);
    }
  } catch (error) {
    console.error('⚠️ Could not check pool count:', error);
    console.log('💡 You can manually trigger sync via: POST /api/pools/sync');
  }
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('\n👋 Shutting down gracefully...');

  server.close(async () => {
    console.log('🔒 HTTP server closed');

    try {
      await closeDatabase();
      await closeRedis();
      console.log('✅ All connections closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

export default app;
