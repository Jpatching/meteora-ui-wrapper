'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  getMyReferralCode,
  getReferralLink,
  getReferralEarnings,
  recordReferralEarning,
  storeReferralFromURL,
  getStoredReferralCode,
  clearStoredReferralCode,
  resolveReferrerWallet,
  getReferralLeaderboard,
  areReferralsEnabled,
  type ReferralEarnings,
} from '@/lib/referrals';

interface ReferralContextType {
  // Current user's referral info
  myReferralCode: string | null;
  myReferralLink: string | null;
  myEarnings: ReferralEarnings;

  // Active referral (when user was referred)
  activeReferralCode: string | null;
  referrerWallet: PublicKey | null;

  // Actions
  refreshEarnings: () => void;
  setActiveReferralCode: (code: string | null) => void;
  recordEarning: (amount: number, referee: string, transaction: string) => void;

  // Leaderboard
  leaderboard: Array<{
    wallet: string;
    code: string;
    uses: number;
    earnings: number;
  }>;
  refreshLeaderboard: () => void;

  // Config
  enabled: boolean;
}

const ReferralContext = createContext<ReferralContextType | null>(null);

export function ReferralProvider({
  children,
  walletAddress,
}: {
  children: ReactNode;
  walletAddress?: string;
}) {
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [myReferralLink, setMyReferralLink] = useState<string | null>(null);
  const [myEarnings, setMyEarnings] = useState<ReferralEarnings>({
    totalEarnings: 0,
    totalReferrals: 0,
    earnings: [],
  });
  const [activeReferralCode, setActiveReferralCodeState] = useState<string | null>(null);
  const [referrerWallet, setReferrerWallet] = useState<PublicKey | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ wallet: string; code: string; uses: number; earnings: number }>
  >([]);

  const enabled = areReferralsEnabled();

  // Load user's referral code and earnings
  useEffect(() => {
    if (walletAddress && enabled) {
      const code = getMyReferralCode(walletAddress);
      const link = getReferralLink(walletAddress);
      const earnings = getReferralEarnings(walletAddress);

      setMyReferralCode(code);
      setMyReferralLink(link);
      setMyEarnings(earnings);
    } else {
      setMyReferralCode(null);
      setMyReferralLink(null);
      setMyEarnings({ totalEarnings: 0, totalReferrals: 0, earnings: [] });
    }
  }, [walletAddress, enabled]);

  // Load referral from URL on mount
  useEffect(() => {
    if (enabled) {
      const storedCode = storeReferralFromURL();
      if (storedCode) {
        setActiveReferralCodeState(storedCode);
      } else {
        const existing = getStoredReferralCode();
        if (existing) {
          setActiveReferralCodeState(existing);
        }
      }
    }
  }, [enabled]);

  // Resolve referrer wallet when code changes
  useEffect(() => {
    if (activeReferralCode && enabled) {
      const wallet = resolveReferrerWallet(activeReferralCode);
      setReferrerWallet(wallet);
    } else {
      setReferrerWallet(null);
    }
  }, [activeReferralCode, enabled]);

  // Refresh earnings
  const refreshEarnings = useCallback(() => {
    if (walletAddress && enabled) {
      const earnings = getReferralEarnings(walletAddress);
      setMyEarnings(earnings);
    }
  }, [walletAddress, enabled]);

  // Set active referral code
  const setActiveReferralCode = useCallback((code: string | null) => {
    setActiveReferralCodeState(code);
  }, []);

  // Record a new earning
  const recordEarning = useCallback(
    (amount: number, referee: string, transaction: string) => {
      if (walletAddress && enabled) {
        recordReferralEarning(walletAddress, amount, referee, transaction);
        refreshEarnings();
      }
    },
    [walletAddress, enabled, refreshEarnings]
  );

  // Refresh leaderboard
  const refreshLeaderboard = useCallback(() => {
    if (enabled) {
      const board = getReferralLeaderboard(10);
      setLeaderboard(board);
    }
  }, [enabled]);

  // Load leaderboard on mount
  useEffect(() => {
    if (enabled) {
      refreshLeaderboard();
    }
  }, [enabled, refreshLeaderboard]);

  const value: ReferralContextType = {
    myReferralCode,
    myReferralLink,
    myEarnings,
    activeReferralCode,
    referrerWallet,
    refreshEarnings,
    setActiveReferralCode,
    recordEarning,
    leaderboard,
    refreshLeaderboard,
    enabled,
  };

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within ReferralProvider');
  }
  return context;
}
