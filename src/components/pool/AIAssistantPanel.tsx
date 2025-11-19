/**
 * AI Assistant Panel - Chat interface with AI-powered insights
 */

'use client';

import { Pool } from '@/lib/jupiter/types';
import { useState } from 'react';

interface AIAssistantPanelProps {
  pool: Pool;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistantPanel({ pool }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI assistant for ${pool.baseAsset.symbol}-SOL. Ask me anything about risks, strategies, or market analysis.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    'Analyze risks',
    'Suggest LP strategy',
    'Predict price',
    'Compare pools'
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = {
        'analyze risks': `Based on my analysis of ${pool.baseAsset.symbol}:

• **Impermanent Loss Risk**: Medium - Current volatility suggests potential for IL
• **Liquidity Risk**: ${pool.baseAsset.liquidity && pool.baseAsset.liquidity > 100000 ? 'Low' : 'Medium'} - TVL is ${pool.baseAsset.liquidity ? `$${(pool.baseAsset.liquidity / 1000).toFixed(0)}K` : 'unknown'}
• **Smart Contract Risk**: Low - Meteora is audited and battle-tested
• **Token Risk**: ${pool.baseAsset.audit?.mintAuthorityDisabled ? 'Low - Mint authority disabled' : 'Medium - Check tokenomics'}

Recommendation: ${pool.baseAsset.liquidity && pool.baseAsset.liquidity > 50000 ? 'Good for conservative LPs' : 'Higher risk, suitable for active traders'}`,

        'suggest lp strategy': `Optimal LP strategy for ${pool.baseAsset.symbol}:

**Recommended Range**: ±20% from current price
**Strategy Type**: ${pool.type === 'dlmm' ? 'Dynamic bins with rebalancing' : 'Standard 50-50 pool'}
**Position Size**: Start with 10-20% of intended allocation
**Rebalance Frequency**: ${pool.volume24h && pool.volume24h > 10000 ? 'Check daily' : 'Check weekly'}

**Expected Returns**:
• Fee APR: ~${pool.volume24h ? ((pool.volume24h * 0.003 * 365) / (pool.baseAsset.liquidity || 1) * 100).toFixed(1) : '5-15'}%
• IL Risk: Medium

Would you like specific bin ranges for your entry?`,

        'predict price': `Price analysis for ${pool.baseAsset.symbol}:

**Technical Indicators**:
• 24h Change: ${pool.baseAsset.stats24h?.priceChange || 0 > 0 ? 'Bullish' : 'Bearish'} ${Math.abs(pool.baseAsset.stats24h?.priceChange || 0).toFixed(1)}%
• Volume Trend: ${pool.volume24h && pool.volume24h > 10000 ? 'Strong' : 'Moderate'}
• Support: $${pool.baseAsset.usdPrice ? (Number(pool.baseAsset.usdPrice) * 0.9).toFixed(6) : '?'}
• Resistance: $${pool.baseAsset.usdPrice ? (Number(pool.baseAsset.usdPrice) * 1.1).toFixed(6) : '?'}

**24h Forecast**:
• Likely Range: $${pool.baseAsset.usdPrice ? (Number(pool.baseAsset.usdPrice) * 0.95).toFixed(6) : '?'} - $${pool.baseAsset.usdPrice ? (Number(pool.baseAsset.usdPrice) * 1.05).toFixed(6) : '?'}
• Confidence: 70%

*Note: This is AI-generated analysis, not financial advice.*`,

        'compare pools': `Comparing ${pool.baseAsset.symbol} pools:

**This Pool (${pool.type?.toUpperCase()})**:
• TVL: $${pool.baseAsset.liquidity ? (pool.baseAsset.liquidity / 1000).toFixed(0) : '?'}K
• Volume: $${pool.volume24h ? (pool.volume24h / 1000).toFixed(0) : '?'}K/day
• Fee Tier: ${pool.type === 'dlmm' ? '0.01-1% (dynamic)' : '0.3%'}

**Ranking**: ${pool.baseAsset.liquidity && pool.baseAsset.liquidity > 100000 ? 'Top tier' : pool.baseAsset.liquidity && pool.baseAsset.liquidity > 10000 ? 'Mid tier' : 'Emerging'}

**Recommendation**: ${pool.type === 'dlmm' ? 'DLMM offers better capital efficiency for concentrated LPs' : 'Standard pool suitable for passive LPs'}

Would you like to see specific pools to compare?`
      };

      const response = responses[message.toLowerCase() as keyof typeof responses] ||
        `I understand you asked about "${message}". Let me analyze ${pool.baseAsset.symbol} for you...

I can help with:
• Risk analysis and safety scores
• LP strategy suggestions and optimal ranges
• Price predictions and technical analysis
• Pool comparisons and recommendations

Just ask me a specific question!`;

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-background border border-border-light rounded-xl overflow-hidden flex flex-col" style={{ height: '500px' }}>
      {/* Header */}
      <div className="p-4 border-b border-border-light flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
          <p className="text-xs text-gray-400">Powered by Claude</p>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-b border-border-light">
        <div className="flex items-center gap-2 flex-wrap">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}

            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="px-4 py-2 bg-gray-800 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border-light">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
