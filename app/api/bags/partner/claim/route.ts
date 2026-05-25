import { NextRequest, NextResponse } from 'next/server';
import { 
  createPartnerClaimTransaction, 
  createPartnerConfigTransaction, 
  BagsApiError 
} from '@/lib/bags/client';
import { RequestValidationError, requireOneOf, requireSolanaPublicKey } from '@/lib/solana/validation';
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

function requireBodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestValidationError('Request body must be an object');
  }

  return body as Record<string, unknown>;
}

/**
 * Generate partner claim or setup transactions.
 * POST /api/bags/partner/claim
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = requireBodyObject(await request.json());
    const partner = requireSolanaPublicKey(body.partner, 'partner');
    const type = body.type === undefined
      ? 'claim'
      : requireOneOf(body.type, 'type', ['claim', 'setup']); // type: 'claim' | 'setup'

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
    telemetry.trackApiRequest('/api/bags/partner/claim', 'POST', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
