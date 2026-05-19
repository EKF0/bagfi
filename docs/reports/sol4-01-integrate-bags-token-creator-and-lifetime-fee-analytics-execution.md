# SOL4-01 Execution: Bags token creator and lifetime fee analytics

## Summary
Integrated Bags analytics endpoints for token creators, lifetime fees, and claim history. Expanded the data layer to persist these analytics and added a dedicated "Bags Ecosystem Analytics" section to the Pro Dashboard.

## Files Changed
- `lib/bags/client.ts`
  - Added `getTokenLifetimeFees`, `getTokenClaimStats`, and `getTokenClaimEvents`.
  - Updated `TokenLaunchCreator` interface to support analytics fields.
- `supabase-schema.sql`
  - Added `bags_token_analytics` table for persistent fee and claimer stats.
  - Added `bags_token_claim_events` table for history.
- `supabase-rls-policies.sql`
  - Added public read and service-role management policies for new tables.
- `lib/bags/discovery-cache.ts`
  - Added `refreshBagsTokenAnalytics` method to ingest data for eligible tokens.
  - Updated `getCachedBagsDiscovery` to return analytics and cache state.
- `app/api/bags/discovery/route.ts`
  - Updated `GET` to include analytics in the response.
  - Updated `POST` with `analytics=true` flag to trigger analytics refresh.
- `components/pro/bags-analytics.tsx` (New)
  - Created a comprehensive analytics dashboard component showing fees, distributions, and history.
- `components/pro/pro-dashboard.tsx`
  - Integrated `BagsAnalytics` and added eligible mints fetching.

## Verification Results
- **Acceptance Criteria Met**:
  - [x] Client supports all 3 new endpoints.
  - [x] Supabase schema and RLS policies updated.
  - [x] Background ingestion logic implemented for eligible tokens.
  - [x] Pro Dashboard displays analytics for selected Bags tokens.
- **Build & Lint**:
  - `npm run lint`: Passed (with minor dynamic image warnings).
  - `npm run build`: Passed (all pages generated).

## Recommendations
- Add a dedicated API route or getter for claim events to allow pagination and better history display.
- Synchronize analytics refresh with the discovery scoring cadence for better consistency.
