# Production Deployment Guide

This guide covers deploying the Meteora UI Wrapper to production.

## Table of Contents

- [Platform Recommendations](#platform-recommendations)
- [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
- [Netlify Deployment](#netlify-deployment)
- [Custom VPS Deployment](#custom-vps-deployment)
- [Environment Configuration](#environment-configuration)
- [Security Checklist](#security-checklist)
- [Monitoring & Logging](#monitoring--logging)
- [Performance Optimization](#performance-optimization)
- [Disaster Recovery](#disaster-recovery)

---

## Platform Recommendations

### 🏆 Vercel (Recommended)

**Best fit for this project because:**
- Next.js 16 native support (made by the same team)
- Zero-config deployment
- Automatic edge caching
- Built-in analytics
- Excellent DX with GitHub integration
- Serverless functions for future API needs
- Free tier sufficient for initial launch

**Pricing:**
- Free tier: Enough for initial launch (100GB bandwidth, unlimited requests)
- Pro: $20/month (1TB bandwidth, advanced analytics)

### Netlify

**Good alternative:**
- Simple deployment process
- Free tier available
- Good CDN performance
- Automatic HTTPS

**Limitations:**
- Not as optimized for Next.js 16 as Vercel
- May require more configuration

### AWS/Google Cloud/Azure

**For enterprise scale:**
- Full control
- Advanced monitoring
- Auto-scaling
- Higher complexity and cost

**Not recommended initially** - start with Vercel and migrate later if needed.

---

## Vercel Deployment (Recommended)

### Prerequisites

1. GitHub account
2. Vercel account (sign up at https://vercel.com)
3. Production-ready environment variables

### Step-by-Step Deployment

#### 1. Prepare Repository

Ensure your repository is pushed to GitHub:

```bash
git remote -v
# Should show: git@github.com:Jpatching/meteora-ui-wrapper.git

git push
```

#### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `meteora-ui-wrapper` repository
4. Vercel will auto-detect Next.js configuration

#### 3. Configure Build Settings

Vercel should auto-detect:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

If not auto-detected, configure manually.

#### 4. Set Environment Variables

Add these in Vercel dashboard (Settings → Environment Variables):

**Required:**
```bash
# Network Configuration
NEXT_PUBLIC_DEFAULT_NETWORK=mainnet-beta  # Change from devnet to mainnet for production

# Premium RPC Configuration
NEXT_PUBLIC_HELIUS_API_KEY=your_production_helius_key
NEXT_PUBLIC_DEVNET_RPC=https://devnet.helius-rpc.com/?api-key=your_key
NEXT_PUBLIC_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=your_key

# Fallback RPC
NEXT_PUBLIC_ALCHEMY_DEVNET_RPC=your_alchemy_devnet_url

# Platform Fee Configuration
NEXT_PUBLIC_ENABLE_FEES=true
NEXT_PUBLIC_FEE_WALLET=YourProductionWalletAddress111111111111111
NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS=8500000

# Fee Distribution (Phase 2)
NEXT_PUBLIC_REFERRAL_PERCENTAGE=10
NEXT_PUBLIC_BUYBACK_PERCENTAGE=45
NEXT_PUBLIC_TREASURY_PERCENTAGE=45

# Fee Wallets
NEXT_PUBLIC_BUYBACK_WALLET=YourBuybackWallet11111111111111111111111
NEXT_PUBLIC_TREASURY_WALLET=YourTreasuryWallet1111111111111111111111

# Referral System
NEXT_PUBLIC_ENABLE_REFERRALS=true

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_EXPORT=true
```

**Optional but Recommended:**
```bash
# Analytics Configuration
NEXT_PUBLIC_MAX_TRANSACTIONS=1000
NEXT_PUBLIC_TRANSACTION_RETENTION_DAYS=90

# Custom Domain (if using)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

#### 5. Deploy

Click "Deploy" button. Vercel will:
1. Clone your repository
2. Install dependencies
3. Build the application
4. Deploy to edge network
5. Provide a preview URL (e.g., `your-project.vercel.app`)

#### 6. Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown by Vercel
4. Wait for SSL certificate provisioning (automatic)

#### 7. Configure Production Settings

In Vercel dashboard:

**Function Configuration:**
- Region: Auto (or closest to your users)
- Node.js Version: 20.x

**Caching:**
- Enable Edge caching (automatic for static assets)

**Security Headers:**
Add in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Netlify Deployment

### Quick Deploy

1. Go to https://app.netlify.com/start
2. Connect GitHub repository
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables (same as Vercel section)
5. Click "Deploy"

### netlify.toml Configuration

Create `netlify.toml` in root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Custom VPS Deployment

For advanced users wanting full control.

### Prerequisites

- Ubuntu 22.04 LTS VPS
- Domain name pointed to VPS IP
- SSH access

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/Jpatching/meteora-ui-wrapper.git
cd meteora-ui-wrapper

# Install dependencies
sudo npm install

# Create production .env.local
sudo nano .env.local
# Add all production environment variables

# Build application
sudo npm run build

# Start with PM2
sudo pm2 start npm --name "meteora-ui" -- start
sudo pm2 startup
sudo pm2 save
```

### 3. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/meteora-ui
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/meteora-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

### 5. Automatic Updates

```bash
# Create update script
sudo nano /var/www/meteora-ui-wrapper/update.sh
```

```bash
#!/bin/bash
cd /var/www/meteora-ui-wrapper
git pull
npm install
npm run build
pm2 restart meteora-ui
```

```bash
sudo chmod +x update.sh

# Setup cron for weekly updates (optional)
sudo crontab -e
# Add: 0 2 * * 0 /var/www/meteora-ui-wrapper/update.sh
```

---

## Environment Configuration

### Production Environment Variables

#### Critical Security Settings

**Fee Wallet:**
- Use a dedicated hot wallet for fee collection
- Never commit private keys to git
- Regularly transfer collected fees to cold storage
- Monitor wallet balance and transactions

**RPC API Keys:**
- Use production-grade Helius plan ($99/mo Growth recommended)
- Keep separate keys for dev/staging/production
- Rotate keys quarterly
- Monitor usage to prevent abuse

#### Network Configuration

```bash
# IMPORTANT: Change to mainnet-beta for production
NEXT_PUBLIC_DEFAULT_NETWORK=mainnet-beta

# Use mainnet RPC endpoints
NEXT_PUBLIC_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=your_production_key
```

#### Fee Configuration

```bash
# Platform fee: 0.0085 SOL = 8,500,000 lamports
NEXT_PUBLIC_PLATFORM_FEE_LAMPORTS=8500000

# Fee distribution percentages (must total 100%)
NEXT_PUBLIC_REFERRAL_PERCENTAGE=10   # 10% to referrers
NEXT_PUBLIC_BUYBACK_PERCENTAGE=45    # 45% to token buyback
NEXT_PUBLIC_TREASURY_PERCENTAGE=45   # 45% to treasury
```

### Staging Environment

Create separate environment for testing:

```bash
# Staging settings
NEXT_PUBLIC_DEFAULT_NETWORK=devnet
NEXT_PUBLIC_ENABLE_FEES=true  # Test with real fees on devnet
NEXT_PUBLIC_FEE_WALLET=YourDevnetTestWallet1111111111111111
```

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set correctly
- [ ] `.env.local` file NOT committed to git
- [ ] Production wallet addresses verified
- [ ] RPC API keys rotated from development keys
- [ ] Fee distribution percentages total 100%
- [ ] No console.log statements in production code
- [ ] Error messages don't expose sensitive data

### Post-Deployment

- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] Security headers configured
- [ ] CSP (Content Security Policy) configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled (via RPC tier system)
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

### Ongoing

- [ ] Regular dependency updates (`npm audit fix`)
- [ ] Monitor fee wallet for unusual activity
- [ ] Review RPC usage and costs monthly
- [ ] Check for Solana network upgrades
- [ ] Update Meteora SDK when new versions released

---

## Monitoring & Logging

### Vercel Analytics (Built-in)

Free tier includes:
- Page views
- Unique visitors
- Top pages
- Devices and browsers

Pro tier adds:
- Web Vitals
- Custom events
- Advanced filtering

### Custom Monitoring

#### 1. Transaction Monitoring

Monitor your fee wallet:

```typescript
// Add to a monitoring script
const monitorFeeWallet = async () => {
  const connection = new Connection(RPC_URL);
  const balance = await connection.getBalance(FEE_WALLET);

  // Alert if balance exceeds threshold (time to transfer to cold storage)
  if (balance > 10 * LAMPORTS_PER_SOL) {
    sendAlert('Fee wallet balance high, transfer to cold storage');
  }
};
```

#### 2. RPC Usage Tracking

Monitor Helius dashboard:
- Daily request count
- Error rates
- Response times

Set up alerts for:
- 80% of monthly quota used
- Error rate > 5%
- Response time > 1000ms

#### 3. Error Tracking

Integrate Sentry (optional):

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.config.js
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Logging Best Practices

```typescript
// Use structured logging
console.log(JSON.stringify({
  level: 'info',
  action: 'pool_created',
  wallet: publicKey.toBase58(),
  network,
  timestamp: new Date().toISOString(),
}));
```

---

## Performance Optimization

### 1. Edge Caching

Vercel automatically caches static assets. For dynamic content:

```javascript
// pages/api/example.ts
export const config = {
  runtime: 'edge',
};
```

### 2. Image Optimization

Use Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority
/>
```

### 3. Bundle Size Optimization

Analyze bundle:

```bash
npm run build
# Check bundle size in output
```

Optimize imports:

```typescript
// Bad - imports entire library
import _ from 'lodash';

// Good - imports only needed function
import { debounce } from 'lodash';
```

### 4. RPC Optimization

- Use Helius for better performance
- Implement request caching where possible
- Batch RPC calls when feasible

---

## Disaster Recovery

### Backup Strategy

#### 1. Code Backup

- Git repository is primary backup
- Mirror to secondary git host (GitLab, Bitbucket)
- Download repository archive monthly

#### 2. Environment Variables Backup

```bash
# Export environment variables
vercel env pull .env.production.backup
# Store securely (NOT in git)
```

#### 3. Analytics Data Backup

Transaction history is stored in localStorage. Implement export:

```typescript
// Add to analytics page
const exportAllData = () => {
  const data = localStorage.getItem('transaction-history');
  const blob = new Blob([data], { type: 'application/json' });
  // Download file
};
```

### Recovery Procedures

#### Quick Recovery (< 5 minutes)

1. Vercel automatic rollback:
   - Go to Deployments tab
   - Click "..." on last working deployment
   - Click "Promote to Production"

#### Full Recovery (< 30 minutes)

1. Fresh deploy:
   ```bash
   git clone https://github.com/Jpatching/meteora-ui-wrapper.git
   cd meteora-ui-wrapper
   # Deploy to Vercel with CLI
   vercel --prod
   ```

2. Restore environment variables from backup

3. Verify all functionality

### Incident Response Plan

1. **Detect Issue**
   - Monitoring alerts
   - User reports
   - Error tracking

2. **Assess Impact**
   - How many users affected?
   - What functionality broken?
   - Any fund loss risk?

3. **Immediate Actions**
   - If fee wallet compromised: IMMEDIATELY transfer funds to cold storage
   - If RPC compromised: Rotate API keys
   - If app broken: Rollback deployment

4. **Communication**
   - Update status page (if available)
   - Post on social media
   - Email affected users (if database exists)

5. **Post-Mortem**
   - Document what happened
   - Identify root cause
   - Implement prevention measures

---

## Launch Checklist

### Pre-Launch (1 week before)

- [ ] Complete security audit
- [ ] Load testing completed
- [ ] All features tested on mainnet
- [ ] Documentation reviewed and updated
- [ ] Support channels set up
- [ ] Monitoring dashboards configured
- [ ] Backup procedures tested
- [ ] Team trained on deployment process

### Launch Day

- [ ] Final code freeze
- [ ] Deploy to production
- [ ] Verify all environment variables
- [ ] Test critical paths (pool creation, fee payment)
- [ ] Monitor error rates closely
- [ ] Check fee wallet is receiving payments
- [ ] Verify RPC is responding correctly
- [ ] Announce launch

### Post-Launch (first 48 hours)

- [ ] Monitor error rates every 2 hours
- [ ] Check fee wallet balance every 4 hours
- [ ] Review RPC usage patterns
- [ ] Respond to user feedback
- [ ] Document any issues
- [ ] Plan immediate fixes if needed

---

## Cost Estimates

### Vercel Hosting

**Free Tier:**
- Cost: $0/month
- Sufficient for: 0-1,000 users/month
- Limits: 100GB bandwidth, 100GB-hrs compute

**Pro Tier:**
- Cost: $20/month
- Sufficient for: 1,000-10,000 users/month
- Limits: 1TB bandwidth, 1000GB-hrs compute

### RPC Costs (Helius)

**Growth Plan:** $99/month
- 1M credits/month
- Sufficient for: 10,000-50,000 transactions/month
- Cost per transaction: ~$0.0001

**Business Plan:** $349/month
- 5M credits/month
- Sufficient for: 50,000-250,000 transactions/month

### Total Monthly Costs

**Small Scale (< 1,000 users):**
- Hosting: $0 (Vercel free)
- RPC: $99 (Helius Growth)
- **Total: $99/month**

**Medium Scale (1,000-10,000 users):**
- Hosting: $20 (Vercel Pro)
- RPC: $99-$349 (Helius Growth/Business)
- **Total: $119-$369/month**

**Revenue Potential:**
- 1,000 users × 10 tx/month × 0.0085 SOL × $100/SOL = $8,500/month
- Operating costs: $99-$369/month
- **Profit margin: ~95%+**

---

## Production Deployment Platforms Comparison

| Feature | Vercel | Netlify | Custom VPS | AWS/GCP |
|---------|--------|---------|------------|---------|
| Setup Time | 5 min | 10 min | 2 hours | 4+ hours |
| Cost (small) | Free | Free | $5/mo | $20/mo |
| Next.js Support | Excellent | Good | Manual | Manual |
| Auto-scaling | Yes | Yes | Manual | Yes |
| SSL | Auto | Auto | Manual | Yes |
| DDoS Protection | Yes | Yes | Manual | Yes |
| Edge Network | Yes | Yes | No | Yes |
| Recommended | ✅ Yes | ⚠️ OK | ❌ No* | ⚠️ Later |

*Not recommended for initial launch - too much overhead

---

## Final Recommendations

**For Launch:**
1. ✅ Deploy to Vercel (easiest, best Next.js support)
2. ✅ Use Helius Growth plan ($99/mo)
3. ✅ Keep Alchemy as fallback
4. ✅ Start with free Vercel tier
5. ✅ Monitor for 2 weeks before scaling

**First Month Goals:**
- Get 100+ users
- Collect data on usage patterns
- Monitor RPC costs
- Validate fee distribution
- Gather user feedback

**After Stability:**
- Consider custom domain
- Upgrade to Vercel Pro if needed
- Implement tiered RPC pricing
- Add advanced analytics
- Scale RPC plan as needed

---

*Last updated: 2025-11-02*
*For questions or issues, see the [GitHub Issues](https://github.com/Jpatching/meteora-ui-wrapper/issues)*
