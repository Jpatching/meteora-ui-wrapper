'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { TransactionRecord, TransactionFilter, AnalyticsSummary } from '@/types/transactions';
import {
  getAllTransactions,
  addTransaction as addTransactionToStore,
  updateTransaction as updateTransactionInStore,
  getWalletTransactions,
  filterTransactions,
  generateAnalytics,
  downloadExport,
  importTransactions,
  clearWalletTransactions,
} from '@/lib/transactionStore';

interface TransactionHistoryContextType {
  transactions: TransactionRecord[];
  addTransaction: (transaction: Omit<TransactionRecord, 'id' | 'timestamp'>) => TransactionRecord;
  updateTransaction: (id: string, updates: Partial<TransactionRecord>) => void;
  getFilteredTransactions: (filter: TransactionFilter) => TransactionRecord[];
  getWalletHistory: (walletAddress: string) => TransactionRecord[];
  getAnalytics: (walletAddress?: string) => AnalyticsSummary;
  exportData: (walletAddress: string) => void;
  importData: (file: File) => Promise<number>;
  clearHistory: (walletAddress: string) => void;
  refresh: () => void;
}

const TransactionHistoryContext = createContext<TransactionHistoryContextType | undefined>(
  undefined
);

export function TransactionHistoryProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = useCallback(() => {
    const loaded = getAllTransactions();
    setTransactions(loaded);
  }, []);

  const addTransaction = useCallback(
    (transaction: Omit<TransactionRecord, 'id' | 'timestamp'>) => {
      const newTransaction = addTransactionToStore(transaction);
      setTransactions((prev) => [...prev, newTransaction]);
      return newTransaction;
    },
    []
  );

  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    updateTransactionInStore(id, updates);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const getFilteredTransactions = useCallback(
    (filter: TransactionFilter) => {
      return filterTransactions(transactions, filter);
    },
    [transactions]
  );

  const getWalletHistory = useCallback(
    (walletAddress: string) => {
      return getWalletTransactions(walletAddress);
    },
    []
  );

  const getAnalytics = useCallback(
    (walletAddress?: string) => {
      const txs = walletAddress ? getWalletTransactions(walletAddress) : transactions;
      return generateAnalytics(txs);
    },
    [transactions]
  );

  const exportData = useCallback((walletAddress: string) => {
    downloadExport(walletAddress);
  }, []);

  const importData = useCallback(
    async (file: File): Promise<number> => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const importedCount = importTransactions(data);
        loadTransactions(); // Refresh state
        return importedCount;
      } catch (error) {
        console.error('Failed to import transactions:', error);
        throw new Error('Invalid file format');
      }
    },
    [loadTransactions]
  );

  const clearHistory = useCallback(
    (walletAddress: string) => {
      clearWalletTransactions(walletAddress);
      loadTransactions(); // Refresh state
    },
    [loadTransactions]
  );

  const refresh = useCallback(() => {
    loadTransactions();
  }, [loadTransactions]);

  const value: TransactionHistoryContextType = {
    transactions,
    addTransaction,
    updateTransaction,
    getFilteredTransactions,
    getWalletHistory,
    getAnalytics,
    exportData,
    importData,
    clearHistory,
    refresh,
  };

  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  );
}

export function useTransactionHistory() {
  const context = useContext(TransactionHistoryContext);
  if (!context) {
    throw new Error('useTransactionHistory must be used within TransactionHistoryProvider');
  }
  return context;
}
