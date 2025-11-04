'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, Select } from '@/components/ui';
import { useNetwork, NetworkType } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';

type RPCPreset = 'default' | 'custom';

interface RPCConfig {
  devnet: string;
  mainnet: string;
  custom?: string;
}

const DEFAULT_RPC_ENDPOINTS: RPCConfig = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

export default function RPCSettingsPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const [preset, setPreset] = useState<RPCPreset>('default');
  const [rpcConfig, setRPCConfig] = useState<RPCConfig>(DEFAULT_RPC_ENDPOINTS);
  const [customRPC, setCustomRPC] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{
    devnet?: boolean;
    mainnet?: boolean;
    custom?: boolean;
  }>({});

  // Load saved RPC config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('rpc_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setRPCConfig({ ...DEFAULT_RPC_ENDPOINTS, ...parsed });
        if (parsed.custom) {
          setPreset('custom');
          setCustomRPC(parsed.custom);
        }
      } catch (error) {
        console.error('Failed to parse RPC config:', error);
      }
    }
  }, []);

  // Validate URL format
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      // Check that it's http or https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  // Save RPC config to localStorage
  const saveConfig = () => {
    setLoading(true);
    try {
      const configToSave = preset === 'custom' && customRPC
        ? { ...rpcConfig, custom: customRPC }
        : rpcConfig;

      // Validate all non-empty RPC URLs
      const endpoints = [
        { name: 'Devnet', url: configToSave.devnet },
        { name: 'Mainnet', url: configToSave.mainnet },
      ];

      for (const endpoint of endpoints) {
        if (endpoint.url && !isValidUrl(endpoint.url)) {
          toast.error(`Invalid URL for ${endpoint.name}: ${endpoint.url}`);
          setLoading(false);
          return;
        }
      }

      localStorage.setItem('rpc_config', JSON.stringify(configToSave));
      toast.success('RPC configuration saved successfully! Reload the page to apply changes.');

      // Trigger a reload warning if currently on a different network
      toast('💡 Tip: Refresh the page or switch networks to use the new RPC', {
        duration: 5000,
        icon: '🔄',
      });
    } catch (error: any) {
      toast.error('Failed to save RPC configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Test RPC connection
  const testConnection = async (endpoint: string, networkName: string) => {
    setTesting(true);
    const testToast = toast.loading(`Testing ${networkName} connection...`);

    try {
      const connection = new Connection(endpoint, 'confirmed');
      const version = await connection.getVersion();
      const blockHeight = await connection.getBlockHeight();

      setConnectionStatus(prev => ({ ...prev, [networkName]: true }));
      toast.success(
        `✓ ${networkName} connected! Version: ${version['solana-core']}, Block: ${blockHeight}`,
        { id: testToast, duration: 5000 }
      );
      return true;
    } catch (error: any) {
      setConnectionStatus(prev => ({ ...prev, [networkName]: false }));
      toast.error(
        `✗ ${networkName} connection failed: ${error.message}`,
        { id: testToast }
      );
      return false;
    } finally {
      setTesting(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setRPCConfig(DEFAULT_RPC_ENDPOINTS);
    setPreset('default');
    setCustomRPC('');
    localStorage.removeItem('rpc_config');
    setConnectionStatus({});
    toast.success('Reset to default RPC endpoints');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">RPC Configuration</h1>
          <p className="text-foreground-secondary mt-2">
            Configure custom RPC endpoints for different networks
          </p>
        </div>

        {/* Current Network Info */}
        <Card className="border-info/20 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-info">Current Network</p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  You are connected to <span className="font-mono font-bold">{network}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RPC Preset Selection */}
        <Card>
          <CardHeader>
            <CardTitle>RPC Endpoint Mode</CardTitle>
            <CardDescription>
              Choose between default public endpoints or configure custom RPC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Endpoint Mode"
              value={preset}
              onChange={(e) => setPreset(e.target.value as RPCPreset)}
            >
              <option value="default">Default Public Endpoints</option>
              <option value="custom">Custom RPC Endpoints</option>
            </Select>

            {preset === 'default' && (
              <div className="p-4 rounded-lg bg-background-tertiary space-y-2">
                <p className="text-sm text-foreground-secondary">
                  <strong>Devnet:</strong> <span className="font-mono text-xs">{DEFAULT_RPC_ENDPOINTS.devnet}</span>
                </p>
                <p className="text-sm text-foreground-secondary">
                  <strong>Mainnet:</strong> <span className="font-mono text-xs">{DEFAULT_RPC_ENDPOINTS.mainnet}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom RPC Configuration */}
        {preset === 'custom' && (
          <Card>
            <CardHeader>
              <CardTitle>Custom RPC Endpoints</CardTitle>
              <CardDescription>
                Configure custom RPC endpoints for each network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Devnet RPC"
                placeholder="https://api.devnet.solana.com"
                value={rpcConfig.devnet}
                onChange={(e) => setRPCConfig({ ...rpcConfig, devnet: e.target.value })}
                helperText="RPC endpoint for Devnet"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection(rpcConfig.devnet, 'devnet')}
                  variant="outline"
                  size="sm"
                  loading={testing}
                  disabled={testing || !rpcConfig.devnet}
                >
                  Test Devnet
                </Button>
                {connectionStatus.devnet !== undefined && (
                  <span className={`text-sm py-2 ${connectionStatus.devnet ? 'text-success' : 'text-error'}`}>
                    {connectionStatus.devnet ? '✓ Connected' : '✗ Failed'}
                  </span>
                )}
              </div>

              <Input
                label="Mainnet RPC"
                placeholder="https://api.mainnet-beta.solana.com"
                value={rpcConfig.mainnet}
                onChange={(e) => setRPCConfig({ ...rpcConfig, mainnet: e.target.value })}
                helperText="RPC endpoint for Mainnet"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection(rpcConfig.mainnet, 'mainnet')}
                  variant="outline"
                  size="sm"
                  loading={testing}
                  disabled={testing || !rpcConfig.mainnet}
                >
                  Test Mainnet
                </Button>
                {connectionStatus.mainnet !== undefined && (
                  <span className={`text-sm py-2 ${connectionStatus.mainnet ? 'text-success' : 'text-error'}`}>
                    {connectionStatus.mainnet ? '✓ Connected' : '✗ Failed'}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Popular RPC Providers */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Popular RPC Providers</CardTitle>
            <CardDescription>
              Consider these providers for better performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background-tertiary">
                <p className="font-semibold text-sm">Helius</p>
                <p className="text-xs text-foreground-secondary mt-1">
                  High-performance RPC with enhanced APIs
                </p>
                <a
                  href="https://helius.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  helius.dev →
                </a>
              </div>

              <div className="p-3 rounded-lg bg-background-tertiary">
                <p className="font-semibold text-sm">QuickNode</p>
                <p className="text-xs text-foreground-secondary mt-1">
                  Fast and reliable blockchain infrastructure
                </p>
                <a
                  href="https://quicknode.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  quicknode.com →
                </a>
              </div>

              <div className="p-3 rounded-lg bg-background-tertiary">
                <p className="font-semibold text-sm">Triton</p>
                <p className="text-xs text-foreground-secondary mt-1">
                  High-throughput RPC for demanding applications
                </p>
                <a
                  href="https://triton.one"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  triton.one →
                </a>
              </div>

              <div className="p-3 rounded-lg bg-background-tertiary">
                <p className="font-semibold text-sm">Alchemy</p>
                <p className="text-xs text-foreground-secondary mt-1">
                  Developer-focused blockchain infrastructure
                </p>
                <a
                  href="https://alchemy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  alchemy.com →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className="flex-1"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={saveConfig}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : '💾 Save Configuration'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
