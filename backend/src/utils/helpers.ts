import crypto from 'crypto';

// Generate referral code from wallet address
export function generateReferralCode(walletAddress: string, attempt: number = 0): string {
  const hash = crypto
    .createHash('sha256')
    .update(walletAddress + attempt.toString())
    .digest('hex');

  // Take first 8 characters and convert to uppercase
  return hash.substring(0, 8).toUpperCase();
}

// Validate Solana wallet address
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation: 32-44 characters, base58 alphabet
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Calculate tier based on volume
export function calculateTier(totalVolume: number): string {
  if (totalVolume >= 1000000) return 'platinum'; // $1M+
  if (totalVolume >= 500000) return 'gold';      // $500K+
  if (totalVolume >= 100000) return 'silver';    // $100K+
  if (totalVolume >= 10000) return 'bronze';     // $10K+
  return 'free';
}

// Get rate limit based on tier
export function getRateLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 10,        // 10 requests per minute
    bronze: 30,      // 30 requests per minute
    silver: 100,     // 100 requests per minute
    gold: 200,       // 200 requests per minute
    platinum: 300,   // 300 requests per minute
  };
  return limits[tier] || limits.free;
}

// Format SOL amount
export function formatSOL(lamports: number): number {
  return lamports / 1e9;
}

// Parse SOL to lamports
export function parseSOL(sol: number): number {
  return Math.floor(sol * 1e9);
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}
