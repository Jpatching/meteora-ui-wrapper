import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tokens/search
 * Search tokens using Jupiter's token search API
 * Query params: ?q=TRUMP
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Query must be at least 2 characters'
    });
  }

  try {
    // Use Jupiter Lite API - searches ALL tokens by name/symbol, includes full metadata
    const response = await fetch(
      `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.statusText}`);
    }

    const tokens = await response.json();

    // Transform to match our TokenData structure
    const transformedTokens = (tokens || []).map((token: any) => ({
      tokenAddress: token.id,
      symbol: token.symbol,
      name: token.name,
      icon: token.icon,
      marketCap: token.mcap || 0,
      liquidity: token.liquidity || 0,
      volume24h: (token.stats24h?.buyVolume || 0) + (token.stats24h?.sellVolume || 0),
      holders: token.holderCount || 0,
      txCount: (token.stats24h?.numBuys || 0) + (token.stats24h?.numSells || 0),
      priceChange: token.stats24h?.priceChange || 0,
      twitter: token.twitter,
      organicScore: token.organicScore,
      audit: token.audit,
      createdAt: token.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: transformedTokens,
      count: transformedTokens.length,
    });
  } catch (error: any) {
    console.error('❌ Token search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
