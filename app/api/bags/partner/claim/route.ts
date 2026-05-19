import { NextRequest, NextResponse } from 'next/server';
import { 
  createPartnerClaimTransaction, 
  createPartnerConfigTransaction, 
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
 * Generate partner claim or setup transactions.
 * POST /api/bags/partner/claim
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { partner, type } = body; // type: 'claim' | 'setup'

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'partner is required' },
        { status: 400 }
      );
    }

    let result;
    if (type === 'setup') {
      result = await createPartnerConfigTransaction({ partner });
    } else {
      result = await createPartnerClaimTransaction({ partner });
    }
    
    telemetry.trackApiRequest('/api/bags/partner/claim', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Bags partner operation failed:', error);
    telemetry.trackApiRequest('/api/bags/partner/claim', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
