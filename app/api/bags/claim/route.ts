import { NextRequest, NextResponse } from 'next/server';
import {
  getClaimablePositions,
  createClaimTransactions,
  BagsApiError
} from '@/lib/bags/client';
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
 * Get claimable fee positions for a wallet.
 * GET /api/bags/claim?userPublicKey=...
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const userPublicKey = request.nextUrl.searchParams.get('userPublicKey');

  if (!userPublicKey) {
    return NextResponse.json(
      { success: false, error: 'userPublicKey is required' },
      { status: 400 }
    );
  }

  try {
    const data = await getClaimablePositions(userPublicKey);
    telemetry.trackApiRequest('/api/bags/claim', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('Bags claimable positions fetch failed:', error);
    telemetry.trackApiRequest('/api/bags/claim', 'GET', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}

/**
 * Generate claim transactions.
 * POST /api/bags/claim
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const data = await createClaimTransactions(body);
    
    telemetry.trackApiRequest('/api/bags/claim', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('Bags claim transaction generation failed:', error);
    telemetry.trackApiRequest('/api/bags/claim', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
