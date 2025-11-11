/**
 * Pool Actions Panel - Tabbed interface for all pool actions
 * Similar to charting.ag interface with Add/Remove/Swap/Claim tabs
 */

'use client';

import { useState } from 'react';
import { AddLiquidityPanel } from '@/components/liquidity/AddLiquidityPanel';
import { DAMMv2AddLiquidityPanel } from '@/components/liquidity/DAMMv2AddLiquidityPanel';
import { RemoveLiquidityPanel } from '@/components/liquidity/RemoveLiquidityPanel';
import { ClaimFeesPanel } from '@/components/liquidity/ClaimFeesPanel';
import { LiquidityDistributionPanel } from '@/components/pool/LiquidityDistributionPanel';
import { Pool } from '@/lib/jupiter/types';

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
  pool?: Pool; // Full pool object for liquidity distribution
}

type TabType = 'add' | 'remove' | 'liquidity' | 'claim';

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
  pool,
}: PoolActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('add');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: '➕' },
    { id: 'remove', label: 'Remove', icon: '➖' },
    { id: 'liquidity', label: 'Liquidity', icon: '📊' },
    { id: 'claim', label: 'Claim', icon: '💰' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-800/30">
      {/* Tab Header - Clean, no outer border */}
      <div className="border-b border-border-light bg-background-secondary/20">
        <div className="grid grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 py-3 text-xs font-medium transition-all relative
                ${activeTab === tab.id
                  ? 'text-white bg-background-secondary/50'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-background-secondary/30'
                }
              `}
            >
              <span className="flex flex-col items-center gap-1">
                <span className="text-base">{tab.icon}</span>
                <span className="text-[10px]">{tab.label.split(' ')[0]}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'add' && poolType === 'dlmm' && (
          <AddLiquidityPanel
            poolAddress={poolAddress}
            tokenXMint={tokenXMint}
            tokenYMint={tokenYMint}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
            tokenXIcon={pool?.baseAsset.icon}
            tokenYIcon={pool?.quoteAsset.icon}
            currentPrice={currentPrice}
            binStep={binStep}
            baseFee={baseFee}
            poolType={poolType}
          />
        )}

        {activeTab === 'add' && poolType === 'damm-v2' && (
          <DAMMv2AddLiquidityPanel
            poolAddress={poolAddress}
            tokenXMint={tokenXMint}
            tokenYMint={tokenYMint}
            tokenXSymbol={tokenXSymbol}
            tokenYSymbol={tokenYSymbol}
          />
        )}

        {activeTab === 'add' && poolType !== 'dlmm' && poolType !== 'damm-v2' && (
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

        {activeTab === 'liquidity' && pool && (
          <LiquidityDistributionPanel pool={pool} />
        )}

        {activeTab === 'liquidity' && !pool && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading</h3>
            <p className="text-sm text-gray-400">
              Fetching liquidity distribution...
            </p>
          </div>
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
