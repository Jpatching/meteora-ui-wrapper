# Railway Deployment Setup

## Required Environment Variables

Set these in Railway dashboard → Your Service → Variables:

### 1. FRONTEND_URL (CRITICAL for CORS)
```
FRONTEND_URL=https://meteora-ui-wrapper.vercel.app,http://localhost:3000
```

**Replace `meteora-ui-wrapper.vercel.app` with your actual Vercel domain!**

This tells the backend which domains are allowed to make API requests. Without this, you'll get CORS errors.

### 2. DATABASE_URL (Auto-provided by Railway)
Railway automatically sets this when you add a PostgreSQL database.

### 3. REDIS_URL (Auto-provided by Railway)
Railway automatically sets this when you add a Redis addon.

### 4. PORT (Auto-provided by Railway)
Railway automatically sets this. The backend will listen on this port.

## Optional Environment Variables

### NODE_ENV
```
NODE_ENV=production
```

### SOLANA_RPC_URL
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Checking Deployment

After deployment, check the logs for:

```
🚀 Backend server running
📊 Environment: production
🌐 Port: 8080
🔗 Frontend: https://meteora-ui-wrapper.vercel.app
🌐 CORS allowed origins: [ 'https://meteora-ui-wrapper.vercel.app', 'http://localhost:3000' ]
✅ PostgreSQL connected
✅ Redis connected
🚀 Running database migrations...
✅ All migrations completed successfully
✅ Database has 644 pools - ready to serve!
```

If you see:
```
⚠️ CORS blocked request from: https://your-frontend.vercel.app
```

Then the FRONTEND_URL is not set correctly!

## Testing the API

Test with curl:
```bash
curl https://alsk-production.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

Test pools endpoint:
```bash
curl https://alsk-production.up.railway.app/api/pools/top?protocol=dlmm&limit=10
```

## Triggering Pool Sync

If database is empty, trigger initial sync:
```bash
curl -X POST https://alsk-production.up.railway.app/api/pools/sync
```

The sync runs automatically on first startup if database is empty, and then every 30 minutes via cron.
