import { NextRequest, NextResponse } from 'next/server';
import { createSwapTransaction, BagsApiError } from '@/lib/bags/client';
import telemetry from '@/lib/telemetry';

/**
 * Bags Swap Transaction API Route
 * POST /api/bags/swap
 * 
 * Converts an accepted quote into a serialized transaction
 * Never exposes the API key to the client
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    const {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol = true,
      prioritizationFeeLamports
    } = body;
    
    // Validation
    if (!quoteResponse || !userPublicKey) {
      telemetry.trackApiRequest('/api/bags/swap', 'POST', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Missing required parameters: quoteResponse, userPublicKey' },
        { status: 400 }
      );
    }
    
    // Validate userPublicKey is valid base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(userPublicKey) || userPublicKey.length < 32 || userPublicKey.length > 44) {
      telemetry.trackApiRequest('/api/bags/swap', 'POST', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Invalid userPublicKey: must be a valid Solana base58 address' },
        { status: 400 }
      );
    }
    
    // Validate quoteResponse has required fields
    if (!quoteResponse.routePlan || !quoteResponse.slippageBps === undefined) {
      telemetry.trackApiRequest('/api/bags/swap', 'POST', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Invalid quoteResponse: must include routePlan and slippageBps' },
        { status: 400 }
      );
    }
    
    // Validate prioritizationFeeLamports if provided
    let feeLamports: number | undefined;
    if (prioritizationFeeLamports !== undefined) {
      feeLamports = parseInt(prioritizationFeeLamports, 10);
      if (isNaN(feeLamports) || feeLamports < 0) {
        telemetry.trackApiRequest('/api/bags/swap', 'POST', 400, Date.now() - startTime);
        return NextResponse.json(
          { error: 'Invalid prioritizationFeeLamports: must be a non-negative integer' },
          { status: 400 }
        );
      }
    }
    
    // Call Bags API to create swap transaction
    const response = await createSwapTransaction({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      prioritizationFeeLamports: feeLamports
    });
    
    const durationMs = Date.now() - startTime;
    telemetry.trackApiRequest('/api/bags/swap', 'POST', 200, durationMs);
    
    return NextResponse.json({
      success: true,
      data: response.data,
      requestId: response.requestId
    });
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    if (error instanceof BagsApiError) {
      telemetry.trackApiRequest('/api/bags/swap', 'POST', error.statusCode, durationMs);
      
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          requestId: error.requestId
        },
        { status: error.statusCode }
      );
    }
    
    console.error('Bags Swap API Error:', error);
    telemetry.trackApiRequest('/api/bags/swap', 'POST', 500, durationMs);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
