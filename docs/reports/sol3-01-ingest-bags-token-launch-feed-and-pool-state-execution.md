# SOL3-01 Execution: Bags discovery ingestion

## Summary
Implemented Supabase-backed ingestion for Bags token launch feed and pool state. The cache is refreshed server-side and exposed through a cached discovery API route for downstream scoring and catalog work.

## Files Changed
- `lib/bags/client.ts`
  - Updated discovery response types to match current Bags envelope responses.
  - Normalized token launch feed into `{ launches, total }`.
  - Normalized Bags pool state into `{ pools, total }`.
  - Added `onlyMigrated` support for pool requests.
- `lib/bags/discovery-cache.ts`
  - Added server-only Supabase service-role cache client.
  - Added refresh cadence enforcement.
  - Upserts token launches, pool records, and cache freshness metadata.
  - Reads cached launches and pools with configurable limits.
- `app/api/bags/discovery/route.ts`
  - `GET` returns cached discovery data.
  - `POST` refreshes discovery data and requires a refresh secret in production.
- `supabase-schema.sql`
  - Added `bags_token_launches`, `bags_pools`, and `bags_cache_state`.
- `supabase-rls-policies.sql`
  - Added RLS, public read policies, and service-role write policies for the cache tables.
- `.env.example`
  - Added cache-related server variables.

## Rate Limit Model
- External Bags calls per refresh: 2.
- Default interval: 300000 ms.
- Minimum accepted interval: 60000 ms.
- Maximum calls/hour at minimum interval: 120.
- Bags roadmap limit: 1000 requests/hour.

## Validation
- `npm run lint`
  - Passed with 0 errors and 2 pre-existing warnings.
- `npm run build`
  - Passed.
  - Generated all 11 pages.
  - Registered `/api/bags/discovery` as a dynamic route.

## Follow-On Work
- `SOL3-02`: Build token risk and eligibility scoring from cached launch and pool rows.
- `SOL6-02`: Add scheduled refresh/queue policy and operational backoff.
