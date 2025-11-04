import { PublicKey } from '@solana/web3.js';

/**
 * Referral System
 *
 * Manages referral codes, tracking, and commission calculations
 */

export interface ReferralCode {
  code: string;
  referrerWallet: string;
  createdAt: number;
  uses: number;
}

export interface ReferralEarnings {
  totalEarnings: number; // in lamports
  totalReferrals: number;
  earnings: Array<{
    timestamp: number;
    amount: number;
    referee: string;
    transaction: string;
  }>;
}

const REFERRAL_STORAGE_KEY = 'meteora-referrals';
const EARNINGS_STORAGE_KEY = 'meteora-referral-earnings';

/**
 * Generate a unique referral code from a wallet address
 *
 * Format: First 4 chars + last 4 chars of base58 address
 * Example: Bac8...3kLm → BAC83KLM
 */
export function generateReferralCode(walletAddress: string): string {
  const clean = walletAddress.trim();
  if (clean.length < 8) {
    throw new Error('Invalid wallet address for referral code generation');
  }

  // Use first 4 and last 4 characters
  const code = (clean.slice(0, 4) + clean.slice(-4)).toUpperCase();
  return code;
}

/**
 * Validate a referral code format
 */
export function isValidReferralCode(code: string): boolean {
  if (!code) return false;
  // 8 characters, alphanumeric
  return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
}

/**
 * Get referral code for the current wallet
 */
export function getMyReferralCode(walletAddress: string): string {
  return generateReferralCode(walletAddress);
}

/**
 * Get referral link for sharing
 */
export function getReferralLink(walletAddress: string, baseUrl?: string): string {
  const code = generateReferralCode(walletAddress);
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${url}?ref=${code}`;
}

/**
 * Store a referral code usage
 */
export function storeReferralCode(code: string, referrerWallet: string): void {
  if (!isValidReferralCode(code)) {
    throw new Error('Invalid referral code format');
  }

  const referrals = getAllReferralCodes();
  const existing = referrals.find((r) => r.code === code.toUpperCase());

  if (existing) {
    existing.uses += 1;
  } else {
    referrals.push({
      code: code.toUpperCase(),
      referrerWallet,
      createdAt: Date.now(),
      uses: 1,
    });
  }

  saveReferralCodes(referrals);
}

/**
 * Get all stored referral codes
 */
export function getAllReferralCodes(): ReferralCode[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading referral codes:', error);
    return [];
  }
}

/**
 * Save referral codes to localStorage
 */
function saveReferralCodes(codes: ReferralCode[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(codes));
  } catch (error) {
    console.error('Error saving referral codes:', error);
  }
}

/**
 * Find referrer wallet by referral code
 */
export function getReferrerWallet(code: string): string | null {
  if (!code || !isValidReferralCode(code)) {
    return null;
  }

  const referrals = getAllReferralCodes();
  const match = referrals.find((r) => r.code === code.toUpperCase());
  return match ? match.referrerWallet : null;
}

/**
 * Record a referral earning
 */
export function recordReferralEarning(
  referrerWallet: string,
  amount: number,
  referee: string,
  transaction: string
): void {
  const earnings = getReferralEarnings(referrerWallet);

  earnings.totalEarnings += amount;
  earnings.totalReferrals += 1;
  earnings.earnings.push({
    timestamp: Date.now(),
    amount,
    referee,
    transaction,
  });

  saveReferralEarnings(referrerWallet, earnings);
}

/**
 * Get referral earnings for a wallet
 */
export function getReferralEarnings(walletAddress: string): ReferralEarnings {
  if (typeof window === 'undefined') {
    return { totalEarnings: 0, totalReferrals: 0, earnings: [] };
  }

  try {
    const key = `${EARNINGS_STORAGE_KEY}-${walletAddress}`;
    const stored = localStorage.getItem(key);
    return stored
      ? JSON.parse(stored)
      : { totalEarnings: 0, totalReferrals: 0, earnings: [] };
  } catch (error) {
    console.error('Error loading referral earnings:', error);
    return { totalEarnings: 0, totalReferrals: 0, earnings: [] };
  }
}

/**
 * Save referral earnings to localStorage
 */
function saveReferralEarnings(walletAddress: string, earnings: ReferralEarnings): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${EARNINGS_STORAGE_KEY}-${walletAddress}`;
    localStorage.setItem(key, JSON.stringify(earnings));
  } catch (error) {
    console.error('Error saving referral earnings:', error);
  }
}

/**
 * Get referral code from URL query parameter
 */
export function getReferralCodeFromURL(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref');

  if (code && isValidReferralCode(code)) {
    return code.toUpperCase();
  }

  return null;
}

/**
 * Store referral code from URL to localStorage for later use
 */
export function storeReferralFromURL(): string | null {
  const code = getReferralCodeFromURL();

  if (code) {
    // Store in localStorage with expiry (30 days)
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'pending-referral',
      JSON.stringify({
        code,
        expiry,
      })
    );
    return code;
  }

  return null;
}

/**
 * Get stored referral code (from URL visit)
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('pending-referral');
    if (!stored) return null;

    const { code, expiry } = JSON.parse(stored);

    // Check if expired
    if (Date.now() > expiry) {
      localStorage.removeItem('pending-referral');
      return null;
    }

    return code;
  } catch (error) {
    console.error('Error getting stored referral code:', error);
    return null;
  }
}

/**
 * Clear stored referral code (after use)
 */
export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pending-referral');
}

/**
 * Get leaderboard of top referrers
 */
export function getReferralLeaderboard(limit: number = 10): Array<{
  wallet: string;
  code: string;
  uses: number;
  earnings: number;
}> {
  const referrals = getAllReferralCodes();

  // Sort by uses (descending)
  const sorted = referrals
    .map((ref) => {
      const earnings = getReferralEarnings(ref.referrerWallet);
      return {
        wallet: ref.referrerWallet,
        code: ref.code,
        uses: ref.uses,
        earnings: earnings.totalEarnings,
      };
    })
    .sort((a, b) => b.uses - a.uses);

  return sorted.slice(0, limit);
}

/**
 * Calculate referral commission amount
 */
export function calculateReferralCommission(totalFeeLamports: number): number {
  const referralPercentage = parseInt(process.env.NEXT_PUBLIC_REFERRAL_PERCENTAGE || '10', 10);
  return Math.floor((totalFeeLamports * referralPercentage) / 100);
}

/**
 * Resolve referrer wallet from code or URL
 *
 * Priority:
 * 1. Explicit code provided
 * 2. Stored referral code from URL
 * 3. Referral code in current URL
 */
export function resolveReferrerWallet(explicitCode?: string): PublicKey | null {
  // 1. Check explicit code
  if (explicitCode) {
    const wallet = getReferrerWallet(explicitCode);
    if (wallet) {
      try {
        return new PublicKey(wallet);
      } catch (error) {
        console.error('Invalid referrer wallet address:', wallet);
        return null;
      }
    }
  }

  // 2. Check stored referral (from previous URL visit)
  const storedCode = getStoredReferralCode();
  if (storedCode) {
    const wallet = getReferrerWallet(storedCode);
    if (wallet) {
      try {
        return new PublicKey(wallet);
      } catch (error) {
        console.error('Invalid referrer wallet address:', wallet);
        return null;
      }
    }
  }

  // 3. Check current URL
  const urlCode = getReferralCodeFromURL();
  if (urlCode) {
    const wallet = getReferrerWallet(urlCode);
    if (wallet) {
      try {
        return new PublicKey(wallet);
      } catch (error) {
        console.error('Invalid referrer wallet address:', wallet);
        return null;
      }
    }
  }

  return null;
}

/**
 * Check if referrals are enabled
 */
export function areReferralsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REFERRALS === 'true';
}
