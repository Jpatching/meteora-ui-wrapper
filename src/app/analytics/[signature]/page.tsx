'use client';

import { use, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { useTransactionHistory } from '@/contexts/TransactionHistoryContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { format } from 'date-fns';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import Link from 'next/link';

export default function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ signature: string }>;
}) {
  const { signature } = use(params);
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const { transactions } = useTransactionHistory();

  // Find transaction by signature
  const transaction = useMemo(() => {
    return transactions.find((t) => t.signature === signature);
  }, [transactions, signature]);

  if (!transaction) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-12">
              <div className="text-center">
                <span className="text-6xl mb-4 block">🔍</span>
                <p className="text-lg font-medium text-warning mb-2">Transaction Not Found</p>
                <p className="text-sm text-foreground-secondary mb-6">
                  This transaction doesn't exist in your local history
                </p>
                <Link href="/analytics">
                  <Button variant="primary">Back to Analytics</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const explorerUrl = `https://solscan.io/tx/${signature}?cluster=${network}`;
  const meteoraUrl = transaction.poolAddress
    ? `https://app.meteora.ag/pools/${transaction.poolAddress}`
    : null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            ← Back to Analytics
          </Button>
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold gradient-text capitalize">
              {transaction.action.replace(/-/g, ' ')}
            </h1>
            <Badge
              variant={
                transaction.status === 'success'
                  ? 'success'
                  : transaction.status === 'failed'
                  ? 'error'
                  : 'warning'
              }
            >
              {transaction.status}
            </Badge>
          </div>
          <p className="text-foreground-secondary">
            {format(transaction.timestamp, 'PPpp')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => window.open(explorerUrl, '_blank')}
            variant="primary"
            size="md"
          >
            🔗 View on Solscan
          </Button>
          {meteoraUrl && (
            <Button
              onClick={() => window.open(meteoraUrl, '_blank')}
              variant="secondary"
              size="md"
            >
              🌊 View on Meteora
            </Button>
          )}
        </div>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Blockchain transaction information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signature */}
            <div>
              <p className="text-sm text-foreground-secondary mb-1">Signature</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm bg-background-tertiary p-3 rounded-lg flex-1 break-all">
                  {transaction.signature}
                </p>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(transaction.signature);
                  }}
                  variant="outline"
                  size="sm"
                >
                  📋
                </Button>
              </div>
            </div>

            {/* Network */}
            <div>
              <p className="text-sm text-foreground-secondary mb-1">Network</p>
              <p className="font-medium capitalize">{transaction.network}</p>
            </div>

            {/* Protocol & Action */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-foreground-secondary mb-1">Protocol</p>
                <p className="font-medium capitalize">{transaction.protocol}</p>
              </div>
              <div>
                <p className="text-sm text-foreground-secondary mb-1">Action</p>
                <p className="font-medium capitalize">{transaction.action.replace(/-/g, ' ')}</p>
              </div>
            </div>

            {/* Wallet */}
            <div>
              <p className="text-sm text-foreground-secondary mb-1">Wallet Address</p>
              <p className="font-mono text-sm">{transaction.walletAddress}</p>
            </div>
          </CardContent>
        </Card>

        {/* Created Resources */}
        {(transaction.poolAddress || transaction.tokenAddress || transaction.configAddress || transaction.vaultAddress) && (
          <Card>
            <CardHeader>
              <CardTitle>Created Resources</CardTitle>
              <CardDescription>Addresses of pools, tokens, and configs created</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transaction.poolAddress && (
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Pool Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-background-tertiary p-3 rounded-lg flex-1">
                      {transaction.poolAddress}
                    </p>
                    <Button
                      onClick={() => navigator.clipboard.writeText(transaction.poolAddress!)}
                      variant="outline"
                      size="sm"
                    >
                      📋
                    </Button>
                  </div>
                </div>
              )}

              {transaction.tokenAddress && (
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Token Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-background-tertiary p-3 rounded-lg flex-1">
                      {transaction.tokenAddress}
                    </p>
                    <Button
                      onClick={() => navigator.clipboard.writeText(transaction.tokenAddress!)}
                      variant="outline"
                      size="sm"
                    >
                      📋
                    </Button>
                  </div>
                </div>
              )}

              {transaction.configAddress && (
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Config Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-background-tertiary p-3 rounded-lg flex-1">
                      {transaction.configAddress}
                    </p>
                    <Button
                      onClick={() => navigator.clipboard.writeText(transaction.configAddress!)}
                      variant="outline"
                      size="sm"
                    >
                      📋
                    </Button>
                  </div>
                </div>
              )}

              {transaction.vaultAddress && (
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Vault Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-background-tertiary p-3 rounded-lg flex-1">
                      {transaction.vaultAddress}
                    </p>
                    <Button
                      onClick={() => navigator.clipboard.writeText(transaction.vaultAddress!)}
                      variant="outline"
                      size="sm"
                    >
                      📋
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fee Information */}
        {transaction.platformFee && transaction.platformFee > 0 && (
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader>
              <CardTitle>Fee Information</CardTitle>
              <CardDescription>Platform fees paid for this transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                <div>
                  <p className="text-sm text-foreground-secondary">Platform Fee</p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {(transaction.platformFee / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
              {transaction.feeToken && (
                <div>
                  <p className="text-sm text-foreground-secondary mb-1">Fee Token</p>
                  <p className="font-mono text-sm">{transaction.feeToken}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Parameters</CardTitle>
            <CardDescription>Input parameters used for this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background-tertiary p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono">
                {JSON.stringify(transaction.params, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Error Details */}
        {transaction.error && (
          <Card className="border-error/20 bg-error/5">
            <CardHeader>
              <CardTitle className="text-error">Error Details</CardTitle>
              <CardDescription>Information about why this transaction failed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background-tertiary p-4 rounded-lg">
                <p className="text-sm font-mono text-error">{transaction.error}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
