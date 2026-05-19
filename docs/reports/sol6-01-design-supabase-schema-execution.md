# SOL6-01 Execution: Design Supabase schema for Solana Smart Bags and Bags caches

## Summary
Formalized the Supabase data layer by auditing existing Bags discovery tables and adding new tables for persistent user sessions and fee position caching. Established comprehensive RLS policies and performance indices for all Bags-related data.

## Files Changed
- `supabase-schema.sql`
  - Added `smart_bag_sessions` table for cross-device persistence of deposit/rebalance sessions.
  - Added `bags_user_fee_positions` table for high-performance caching of user earnings.
  - Formalized relationships and indices for all previously added tables (`bags_token_launches`, `bags_pools`, `bags_token_scores`, `bags_token_analytics`, `bags_token_claim_events`).
- `supabase-rls-policies.sql`
  - Established ownership-based RLS policies for `smart_bag_sessions` and `bags_user_fee_positions`.
  - Audited and reinforced public-read/service-role-write policies for all cache tables.

## Schema Overview

### Discovery & Analytics (Public Cache)
- `bags_token_launches`: Metadata for all Bags tokens.
- `bags_pools`: Liquidity pool state (DBC, DAMM v2).
- `bags_token_scores`: Eligibility and risk scoring results.
- `bags_token_analytics`: Lifetime fees and creator distribution.
- `bags_token_claim_events`: Historical fee claim log.

### User Private Data
- `smart_bag_sessions`: Persistent state for multi-step Smart Bag operations.
- `bags_user_fee_positions`: User-specific claimable earnings cache.

## Verification Results
- **Acceptance Criteria Met**:
  - [x] Full Bags data schema formalized.
  - [x] Session and user position tables defined.
  - [x] Ownership-based RLS policies established.
  - [x] Relational integrity and indices verified.
- **Build & Lint**:
  - `npm run lint`: Passed.
  - `npm run build`: Passed.

## Recommendations
- Migrate the `SmartBagSession` engine in `lib/smart-bags/session-engine.ts` to prefer Supabase persistence over `localStorage` when a user is authenticated.
- Implement a background worker or cron job for `SOL6-02` to keep the user fee positions cache updated.
