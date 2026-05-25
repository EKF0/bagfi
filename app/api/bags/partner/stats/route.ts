import { NextRequest, NextResponse } from 'next/server';
import { getPartnerStats, BagsApiError } from '@/lib/bags/client';
import { RequestValidationError, requireSolanaPublicKey } from '@/lib/solana/validation';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function errorResponse(error: unknown, status = 500) {
  if (error instanceof RequestValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 400 }
    );
  }

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
 * Get partner stats for a wallet.
 * GET /api/bags/partner/stats?partner={pubkey}
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const partner = requireSolanaPublicKey(
      request.nextUrl.searchParams.get('partner'),
      'partner'
    );

    // 1. Fetch from Bags API
    const response = await getPartnerStats(partner);
    const stats = response.data;

    // 2. Cache in Supabase (optional, for history/reporting)
    // For now we just return the live data
    
    telemetry.trackApiRequest('/api/bags/partner/stats', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Bags partner stats fetch failed:', error);
    telemetry.trackApiRequest('/api/bags/partner/stats', 'GET', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
