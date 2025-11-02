'use client';

import { Button } from '@/components/ui';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';

interface ConfigExportButtonProps {
  formData: any;
  protocol: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
}

export function ConfigExportButton({
  formData,
  protocol,
  action,
  variant = 'outline',
  className = '',
}: ConfigExportButtonProps) {
  const { network } = useNetwork();

  const handleExport = () => {
    try {
      // Build config object based on protocol
      const config: any = {
        rpcUrl: network === 'mainnet-beta'
          ? 'https://api.mainnet-beta.solana.com'
          : network === 'devnet'
          ? 'https://api.devnet.solana.com'
          : 'http://localhost:8899',
        dryRun: false,
        computeUnitPriceMicroLamports: 1000,
      };

      // Add protocol-specific configuration
      if (protocol === 'dlmm') {
        if (action === 'create-pool') {
          config.quoteMint = formData.quoteMint || 'So11111111111111111111111111111111111111112';

          if (formData.tokenName && formData.tokenSymbol) {
            config.createBaseToken = {
              name: formData.tokenName,
              symbol: formData.tokenSymbol,
              uri: formData.tokenUri,
              decimals: Number(formData.tokenDecimals) || 9,
              supply: formData.tokenSupply || '1000000000',
            };
          } else if (formData.baseMint) {
            config.baseMint = formData.baseMint;
          }

          config.dlmmConfig = {
            binStep: Number(formData.binStep) || 25,
            baseAmount: formData.baseAmount,
            quoteAmount: formData.quoteAmount,
            feeBps: Number(formData.feeBps) || 1,
            initialPrice: formData.initialPrice,
            activationType: Number(formData.activationType) || 1,
            activationPoint: formData.activationPoint ? Number(formData.activationPoint) : undefined,
            hasAlphaVault: formData.hasAlphaVault || false,
            creatorPoolOnOffControl: formData.creatorPoolOnOffControl || false,
          };
        } else if (action === 'seed-lfg') {
          config.poolAddress = formData.poolAddress;
          config.lfgSeedLiquidity = {
            minPrice: formData.minPrice,
            maxPrice: formData.maxPrice,
            curvature: Number(formData.curvature) || 0.6,
            seedAmount: formData.seedAmount,
            positionOwner: formData.positionOwner,
            feeOwner: formData.feeOwner,
            lockReleasePoint: Number(formData.lockReleasePoint) || 0,
          };
        }
      } else if (protocol === 'damm-v1') {
        if (action === 'create-pool') {
          config.quoteMint = formData.quoteMint || 'So11111111111111111111111111111111111111112';

          if (formData.tokenName && formData.tokenSymbol) {
            config.createBaseToken = {
              name: formData.tokenName,
              symbol: formData.tokenSymbol,
              uri: formData.tokenUri,
              decimals: Number(formData.tokenDecimals) || 9,
              supply: formData.tokenSupply || '1000000000',
            };
          } else if (formData.baseMint) {
            config.baseMint = formData.baseMint;
          }

          config.dammV1Config = {
            baseAmount: formData.baseAmount,
            quoteAmount: formData.quoteAmount,
            fee: Number(formData.feeBps) || 25,
          };
        }
      } else if (protocol === 'damm-v2') {
        if (action === 'create-balanced') {
          config.quoteMint = formData.quoteMint || 'So11111111111111111111111111111111111111112';

          if (formData.tokenName && formData.tokenSymbol) {
            config.createBaseToken = {
              name: formData.tokenName,
              symbol: formData.tokenSymbol,
              uri: formData.tokenUri,
              decimals: Number(formData.tokenDecimals) || 9,
              supply: formData.tokenSupply || '1000000000',
            };
          } else if (formData.baseMint) {
            config.baseMint = formData.baseMint;
          }

          config.dammV2Config = {
            baseAmount: formData.baseAmount,
            quoteAmount: formData.quoteAmount,
            initPrice: formData.initialPrice,
            maxPrice: formData.maxPrice,
            poolFees: {
              tradeFeeInBps: Number(formData.tradeFeeInBps) || 25,
            },
          };
        } else if (action === 'add-liquidity') {
          config.addLiquidity = {
            poolAddress: formData.poolAddress,
            baseAmount: formData.amountIn,
            quoteAmount: formData.amountIn,
            slippageBps: Number(formData.slippageBps) || 100,
          };
        }
      } else if (protocol === 'dbc') {
        if (action === 'create-config') {
          config.dbcConfig = {
            migrationQuoteThreshold: formData.migrationQuoteThreshold,
            tradingFee: Number(formData.tradingFee) || 25,
            protocolFee: Number(formData.protocolFee) || 10,
          };
        } else if (action === 'create-pool') {
          config.quoteMint = 'So11111111111111111111111111111111111111112';

          if (formData.tokenName && formData.tokenSymbol) {
            config.createBaseToken = {
              name: formData.tokenName,
              symbol: formData.tokenSymbol,
              uri: formData.tokenUri,
              decimals: Number(formData.tokenDecimals) || 9,
              supply: formData.tokenSupply || '1000000000',
            };
          } else if (formData.baseMint) {
            config.baseMint = formData.baseMint;
          }

          config.dbcPool = {
            configAddress: formData.configAddress,
            initialPrice: formData.initialPrice,
          };
        } else if (action === 'swap') {
          config.dbcSwap = {
            poolAddress: formData.poolAddress,
            amount: formData.amount,
            side: formData.side,
            slippageBps: Number(formData.slippageBps) || 100,
          };
        }
      } else if (protocol === 'alpha-vault') {
        config.alphaVault = {
          poolAddress: formData.poolAddress,
          poolType: formData.poolType,
          baseMint: formData.baseMint,
          quoteMint: formData.quoteMint,
          maxDepositCap: formData.maxDepositCap,
          startVestingPoint: Number(formData.startVestingPoint) || 0,
          endVestingPoint: Number(formData.endVestingPoint) || 0,
          escrowFee: Number(formData.escrowFee) || 100,
          performanceFeeBps: Number(formData.performanceFeeBps) || 2000,
          managementFeeBps: Number(formData.managementFeeBps) || 200,
          whitelistEnabled: formData.whitelistEnabled || false,
        };
      }

      // Convert to JSONC format (JSON with comments)
      const jsonc = generateJSONC(config, protocol, action);

      // Create and download file
      const blob = new Blob([jsonc], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${protocol}-${action}-config-${Date.now()}.jsonc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Config exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export config');
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleExport}
      className={className}
    >
      💾 Export Current Form
    </Button>
  );
}

// Helper to generate JSONC with comments
function generateJSONC(config: any, protocol: string, action: string): string {
  const lines: string[] = [];

  lines.push('{');
  lines.push(`  // ============================================`);
  lines.push(`  // ${protocol.toUpperCase()} ${action.toUpperCase().replace(/-/g, ' ')} - Exported Configuration`);
  lines.push(`  // ============================================`);
  lines.push(`  // Generated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push(`  // Solana RPC endpoint`);
  lines.push(`  "rpcUrl": "${config.rpcUrl}",`);
  lines.push('');

  lines.push(`  // Dry run mode`);
  lines.push(`  "dryRun": ${config.dryRun},`);
  lines.push('');

  lines.push(`  // Compute unit price`);
  lines.push(`  "computeUnitPriceMicroLamports": ${config.computeUnitPriceMicroLamports},`);
  lines.push('');

  // Add remaining fields without comments for simplicity
  const { rpcUrl, dryRun, computeUnitPriceMicroLamports, ...rest } = config;

  Object.entries(rest).forEach(([key, value], index, array) => {
    const isLast = index === array.length - 1;
    const jsonValue = JSON.stringify(value, null, 2).split('\n').map((line, i) =>
      i === 0 ? line : '  ' + line
    ).join('\n');
    lines.push(`  "${key}": ${jsonValue}${isLast ? '' : ','}`);
  });

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
