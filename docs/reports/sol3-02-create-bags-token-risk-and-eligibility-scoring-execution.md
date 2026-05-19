# SOL3-02 Execution: Bags token risk and eligibility scoring

## Summary
Implemented deterministic Bags token scoring and eligible-only discovery filtering. The scoring layer persists cache rows in Supabase and uses server-only Bags API calls for creator data and price-impact probes.

## Files Changed
- `lib/bags/client.ts`
  - Normalized current Bags trade quote envelopes to the app's existing quote shape.
  - Added `slippageMode` support for quote requests.
  - Added `getTokenLaunchCreators`.
- `lib/bags/risk-scoring.ts`
  - Added metadata, pool/liquidity, creator, and price-impact scoring rules.
  - Emits `riskScore`, `riskTier`, `isEligible`, rejection reasons, warnings, and filter details.
- `lib/bags/discovery-cache.ts`
  - Added `bags_token_scores` Supabase types.
  - Added score refresh cadence enforcement.
  - Added score persistence and `eligibleLaunches`.
- `app/api/bags/discovery/route.ts`
  - `GET ?eligibleOnly=true` filters `launches` to scored eligible tokens.
  - `POST ?score=true` refreshes token scores after discovery refresh.
- `supabase-schema.sql`
  - Added `bags_token_scores` and query indexes.
- `supabase-rls-policies.sql`
  - Added score-table RLS, public read policies, and service-role write policies.
- `.env.example`
  - Added scoring cadence, candidate limit, and USDC probe amount configuration.

## Rate Limit Model
- Discovery refresh remains 2 Bags API calls.
- Scoring uses up to 2 Bags API calls per candidate: creator lookup and quote probe.
- Default scoring limit is 20 candidates.
- Default scoring interval is 15 minutes.
- Minimum scoring interval is 5 minutes.
- Maximum scoring use at minimum interval is 480 requests/hour, below the 1000 requests/hour roadmap limit.

## Validation
- `npm run lint`
  - Passed with 0 errors and 2 pre-existing warnings.
- `npm run build`
  - Passed.
  - Generated all 11 pages and the dynamic Bags discovery route.

## Notes
- Live scoring was not executed locally because `.env` contains test Bags/Supabase values.
- `SOL3-03` can now use `eligibleLaunches` or `GET /api/bags/discovery?eligibleOnly=true` to build catalog allocation templates from scored assets only.
