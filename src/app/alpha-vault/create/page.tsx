'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, FeeDisclosure, ReferralInput } from '@/components/ui';
import { ConfigUpload } from '@/components/config/ConfigUpload';
import { ConfigExportButton } from '@/components/config/ConfigExportButton';
import { TokenCreationSection } from '@/components/form-sections/TokenCreationSection';
import { QuoteMintSelector } from '@/components/form-sections/QuoteMintSelector';
import { useNetwork } from '@/contexts/NetworkContext';
// import { useAlphaVault } from '@/lib/meteora/useAlphaVault';  // TEMPORARILY DISABLED due to SDK dependency issue
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function AlphaVaultCreatePage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  // const { createVault } = useAlphaVault();  // TEMPORARILY DISABLED
  const [loading, setLoading] = useState(false);

  // Temporary placeholder - Alpha Vault has SDK compatibility issue
  const createVault = async (params: any): Promise<{success: boolean; signature?: string; vaultAddress?: string}> => {
    throw new Error('Alpha Vault temporarily disabled due to SDK compatibility issue with @meteora-ag/cp-amm-sdk');
  };

  // Token creation state
  const [tokenData, setTokenData] = useState({
    createNew: true,
    name: '',
    symbol: '',
    uri: '',
    decimals: '9',
    supply: '',
    baseMint: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    quoteMint: 'So11111111111111111111111111111111111111112',
    depositCap: '',
    performanceFee: '20',
    managementFee: '2',
  });

  // Handle config upload
  const handleConfigLoaded = (config: any) => {
    const vault = config.alphaVault || {};
    const tokenCreate = config.createBaseToken;

    if (tokenCreate) {
      setTokenData({
        createNew: true,
        name: tokenCreate.name || '',
        symbol: tokenCreate.symbol || '',
        uri: tokenCreate.uri || '',
        decimals: tokenCreate.decimals?.toString() || '9',
        supply: tokenCreate.supply?.toString() || '',
        baseMint: '',
      });
    }

    setFormData({
      ...formData,
      quoteMint: config.quoteMint || formData.quoteMint,
      depositCap: vault.depositCap?.toString() || '',
      performanceFee: vault.performanceFee?.toString() || '20',
      managementFee: vault.managementFee?.toString() || '2',
    });
    toast.success('Config loaded and form pre-filled!');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating Alpha Vault...');

    try {
      const result = await createVault({
        poolAddress: formData.quoteMint, // Using quoteMint as placeholder pool address
        baseMint: tokenData.createNew ? undefined : tokenData.baseMint,
        quoteMint: formData.quoteMint,
        poolType: 'dlmm',
        maxDepositCap: formData.depositCap,
        individualDepositingCap: formData.depositCap,
        startVestingPoint: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        endVestingPoint: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        escrowFee: formData.performanceFee,
        createBaseToken: tokenData.createNew ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          uri: tokenData.uri,
          decimals: Number(tokenData.decimals),
          supply: tokenData.supply,
        } : undefined,
      });

      toast.success('Alpha Vault created successfully!', { id: loadingToast });

      if (result.signature) {
        const explorerUrl = network === 'mainnet-beta'
          ? `https://solscan.io/tx/${result.signature}`
          : `https://solscan.io/tx/${result.signature}?cluster=${network}`;

        toast.success(
          <div>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View transaction on Solscan
            </a>
          </div>,
          { duration: 10000 }
        );
      }

      if (result.vaultAddress) {
        toast.success(`Vault address: ${result.vaultAddress}`, { duration: 10000 });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create vault', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Create Alpha Vault</h1>
          <p className="text-foreground-secondary mt-2">
            Create an automated liquidity management vault with dynamic strategies
          </p>
        </div>

        {/* Wallet Warning */}
        {!publicKey && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-warning">Connect your wallet to continue</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config Upload */}
        <ConfigUpload
          onConfigLoaded={handleConfigLoaded}
          expectedProtocol="alpha-vault"
          templateFile="alpha-vault-create.example.jsonc"
        />

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Creation */}
          <TokenCreationSection
            data={tokenData}
            onChange={(updates) => setTokenData({ ...tokenData, ...updates })}
          />

          {/* Vault Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Vault Configuration</CardTitle>
              <CardDescription>
                Configure the Alpha Vault parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuoteMintSelector
                value={formData.quoteMint}
                onChange={(value) => setFormData({ ...formData, quoteMint: value })}
              />

              <Input
                label="Deposit Cap"
                type="number"
                step="any"
                required
                value={formData.depositCap}
                onChange={(e) => setFormData({ ...formData, depositCap: e.target.value })}
                helperText="Maximum total deposits allowed in the vault"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Performance Fee (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={formData.performanceFee}
                  onChange={(e) => setFormData({ ...formData, performanceFee: e.target.value })}
                  helperText="Fee on profits (e.g., 20% of gains)"
                />
                <Input
                  label="Management Fee (% annually)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={formData.managementFee}
                  onChange={(e) => setFormData({ ...formData, managementFee: e.target.value })}
                  helperText="Annual fee on assets under management"
                />
              </div>

              <div className="p-4 rounded-lg bg-background-tertiary">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Performance Fee:</span>
                    <span className="font-medium">{formData.performanceFee}% of profits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Management Fee:</span>
                    <span className="font-medium">{formData.managementFee}% annually</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-info/20 bg-info/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Alpha Vault:</strong> Automated strategy vault that actively manages liquidity positions.</p>
                  <p><strong>Dynamic Strategies:</strong> Automatically adjusts positions based on market conditions.</p>
                  <p><strong>Depositors:</strong> Users deposit tokens and receive vault shares representing their portion.</p>
                  <p><strong>Fees:</strong> Performance fee on profits + management fee on total assets.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Input */}
          <ReferralInput />

          {/* Platform Fee Disclosure */}
          <FeeDisclosure variant="default" />

          <div className="flex gap-3">
            <ConfigExportButton
              formData={formData}
              protocol="alpha-vault"
              action="create"
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
              {loading ? 'Creating Vault...' : '🏦 Create Alpha Vault'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
