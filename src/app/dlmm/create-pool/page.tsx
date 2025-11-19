'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Select,
  Button,
  Badge,
  Tooltip,
  FeeDisclosure,
  ReferralInput,
} from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { MetadataBuilder } from '@/components/metadata';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';
import { useDLMM } from '@/lib/meteora/useDLMM';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function DLMMCreatePoolPage() {
  const router = useRouter();
  const { createPool: createDLMMPool, createPoolWithLiquidity } = useDLMM();
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [createNewToken, setCreateNewToken] = useState(true);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [showMetadataBuilder, setShowMetadataBuilder] = useState(false);
  const [addInitialLiquidity, setAddInitialLiquidity] = useState(false);
  const [liquidityStrategy, setLiquidityStrategy] = useState<'spot' | 'curve' | 'bid-ask'>('curve');

  const [formData, setFormData] = useState({
    // Token creation
    tokenName: '',
    tokenSymbol: '',
    tokenUri: '',
    tokenDecimals: '9',
    tokenSupply: '1000000000',
    // Existing token
    baseMint: '',
    // Pool config
    quoteMint: 'So11111111111111111111111111111111111111112', // SOL
    binStep: '25',
    baseAmount: '',
    quoteAmount: '',
    // Advanced pool config
    feeBps: '1',
    initialPrice: '',
    activationType: '1',
    activationPoint: '',
    hasAlphaVault: false,
    creatorPoolOnOffControl: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Validate initial price
    const price = parseFloat(formData.initialPrice);
    if (!formData.initialPrice || price <= 0) {
      toast.error('Initial price must be greater than 0');
      return;
    }

    // Calculate implied price from amounts if both are provided
    if (formData.baseAmount && formData.quoteAmount) {
      const baseAmt = parseFloat(formData.baseAmount);
      const quoteAmt = parseFloat(formData.quoteAmount);
      const impliedPrice = quoteAmt / baseAmt;
      const priceDiff = Math.abs(price - impliedPrice) / impliedPrice;

      // Warn if manual price differs by more than 5% from implied price
      if (priceDiff > 0.05) {
        toast.error(
          `Initial price (${price.toFixed(6)}) differs significantly from calculated price (${impliedPrice.toFixed(6)}). Please verify your inputs.`,
          { duration: 6000 }
        );
        return;
      }
    }

    setLoading(true);

    // Determine if we're adding liquidity
    const hasLiquidityAmounts = formData.baseAmount || formData.quoteAmount;
    const willAddLiquidity = addInitialLiquidity && hasLiquidityAmounts;

    // Show appropriate loading message
    let loadingMessage = 'Creating DLMM pool...';
    if (createNewToken && willAddLiquidity) {
      loadingMessage = 'Step 1/3: Creating token...';
    } else if (createNewToken) {
      loadingMessage = 'Step 1/2: Creating token...';
    } else if (willAddLiquidity) {
      loadingMessage = 'Step 1/2: Creating pool...';
    }

    const loadingToast = toast.loading(loadingMessage);

    try {
      // Prepare pool parameters
      const poolParams = {
        quoteMint: formData.quoteMint,
        binStep: Number(formData.binStep),
        feeBps: Number(formData.feeBps),
        initialPrice: formData.initialPrice,
        activationType: Number(formData.activationType),
        activationPoint: formData.activationPoint ? Number(formData.activationPoint) : undefined,
        hasAlphaVault: formData.hasAlphaVault,
        creatorPoolOnOffControl: formData.creatorPoolOnOffControl,
        baseMint: createNewToken ? undefined : formData.baseMint,
        createBaseToken: createNewToken ? {
          name: formData.tokenName,
          symbol: formData.tokenSymbol,
          uri: formData.tokenUri,
          decimals: Number(formData.tokenDecimals),
          supply: formData.tokenSupply,
        } : undefined,
        baseAmount: formData.baseAmount,
        quoteAmount: formData.quoteAmount,
      };

      let result;

      if (willAddLiquidity) {
        // Create pool WITH initial liquidity
        if (createNewToken) {
          toast.loading('Step 2/3: Creating pool...', { id: loadingToast });
        } else {
          toast.loading('Step 2/2: Adding initial liquidity...', { id: loadingToast });
        }

        result = await createPoolWithLiquidity({
          ...poolParams,
          addLiquidity: true,
          liquidityStrategy,
        });

        toast.success('Pool created with initial liquidity!', { id: loadingToast });
      } else {
        // Create pool without liquidity
        if (createNewToken) {
          toast.loading('Step 2/2: Creating pool...', { id: loadingToast });
        }

        result = await createDLMMPool(poolParams);
        toast.success('Pool created successfully!', { id: loadingToast });
      }

      // Show transaction link (pool creation transaction)
      if (result.signature) {
        const explorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/tx/${result.signature}`
          : `https://solscan.io/tx/${result.signature}?cluster=${network}`;

        toast.success(
          <div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View pool creation on Solscan
            </a>
          </div>,
          { duration: 10000 }
        );
      }

      if (result.poolAddress) {
        const poolExplorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/account/${result.poolAddress}`
          : `https://solscan.io/account/${result.poolAddress}?cluster=${network}`;

        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Pool Created!</span>
            <a
              href={poolExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-xs font-mono"
            >
              {result.poolAddress}
            </a>
          </div>,
          { duration: 15000 }
        );
      }

      // Show newly created token address with copy button
      if (result.baseMint && createNewToken) {
        setNewlyCreatedToken(result.baseMint);
        const tokenExplorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/token/${result.baseMint}`
          : `https://solscan.io/token/${result.baseMint}?cluster=${network}`;

        toast.success(
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Token Created!</span>
            <a
              href={tokenExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs underline"
            >
              {result.baseMint}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.baseMint!);
                toast.success('Token address copied!', { duration: 2000 });
              }}
              className="px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 rounded transition-colors"
            >
              Copy Address
            </button>
          </div>,
          { duration: 15000 }
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Request failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const dlmmCfg = config.dlmmConfig || {};
    const baseToken = config.createBaseToken;

    if (baseToken) {
      setCreateNewToken(true);
      setFormData({
        ...formData,
        tokenName: baseToken.name || '',
        tokenSymbol: baseToken.symbol || '',
        tokenUri: baseToken.uri || '',
        tokenDecimals: baseToken.decimals?.toString() || '9',
        tokenSupply: baseToken.supply?.toString() || '1000000000',
        quoteMint: config.quoteMint || formData.quoteMint,
        binStep: dlmmCfg.binStep?.toString() || '25',
        baseAmount: dlmmCfg.baseAmount?.toString() || '',
        quoteAmount: dlmmCfg.quoteAmount?.toString() || '',
        feeBps: dlmmCfg.feeBps?.toString() || '1',
        initialPrice: dlmmCfg.initialPrice?.toString() || '',
        activationType: dlmmCfg.activationType?.toString() || '1',
        activationPoint: dlmmCfg.activationPoint?.toString() || '',
        hasAlphaVault: dlmmCfg.hasAlphaVault || false,
        creatorPoolOnOffControl: dlmmCfg.creatorPoolOnOffControl || false,
        baseMint: '',
      });
    } else if (config.baseMint) {
      setCreateNewToken(false);
      setFormData({
        ...formData,
        baseMint: config.baseMint,
        quoteMint: config.quoteMint || formData.quoteMint,
        binStep: dlmmCfg.binStep?.toString() || '25',
        baseAmount: dlmmCfg.baseAmount?.toString() || '',
        quoteAmount: dlmmCfg.quoteAmount?.toString() || '',
        feeBps: dlmmCfg.feeBps?.toString() || '1',
        initialPrice: dlmmCfg.initialPrice?.toString() || '',
        activationType: dlmmCfg.activationType?.toString() || '1',
        activationPoint: dlmmCfg.activationPoint?.toString() || '',
        hasAlphaVault: dlmmCfg.hasAlphaVault || false,
        creatorPoolOnOffControl: dlmmCfg.creatorPoolOnOffControl || false,
      });
    }

    toast.success('Config loaded and form pre-filled!');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🏊</span>
            <h1 className="text-3xl font-bold gradient-text">Create DLMM Pool</h1>
          </div>
          <p className="text-foreground-secondary">
            Create a Dynamic Liquidity Market Maker pool with customizable bin steps and liquidity
            distribution
          </p>
        </div>

        {/* Wallet Warning */}
        {!publicKey && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-warning">Please connect your wallet to create a pool</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Upload */}
        <ConfigUpload
          onConfigLoaded={handleConfigLoaded}
          expectedProtocol="dlmm"
          templateFile="dlmm-create-pool.example.jsonc"
        />

        {/* Success Card - Next Steps */}
        {newlyCreatedToken && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-success">Pool created successfully!</p>
                    <p className="text-sm text-foreground-secondary mt-1">
                      Ready to seed liquidity for your new pool
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/dlmm/seed-lfg?baseMint=${newlyCreatedToken}`)}
                  className="whitespace-nowrap"
                >
                  💧 Seed Liquidity →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Token Configuration</CardTitle>
              <CardDescription>
                Create a new token or use an existing one as the base token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary">
                <input
                  type="checkbox"
                  id="createNew"
                  checked={createNewToken}
                  onChange={(e) => setCreateNewToken(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                />
                <label htmlFor="createNew" className="text-sm font-medium cursor-pointer">
                  Create a new token
                </label>
                <Tooltip content="Check this to create a new SPL token for your pool">
                  <span className="text-foreground-muted cursor-help">ℹ️</span>
                </Tooltip>
              </div>

              {createNewToken ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Token Name"
                    placeholder="My Awesome Token"
                    required
                    value={formData.tokenName}
                    onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                    helperText="The full name of your token"
                  />
                  <Input
                    label="Token Symbol"
                    placeholder="MAT"
                    required
                    value={formData.tokenSymbol}
                    onChange={(e) =>
                      setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })
                    }
                    maxLength={10}
                    helperText="The ticker symbol (e.g., SOL, USDC)"
                  />

                  {/* Metadata Builder Toggle */}
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-text-secondary">
                        Token Metadata <span className="text-error">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMetadataBuilder(!showMetadataBuilder)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        {showMetadataBuilder ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Use URI instead
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Build metadata
                          </>
                        )}
                      </button>
                    </div>

                    {showMetadataBuilder ? (
                      <div className="p-6 rounded-xl bg-bg-tertiary border border-border-light">
                        <MetadataBuilder
                          tokenName={formData.tokenName}
                          tokenSymbol={formData.tokenSymbol}
                          onMetadataGenerated={(uri, metadata) => {
                            setFormData({ ...formData, tokenUri: uri });
                            toast.success('Metadata URI generated and set!');
                          }}
                        />
                      </div>
                    ) : (
                      <Input
                        placeholder="ipfs://... or https://..."
                        type="url"
                        required
                        value={formData.tokenUri}
                        onChange={(e) => setFormData({ ...formData, tokenUri: e.target.value })}
                        helperText="JSON metadata URI (logo, description, etc.) or build metadata above"
                      />
                    )}
                  </div>
                  <Input
                    label="Decimals"
                    type="number"
                    required
                    value={formData.tokenDecimals}
                    onChange={(e) => setFormData({ ...formData, tokenDecimals: e.target.value })}
                    min="0"
                    max="9"
                    helperText="Token decimal places (usually 9)"
                  />
                  <Input
                    label="Total Supply"
                    type="number"
                    min="0"
                    required
                    value={formData.tokenSupply}
                    onChange={(e) => setFormData({ ...formData, tokenSupply: e.target.value })}
                    helperText="Total token supply"
                  />
                </div>
              ) : (
                <Input
                  label="Base Token Mint Address"
                  placeholder="TokenMint111..."
                  required
                  value={formData.baseMint}
                  onChange={(e) => setFormData({ ...formData, baseMint: e.target.value })}
                  className="font-mono text-sm"
                  helperText="The address of your existing SPL token"
                />
              )}
            </CardContent>
          </Card>

          {/* Pool Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Configuration</CardTitle>
              <CardDescription>
                Configure the DLMM pool parameters and initial liquidity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Quote Token"
                  required
                  value={formData.quoteMint}
                  onChange={(e) => setFormData({ ...formData, quoteMint: e.target.value })}
                  helperText="The token to pair with (usually SOL or stablecoin)"
                >
                  <option value="So11111111111111111111111111111111111111112">SOL</option>
                  <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
                  <option value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">USDT</option>
                </Select>

                <Select
                  label="Bin Step (Fee Tier)"
                  required
                  value={formData.binStep}
                  onChange={(e) => setFormData({ ...formData, binStep: e.target.value })}
                  helperText="Lower = tighter spread, higher = wider spread"
                >
                  <option value="1">1 (0.01% - Stable Pairs)</option>
                  <option value="5">5 (0.05% - Tight Range)</option>
                  <option value="25">25 (0.25% - Standard)</option>
                  <option value="100">100 (1% - Wide Range)</option>
                </Select>

                <Input
                  label="Base Token Amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="1000"
                  value={formData.baseAmount}
                  onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                  helperText="Amount of base tokens to deposit"
                />

                <Input
                  label="Quote Token Amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="100"
                  value={formData.quoteAmount}
                  onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                  helperText="Amount of quote tokens to deposit"
                />
              </div>

              <Input
                label="Initial Price"
                type="number"
                step="any"
                min="0"
                required
                placeholder="0.0001"
                value={formData.initialPrice}
                onChange={(e) => setFormData({ ...formData, initialPrice: e.target.value })}
                helperText="Price per base token in quote tokens (must be > 0)"
              />

              {/* Add Initial Liquidity Toggle */}
              <div className="col-span-2 p-4 rounded-lg bg-background-tertiary border border-border-light">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="addLiquidity"
                      checked={addInitialLiquidity}
                      onChange={(e) => setAddInitialLiquidity(e.target.checked)}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <label htmlFor="addLiquidity" className="text-sm font-semibold cursor-pointer">
                      💧 Add Initial Liquidity (Test SDK)
                    </label>
                    <Tooltip content="Creates pool and immediately adds liquidity using the amounts above. Perfect for testing the Meteora SDK!">
                      <span className="text-foreground-muted cursor-help">ℹ️</span>
                    </Tooltip>
                  </div>
                </div>

                {addInitialLiquidity && (
                  <div className="mt-3 pt-3 border-t border-border-light">
                    <label className="block text-xs font-medium text-foreground-secondary mb-2">
                      Liquidity Strategy
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['spot', 'curve', 'bid-ask'] as const).map((strategy) => (
                        <button
                          key={strategy}
                          type="button"
                          onClick={() => setLiquidityStrategy(strategy)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            liquidityStrategy === strategy
                              ? 'bg-primary text-white'
                              : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                          }`}
                        >
                          {strategy === 'spot' && '🎯 Spot'}
                          {strategy === 'curve' && '📊 Curve'}
                          {strategy === 'bid-ask' && '⚖️ Bid-Ask'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-foreground-muted">
                      {liquidityStrategy === 'spot' && 'Concentrated around current price'}
                      {liquidityStrategy === 'curve' && 'Balanced distribution (recommended)'}
                      {liquidityStrategy === 'bid-ask' && 'Spread for market making'}
                    </p>
                  </div>
                )}
              </div>

              {/* Price Preview */}
              {formData.baseAmount && formData.quoteAmount && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground-muted mb-1">Calculated Price (from amounts)</p>
                  <p className="text-lg font-bold text-foreground">
                    1 {formData.tokenSymbol || 'BASE'} ≈{' '}
                    {(parseFloat(formData.quoteAmount) / parseFloat(formData.baseAmount)).toFixed(
                      6
                    )}{' '}
                    {formData.quoteMint === 'So11111111111111111111111111111111111111112'
                      ? 'SOL'
                      : 'QUOTE'}
                  </p>
                  {formData.initialPrice && parseFloat(formData.initialPrice) > 0 && (
                    <>
                      {(() => {
                        const calcPrice = parseFloat(formData.quoteAmount) / parseFloat(formData.baseAmount);
                        const manualPrice = parseFloat(formData.initialPrice);
                        const diff = Math.abs(calcPrice - manualPrice) / calcPrice;
                        const isSignificantDiff = diff > 0.05;

                        return (
                          <div className={`mt-2 pt-2 border-t ${isSignificantDiff ? 'border-warning/30' : 'border-primary/20'}`}>
                            <p className="text-sm text-foreground-muted">Manual Initial Price</p>
                            <p className={`text-md font-semibold ${isSignificantDiff ? 'text-warning' : 'text-foreground'}`}>
                              {manualPrice.toFixed(6)} {formData.quoteMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'QUOTE'}
                              {isSignificantDiff && ' ⚠️ Differs from calculated'}
                            </p>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-info">DLMM Pool Features:</p>
                  <ul className="text-foreground-secondary space-y-1">
                    <li>• Concentrated liquidity in price bins for capital efficiency</li>
                    <li>• Customizable fee tiers based on volatility</li>
                    <li>• Dynamic fee distribution based on liquidity placement</li>
                    <li>• No impermanent loss protection mechanisms</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure variant="default" />

          {/* Submit Button */}
          <div className="flex gap-3">
            <ConfigExportButton
              formData={formData}
              protocol="dlmm"
              action="create-pool"
              variant="outline"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!publicKey || loading}
              className="flex-1"
            >
              {loading
                ? 'Creating Pool...'
                : addInitialLiquidity && (formData.baseAmount || formData.quoteAmount)
                ? '🚀 Create Pool + Add Liquidity'
                : '🚀 Create DLMM Pool'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
