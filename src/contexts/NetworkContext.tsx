'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { clusterApiUrl, Connection } from '@solana/web3.js';

export type NetworkType = 'devnet' | 'mainnet-beta';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  rpcUrl: string;
  getConnection: () => Promise<Connection>;
  testRpcHealth: (url: string) => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Initialize network from localStorage immediately (not in useEffect)
  // This prevents race conditions where queries fire before localStorage is read
  const [network, setNetworkState] = useState<NetworkType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meteora-network') as NetworkType;
      if (saved && ['devnet', 'mainnet-beta'].includes(saved)) {
        console.log(`[Network] Loaded from localStorage: ${saved}`);
        return saved;
      }
    }
    console.log('[Network] No saved network, defaulting to mainnet-beta');
    return 'mainnet-beta'; // Default to mainnet, not devnet
  });
  const [currentRpcUrl, setCurrentRpcUrl] = useState<string>('');

  // Test RPC health by trying to get recent blockhash
  const testRpcHealth = useCallback(async (url: string): Promise<boolean> => {
    try {
      const connection = new Connection(url, 'confirmed');
      await connection.getLatestBlockhash();
      return true;
    } catch (error) {
      console.error(`[RPC Health] Failed to connect to ${url}:`, error);
      return false;
    }
  }, []);

  // Get fallback URLs for a network
  const getFallbackUrls = useCallback((networkType: NetworkType): string[] => {
    const fallbacks: string[] = [];

    // Add Alchemy fallback for devnet
    if (networkType === 'devnet' && process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_RPC) {
      fallbacks.push(process.env.NEXT_PUBLIC_ALCHEMY_DEVNET_RPC);
    }

    // Add Solana public RPC as last resort
    switch (networkType) {
      case 'devnet':
        fallbacks.push(clusterApiUrl('devnet'));
        break;
      case 'mainnet-beta':
        fallbacks.push(clusterApiUrl('mainnet-beta'));
        break;
    }

    return fallbacks;
  }, []);

  const getRpcUrl = useCallback((networkType: NetworkType): string => {
    // Priority 1: Check for custom RPC from settings page (localStorage)
    if (typeof window !== 'undefined') {
      try {
        const savedConfig = localStorage.getItem('rpc_config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          // Map mainnet-beta to mainnet for config lookup
          const networkKey = networkType === 'mainnet-beta' ? 'mainnet' : networkType;

          if (config[networkKey]) {
            console.log(`[RPC] Using custom RPC for ${networkType}:`, config[networkKey]);
            return config[networkKey];
          }
        }
      } catch (error) {
        console.error('[RPC] Failed to load custom RPC config:', error);
      }
    }

    // Priority 2: Check environment variables
    if (networkType === 'mainnet-beta' && process.env.NEXT_PUBLIC_MAINNET_RPC) {
      console.log('[RPC] Using env var for mainnet');
      return process.env.NEXT_PUBLIC_MAINNET_RPC;
    }
    if (networkType === 'devnet' && process.env.NEXT_PUBLIC_DEVNET_RPC) {
      console.log('[RPC] Using env var for devnet');
      return process.env.NEXT_PUBLIC_DEVNET_RPC;
    }

    // Priority 3: Fall back to Solana defaults
    console.log(`[RPC] Using default Solana RPC for ${networkType}`);
    switch (networkType) {
      case 'devnet':
        return clusterApiUrl('devnet');
      case 'mainnet-beta':
        return clusterApiUrl('mainnet-beta');
      default:
        return clusterApiUrl('devnet');
    }
  }, []);

  // Get connection with automatic failover
  const getConnection = useCallback(async (): Promise<Connection> => {
    const primaryUrl = getRpcUrl(network);

    // Try primary RPC first
    if (await testRpcHealth(primaryUrl)) {
      console.log(`[RPC] Using primary RPC: ${primaryUrl}`);
      setCurrentRpcUrl(primaryUrl);
      return new Connection(primaryUrl, 'confirmed');
    }

    // Try fallback RPCs
    console.warn(`[RPC] Primary RPC failed, trying fallbacks...`);
    const fallbacks = getFallbackUrls(network);

    for (const fallbackUrl of fallbacks) {
      if (await testRpcHealth(fallbackUrl)) {
        console.log(`[RPC] Using fallback RPC: ${fallbackUrl}`);
        setCurrentRpcUrl(fallbackUrl);
        return new Connection(fallbackUrl, 'confirmed');
      }
    }

    // If all fail, return primary anyway and let it fail with proper error
    console.error(`[RPC] All RPCs failed, using primary anyway`);
    setCurrentRpcUrl(primaryUrl);
    return new Connection(primaryUrl, 'confirmed');
  }, [network, getRpcUrl, testRpcHealth, getFallbackUrls]);

  const setNetwork = useCallback((newNetwork: NetworkType) => {
    console.log(`[Network] Switching to ${newNetwork}`);
    setNetworkState(newNetwork);
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('meteora-network', newNetwork);
    }
  }, []);

  // Note: Network is now initialized in useState, no need for useEffect
  // This was moved to prevent race conditions with React Query

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        rpcUrl: currentRpcUrl || getRpcUrl(network),
        getConnection,
        testRpcHealth,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
