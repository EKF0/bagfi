import { NextRequest, NextResponse } from 'next/server';
import { createFeeShareConfigTransaction, BagsApiError, type FeeShareConfigRequest } from '@/lib/bags/client';
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

function requireBodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestValidationError('Request body must be an object');
  }

  return body as Record<string, unknown>;
}

function validateFeeShareRequest(body: unknown): FeeShareConfigRequest {
  const value = requireBodyObject(body);

  if (!Array.isArray(value.participants) || value.participants.length === 0) {
    throw new RequestValidationError('participants must include at least one stakeholder');
  }

  const seenWallets = new Set<string>();
  const participants = value.participants.map((participant, index) => {
    const item = requireBodyObject(participant);
    const wallet = requireSolanaPublicKey(item.wallet, `participants[${index}].wallet`);

    if (typeof item.bps !== 'number' || !Number.isInteger(item.bps) || item.bps <= 0 || item.bps > 10000) {
      throw new RequestValidationError(`participants[${index}].bps must be an integer between 1 and 10000`);
    }

    if (seenWallets.has(wallet)) {
      throw new RequestValidationError(`participants[${index}].wallet is duplicated`);
    }

    seenWallets.add(wallet);
    return { wallet, bps: item.bps };
  });

  const totalBps = participants.reduce((total, participant) => total + participant.bps, 0);
  if (totalBps > 10000) {
    throw new RequestValidationError('participant fee share total must not exceed 10000 bps');
  }

  return {
    creator: requireSolanaPublicKey(value.creator, 'creator'),
    tokenMint: requireSolanaPublicKey(value.tokenMint, 'tokenMint'),
    participants
  };
}

/**
 * Generate fee share configuration transactions.
 * POST /api/bags/creator/fee-share
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const response = await createFeeShareConfigTransaction(validateFeeShareRequest(await request.json()));

    telemetry.trackApiRequest('/api/bags/creator/fee-share', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Bags fee share config failed:', error);
    telemetry.trackApiRequest('/api/bags/creator/fee-share', 'POST', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
