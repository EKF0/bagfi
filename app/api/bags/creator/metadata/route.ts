import { NextRequest, NextResponse } from 'next/server';
import { createTokenMetadata, BagsApiError, type TokenMetadataRequest } from '@/lib/bags/client';
import {
  RequestValidationError,
  optionalBoundedString,
  optionalHttpUrl,
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

function validateMetadataRequest(body: unknown): TokenMetadataRequest & { walletAddress: string } {
  const value = requireBodyObject(body);
  const symbol = requireBoundedString(value.symbol, 'symbol', {
    minLength: 1,
    maxLength: 12,
    pattern: /^[A-Za-z0-9]+$/
  });

  return {
    name: requireBoundedString(value.name, 'name', { minLength: 2, maxLength: 64 }),
    symbol,
    description: optionalBoundedString(value.description, 'description', { maxLength: 500 }) || '',
    twitter: optionalBoundedString(value.twitter, 'twitter', { maxLength: 64, pattern: /^@?[A-Za-z0-9_]{1,15}$/ }),
    telegram: optionalBoundedString(value.telegram, 'telegram', { maxLength: 64 }),
    website: optionalHttpUrl(value.website, 'website'),
    imageUrl: optionalHttpUrl(value.imageUrl, 'imageUrl'),
    walletAddress: requireSolanaPublicKey(value.walletAddress, 'walletAddress')
  };
}

/**
 * Create token metadata.
 * POST /api/bags/creator/metadata
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const metadata = validateMetadataRequest(await request.json());

    // 1. Call Bags API to generate metadata URI
    const response = await createTokenMetadata({
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      twitter: metadata.twitter,
      telegram: metadata.telegram,
      website: metadata.website,
      imageUrl: metadata.imageUrl
    });

    const { metadataUri } = response.data;

    // 2. Save draft in Supabase
    // Note: We'd need a typed repository for this, but for now we'll use a direct supabase client or planned logic
    // Since I'm in SOL5-01, I'm "planning" and implementing the flow.
    
    telemetry.trackApiRequest('/api/bags/creator/metadata', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: { metadataUri }
    });
  } catch (error) {
    console.error('Bags creator metadata creation failed:', error);
    telemetry.trackApiRequest('/api/bags/creator/metadata', 'POST', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
