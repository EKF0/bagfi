import { NextRequest, NextResponse } from 'next/server';
import { webcrypto } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import {
  getUserProfile,
  updatePublicLeaderboardStatus
} from '@/lib/users/profile-repository';
import {
  getUserProfileSigningMessage,
  USER_PROFILE_ACTIONS,
  type UserProfileAction,
  type UserProfileAuthorization
} from '@/lib/users/profile-signing';
import {
  RequestValidationError,
  optionalBoolean,
  requireOneOf,
  requireSolanaPublicKey
} from '@/lib/solana/validation';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

class UserProfileAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserProfileAuthorizationError';
  }
}

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

  if (error instanceof UserProfileAuthorizationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 401 }
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

function requireBodyObject(body: unknown, fieldName = 'Request body'): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestValidationError(`${fieldName} must be an object`);
  }

  return body as Record<string, unknown>;
}

function requireAuthorization(body: Record<string, unknown>): UserProfileAuthorization {
  const authorization = requireBodyObject(body.authorization, 'authorization');

  if (typeof authorization.message !== 'string' || authorization.message.length > 1000) {
    throw new RequestValidationError('authorization.message must be a string up to 1000 characters');
  }

  if (
    typeof authorization.signature !== 'string'
    || authorization.signature.length < 80
    || authorization.signature.length > 100
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(authorization.signature)
  ) {
    throw new RequestValidationError('authorization.signature must be a base64 Ed25519 signature');
  }

  return {
    message: authorization.message,
    signature: authorization.signature
  };
}

async function verifyUserProfileAuthorization(params: {
  walletAddress: string;
  action: UserProfileAction;
  isPublicLeaderboard: boolean;
  authorization: UserProfileAuthorization;
}) {
  const expectedMessage = getUserProfileSigningMessage({
    walletAddress: params.walletAddress,
    action: params.action,
    isPublicLeaderboard: params.isPublicLeaderboard
  });

  if (params.authorization.message !== expectedMessage) {
    throw new UserProfileAuthorizationError('User profile authorization does not match the requested update');
  }

  const signature = Buffer.from(params.authorization.signature, 'base64');
  if (signature.byteLength !== 64) {
    throw new UserProfileAuthorizationError('User profile authorization signature is invalid');
  }

  const publicKey = new PublicKey(params.walletAddress);
  const key = await webcrypto.subtle.importKey(
    'raw',
    publicKey.toBytes(),
    'Ed25519',
    false,
    ['verify']
  );
  const isValid = await webcrypto.subtle.verify(
    'Ed25519',
    key,
    signature,
    new TextEncoder().encode(params.authorization.message)
  );

  if (!isValid) {
    throw new UserProfileAuthorizationError('User profile authorization signature is invalid');
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const walletAddress = requireSolanaPublicKey(
      request.nextUrl.searchParams.get('walletAddress'),
      'walletAddress'
    );
    const profile = await getUserProfile(walletAddress);

    telemetry.trackApiRequest('/api/users/profile', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    const status = error instanceof RequestValidationError ? 400 : 500;

    console.error('User profile read failed:', error);
    telemetry.trackApiRequest('/api/users/profile', 'GET', status, Date.now() - startTime);

    return errorResponse(error, status);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = requireBodyObject(await request.json());
    const walletAddress = requireSolanaPublicKey(body.walletAddress, 'walletAddress');
    const action = requireOneOf(body.action, 'action', USER_PROFILE_ACTIONS);
    const isPublicLeaderboard = optionalBoolean(
      body.isPublicLeaderboard,
      'isPublicLeaderboard'
    );

    if (action === 'update-public-leaderboard' && typeof isPublicLeaderboard !== 'boolean') {
      throw new RequestValidationError('isPublicLeaderboard is required for update-public-leaderboard');
    }

    const authorization = requireAuthorization(body);

    await verifyUserProfileAuthorization({
      walletAddress,
      action,
      isPublicLeaderboard: isPublicLeaderboard as boolean,
      authorization
    });

    const profile = await updatePublicLeaderboardStatus({
      walletAddress,
      isPublicLeaderboard: isPublicLeaderboard as boolean
    });

    telemetry.trackApiRequest('/api/users/profile', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    const status = error instanceof RequestValidationError
      ? 400
      : error instanceof UserProfileAuthorizationError
        ? 401
        : 500;

    console.error('User profile update failed:', error);
    telemetry.trackApiRequest('/api/users/profile', 'POST', status, Date.now() - startTime);

    return errorResponse(error, status);
  }
}
