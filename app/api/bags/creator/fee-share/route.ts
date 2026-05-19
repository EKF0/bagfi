import { NextRequest, NextResponse } from 'next/server';
import { createFeeShareConfigTransaction, BagsApiError } from '@/lib/bags/client';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function errorResponse(error: unknown, status = 500) {
  if (error instanceof BagsApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        requestId: error.requestId
      },
      { status: error.statusCode || status }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    },
    { status }
  );
}

/**
 * Generate fee share configuration transactions.
 * POST /api/bags/creator/fee-share
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { creator, tokenMint, participants } = body;

    if (!creator || !tokenMint || !participants) {
      return NextResponse.json(
        { success: false, error: 'creator, tokenMint, and participants are required' },
        { status: 400 }
      );
    }

    const response = await createFeeShareConfigTransaction({
      creator,
      tokenMint,
      participants
    });

    telemetry.trackApiRequest('/api/bags/creator/fee-share', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Bags fee share config failed:', error);
    telemetry.trackApiRequest('/api/bags/creator/fee-share', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
