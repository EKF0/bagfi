# SOL6-01: Design Supabase schema for Solana Smart Bags and Bags caches

## Problem
Currently, Smart Bag sessions are stored in `localStorage`, which prevents cross-device persistence and makes the platform less reliable. Furthermore, while many Bags discovery tables have been added, they haven't been formalized into a cohesive schema design with full RLS coverage and indices for production scale.

## Scope
- Formalize the SQL schema for all Bags-related discovery and analytics data.
- Design and add tables for persistent Smart Bag sessions and user fee positions.
- Establish comprehensive RLS policies for both public cache and private user data.
- Ensure all tables have appropriate indices for performance.

## Dependencies
- `SOL1-04`: Normalize Solana wallet identity (Completed)

## Acceptance Criteria
- [ ] SQL schema for `bags_token_launches`, `bags_pools`, `bags_token_scores`, `bags_token_analytics`, and `bags_token_claim_events` formalized.
- [ ] New tables `smart_bag_sessions` and `bags_user_fee_positions` defined.
- [ ] RLS policies established:
  - Discovery/Analytics: Public read, service-role write.
  - Sessions/User Positions: User-private read/write (owner only).
- [ ] All tables have performance indices and foreign key constraints.
- [ ] Build and lint pass.

## Implementation Plan
1.  **Audit Current Schema**: Review existing tables added in previous SOL3/SOL4 tasks.
2.  **Define Session Table**: Create `smart_bag_sessions` with full state tracking.
3.  **Define User Position Cache**: Create `bags_user_fee_positions` for performant earnings views.
4.  **Update SQL Files**: Apply changes to `supabase-schema.sql` and `supabase-rls-policies.sql`.
5.  **Establish RLS**: Add ownership-based policies for private tables.
6.  **Verification**: Manual review of SQL structure and relational integrity.
