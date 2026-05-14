import { NextRequest, NextResponse } from 'next/server';
import { getTradeQuote, BagsApiError } from '@/lib/bags/client';
import telemetry from '@/lib/telemetry';

/**
 * Bags Quote API Route
 * GET /api/bags/quote
 * 
 * Validates input and returns a quote from Bags.fm API
 * Never exposes the API key to the client
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps');
    const userPublicKey = searchParams.get('userPublicKey');
    
    // Validation
    if (!inputMint || !outputMint || !amount) {
      telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Missing required parameters: inputMint, outputMint, amount' },
        { status: 400 }
      );
    }
    
    // Validate mint addresses are valid base58 strings
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(inputMint) || inputMint.length < 32 || inputMint.length > 44) {
      telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Invalid inputMint: must be a valid Solana base58 address' },
        { status: 400 }
      );
    }
    
    if (!base58Regex.test(outputMint) || outputMint.length < 32 || outputMint.length > 44) {
      telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Invalid outputMint: must be a valid Solana base58 address' },
        { status: 400 }
      );
    }
    
    // Validate amount is a positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate slippage if provided
    let slippageBpsNum: number | undefined;
    if (slippageBps) {
      slippageBpsNum = parseInt(slippageBps, 10);
      if (isNaN(slippageBpsNum) || slippageBpsNum < 0 || slippageBpsNum > 10000) {
        telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
        return NextResponse.json(
          { error: 'Invalid slippageBps: must be between 0 and 10000 (100%)' },
          { status: 400 }
        );
      }
    }
    
    // Validate userPublicKey if provided
    if (userPublicKey) {
      if (!base58Regex.test(userPublicKey) || userPublicKey.length < 32 || userPublicKey.length > 44) {
        telemetry.trackApiRequest('/api/bags/quote', 'GET', 400, Date.now() - startTime);
        return NextResponse.json(
          { error: 'Invalid userPublicKey: must be a valid Solana base58 address' },
          { status: 400 }
        );
      }
    }
    
    // Call Bags API
    const response = await getTradeQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBpsNum,
      userPublicKey: userPublicKey || undefined
    });
    
    const durationMs = Date.now() - startTime;
    telemetry.trackApiRequest('/api/bags/quote', 'GET', 200, durationMs);
    
    return NextResponse.json({
      success: true,
      data: response.data,
      requestId: response.requestId
    });
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    if (error instanceof BagsApiError) {
      telemetry.trackApiRequest('/api/bags/quote', 'GET', error.statusCode, durationMs);
      
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
    
    console.error('Bags Quote API Error:', error);
    telemetry.trackApiRequest('/api/bags/quote', 'GET', 500, durationMs);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
