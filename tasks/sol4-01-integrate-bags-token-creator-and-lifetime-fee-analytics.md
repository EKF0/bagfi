# SOL4-01: Integrate Bags token creator and lifetime fee analytics

## Problem
Users need visibility into token creator reputation and the economic activity (fees) of tokens before investing in Smart Bags. This information is available via the Bags API but not yet integrated into the BagFi data layer or UI.

## Scope
- Integrate 3 new Bags API analytics endpoints into the client.
- Extend the Supabase schema to store analytics and claim history.
- Implement background ingestion for analytics of eligible tokens.
- Add a "Creator & Fee Analytics" section to the Pro Dashboard.

## Dependencies
- `SOL3-01`: Ingest Bags token launch feed and pool state (Completed)

## Acceptance Criteria
- [ ] `lib/bags/client.ts` supports `getTokenLifetimeFees`, `getTokenClaimStats`, and `getTokenClaimEvents`.
- [ ] Supabase schema updated with `bags_token_analytics` and `bags_token_claim_events`.
- [ ] Discovery cache refresh includes analytics ingestion for eligible tokens.
- [ ] Pro Dashboard shows lifetime fees, top claimers, and recent fee claim history for selected tokens.
- [ ] Build and lint pass.

## Research Task
- Verify the exact data shapes of the new endpoints (Done).
- Map BagFi's "Pro Dashboard" layout to accommodate new analytics data.
- Determine the best refresh cadence for analytics (likely slower than pool state).

## Implementation Plan
1.  **Bags Client**: Add the 3 new methods with proper types.
2.  **Database**: Update `supabase-schema.sql` and `supabase-rls-policies.sql`. Apply changes.
3.  **Data Ingestion**: Update `lib/bags/discovery-cache.ts` to fetch and persist analytics.
4.  **API Route**: Update `/api/bags/discovery` or create `/api/bags/analytics`.
5.  **UI**: Build the analytics components in `components/pro/pro-dashboard.tsx`.
6.  **Verification**: Manual QA with mocked/test data.
