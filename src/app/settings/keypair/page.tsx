'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button } from '@/components/ui';
import { useNetwork } from '@/contexts/NetworkContext';
import toast from 'react-hot-toast';
import bs58 from 'bs58';

export default function KeypairPage() {
  const { publicKey } = useWallet();
  const { network } = useNetwork();
  const [generatedKeypair, setGeneratedKeypair] = useState<Keypair | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const handleGenerateKeypair = () => {
    const keypair = Keypair.generate();
    setGeneratedKeypair(keypair);
    toast.success('New keypair generated!');
  };

  const handleCopyPublicKey = () => {
    if (generatedKeypair) {
      navigator.clipboard.writeText(generatedKeypair.publicKey.toBase58());
      toast.success('Public key copied to clipboard');
    }
  };

  const handleCopyPrivateKey = () => {
    if (generatedKeypair) {
      navigator.clipboard.writeText(bs58.encode(generatedKeypair.secretKey));
      toast.success('Private key copied to clipboard');
    }
  };

  const handleDownloadKeypair = () => {
    if (generatedKeypair) {
      const keypairData = {
        publicKey: generatedKeypair.publicKey.toBase58(),
        secretKey: bs58.encode(generatedKeypair.secretKey),
        secretKeyArray: Array.from(generatedKeypair.secretKey),
      };
      const blob = new Blob([JSON.stringify(keypairData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keypair-${generatedKeypair.publicKey.toBase58().slice(0, 8)}.json`;
      a.click();
      toast.success('Keypair downloaded');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Keypair Generator</h1>
          <p className="text-foreground-secondary mt-2">
            Generate new Solana keypairs for testing and development
          </p>
        </div>

        {/* Generate Keypair */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Keypair</CardTitle>
            <CardDescription>
              Create a new Solana keypair for use in your applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateKeypair}
              variant="primary"
              size="lg"
              className="w-full"
            >
              🔑 Generate New Keypair
            </Button>
          </CardContent>
        </Card>

        {/* Display Generated Keypair */}
        {generatedKeypair && (
          <>
            {/* Public Key */}
            <Card>
              <CardHeader>
                <CardTitle>Public Key</CardTitle>
                <CardDescription>
                  Share this address to receive tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background-tertiary font-mono text-sm break-all">
                  {generatedKeypair.publicKey.toBase58()}
                </div>
                <Button onClick={handleCopyPublicKey} variant="secondary" size="md">
                  📋 Copy Public Key
                </Button>
              </CardContent>
            </Card>

            {/* Private Key */}
            <Card>
              <CardHeader>
                <CardTitle>Private Key</CardTitle>
                <CardDescription>
                  Keep this secret! Never share your private key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background-tertiary font-mono text-sm break-all">
                  {showPrivateKey
                    ? bs58.encode(generatedKeypair.secretKey)
                    : '••••••••••••••••••••••••••••••••••••••••••••'
                  }
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    variant="secondary"
                    size="md"
                  >
                    {showPrivateKey ? '🙈 Hide' : '👁️ Show'} Private Key
                  </Button>
                  <Button onClick={handleCopyPrivateKey} variant="secondary" size="md">
                    📋 Copy Private Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Download */}
            <Card>
              <CardHeader>
                <CardTitle>Download Keypair</CardTitle>
                <CardDescription>
                  Save the keypair as a JSON file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadKeypair} variant="primary" size="md">
                  💾 Download Keypair JSON
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Warning Card */}
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="space-y-2 text-sm text-warning">
                <p><strong>Security Warning:</strong></p>
                <p>• Never share your private key with anyone</p>
                <p>• Store private keys securely offline</p>
                <p>• Use hardware wallets for mainnet funds</p>
                <p>• These keypairs are for development/testing only</p>
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
                <p><strong>Use Cases:</strong></p>
                <p>• Generate keypairs for testing on devnet</p>
                <p>• Create wallets for automated scripts</p>
                <p>• Generate token mint authorities</p>
                <p>• Create pool creator keypairs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
