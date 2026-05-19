import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedBagsDiscovery,
  refreshBagsDiscoveryCache,
  refreshBagsTokenScores,
  refreshBagsTokenAnalytics
} from '@/lib/bags/discovery-cache';
import { BagsApiError } from '@/lib/bags/client';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isRefreshAuthorized(request: NextRequest): boolean {
  const refreshSecret = process.env.BAGS_CACHE_REFRESH_SECRET;

  if (!refreshSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authorization = request.headers.get('authorization');
  const explicitSecret = request.headers.get('x-bags-cache-secret');

  return authorization === `Bearer ${refreshSecret}` || explicitSecret === refreshSecret;
}

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
 * Cached Bags discovery data.
 * GET /api/bags/discovery
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const launchLimit = Number(request.nextUrl.searchParams.get('launchLimit') ?? 100);
    const poolLimit = Number(request.nextUrl.searchParams.get('poolLimit') ?? 250);
    const scoreLimit = Number(request.nextUrl.searchParams.get('scoreLimit') ?? 250);
    const analyticsLimit = Number(request.nextUrl.searchParams.get('analyticsLimit') ?? 50);
    const eligibleOnly = request.nextUrl.searchParams.get('eligibleOnly') === 'true';

    const data = await getCachedBagsDiscovery({
      launchLimit: Number.isFinite(launchLimit) && launchLimit > 0 ? launchLimit : 100,
      poolLimit: Number.isFinite(poolLimit) && poolLimit > 0 ? poolLimit : 250,
      scoreLimit: Number.isFinite(scoreLimit) && scoreLimit > 0 ? scoreLimit : 250,
      analyticsLimit: Number.isFinite(analyticsLimit) && analyticsLimit > 0 ? analyticsLimit : 50,
      eligibleOnly
    });

    telemetry.trackApiRequest('/api/bags/discovery', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Bags discovery cache read failed:', error);
    telemetry.trackApiRequest('/api/bags/discovery', 'GET', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}

/**
 * Refresh Bags discovery data from Bags API into Supabase.
 * POST /api/bags/discovery
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!isRefreshAuthorized(request)) {
    telemetry.trackApiRequest('/api/bags/discovery', 'POST', 401, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized Bags discovery cache refresh'
      },
      { status: 401 }
    );
  }

  try {
    const force = request.nextUrl.searchParams.get('force') === 'true';
    const score = request.nextUrl.searchParams.get('score') === 'true';
    const analytics = request.nextUrl.searchParams.get('analytics') === 'true';
    const scoreLimit = Number(request.nextUrl.searchParams.get('scoreLimit') ?? 20);
    const analyticsLimit = Number(request.nextUrl.searchParams.get('analyticsLimit') ?? 20);

    const discovery = await refreshBagsDiscoveryCache({ force });
    
    const scoring = score
      ? await refreshBagsTokenScores({
          force,
          limit: Number.isFinite(scoreLimit) && scoreLimit > 0 ? scoreLimit : 20
        })
      : null;

    const analyticsData = analytics
      ? await refreshBagsTokenAnalytics({
          force,
          limit: Number.isFinite(analyticsLimit) && analyticsLimit > 0 ? analyticsLimit : 20
        })
      : null;

    telemetry.trackApiRequest('/api/bags/discovery', 'POST', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: {
        discovery,
        scoring,
        analytics: analyticsData
      }
    });
  } catch (error) {
    console.error('Bags discovery cache refresh failed:', error);
    telemetry.trackApiRequest('/api/bags/discovery', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
