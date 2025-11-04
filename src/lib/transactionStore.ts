/**
 * Transaction store using localStorage for persistent transaction history
 * Provides CRUD operations for transaction records with export/import functionality
 */

import type {
  TransactionRecord,
  TransactionFilter,
  AnalyticsSummary,
  ExportData,
} from '@/types/transactions';

const STORAGE_KEY = 'meteora-transactions';
const STORAGE_VERSION = '1.0.0';
const MAX_TRANSACTIONS = 1000; // Keep last 1000 transactions

/**
 * Generate unique ID for transaction
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all transactions from localStorage
 */
export function getAllTransactions(): TransactionRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const transactions: TransactionRecord[] = JSON.parse(data);
    return transactions;
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
}

/**
 * Save transactions to localStorage
 */
function saveTransactions(transactions: TransactionRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Keep only most recent MAX_TRANSACTIONS
    const trimmed = transactions.slice(-MAX_TRANSACTIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save transactions:', error);
  }
}

/**
 * Add a new transaction
 */
export function addTransaction(
  transaction: Omit<TransactionRecord, 'id' | 'timestamp'>
): TransactionRecord {
  const newTransaction: TransactionRecord = {
    ...transaction,
    id: generateId(),
    timestamp: Date.now(),
  };

  const transactions = getAllTransactions();
  transactions.push(newTransaction);
  saveTransactions(transactions);

  return newTransaction;
}

/**
 * Update transaction status (e.g., when confirmed or failed)
 */
export function updateTransaction(
  id: string,
  updates: Partial<TransactionRecord>
): void {
  const transactions = getAllTransactions();
  const index = transactions.findIndex((t) => t.id === id);

  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updates };
    saveTransactions(transactions);
  }
}

/**
 * Get transactions for specific wallet
 */
export function getWalletTransactions(walletAddress: string): TransactionRecord[] {
  return getAllTransactions().filter(
    (t) => t.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Get transaction by signature
 */
export function getTransactionBySignature(signature: string): TransactionRecord | null {
  const transactions = getAllTransactions();
  return transactions.find((t) => t.signature === signature) || null;
}

/**
 * Filter transactions
 */
export function filterTransactions(
  transactions: TransactionRecord[],
  filter: TransactionFilter
): TransactionRecord[] {
  return transactions.filter((t) => {
    if (filter.protocol && t.protocol !== filter.protocol) return false;
    if (filter.action && t.action !== filter.action) return false;
    if (filter.status && t.status !== filter.status) return false;
    if (filter.network && t.network !== filter.network) return false;
    if (filter.startDate && t.timestamp < filter.startDate) return false;
    if (filter.endDate && t.timestamp > filter.endDate) return false;

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSignature = t.signature.toLowerCase().includes(searchLower);
      const matchesPool = t.poolAddress?.toLowerCase().includes(searchLower);
      const matchesToken = t.tokenAddress?.toLowerCase().includes(searchLower);
      const matchesLabel = t.label?.toLowerCase().includes(searchLower);

      if (!matchesSignature && !matchesPool && !matchesToken && !matchesLabel) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generate analytics summary
 */
export function generateAnalytics(transactions: TransactionRecord[]): AnalyticsSummary {
  const summary: AnalyticsSummary = {
    totalTransactions: transactions.length,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalFeesPaid: 0,
    totalMetadataFees: 0,
    metadataServiceUsages: 0,
    totalPools: 0,
    totalTokens: 0,
    protocolBreakdown: {
      'dlmm': 0,
      'damm-v1': 0,
      'damm-v2': 0,
      'dbc': 0,
      'alpha-vault': 0,
      'settings': 0,
    },
    actionBreakdown: {} as any,
  };

  transactions.forEach((t) => {
    // Count status
    if (t.status === 'success') summary.successfulTransactions++;
    if (t.status === 'failed') summary.failedTransactions++;

    // Sum fees
    if (t.platformFee) summary.totalFeesPaid += t.platformFee;

    // Sum metadata service fees
    if (t.metadataServiceUsed && t.metadataFee) {
      summary.totalMetadataFees += t.metadataFee;
      summary.metadataServiceUsages++;
    }

    // Count resources
    if (t.poolAddress) summary.totalPools++;
    if (t.tokenAddress) summary.totalTokens++;

    // Protocol breakdown
    summary.protocolBreakdown[t.protocol]++;

    // Action breakdown
    if (!summary.actionBreakdown[t.action]) {
      summary.actionBreakdown[t.action] = 0;
    }
    summary.actionBreakdown[t.action]++;
  });

  return summary;
}

/**
 * Export transactions as JSON
 */
export function exportTransactions(walletAddress: string): ExportData {
  const transactions = getWalletTransactions(walletAddress);

  return {
    version: STORAGE_VERSION,
    exportDate: Date.now(),
    walletAddress,
    transactions,
  };
}

/**
 * Export transactions and download as file
 */
export function downloadExport(walletAddress: string): void {
  const data = exportTransactions(walletAddress);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `meteora-launches-${walletAddress.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Import transactions from exported data
 */
export function importTransactions(data: ExportData): number {
  const existing = getAllTransactions();
  const existingSignatures = new Set(existing.map((t) => t.signature));

  // Filter out duplicates
  const newTransactions = data.transactions.filter(
    (t) => !existingSignatures.has(t.signature)
  );

  if (newTransactions.length > 0) {
    const combined = [...existing, ...newTransactions];
    saveTransactions(combined);
  }

  return newTransactions.length;
}

/**
 * Clear all transactions (with confirmation)
 */
export function clearAllTransactions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear transactions for specific wallet
 */
export function clearWalletTransactions(walletAddress: string): void {
  const transactions = getAllTransactions();
  const filtered = transactions.filter(
    (t) => t.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
  );
  saveTransactions(filtered);
}
