import { NextRequest, NextResponse } from 'next/server';
import { parseUnits, formatUnits } from 'viem';
import telemetry from '@/lib/telemetry';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fromChain = searchParams.get('fromChain') || 'ETH';
    const toChain = searchParams.get('toChain') || 'ARB';
    const fromToken = searchParams.get('fromToken') || 'ETH';
    const toToken = searchParams.get('toToken') || 'USDC';
    const fromAmount = searchParams.get('fromAmount');
    const fromAddress = searchParams.get('fromAddress') || '0x0000000000000000000000000000000000000000';
    
    // Input validation
    if (!fromAmount || isNaN(Number(fromAmount)) || Number(fromAmount) <= 0) {
      telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount || '0', false, new Error('Invalid fromAmount parameter'));
      return NextResponse.json(
        { error: 'Invalid fromAmount parameter' },
        { status: 400 }
      );
    }
    
    // Validate chain parameters
    const validChains = ['ETH', 'ARB', 'OP', 'BASE', 'POLYGON'];
    const validTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'WETH'];
    
    if (!validChains.includes(fromChain) || !validChains.includes(toChain)) {
      telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount, false, new Error('Invalid chain parameter'));
      return NextResponse.json(
        { error: 'Invalid chain parameter' },
        { status: 400 }
      );
    }
    
    if (!validTokens.includes(fromToken) || !validTokens.includes(toToken)) {
      telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount, false, new Error('Invalid token parameter'));
      return NextResponse.json(
        { error: 'Invalid token parameter' },
        { status: 400 }
      );
    }
    
    // Parse the amount
    let fromAmountWei;
    try {
      // Assuming 18 decimals for now, could be made dynamic based on token
      fromAmountWei = parseUnits(fromAmount, 18).toString();
    } catch (e) {
      telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount, false, new Error('Invalid amount format'));
      return NextResponse.json(
        { error: 'Invalid amount format' },
        { status: 400 }
      );
    }
    
    // Build Li.Fi API URL
    const url = `https://li.quest/v1/quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${fromAmountWei}&fromAddress=${fromAddress}`;
    
    // Fetch from Li.Fi API
    const response = await fetch(url);
    const durationMs = Date.now() - startTime;
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      telemetry.trackApiRequest('/api/quote', 'GET', response.status, durationMs);
      telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount, false, new Error(errData.message || 'Failed to fetch route'));
      return NextResponse.json(
        { error: errData.message || 'Failed to fetch route' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Process the response to match the expected format
    let receiveAmount = '';
    if (data.estimate && data.estimate.toAmount) {
      // Assuming 6 decimals for USDC, could be made dynamic
      const formattedReceive = formatUnits(BigInt(data.estimate.toAmount), 6);
      receiveAmount = Number(formattedReceive).toFixed(4);
    }
    
    // Track successful request
    telemetry.trackApiRequest('/api/quote', 'GET', 200, durationMs);
    telemetry.trackQuoteRequest(fromChain, toChain, fromToken, toToken, fromAmount, true);
    
    return NextResponse.json({
      ...data,
      receiveAmount
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('Quote API Error:', error);
    telemetry.trackApiRequest('/api/quote', 'GET', 500, durationMs);
    telemetry.trackQuoteRequest(
      request.nextUrl.searchParams.get('fromChain') || 'unknown',
      request.nextUrl.searchParams.get('toChain') || 'unknown',
      request.nextUrl.searchParams.get('fromToken') || 'unknown',
      request.nextUrl.searchParams.get('toToken') || 'unknown',
      request.nextUrl.searchParams.get('fromAmount') || '0',
      false,
      error
    );
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}