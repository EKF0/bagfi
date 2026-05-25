import { NextRequest, NextResponse } from 'next/server';
import { webcrypto } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { upsertSmartBagSession } from '@/lib/smart-bags/session-persistence';
import type { SmartBagDepositSession } from '@/lib/smart-bags/session-engine';
import {
  getSmartBagSessionSigningMessage,
  type SmartBagSessionAuthorization
} from '@/lib/smart-bags/session-signing';
import {
  RequestValidationError,
  requireBoundedString,
  requireOneOf,
  requireSolanaPublicKey
} from '@/lib/solana/validation';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SESSION_TYPES = ['deposit', 'rebalance'] as const;
const SESSION_STATUSES = ['draft', 'quoted', 'signing', 'confirmed', 'failed'] as const;
const MAX_SESSION_JSON_BYTES = 200_000;

class SessionAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAuthorizationError';
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

  if (error instanceof SessionAuthorizationError) {
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

function requireArray(value: unknown, fieldName: string, maxLength: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new RequestValidationError(`${fieldName} must be an array`);
  }

  if (value.length > maxLength) {
    throw new RequestValidationError(`${fieldName} cannot contain more than ${maxLength} items`);
  }

  return value;
}

function requireInteger(value: unknown, fieldName: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RequestValidationError(`${fieldName} must be an integer between ${min} and ${max}`);
  }

  return value;
}

function requireIsoDate(value: unknown, fieldName: string) {
  const text = requireBoundedString(value, fieldName, { minLength: 10, maxLength: 40 });
  const timestamp = Date.parse(text);

  if (!Number.isFinite(timestamp)) {
    throw new RequestValidationError(`${fieldName} must be a valid ISO date`);
  }

  return text;
}

function requirePositiveIntegerString(value: unknown, fieldName: string) {
  const text = requireBoundedString(value, fieldName, { minLength: 1, maxLength: 80, pattern: /^\d+$/ });

  if (BigInt(text) <= BigInt(0)) {
    throw new RequestValidationError(`${fieldName} must be greater than zero`);
  }

  return text;
}

function requireDecimalString(value: unknown, fieldName: string) {
  return requireBoundedString(value, fieldName, {
    minLength: 1,
    maxLength: 80,
    pattern: /^\d+(\.\d+)?$/
  });
}

function validateSessionPayload(body: unknown): SmartBagDepositSession {
  const value = requireBodyObject(body);
  const session = requireBodyObject(value.session, 'session');
  const inputToken = requireBodyObject(session.inputToken, 'session.inputToken');
  const sessionJsonBytes = new TextEncoder().encode(JSON.stringify(session)).length;

  if (sessionJsonBytes > MAX_SESSION_JSON_BYTES) {
    throw new RequestValidationError('session payload is too large');
  }

  requireBoundedString(session.id, 'session.id', {
    minLength: 8,
    maxLength: 160,
    pattern: /^[A-Za-z0-9_-]+$/
  });
  requireOneOf(session.type, 'session.type', SESSION_TYPES);
  requireBoundedString(session.bagId, 'session.bagId', { minLength: 1, maxLength: 120 });
  requireBoundedString(session.bagTitle, 'session.bagTitle', { minLength: 1, maxLength: 160 });
  requireSolanaPublicKey(session.walletAddress, 'session.walletAddress');
  requireBoundedString(inputToken.symbol, 'session.inputToken.symbol', { minLength: 1, maxLength: 24 });
  requireBoundedString(inputToken.name, 'session.inputToken.name', { minLength: 1, maxLength: 80 });
  requireSolanaPublicKey(inputToken.mint, 'session.inputToken.mint');
  requireInteger(inputToken.decimals, 'session.inputToken.decimals', 0, 18);
  requireDecimalString(session.inputAmount, 'session.inputAmount');
  requirePositiveIntegerString(session.inputAmountBaseUnits, 'session.inputAmountBaseUnits');
  requireInteger(session.slippageBps, 'session.slippageBps', 0, 10000);
  requireInteger(session.maxSlippageBps, 'session.maxSlippageBps', 0, 10000);
  requireInteger(session.rebalanceThresholdBps, 'session.rebalanceThresholdBps', 0, 10000);
  requireArray(session.allocationSplits, 'session.allocationSplits', 20);
  requireArray(session.quoteSnapshots, 'session.quoteSnapshots', 40);
  requireArray(session.receipts, 'session.receipts', 40);
  requireIsoDate(session.createdAt, 'session.createdAt');
  requireIsoDate(session.updatedAt, 'session.updatedAt');
  requireOneOf(session.status, 'session.status', SESSION_STATUSES);

  return session as unknown as SmartBagDepositSession;
}

function validateAuthorization(body: unknown): SmartBagSessionAuthorization {
  const value = requireBodyObject(body);
  const authorization = requireBodyObject(value.authorization, 'authorization');

  return {
    message: requireBoundedString(authorization.message, 'authorization.message', {
      minLength: 10,
      maxLength: 1000
    }),
    signature: requireBoundedString(authorization.signature, 'authorization.signature', {
      minLength: 80,
      maxLength: 100,
      pattern: /^[A-Za-z0-9+/]+={0,2}$/
    })
  };
}

async function verifySessionAuthorization(
  session: SmartBagDepositSession,
  authorization: SmartBagSessionAuthorization
) {
  const expectedMessage = getSmartBagSessionSigningMessage(session);

  if (authorization.message !== expectedMessage) {
    throw new SessionAuthorizationError('Smart Bag session authorization does not match the session payload');
  }

  const signature = Buffer.from(authorization.signature, 'base64');

  if (signature.byteLength !== 64) {
    throw new SessionAuthorizationError('Smart Bag session authorization signature is invalid');
  }

  const publicKey = new PublicKey(session.walletAddress);
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
    new TextEncoder().encode(authorization.message)
  );

  if (!isValid) {
    throw new SessionAuthorizationError('Smart Bag session authorization signature is invalid');
  }
}

/**
 * Persist Smart Bag session progress.
 * POST /api/bags/sessions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const session = validateSessionPayload(body);
    const authorization = validateAuthorization(body);

    await verifySessionAuthorization(session, authorization);

    const row = await upsertSmartBagSession(session);

    telemetry.trackApiRequest('/api/bags/sessions', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        status: row.status,
        persistedAt: row.updated_at
      }
    });
  } catch (error) {
    const status = error instanceof RequestValidationError
      ? 400
      : error instanceof SessionAuthorizationError
        ? 401
        : 500;

    console.error('Smart Bag session persistence failed:', error);
    telemetry.trackApiRequest('/api/bags/sessions', 'POST', status, Date.now() - startTime);

    return errorResponse(error, status);
  }
}
