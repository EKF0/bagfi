# SOL3-01 Research: Bags discovery ingestion

## Scope
Implement roadmap task `SOL3-01`: ingest Bags token launch feed and Bags pool state into Supabase with a refresh cadence that stays below the Bags API limit of 1000 requests/hour.

## Sources Checked
- Bags API Reference: `https://docs.bags.fm/api-reference/introduction`
- Bags token launch feed: `https://docs.bags.fm/api-reference/get-token-launch-feed`
- Bags pools: `https://docs.bags.fm/api-reference/get-bags-pools`
- Bags documentation index: `https://docs.bags.fm/llms.txt`
- Supabase API security: `https://supabase.com/docs/guides/api/securing-your-api`
- Supabase RLS: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase changelog, checked for relevant breaking changes: `https://supabase.com/changelog`

## Findings
- Bags API uses `https://public-api-v2.bags.fm/api/v1/` and authenticates with the `x-api-key` header.
- Bags responses are envelope-shaped with `success` and `response`.
- `GET /token-launch/feed` currently returns an array of token launch records under `response`, including `tokenMint`, `status`, social links, signature, account keys, `dbcPoolKey`, and `dbcConfigKey`.
- `GET /solana/bags/pools` currently returns an array of pool records under `response`, including `tokenMint`, `dbcConfigKey`, `dbcPoolKey`, and `dammV2PoolKey`. It supports `onlyMigrated`.
- Supabase public-schema cache tables should have RLS enabled. Public clients need explicit read grants/policies; writes should be reserved for trusted server/service-role jobs.

## Design Decision
Use a server-only Supabase service-role client for cache writes and expose cached rows through a Next.js API route. Keep external Bags calls behind a POST refresh path guarded by `BAGS_CACHE_REFRESH_SECRET` in production.

The default cadence is 5 minutes. The configurable interval is clamped to at least 60 seconds, so the cache refresh makes at most 2 external Bags calls/minute, or 120 requests/hour at the minimum interval.
