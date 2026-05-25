import { NextRequest, NextResponse } from 'next/server';
import { listPublicLeaderboardProfiles } from '@/lib/users/profile-repository';
import telemetry from '@/lib/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const profiles = await listPublicLeaderboardProfiles(limit);

    telemetry.trackApiRequest('/api/users/leaderboard', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('User leaderboard read failed:', error);
    telemetry.trackApiRequest('/api/users/leaderboard', 'GET', 500, Date.now() - startTime);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
