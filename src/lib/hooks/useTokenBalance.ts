/**
 * Hook for fetching SPL token balances
 */

'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { useQuery } from '@tanstack/react-query';

export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  address: string;
}

/**
 * Fetch balance for a specific token
 */
export function useTokenBalance(mintAddress: string | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['token-balance', publicKey?.toBase58(), mintAddress],
    queryFn: async (): Promise<TokenBalance | null> => {
      if (!publicKey || !mintAddress) return null;

      try {
        const mint = new PublicKey(mintAddress);
        const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);

        // Try to fetch the account
        const accountInfo = await getAccount(connection, tokenAccount);

        return {
          mint: mintAddress,
          balance: Number(accountInfo.amount),
          decimals: accountInfo.mint ? 9 : 9, // Default to 9 if not available
          uiAmount: Number(accountInfo.amount) / Math.pow(10, 9),
          address: tokenAccount.toBase58(),
        };
      } catch (error) {
        // Account doesn't exist or other error
        console.debug('Token account not found:', mintAddress);
        return {
          mint: mintAddress,
          balance: 0,
          decimals: 9,
          uiAmount: 0,
          address: '',
        };
      }
    },
    enabled: !!publicKey && !!mintAddress,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Fetch balances for multiple tokens
 */
export function useTokenBalances(mintAddresses: string[]) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['token-balances', publicKey?.toBase58(), ...mintAddresses],
    queryFn: async (): Promise<TokenBalance[]> => {
      if (!publicKey || mintAddresses.length === 0) return [];

      const balances = await Promise.all(
        mintAddresses.map(async (mintAddress) => {
          try {
            const mint = new PublicKey(mintAddress);
            const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);

            const accountInfo = await getAccount(connection, tokenAccount);

            return {
              mint: mintAddress,
              balance: Number(accountInfo.amount),
              decimals: 9,
              uiAmount: Number(accountInfo.amount) / Math.pow(10, 9),
              address: tokenAccount.toBase58(),
            };
          } catch (error) {
            return {
              mint: mintAddress,
              balance: 0,
              decimals: 9,
              uiAmount: 0,
              address: '',
            };
          }
        })
      );

      return balances;
    },
    enabled: !!publicKey && mintAddresses.length > 0,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

/**
 * Fetch SOL balance
 */
export function useSOLBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['sol-balance', publicKey?.toBase58()],
    queryFn: async (): Promise<number> => {
      if (!publicKey) return 0;

      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    },
    enabled: !!publicKey,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}
