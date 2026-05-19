# SOL3-01: Ingest Bags token launch feed and pool state

## Workstream
Bags Discovery & Scoring

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL1-02

## Details
- Objective: Ingest Bags token launch feed and pool state into Supabase for downstream scoring and catalog work
- Acceptance criteria: Launch feed and Bags pool data cached in Supabase with refresh cadence that respects 1000 requests/hour limit
- Execution notes: Implemented a server-only cache refresh path using the existing Bags client and Supabase service-role writes. Cache reads are exposed through a dynamic Next.js API route.

## Checklist
- [x] Verify current Bags API docs for token launch feed and pool state shapes
- [x] Run GitNexus impact analysis before modifying Bags discovery symbols
- [x] Add Supabase cache schema and RLS policies
- [x] Implement server-side cache read and refresh logic
- [x] Add guarded API route for cached discovery data and refresh
- [x] Document required cache environment variables
- [x] Update roadmap and progress docs
- [x] Run lint and build
- [x] Run GitNexus change detection

## Deliverables
- `lib/bags/client.ts`: Updated discovery endpoint types for current Bags API response envelopes
- `lib/bags/discovery-cache.ts`: Server-only Supabase cache reader/writer with refresh cadence enforcement
- `app/api/bags/discovery/route.ts`: Cached discovery read endpoint and guarded refresh endpoint
- `supabase-schema.sql`: Added `bags_token_launches`, `bags_pools`, and `bags_cache_state`
- `supabase-rls-policies.sql`: Added public read and service-role write policies for Bags cache tables
- `.env.example`: Documented `SUPABASE_SERVICE_ROLE_KEY`, `BAGS_CACHE_REFRESH_SECRET`, and `BAGS_DISCOVERY_REFRESH_INTERVAL_MS`

## Validation
- `npm run lint` — 0 errors, 2 pre-existing warnings
- `npm run build` — successful, all 11 pages generated and `/api/bags/discovery` registered as a dynamic route
