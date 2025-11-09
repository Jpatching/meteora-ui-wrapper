/**
 * React Hook for MetaTools Vault Management
 * Handles session wallet creation and position management
 */

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  createVault,
  generateSessionWallet,
  fetchVaultMetadata,
  Protocol,
  Strategy,
  openPositionInstruction,
  closePositionInstruction,
} from '../vault/vaultSDK';
import { useLocalStorage } from './useLocalStorage';

interface VaultState {
  sessionWallet: Keypair | null;
  vaultPDA: PublicKey | null;
  vaultData: any | null;
  positions: any[];
}

export function useVault() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Persist session wallet in localStorage (encrypted would be better in production)
  const [storedSessionWallet, setStoredSessionWallet] = useLocalStorage<string | null>(
    'metatools_session_wallet',
    null
  );

  const [state, setState] = useState<VaultState>({
    sessionWallet: null,
    vaultPDA: null,
    vaultData: null,
    positions: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session wallet from localStorage on mount
  useEffect(() => {
    if (storedSessionWallet) {
      try {
        const secretKey = Uint8Array.from(JSON.parse(storedSessionWallet));
        const keypair = Keypair.fromSecretKey(secretKey);
        setState(prev => ({ ...prev, sessionWallet: keypair }));
      } catch (err) {
        console.error('Failed to restore session wallet:', err);
        setStoredSessionWallet(null);
      }
    }
  }, [storedSessionWallet, setStoredSessionWallet]);

  /**
   * Create a new vault with session wallet
   */
  const createNewVault = useCallback(async (referrer?: PublicKey) => {
    if (!wallet.publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate session wallet
      const sessionWallet = generateSessionWallet();

      // Create vault on-chain
      const result = await createVault(
        connection,
        wallet,
        sessionWallet,
        referrer
      );

      // Store session wallet securely
      setStoredSessionWallet(JSON.stringify(Array.from(sessionWallet.secretKey)));

      // Update state
      setState(prev => ({
        ...prev,
        sessionWallet,
        vaultPDA: result.vaultPDA,
      }));

      setLoading(false);
      return {
        ...result,
        sessionWalletPrivateKey: Array.from(sessionWallet.secretKey),
      };
    } catch (err: any) {
      console.error('Error creating vault:', err);
      setError(err.message || 'Failed to create vault');
      setLoading(false);
      return null;
    }
  }, [connection, wallet, setStoredSessionWallet]);

  /**
   * Load vault data from chain
   */
  const loadVault = useCallback(async () => {
    if (!state.sessionWallet) {
      setError('No session wallet found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vaultData = await fetchVaultMetadata(
        connection,
        state.sessionWallet.publicKey
      );

      if (!vaultData) {
        setError('Vault not found on-chain');
        setLoading(false);
        return;
      }

      setState(prev => ({
        ...prev,
        vaultData,
      }));

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading vault:', err);
      setError(err.message || 'Failed to load vault');
      setLoading(false);
    }
  }, [connection, state.sessionWallet]);

  /**
   * Open a new position
   */
  const openPosition = useCallback(async (
    poolAddress: string,
    baseMint: string,
    quoteMint: string,
    initialTVL: number,
    protocol: Protocol,
    strategy: Strategy
  ) => {
    if (!state.sessionWallet) {
      setError('No session wallet found');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const instruction = openPositionInstruction(
        state.sessionWallet.publicKey,
        new PublicKey(poolAddress),
        new PublicKey(baseMint),
        new PublicKey(quoteMint),
        BigInt(initialTVL),
        protocol,
        strategy
      );

      // TODO: Build and send transaction
      // For now, return the instruction

      setLoading(false);
      return instruction;
    } catch (err: any) {
      console.error('Error opening position:', err);
      setError(err.message || 'Failed to open position');
      setLoading(false);
      return null;
    }
  }, [state.sessionWallet]);

  /**
   * Close a position
   */
  const closePosition = useCallback(async (positionId: number) => {
    if (!state.sessionWallet) {
      setError('No session wallet found');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const instruction = closePositionInstruction(
        state.sessionWallet.publicKey,
        BigInt(positionId)
      );

      // TODO: Build and send transaction

      setLoading(false);
      return instruction;
    } catch (err: any) {
      console.error('Error closing position:', err);
      setError(err.message || 'Failed to close position');
      setLoading(false);
      return null;
    }
  }, [state.sessionWallet]);

  /**
   * Export session wallet private key
   */
  const exportSessionWallet = useCallback(() => {
    if (!state.sessionWallet) {
      return null;
    }

    return {
      publicKey: state.sessionWallet.publicKey.toBase58(),
      privateKey: Array.from(state.sessionWallet.secretKey),
      privateKeyBase58: require('bs58').encode(state.sessionWallet.secretKey),
    };
  }, [state.sessionWallet]);

  /**
   * Clear session wallet (logout)
   */
  const clearSessionWallet = useCallback(() => {
    setStoredSessionWallet(null);
    setState({
      sessionWallet: null,
      vaultPDA: null,
      vaultData: null,
      positions: [],
    });
  }, [setStoredSessionWallet]);

  return {
    // State
    hasVault: !!state.sessionWallet,
    sessionWallet: state.sessionWallet,
    vaultPDA: state.vaultPDA,
    vaultData: state.vaultData,
    positions: state.positions,
    loading,
    error,

    // Actions
    createNewVault,
    loadVault,
    openPosition,
    closePosition,
    exportSessionWallet,
    clearSessionWallet,
  };
}
