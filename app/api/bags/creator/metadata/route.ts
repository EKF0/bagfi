import { NextRequest, NextResponse } from 'next/server';
import { createTokenMetadata, BagsApiError } from '@/lib/bags/client';
import { db } from '@/lib/database';
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
 * Create token metadata.
 * POST /api/bags/creator/metadata
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { name, symbol, description, twitter, telegram, website, imageUrl, walletAddress } = body;

    if (!name || !symbol || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'name, symbol, and walletAddress are required' },
        { status: 400 }
      );
    }

    // 1. Call Bags API to generate metadata URI
    const response = await createTokenMetadata({
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      imageUrl
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
    telemetry.trackApiRequest('/api/bags/creator/metadata', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
