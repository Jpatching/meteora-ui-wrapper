'use client';

import { useState } from 'react';

export function DLMMPoolForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    createNew: true,
    tokenName: '',
    tokenSymbol: '',
    tokenUri: '',
    baseMint: '',
    quoteMint: 'So11111111111111111111111111111111111111112',
    binStep: '25',
    baseAmount: '',
    quoteAmount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/pools/create-dlmm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Create DLMM Pool
        </h2>
        <p className="text-gray-600 mt-2">
          Launch a Dynamic Liquidity Market Maker pool on Solana
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Token Creation Toggle */}
        <div className="border-2 border-purple-100 rounded-xl p-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.createNew}
              onChange={(e) => setFormData({ ...formData, createNew: e.target.checked })}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <span className="text-lg font-medium">Create a new token</span>
          </label>

          {formData.createNew ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Name *
                </label>
                <input
                  required
                  value={formData.tokenName}
                  onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="My Awesome Token"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <input
                    required
                    value={formData.tokenSymbol}
                    onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="MAT"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata URI *
                  </label>
                  <input
                    required
                    type="url"
                    value={formData.tokenUri}
                    onChange={(e) => setFormData({ ...formData, tokenUri: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Token Mint *
              </label>
              <input
                required
                value={formData.baseMint}
                onChange={(e) => setFormData({ ...formData, baseMint: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="TokenMint111..."
              />
            </div>
          )}
        </div>

        {/* Pool Configuration */}
        <div className="border-2 border-blue-100 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Pool Configuration</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Token *
              </label>
              <select
                value={formData.quoteMint}
                onChange={(e) => setFormData({ ...formData, quoteMint: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="So11111111111111111111111111111111111111112">SOL</option>
                <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
                <option value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bin Step (Fee) *
              </label>
              <select
                value={formData.binStep}
                onChange={(e) => setFormData({ ...formData, binStep: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="1">1 (0.01% - Stables)</option>
                <option value="5">5 (0.05% - Tight)</option>
                <option value="25">25 (0.25% - Standard)</option>
                <option value="100">100 (1% - Wide)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Amount *
              </label>
              <input
                required
                type="number"
                step="any"
                value={formData.baseAmount}
                onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Amount *
              </label>
              <input
                required
                type="number"
                step="any"
                value={formData.quoteAmount}
                onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? '⏳ Creating Pool...' : '🚀 Create Pool'}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={`mt-6 p-6 rounded-xl ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          {result.success ? (
            <div>
              <h3 className="text-xl font-bold text-green-900 mb-4">🎉 Pool Created!</h3>
              <div className="space-y-2 text-sm">
                <p className="text-green-800">
                  <span className="font-medium">Pool:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded">{result.poolAddress}</code>
                </p>
                {result.signature && (
                  <p className="text-green-800">
                    <span className="font-medium">Transaction:</span>{' '}
                    <a
                      href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      View on Solscan →
                    </a>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-red-900 mb-2">Error</h3>
              <p className="text-red-800">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
