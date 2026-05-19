# SOL3-02 Research: Bags token risk and eligibility scoring

## Scope
Implement deterministic scoring for Bags token candidates so downstream Smart Bag catalog work can select only eligible assets.

## Sources Checked
- Bags API Reference: `https://docs.bags.fm/api-reference/introduction`
- Bags token launch feed: `https://docs.bags.fm/api-reference/get-token-launch-feed`
- Bags pools: `https://docs.bags.fm/api-reference/get-bags-pools`
- Bags creator lookup: `https://docs.bags.fm/api-reference/get-token-launch-creators`
- Bags trade quote: `https://docs.bags.fm/api-reference/get-trade-quote`
- Supabase API security/RLS guidance: `https://supabase.com/docs/guides/api/securing-your-api`
- Supabase RLS guidance: `https://supabase.com/docs/guides/database/postgres/row-level-security`

## Findings
- Bags API responses are envelope-shaped with `success` and `response`.
- Current quote responses use `inAmount`, `outAmount`, `minOutAmount`, `priceImpactPct`, and route legs with `venue`/`marketKey`; existing UI code expects normalized `inputAmount`, `outputAmount`, `otherAmountThreshold`, and `swapInfo` route legs.
- Creator analytics are available through `GET /token-launch/creator/v3` and include wallet, provider, provider username, creator/admin flags, and royalty basis points.
- Bags pool state exposes pool keys, including `dammV2PoolKey`, which is a useful MVP liquidity/migration gate when paired with a quote price-impact probe.
- Public Supabase cache/score tables need explicit RLS policies and grants for `anon`/`authenticated` reads; writes should stay service-role only.

## Scoring Model
The MVP scoring model uses deterministic hard gates plus warnings:

- Metadata: token must be launched and include required display/metadata fields.
- Pool/liquidity: token must have cached pool state, a DBC pool key, and migrated DAMM v2 pool key.
- Creator: token must have creator data with a primary creator wallet; missing provider data reduces score.
- Price impact: a 10 USDC quote probe must be available and at or below 5% price impact.

Eligible tokens require no hard rejection reasons and a risk score of at least 70.
