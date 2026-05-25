import { NextRequest, NextResponse } from 'next/server';
import {
  getClaimablePositions,
  createClaimTransactions,
  BagsApiError,
  type ClaimTransactionRequest
} from '@/lib/bags/client';
import {
  RequestValidationError,
  optionalBoolean,
  optionalSolanaPublicKey,
  requireOneOf,
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

function validateClaimTransactionRequest(body: unknown): ClaimTransactionRequest {
  const value = requireBodyObject(body);
  const claimVirtualPoolFees = optionalBoolean(value.claimVirtualPoolFees, 'claimVirtualPoolFees');
  const claimDammV2Fees = optionalBoolean(value.claimDammV2Fees, 'claimDammV2Fees');
  const customFeeVaultClaimerSide = value.customFeeVaultClaimerSide === undefined || value.customFeeVaultClaimerSide === null
    ? value.customFeeVaultClaimerSide as null | undefined
    : requireOneOf(value.customFeeVaultClaimerSide, 'customFeeVaultClaimerSide', ['A', 'B']);

  const request: ClaimTransactionRequest = {
    feeClaimer: requireSolanaPublicKey(value.feeClaimer, 'feeClaimer'),
    tokenMint: requireSolanaPublicKey(value.tokenMint, 'tokenMint'),
    virtualPoolAddress: optionalSolanaPublicKey(value.virtualPoolAddress, 'virtualPoolAddress'),
    dammV2Position: optionalSolanaPublicKey(value.dammV2Position, 'dammV2Position'),
    dammV2Pool: optionalSolanaPublicKey(value.dammV2Pool, 'dammV2Pool'),
    dammV2PositionNftAccount: optionalSolanaPublicKey(value.dammV2PositionNftAccount, 'dammV2PositionNftAccount'),
    tokenAMint: optionalSolanaPublicKey(value.tokenAMint, 'tokenAMint'),
    tokenBMint: optionalSolanaPublicKey(value.tokenBMint, 'tokenBMint'),
    tokenAVault: optionalSolanaPublicKey(value.tokenAVault, 'tokenAVault'),
    tokenBVault: optionalSolanaPublicKey(value.tokenBVault, 'tokenBVault'),
    claimVirtualPoolFees,
    claimDammV2Fees,
    isCustomFeeVault: optionalBoolean(value.isCustomFeeVault, 'isCustomFeeVault'),
    feeShareProgramId: optionalSolanaPublicKey(value.feeShareProgramId, 'feeShareProgramId'),
    customFeeVaultClaimerA: optionalSolanaPublicKey(value.customFeeVaultClaimerA, 'customFeeVaultClaimerA'),
    customFeeVaultClaimerB: optionalSolanaPublicKey(value.customFeeVaultClaimerB, 'customFeeVaultClaimerB'),
    customFeeVaultClaimerSide,
  };

  if (!request.claimVirtualPoolFees && !request.claimDammV2Fees) {
    throw new RequestValidationError('At least one claim type must be selected');
  }

  if (request.claimVirtualPoolFees && !request.virtualPoolAddress) {
    throw new RequestValidationError('virtualPoolAddress is required when claimVirtualPoolFees is true');
  }

  if (request.claimDammV2Fees) {
    const requiredDammFields: Array<keyof ClaimTransactionRequest> = [
      'dammV2Position',
      'dammV2Pool',
      'dammV2PositionNftAccount',
      'tokenAMint',
      'tokenBMint',
      'tokenAVault',
      'tokenBVault',
    ];

    for (const field of requiredDammFields) {
      if (!request[field]) {
        throw new RequestValidationError(`${field} is required when claimDammV2Fees is true`);
      }
    }
  }

  return request;
}

/**
 * Get claimable fee positions for a wallet.
 * GET /api/bags/claim?userPublicKey=...
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const userPublicKey = requireSolanaPublicKey(
      request.nextUrl.searchParams.get('userPublicKey'),
      'userPublicKey'
    );
    const data = await getClaimablePositions(userPublicKey);
    telemetry.trackApiRequest('/api/bags/claim', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('Bags claimable positions fetch failed:', error);
    telemetry.trackApiRequest('/api/bags/claim', 'GET', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}

/**
 * Generate claim transactions.
 * POST /api/bags/claim
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const data = await createClaimTransactions(validateClaimTransactionRequest(body));
    
    telemetry.trackApiRequest('/api/bags/claim', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('Bags claim transaction generation failed:', error);
    telemetry.trackApiRequest('/api/bags/claim', 'POST', error instanceof RequestValidationError ? 400 : 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
