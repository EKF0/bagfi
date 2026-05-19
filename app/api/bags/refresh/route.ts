import { NextRequest, NextResponse } from 'next/server';
import { refreshAllBagsData } from '@/lib/bags/discovery-cache';
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
 * Unified refresh endpoint for background jobs.
 * POST /api/bags/refresh
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!isRefreshAuthorized(request)) {
    telemetry.trackApiRequest('/api/bags/refresh', 'POST', 401, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized Bags data refresh'
      },
      { status: 401 }
    );
  }

  try {
    const force = request.nextUrl.searchParams.get('force') === 'true';
    const scoreLimit = Number(request.nextUrl.searchParams.get('scoreLimit') ?? 20);
    const analyticsLimit = Number(request.nextUrl.searchParams.get('analyticsLimit') ?? 20);

    const result = await refreshAllBagsData({
      force,
      scoreLimit: Number.isFinite(scoreLimit) && scoreLimit > 0 ? scoreLimit : 20,
      analyticsLimit: Number.isFinite(analyticsLimit) && analyticsLimit > 0 ? analyticsLimit : 20
    });

    const duration = Date.now() - startTime;
    telemetry.trackApiRequest('/api/bags/refresh', 'POST', 200, duration);
    
    // Log detailed refresh telemetry
    telemetry.trackUserAction('bags.refresh_cycle', {
      durationMs: duration,
      requestsUsed: result.totalExternalRequestsUsed,
      discoveryRefreshed: result.discovery.refreshed,
      scoringRefreshed: result.scoring?.refreshed || false,
      analyticsRefreshed: result.analytics?.refreshed || false
    });

    console.log(`Bags refresh cycle completed in ${duration}ms using ${result.totalExternalRequestsUsed} API calls.`);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        durationMs: duration,
        requestsUsed: result.totalExternalRequestsUsed
      }
    });
  } catch (error) {
    console.error('Bags unified refresh failed:', error);
    telemetry.trackApiRequest('/api/bags/refresh', 'POST', 500, Date.now() - startTime);
    return errorResponse(error);
  }
}
