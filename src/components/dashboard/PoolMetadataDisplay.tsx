/**
 * Component to display pool metadata (binStep, baseFee)
 * Now receives REAL data directly from Meteora API via pool object
 */

'use client';

interface PoolMetadataDisplayProps {
  meteoraData?: {
    binStep?: number;
    baseFeePercentage?: string;
    poolType: 'dlmm' | 'damm-v1' | 'damm-v2';
  };
}

export function PoolMetadataDisplay({ meteoraData }: PoolMetadataDisplayProps) {
  if (!meteoraData) {
    return <span className="text-[10px] text-foreground-muted/50">-</span>;
  }

  const { binStep, baseFeePercentage, poolType } = meteoraData;

  // Format display based on pool type
  if (poolType === 'dlmm' && binStep !== undefined && baseFeePercentage !== undefined) {
    const feePercent = parseFloat(baseFeePercentage);
    return (
      <span className="text-[10px] text-foreground-muted/70">
        binStep: {binStep} | fee: {feePercent.toFixed(2)}%
      </span>
    );
  }

  if (baseFeePercentage !== undefined) {
    const feePercent = parseFloat(baseFeePercentage);
    return (
      <span className="text-[10px] text-foreground-muted/70">
        fee: {feePercent.toFixed(2)}%
      </span>
    );
  }

  return <span className="text-[10px] text-foreground-muted/50">-</span>;
}
