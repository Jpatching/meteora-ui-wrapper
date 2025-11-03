/**
 * Position storage and retrieval
 * Stores user positions in localStorage for persistence
 */

import type {
  UserPosition,
  PortfolioSummary,
  PositionType,
  PositionStatus,
} from '@/types/positions';

const STORAGE_KEY = 'meteora_positions';
const STORAGE_VERSION = '1.0';

interface StorageData {
  version: string;
  positions: UserPosition[];
  lastUpdated: number;
}

/**
 * Get all positions from localStorage
 */
export function getAllPositions(): UserPosition[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: StorageData = JSON.parse(stored);
    return data.positions || [];
  } catch (error) {
    console.error('Failed to load positions from storage:', error);
    return [];
  }
}

/**
 * Save positions to localStorage
 */
function savePositions(positions: UserPosition[]): void {
  if (typeof window === 'undefined') return;

  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      positions,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save positions to storage:', error);
  }
}

/**
 * Add a new position
 */
export function addPosition(position: Omit<UserPosition, 'id' | 'createdAt' | 'lastUpdated'>): UserPosition {
  const newPosition: UserPosition = {
    ...position,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };

  const positions = getAllPositions();
  positions.push(newPosition);
  savePositions(positions);

  return newPosition;
}

/**
 * Update an existing position
 */
export function updatePosition(id: string, updates: Partial<UserPosition>): void {
  const positions = getAllPositions();
  const index = positions.findIndex((p) => p.id === id);

  if (index === -1) {
    console.warn(`Position ${id} not found`);
    return;
  }

  positions[index] = {
    ...positions[index],
    ...updates,
    lastUpdated: Date.now(),
  };

  savePositions(positions);
}

/**
 * Delete a position
 */
export function deletePosition(id: string): void {
  const positions = getAllPositions();
  const filtered = positions.filter((p) => p.id !== id);
  savePositions(filtered);
}

/**
 * Get positions for a specific wallet
 */
export function getWalletPositions(walletAddress: string): UserPosition[] {
  const positions = getAllPositions();
  return positions.filter(
    (p) => p.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Get active positions for a wallet
 */
export function getActivePositions(walletAddress: string): UserPosition[] {
  return getWalletPositions(walletAddress).filter((p) => p.status === 'active');
}

/**
 * Get positions by protocol
 */
export function getPositionsByProtocol(
  walletAddress: string,
  protocol: PositionType
): UserPosition[] {
  return getWalletPositions(walletAddress).filter((p) => p.type === protocol);
}

/**
 * Get positions by pool
 */
export function getPositionsByPool(
  walletAddress: string,
  poolAddress: string
): UserPosition[] {
  return getWalletPositions(walletAddress).filter(
    (p) => p.poolAddress.toLowerCase() === poolAddress.toLowerCase()
  );
}

/**
 * Generate portfolio summary for a wallet
 */
export function getPortfolioSummary(walletAddress: string): PortfolioSummary {
  const positions = getWalletPositions(walletAddress);
  const activePositions = positions.filter((p) => p.status === 'active');
  const closedPositions = positions.filter((p) => p.status === 'closed');

  const totalValueUSD = activePositions.reduce((sum, p) => sum + p.currentValueUSD, 0);
  const totalPnLUSD = activePositions.reduce((sum, p) => sum + p.pnlUSD, 0);
  const totalFeesEarnedUSD = positions.reduce((sum, p) => sum + p.totalFeesEarnedUSD, 0);

  const totalInitialValue = activePositions.reduce((sum, p) => sum + p.initialValueUSD, 0);
  const totalPnLPercent = totalInitialValue > 0 ? (totalPnLUSD / totalInitialValue) * 100 : 0;

  // Protocol breakdown
  const valueByProtocol: Record<PositionType, number> = {
    'dlmm': 0,
    'damm-v1': 0,
    'damm-v2': 0,
    'dbc': 0,
    'alpha-vault': 0,
  };

  const positionsByProtocol: Record<PositionType, number> = {
    'dlmm': 0,
    'damm-v1': 0,
    'damm-v2': 0,
    'dbc': 0,
    'alpha-vault': 0,
  };

  activePositions.forEach((p) => {
    valueByProtocol[p.type] += p.currentValueUSD;
    positionsByProtocol[p.type] += 1;
  });

  // Best and worst performers
  const sortedByPnL = [...activePositions].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const bestPerformingPosition = sortedByPnL[0];
  const worstPerformingPosition = sortedByPnL[sortedByPnL.length - 1];

  return {
    totalValueUSD,
    totalPnLUSD,
    totalPnLPercent,
    totalFeesEarnedUSD,
    activePositions: activePositions.length,
    closedPositions: closedPositions.length,
    valueByProtocol,
    positionsByProtocol,
    bestPerformingPosition,
    worstPerformingPosition,
    lastUpdated: Date.now(),
  };
}

/**
 * Mark a position as closed
 */
export function closePosition(id: string, closingSignature?: string): void {
  updatePosition(id, {
    status: 'closed',
    transactionSignature: closingSignature,
  });
}

/**
 * Clear all positions for a wallet (use with caution)
 */
export function clearWalletPositions(walletAddress: string): void {
  const allPositions = getAllPositions();
  const filtered = allPositions.filter(
    (p) => p.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
  );
  savePositions(filtered);
}

/**
 * Export positions to JSON
 */
export function exportPositions(walletAddress: string): void {
  const positions = getWalletPositions(walletAddress);
  const exportData = {
    version: STORAGE_VERSION,
    exportDate: Date.now(),
    walletAddress,
    positions,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `meteora-positions-${walletAddress.slice(0, 8)}-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Import positions from JSON
 */
export function importPositions(data: any): number {
  if (!data.positions || !Array.isArray(data.positions)) {
    throw new Error('Invalid positions data');
  }

  const existingPositions = getAllPositions();
  const newPositions = data.positions as UserPosition[];

  // Merge positions (avoid duplicates by ID)
  const positionMap = new Map<string, UserPosition>();

  existingPositions.forEach((p) => positionMap.set(p.id, p));
  newPositions.forEach((p) => positionMap.set(p.id, p));

  const mergedPositions = Array.from(positionMap.values());
  savePositions(mergedPositions);

  return newPositions.length;
}
