/**
 * API endpoint to fetch pool details (binStep, baseFee) from Meteora SDK
 * Supports bulk fetching for ALL visible pools at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPoolDetails } from '@/lib/meteora/poolDetails';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pools } = body; // Array of { poolAddress, poolType }

    if (!pools || !Array.isArray(pools)) {
      return NextResponse.json(
        { error: 'Missing pools array' },
        { status: 400 }
      );
    }

    console.log(`🚀 Bulk fetching details for ${pools.length} pools...`);

    // Fetch ALL pools in parallel (Solana RPC can handle this)
    const results = await Promise.all(
      pools.map(async ({ poolAddress, poolType }) => {
        try {
          const details = await fetchPoolDetails(poolAddress, poolType);
          return { poolAddress, details, success: true };
        } catch (error: any) {
          console.error(`Failed to fetch ${poolAddress}:`, error.message);
          return { poolAddress, details: {}, success: false };
        }
      })
    );

    // Convert to map for easy lookup
    const detailsMap: Record<string, any> = {};
    results.forEach(({ poolAddress, details }) => {
      detailsMap[poolAddress] = details;
    });

    console.log(`✅ Fetched details for ${results.filter(r => r.success).length}/${pools.length} pools`);

    return NextResponse.json({ success: true, detailsMap });
  } catch (error: any) {
    console.error('Error fetching pool details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pool details' },
      { status: 500 }
    );
  }
}
