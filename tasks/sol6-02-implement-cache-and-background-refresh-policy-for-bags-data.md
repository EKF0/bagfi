# SOL6-02: Implement cache and background refresh policy for Bags data

## Problem
Currently, Bags data refreshes are triggered individually by separate query parameters on a single API route. This is difficult to orchestrate from external background jobs (like Vercel Cron or GitHub Actions) and lacks a unified error handling and reporting mechanism. We need a centralized refresh policy that respects rate limits while keeping the full data stack (Discovery -> Scoring -> Analytics) fresh.

## Scope
- Implement a centralized `refreshAllBagsData` coordinator in the discovery cache layer.
- Define explicit freshness and expiration policies for each data type:
    - Discovery (Feed/Pools): 5 minutes.
    - Risk Scoring: 15 minutes.
    - Analytics (Fees/Creators): 30 minutes.
- Create a dedicated `/api/bags/refresh` route for background orchestration.
- Implement unified logging and telemetry for the refresh cycle.

## Dependencies
- `SOL3-01`: Ingest Bags token launch feed and pool state (Completed)
- `SOL6-01`: Design Supabase schema for Solana Smart Bags and Bags caches (Completed)

## Acceptance Criteria
- [ ] Centralized `refreshAllBagsData` method correctly chains refreshes based on expiration.
- [ ] API route `/api/bags/refresh` implemented and authorized.
- [ ] Telemetry tracks individual and total refresh cycle times.
- [ ] Build and lint pass.

## Implementation Plan
1.  **Coordinator Logic**: Add `refreshAllBagsData` to `lib/bags/discovery-cache.ts`.
2.  **API Route**: Create `app/api/bags/refresh/route.ts`.
3.  **Vercel Configuration**: Update `vercel.json` with a cron schedule (if applicable/allowed).
4.  **Telemetry**: Add tracks for refresh success/failure and latency.
5.  **Verification**: Manual trigger of the refresh cycle and log verification.
