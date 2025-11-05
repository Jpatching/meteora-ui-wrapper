/**
 * Pool Actions Panel - Tabbed interface for all pool actions
 * Similar to charting.ag interface with Add/Remove/Swap/Claim tabs
 */

'use client';

import { useState } from 'react';
import { AddLiquidityPanel } from '@/components/liquidity/AddLiquidityPanel';
import { RemoveLiquidityPanel } from '@/components/liquidity/RemoveLiquidityPanel';
import { SwapPanel } from '@/components/swap/SwapPanel';
import { ClaimFeesPanel } from '@/components/liquidity/ClaimFeesPanel';

interface PoolActionsPanelProps {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
  currentPrice: number;
  binStep: number;
  baseFee?: number;
  poolType: string;
}

type TabType = 'add' | 'remove' | 'swap' | 'claim';

export function PoolActionsPanel({
  poolAddress,
  tokenXMint,
  tokenYMint,
  tokenXSymbol,
  tokenYSymbol,
  currentPrice,
  binStep,
  baseFee,
  poolType,
}: PoolActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('add');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'add', label: 'Add Liquidity', icon: '➕' },
    { id: 'remove', label: 'Remove', icon: '➖' },
    { id: 'swap', label: 'Swap', icon: '🔄' },
    { id: 'claim', label: 'Claim Fees', icon: '💰' },
  ];

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden">
      {/* Tab Header */}
      <div className="border-b border-border-light">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium transition-all relative
                ${activeTab === tab.id
                  ? 'text-white bg-background-secondary'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-background-secondary/50'
                }
              `}
            >
              <span className="inline-flex items-center gap-2">
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'add' && poolType === 'dlmm' && (
          <AddLiquidityPanel
            poolAddress={poolAddress}
            tokenXMint={tokenXMint}
            tokenYMint={tokenYMint}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
            currentPrice={currentPrice}
            binStep={binStep}
            baseFee={baseFee}
          />
        )}

        {activeTab === 'add' && poolType !== 'dlmm' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              Add liquidity for {poolType.toUpperCase()} pools will be available soon.
            </p>
          </div>
        )}

        {activeTab === 'remove' && poolType === 'dlmm' && (
          <RemoveLiquidityPanel
            poolAddress={poolAddress}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
          />
        )}

        {activeTab === 'remove' && poolType !== 'dlmm' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              Remove liquidity for {poolType.toUpperCase()} pools will be available soon.
            </p>
          </div>
        )}

        {activeTab === 'swap' && (
          <SwapPanel
            poolAddress={poolAddress}
            tokenXMint={tokenXMint}
            tokenYMint={tokenYMint}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
            poolType={poolType}
          />
        )}

        {activeTab === 'claim' && poolType === 'dlmm' && (
          <ClaimFeesPanel
            poolAddress={poolAddress}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
          />
        )}

        {activeTab === 'claim' && poolType !== 'dlmm' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              Claim fees for {poolType.toUpperCase()} pools will be available soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
