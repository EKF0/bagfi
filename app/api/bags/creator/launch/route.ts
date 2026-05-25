import { NextRequest, NextResponse } from 'next/server';
import { createTokenLaunchTransaction, BagsApiError, type TokenLaunchRequest } from '@/lib/bags/client';
import {
  RequestValidationError,
  optionalNonNegativeIntegerString,
  requireBoundedString,
  requireSolanaPublicKey
} from '@/lib/solana/validation';
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

function validateLaunchRequest(body: unknown): TokenLaunchRequest {
  const value = requireBodyObject(body);

  return {
    creator: requireSolanaPublicKey(value.creator, 'creator'),
    metadataUri: requireBoundedString(value.metadataUri, 'metadataUri', { minLength: 1, maxLength: 2048 }),
    initialBuyAmount: optionalNonNegativeIntegerString(value.initialBuyAmount, 'initialBuyAmount')
  };
}

/**
 * Generate token launch transaction.
 * POST /api/bags/creator/launch
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const launchRequest = validateLaunchRequest(await request.json());

    const response = await createTokenLaunchTransaction(launchRequest);

    telemetry.trackApiRequest('/api/bags/creator/launch', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Bags creator launch transaction failed:', error);
    telemetry.trackApiRequest('/api/bags/creator/launch', 'POST', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
