import { NextRequest, NextResponse } from 'next/server';
import { createDLMMPool } from '../../../../lib/invent-cli';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Creating DLMM pool with:', body);

    const result = await createDLMMPool({
      tokenName: body.tokenName,
      tokenSymbol: body.tokenSymbol,
      tokenUri: body.tokenUri,
      baseMint: body.baseMint,
      quoteMint: body.quoteMint || 'So11111111111111111111111111111111111111112',
      binStep: parseInt(body.binStep) || 25,
      baseAmount: body.baseAmount,
      quoteAmount: body.quoteAmount,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
