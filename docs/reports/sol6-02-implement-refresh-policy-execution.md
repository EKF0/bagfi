# SOL6-02 Execution: Implement cache and background refresh policy for Bags data

## Summary
Implemented a centralized refresh coordinator that manages the full Bags data lifecycle (Discovery -> Scoring -> Analytics). Defined explicit freshness policies and created a unified API route for background orchestration and telemetry tracking.

## Files Changed
- `lib/bags/discovery-cache.ts`
  - Added `refreshAllBagsData` coordinator method.
  - Implemented sequential refresh logic that respects dependencies and rate limits.
  - Defined explicit interval constants: Discovery (5m), Scoring (15m), Analytics (30m).
- `app/api/bags/refresh/route.ts` (New)
  - Created a unified POST endpoint for triggering the full refresh cycle.
  - Implemented authorization checks and refresh telemetry.
- `docs/progress.md`
  - Updated with task completion status.

## Refresh Policies

| Data Type | Endpoint Dependencies | Refresh Interval |
| :--- | :--- | :--- |
| **Discovery** | `Feed`, `Pools` | 5 Minutes |
| **Risk Scoring** | `Creators`, `Quote` | 15 Minutes |
| **Analytics** | `Fees`, `ClaimStats`, `Events` | 30 Minutes |

## Verification Results
- **Acceptance Criteria Met**:
  - [x] Centralized `refreshAllBagsData` coordinator implemented.
  - [x] API route `/api/bags/refresh` established and protected.
  - [x] Freshness policies defined and enforced by coordinator.
  - [x] Sequential execution ensures latest discovery data is used for scoring/analytics.
- **Build & Lint**:
  - `npm run lint`: Passed.
  - `npm run build`: Passed (all pages generated).

## Recommendations
- Configure a Vercel Cron job or external health checker to call `POST /api/bags/refresh` every 5 minutes.
- Monitor `bags_cache_state` in Supabase to verify that the expiration logic is performing as expected in production.
