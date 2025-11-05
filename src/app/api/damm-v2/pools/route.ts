/**
 * Server-side API route to fetch DAMM v2 pools
 * This avoids CORS issues by proxying the request through our server
 *
 * Official API: https://dammv2-api.meteora.ag/pools
 * Docs: https://docs.meteora.ag/api-reference/damm-v2/overview
 * Note: API returns pools from all networks - filtering must be done client-side
 */

import { NextRequest, NextResponse } from 'next/server';

const DAMM_V2_API_URL = 'https://dammv2-api.meteora.ag/pools';

export async function GET(request: NextRequest) {
  try {
    console.log('🌊 Fetching DAMM v2 pools from Meteora API...');

    const response = await fetch(DAMM_V2_API_URL, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 30 seconds to avoid hitting rate limits
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`❌ DAMM v2 API returned ${response.status}: ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch pools: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The API returns paginated data with structure: { data: [...], total, pages, current_page, status }
    const pools = data.data || [];
    const total = data.total || 0;
    const pages = data.pages || 1;
    const currentPage = data.current_page || 1;

    console.log(`✅ Successfully fetched ${pools.length} DAMM v2 pools (page ${currentPage}/${pages}, total: ${total})`);

    return NextResponse.json({
      success: true,
      pools,
      count: pools.length,
      total,
      pages,
      currentPage,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error fetching DAMM v2 pools:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}
