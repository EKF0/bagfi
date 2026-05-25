# BagFi Real-World End-to-End Readiness Guide

Last reviewed: 2026-05-24

## 1. Purpose

This document turns the current BagFi codebase into an actionable real-world launch plan. It covers:

- What the project currently contains.
- Which end-to-end product flows exist.
- Which gaps still block a real production launch with mainnet users and real capital.
- Which tasks are engineering/AI tasks.
- Which tasks must be completed manually by the project owner.
- The exact manual steps needed for each owner task.

This is intentionally operational. It should be used as the launch checklist before opening BagFi to public users.

## 2. Current Project Snapshot

BagFi is a Next.js 15 App Router application focused on Solana-native Smart Bags and Bags.fm integrations. The repo includes:

- Client pages for dashboard, Smart Bags, swap, Pro Analytics, Earnings, Creator Lab, Leaderboard, Terms, and Privacy.
- Server routes for Bags quote, swap, discovery, refresh, claim, partner, and creator operations.
- A server-side Bags API client with retries, rate-limit tracking, and response normalization.
- Supabase SQL schema and RLS policy files.
- Solana wallet adapter setup for Phantom and Solflare.
- Smart Bag catalog and local session engine.
- Vitest coverage for Bags API wrappers, route validation, discovery cache, risk scoring, and session logic.
- Legacy EVM Solidity contracts and Hardhat tests that are no longer aligned with the Solana-first product direction.

GitNexus was refreshed before this review. The refreshed index reported:

- 1,900 nodes
- 2,712 edges
- 26 clusters
- 109 flows

GitNexus route mapping found 11 API routes:

- `/api/quote`
- `/api/bags/quote`
- `/api/bags/swap`
- `/api/bags/discovery`
- `/api/bags/refresh`
- `/api/bags/claim`
- `/api/bags/partner/stats`
- `/api/bags/partner/claim`
- `/api/bags/creator/metadata`
- `/api/bags/creator/launch`
- `/api/bags/creator/fee-share`

## 3. Verification Status From This Review

Commands run on 2026-05-24:

| Gate | Result | Notes |
| --- | --- | --- |
| `npx gitnexus analyze` | Passed | GitNexus index refreshed successfully. |
| `npm run lint` | Passed with warnings | 0 errors, 5 warnings. Warnings are image optimization, anonymous default exports, and one unused eslint-disable. |
| `npm run test:ts` | Passed | 5 test files, 22 tests passed. |
| `npm run build` | Passed | Next build completed, 15 pages generated. |
| `npm run test` | Failed | Hardhat legacy EVM tests: 5 passing, 7 failing. Failures are constructor mismatch, ERC20 allowance/balance issues, and OpenZeppelin Ownable custom error expectation mismatches. |

Build warning to fix before production:

- Next inferred `/Users/ekf/bun.lock` as workspace root instead of this repo because multiple lockfiles exist. Set `outputFileTracingRoot` in `next.config.ts` or remove the unrelated parent lockfile from the deployment context.

## 4. High-Level Readiness Verdict

The web app can build and the Solana/Bags unit tests pass, but the project is not ready for public real-money mainnet launch yet.

The largest blockers are:

1. The standalone swap page still uses the legacy `/api/quote` route, which is EVM/Li.Fi shaped, not the Solana/Bags route. See `components/swap/swap-terminal.tsx:72` and `app/api/quote/route.ts:1`.
2. Smart Bag sessions are still saved to `localStorage`, not the production Supabase session table. See `lib/smart-bags/session-engine.ts:285`.
3. The Supabase schema defines 13 tables, but `lib/database.ts` only types and wraps `users` and `portfolio_snapshots`.
4. Creator metadata says draft persistence is planned but not implemented. See `app/api/bags/creator/metadata/route.ts:62`.
5. Portfolio USD values use a hardcoded price map. See `lib/solana/balances.ts:31`.
6. Telemetry is an in-memory/console logger with Sentry left as a TODO. See `lib/telemetry.ts:4`.
7. Vercel cron is not configured in `vercel.json`. See `vercel.json:1`.
8. README and `.env.example` still contain AI Studio, Gemini, WalletConnect, Li.Fi, and 1inch remnants. See `README.md:5` and `.env.example:1`.
9. Legacy EVM contracts/tests remain and currently fail.
10. Manual infrastructure, legal, partner, domain, monitoring, and mainnet smoke-test work has not been completed.

## 5. Product Areas Reviewed

### 5.1 App Shell and Navigation

Files:

- `app/layout.tsx`
- `app/client-providers.tsx`
- `app/providers.tsx`
- `components/header.tsx`
- `components/footer.tsx`

Current state:

- Root layout wraps the app in Solana wallet providers.
- Providers use `ConnectionProvider`, `WalletProvider`, Phantom, and Solflare.
- Footer links to Terms, Privacy, Smart Bags, Swap, Pro Analytics, Creator Lab, and Earnings.
- Desktop navigation is present.

Remaining work:

- Add a mobile navigation menu. The main navigation is hidden on smaller screens.
- Verify wallet auto-connect behavior in production browsers.
- Replace placeholder social links with real project accounts.
- Confirm brand metadata and OpenGraph images are production-ready.

Manual owner tasks:

1. Choose final brand domain and social handles.
2. Create or reserve the official X/Twitter, GitHub org, and support channel.
3. Decide whether the public app should expose Creator Lab and Partner Center at launch or keep them allowlisted.

### 5.2 Dashboard and Portfolio Balances

Files:

- `app/page.tsx`
- `components/dashboard/net-worth.tsx`
- `components/dashboard/asset-allocation.tsx`
- `components/dashboard/holdings-table.tsx`
- `hooks/use-wallet-balances.ts`
- `lib/solana/balances.ts`

Current state:

- Dashboard reads connected wallet balances from Solana RPC.
- Native SOL and SPL token balances are fetched.
- Known tokens are enriched from the Smart Bag catalog.
- Dust is filtered.
- Balances are sorted by USD value.

Production gap:

- USD prices are hardcoded in `PRICE_MAP`, so dashboard net worth can be wrong in production.

Engineering tasks:

- Replace `PRICE_MAP` with a real price provider.
- Add stale-price detection and fallback behavior.
- Add tests for unknown tokens, missing prices, and RPC failure.
- Add rate-limit handling for balance/price refreshes.

Manual owner tasks:

1. Choose the production price source:
   - Option A: Jupiter Price API.
   - Option B: Helius enriched token API.
   - Option C: Bags.fm source if available for all supported mints.
2. Confirm pricing terms and request limits.
3. Decide whether unknown tokens should show with value `$0`, hidden by default, or shown with a warning.
4. Define supported token list for launch.

### 5.3 Smart Bags

Files:

- `app/bags/page.tsx`
- `components/bags/bag-card.tsx`
- `components/bags/deposit-modal.tsx`
- `lib/smart-bags/catalog.ts`
- `lib/smart-bags/session-engine.ts`

Current state:

- Three Smart Bag templates exist:
  - Solana Blue Chip Bag
  - Solana DeFi Growth Bag
  - Stable Reserve Bag
- Deposit flow splits an input amount by BPS allocation.
- For each non-direct leg, it requests a Bags quote and swap transaction.
- Each swap transaction is simulated before signing.
- Each leg is signed and submitted one by one.
- Receipts are saved locally and wallet balances are refreshed.

Production gaps:

- Sessions are stored in browser `localStorage`, not the Supabase `smart_bag_sessions` table.
- There is no cross-device recovery.
- There is no server-side session audit trail.
- There is no resume flow for a partially completed multi-leg deposit.
- There is no production-grade rebalance flow even though session types include `deposit | rebalance`.
- There is no minimum deposit policy per bag.
- There is no liquidity/route availability pre-check before presenting bags.
- There is no formal asset review process for adding/removing bag assets.

Engineering tasks:

1. Persist Smart Bag sessions in Supabase.
2. Align session status values between TypeScript and SQL. SQL uses `idle`, `depositing`, `confirming`, `success`, `error`; TypeScript uses `draft`, `quoted`, `signing`, `confirmed`, `failed`.
3. Add session resume and cancellation.
4. Add quote expiry handling using `lastValidBlockHeight`.
5. Add deposit minimums and maximums.
6. Add bag availability checks before users can deposit.
7. Add a true rebalance workflow or remove rebalance claims from launch copy.
8. Add transaction links for each confirmed leg.
9. Add end-to-end tests for partial success, rejected wallet signature, expired quote, and failed leg.

Manual owner tasks:

1. Approve launch bag templates.
   - Review each token in `lib/smart-bags/catalog.ts`.
   - Confirm mint addresses.
   - Confirm allocation percentages.
   - Confirm risk tier copy.
   - Confirm max slippage per bag.
2. Decide operational policy for failed multi-leg deposits.
   - Whether the app should stop immediately.
   - Whether users can retry only the failed leg.
   - Whether support should provide manual guidance.
3. Fund a test wallet for mainnet smoke tests.
   - Start with a small SOL amount.
   - Keep enough SOL for fees.
   - Use a separate wallet from treasury/admin wallets.
4. Define the public user warning for Smart Bags.
   - Non-custodial.
   - Volatile assets.
   - Multi-transaction execution risk.
   - No guaranteed rebalance outcome.

### 5.4 Swap Terminal

Files:

- `app/swap/page.tsx`
- `components/swap/swap-terminal.tsx`
- `components/swap/transaction-review-modal.tsx`
- `app/api/quote/route.ts`
- `app/api/bags/quote/route.ts`
- `app/api/bags/swap/route.ts`

Current state:

- There is a Solana-looking swap UI with SOL/USDC/USDT/BONK/JUP selectors.
- There is a proper Bags quote route at `/api/bags/quote`.
- There is a proper Bags swap transaction route at `/api/bags/swap`.
- There is a transaction review modal component that can simulate and sign a serialized Solana transaction.

Production blocker:

- `SwapTerminal` currently calls `/api/quote`, not `/api/bags/quote`.
- `/api/quote` is still EVM/Li.Fi shaped, imports `viem`, validates ETH/ARB/OP/BASE/POLYGON, and calls `https://li.quest/v1/quote`.
- `SwapTerminal` expects `transactionRequest`, while Bags swap route returns `swapTransaction`.
- `SwapTerminal` marks simulation success without calling `simulateTransaction`.
- The transaction review modal exists but is not integrated into the swap terminal.

Engineering tasks:

1. Remove or quarantine `/api/quote`.
2. Update `SwapTerminal` to call `/api/bags/quote`.
3. Convert UI token symbols to Solana mint addresses before requesting quotes.
4. Update quote display to use Bags/Jupiter-style fields:
   - `inputAmount`
   - `outputAmount`
   - `otherAmountThreshold`
   - `slippageBps`
   - `priceImpactPct`
   - `routePlan`
5. On swap button click, call `/api/bags/swap`.
6. Open `TransactionReviewModal` with `swapTransaction`.
7. Require actual simulation success before enabling signing.
8. Confirm transaction after send.
9. Trigger dashboard balance refresh after confirmation.
10. Add tests for no route, high price impact, simulation failure, user rejection, and successful send.

Manual owner tasks:

1. Decide whether the standalone swap page should be public at launch.
2. Choose supported token pairs.
3. Set maximum allowed slippage defaults.
4. Set maximum allowed price impact before hard block.
5. Write user-facing copy for route unavailability and high impact warnings.

### 5.5 Bags Discovery, Risk Scoring, and Analytics

Files:

- `app/api/bags/discovery/route.ts`
- `app/api/bags/refresh/route.ts`
- `lib/bags/discovery-cache.ts`
- `lib/bags/risk-scoring.ts`
- `components/pro/bags-analytics.tsx`
- `components/pro/pro-dashboard.tsx`

Current state:

- Discovery cache tables are defined.
- Refresh endpoint exists.
- Refresh authorization uses `BAGS_CACHE_REFRESH_SECRET`.
- Risk scoring exists for token launches.
- Pro Dashboard and Bags Analytics read cached discovery data.

Production gaps:

- `vercel.json` does not configure cron.
- No external monitoring verifies refresh freshness.
- No runbook exists for Bags rate-limit exhaustion.
- No admin page exists to inspect cache health.
- Some analytics UI still has placeholder history.

Engineering tasks:

1. Add Vercel cron for `/api/bags/refresh`.
2. Add cache freshness endpoint or admin panel.
3. Add alerting for stale `bags_cache_state`.
4. Add alerting for low Bags API remaining limits.
5. Complete analytics history UI or remove placeholder areas.
6. Add integration tests for authorized and unauthorized refresh.

Manual owner tasks:

1. Generate a production refresh secret:
   - Run `openssl rand -base64 32`.
   - Save it in a password manager.
   - Add it to Vercel as `BAGS_CACHE_REFRESH_SECRET`.
2. Decide refresh cadence:
   - Recommended launch default: every 5 minutes.
   - Use slower cadence if Bags rate limit is low.
3. Confirm Bags API rate limit with Bags.fm.
4. Decide who receives stale-cache alerts.
5. Create a private operations checklist for manually triggering refresh:
   - Use `POST https://your-domain/api/bags/refresh`.
   - Include `x-bags-cache-secret`.
   - Use `?force=true` only during controlled operations.

### 5.6 Earnings and Fee Claims

Files:

- `app/earnings/page.tsx`
- `components/bags/claim-center.tsx`
- `app/api/bags/claim/route.ts`
- `lib/bags/client.ts`

Current state:

- Connected wallet can fetch claimable positions.
- Claim transaction generation is proxied through `/api/bags/claim`.
- Transactions are simulated, signed, sent, and confirmed.

Production gaps:

- Claim route does not validate the full POST body as strictly as quote/swap routes.
- Claim flow does not track confirmations with telemetry as completely as deposit/partner flow.
- There is no persistence of claim attempts or claim receipts.
- The UI assumes claimable lamports are SOL-like and formats with 9 decimals.
- There is no mainnet claim smoke-test evidence.

Engineering tasks:

1. Add strict claim POST validation.
2. Add telemetry for claim simulation and confirmation.
3. Persist claim receipts or cache updates after successful claim.
4. Confirm token/fee decimals with Bags API response contract.
5. Add tests for invalid fee claimer, missing token mint, and simulation failure.

Manual owner tasks:

1. Identify a real wallet with a small claimable Bags fee position.
2. Run a mainnet claim smoke test.
3. Save the transaction signature in the launch QA record.
4. Confirm the post-claim state updates correctly.
5. Confirm support guidance for failed claim transactions.

### 5.7 Creator Lab

Files:

- `app/creator/page.tsx`
- `components/bags/launch-wizard.tsx`
- `app/api/bags/creator/metadata/route.ts`
- `app/api/bags/creator/launch/route.ts`
- `app/api/bags/creator/fee-share/route.ts`

Current state:

- Creator Lab has a multi-step UI:
  - Metadata
  - Fee Share
  - Preview
  - Launch
  - Success
- Metadata route calls Bags API and returns `metadataUri`.
- Launch route generates a launch transaction.
- Fee share route generates fee-share configuration transactions.

Production gaps:

- Draft save is not implemented despite `bags_creator_drafts` table.
- Inputs need stricter validation:
  - name length
  - symbol format
  - image URL
  - website URL
  - social handles
  - participant wallet addresses
  - participant BPS values
  - initial buy amount
- Fee-share errors are swallowed after launch.
- Launch uses `skipPreflight: true` without an explicit prior simulation step in the UI.
- Creator Lab probably should not be public without abuse controls.
- No moderation or takedown workflow exists for malicious token metadata.

Engineering tasks:

1. Add draft persistence.
2. Add strict server-side validation.
3. Add explicit transaction simulation before token launch signing.
4. Add participant address validation.
5. Add a launch receipt table/update path.
6. Add creator allowlist or feature flag.
7. Add abuse prevention:
   - rate limit metadata creation
   - rate limit launch transaction generation
   - block offensive/impersonation metadata if required
8. Add tests for invalid symbols, over-100% fee share, invalid participant wallet, and fee-share partial failure.

Manual owner tasks:

1. Decide whether Creator Lab launches publicly on day one.
2. If not public, create an allowlist:
   - List wallet addresses.
   - Define approval criteria.
   - Define who can approve.
3. Define token metadata policy:
   - No impersonation.
   - No illegal content.
   - No misleading affiliation claims.
   - No copyrighted brand misuse.
4. Define fee-share support policy:
   - What happens if token launch succeeds but fee-share config fails.
   - Whether BagFi support helps retry.
   - Whether BagFi gives any guarantee.
5. Run one controlled mainnet creator launch with a test token before public launch.

### 5.8 Partner Center

Files:

- `components/pro/partner-center.tsx`
- `app/api/bags/partner/stats/route.ts`
- `app/api/bags/partner/claim/route.ts`

Current state:

- Partner stats route calls Bags API.
- Partner setup/claim route generates transactions.
- Client simulates, signs, sends, and confirms partner transactions.

Production gaps:

- Partner stats caching is not implemented, despite `bags_partner_stats` table.
- Partner routes do not validate wallet addresses as strictly as quote/swap.
- There is no partner entitlement check.
- Partner Center appears in Pro Dashboard for any connected wallet.

Engineering tasks:

1. Add strict validation for partner public keys.
2. Add partner eligibility/allowlist check.
3. Cache partner stats in Supabase.
4. Add telemetry and receipt persistence for partner setup/claim.
5. Add tests for unauthorized partner access and failed setup transactions.

Manual owner tasks:

1. Decide who is a BagFi partner.
2. Create a partner wallet allowlist.
3. Confirm Bags.fm partner program requirements.
4. Define partner support process:
   - setup help
   - failed claim help
   - reporting cadence
5. Decide whether Partner Center is visible to all Pro users or only allowed partners.

### 5.9 Supabase and Data Layer

Files:

- `supabase-schema.sql`
- `supabase-rls-policies.sql`
- `lib/database.ts`
- `lib/supabase.ts`
- `lib/bags/discovery-cache.ts`

Current state:

- SQL defines users, portfolio snapshots, Bags cache tables, scores, analytics, claim events, Smart Bag sessions, fee positions, partner stats, and creator drafts.
- RLS policies exist.
- Discovery cache uses service role writes.

Production gaps:

- `lib/database.ts` only types `users` and `portfolio_snapshots`.
- There are two Supabase clients (`lib/database.ts` and `lib/supabase.ts`), which can drift.
- RLS policies compare `auth.uid()::text` to `wallet_address`; this only works if Supabase auth UID is actually the wallet address or if custom auth is implemented.
- There is no migration runner or migration history.
- There is no seed/backfill script.
- No database backup/restore runbook exists.

Engineering tasks:

1. Generate complete Supabase TypeScript types from the production schema.
2. Replace duplicate Supabase client setup with one typed client module.
3. Decide auth model:
   - no Supabase Auth, service-route-only writes
   - wallet signature login with JWT wallet claim
   - standard Supabase Auth plus wallet profile mapping
4. Rewrite RLS around the chosen auth model.
5. Add migrations instead of one large SQL file.
6. Add database integration tests where possible.
7. Add scripts for schema apply, backup check, and seed data.

Manual owner tasks:

1. Create a production Supabase project.
2. Store the project URL, anon key, service role key, and DB password in a password manager.
3. Run schema in this order:
   - enable required extensions if needed, especially `uuid-ossp` or replace `uuid_generate_v4()`
   - run `supabase-schema.sql`
   - run `supabase-rls-policies.sql`
4. Verify every table exists.
5. Verify RLS is enabled on all private tables.
6. Rotate service role key if it was ever shared in local chat, screenshots, or public logs.
7. Configure backups:
   - daily backups at minimum
   - point-in-time recovery if budget allows
8. Add a monthly restore drill to operations calendar.

### 5.10 Environment and Deployment

Files:

- `.env.example`
- `vercel.json`
- `next.config.ts`
- `package.json`
- `README.md`

Current state:

- Build and install commands exist in `vercel.json`.
- Environment validation checks Supabase, Solana, and Bags variables.
- Production launch guide lists important environment variables.

Production gaps:

- `.env.example` still starts with Gemini/AI Studio variables.
- Deprecated WalletConnect, Li.Fi, and 1inch variables remain.
- README is still AI Studio boilerplate.
- Vercel cron is missing.
- `outputFileTracingRoot` is not configured, causing a build warning due parent lockfile detection.

Engineering tasks:

1. Rewrite README for BagFi.
2. Clean `.env.example`.
3. Add Vercel cron.
4. Add `outputFileTracingRoot` in `next.config.ts`.
5. Add deployment checklist to docs.
6. Add environment variable validation for:
   - `SUPABASE_SERVICE_ROLE_KEY` in routes that write cache
   - `BAGS_CACHE_REFRESH_SECRET` in production
   - optional telemetry DSN when telemetry is enabled
7. Remove unused AI Studio/Gemini references unless the product still needs them.

Manual owner tasks:

1. Create production Vercel project.
2. Set production environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
   - `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
   - `NEXT_PUBLIC_SOLANA_WS_ENDPOINT` if available
   - `BAGS_API_KEY`
   - `BAGS_CACHE_REFRESH_SECRET`
   - `BAGS_DISCOVERY_REFRESH_INTERVAL_MS`
   - `BAGS_SCORING_REFRESH_INTERVAL_MS`
   - `BAGS_SCORING_CANDIDATE_LIMIT`
   - `BAGS_SCORING_PRICE_IMPACT_PROBE_USDC_UNITS`
3. Configure preview environment variables separately.
4. Do not reuse development Supabase keys in production.
5. Confirm Vercel deployment region.
6. Add custom domain.
7. Add DNS records.
8. Confirm HTTPS.
9. Confirm no secret values appear in browser bundles or client logs.

### 5.11 Telemetry, Monitoring, and Incident Response

Files:

- `lib/telemetry.ts`
- `lib/bags/client.ts`
- API route telemetry calls

Current state:

- API requests, Bags requests, Solana simulations, and confirmations are tracked through a custom utility.
- Events are kept in memory and logged in development.

Production gaps:

- No real external telemetry sink is active.
- Sentry integration is a TODO.
- No alerting exists for failed transaction spikes, stale cache, rate-limit exhaustion, or build/deploy failures.
- No incident runbook exists.

Engineering tasks:

1. Add Sentry or equivalent.
2. Add server-side structured logging.
3. Add alert thresholds:
   - Bags API 429 or 5xx spike
   - simulation failure spike
   - stale discovery cache
   - Solana RPC errors
   - refresh cron failure
4. Add dashboard with request rate, error rate, and refresh freshness.
5. Add correlation IDs to user-visible support errors.

Manual owner tasks:

1. Create Sentry project or choose another provider.
2. Add team members and alert recipients.
3. Decide incident severity levels.
4. Create support contact path.
5. Define public incident communication channel.
6. Write escalation contacts:
   - BagFi owner
   - engineering
   - Bags.fm contact
   - RPC provider support
   - Supabase support
   - Vercel support

### 5.12 Security, Compliance, and Legal

Files:

- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `docs/safety-compliance-checklist.md`
- `docs/guardrails.md`

Current state:

- Terms and Privacy pages exist.
- Safety checklist exists.
- Non-custodial disclosures exist in Smart Bags UI.

Production gaps:

- Terms and Privacy are generic and should be reviewed by counsel.
- No explicit jurisdiction, company/entity, governing law, contact email, or data retention policy is present.
- No wallet-signature authentication model has been finalized.
- Creator Lab can produce public token metadata and therefore needs abuse/legal review.
- No sanctions/geoblocking policy is documented.
- No formal security review or external audit evidence exists.

Engineering tasks:

1. Add acceptance modal or persistent acknowledgment for high-risk flows if counsel recommends it.
2. Add privacy controls and retention behavior for wallet-linked data.
3. Add feature flags for Creator Lab and Partner Center.
4. Add abuse reporting endpoint/process if Creator Lab launches publicly.
5. Add security headers and CSP review.
6. Add dependency vulnerability scan in CI.

Manual owner tasks:

1. Hire or consult legal counsel for Terms and Privacy.
2. Decide operating entity and jurisdiction.
3. Add official contact email.
4. Decide whether to block sanctioned jurisdictions or use a compliance vendor.
5. Define data retention period.
6. Define risk disclosures for:
   - Smart Bag deposits
   - standalone swaps
   - creator launches
   - fee claims
7. Decide whether every user must accept Terms before transaction flows.
8. Commission an external security review before public launch with real capital.

### 5.13 Legacy EVM Contracts and Tests

Files:

- `contracts/BagFiZapper.sol`
- `contracts/SmartBagVault.sol`
- `contracts/mocks/*`
- `test/BagFiZapper.test.cjs`
- `test/SmartBagVault.test.cjs`
- `hardhat.config.js`

Current state:

- Legacy Solidity contracts remain in repo.
- Hardhat tests fail.
- Product direction is Solana/Bags-first and non-custodial.

Decision needed:

- Either remove/archive the EVM contract layer from the production repo, or keep it as a separate legacy/experimental package and fix its tests.

Recommended launch path:

- Do not treat EVM contracts as part of the production BagFi Solana launch.
- Move them to `legacy/evm/` or a separate repository if they are not part of the current product.
- Remove Hardhat from required production gates unless the EVM package remains supported.

Manual owner tasks:

1. Decide whether EVM vault/zapper work is still part of BagFi.
2. If no:
   - Approve archive/removal.
   - Remove public references to EVM vaults.
3. If yes:
   - Fund separate audit budget.
   - Define chain support.
   - Fix constructor/test mismatches.
   - Add deployment and verification workflow.

## 6. Remaining Engineering Task Backlog

### P0: Must Complete Before Any Public Mainnet Launch

| ID | Task | Area | Owner |
| --- | --- | --- | --- |
| P0-01 | Replace standalone swap flow with `/api/bags/quote` and `/api/bags/swap`; remove legacy `/api/quote` from public use. | Swap | Engineering |
| P0-02 | Integrate real transaction review modal in swap flow with mandatory simulation. | Swap | Engineering |
| P0-03 | Add strict server validation for claim, partner, and creator routes. | API security | Engineering |
| P0-04 | Persist Smart Bag sessions to Supabase and support partial session recovery. | Smart Bags/Data | Engineering |
| P0-05 | Fix Supabase auth/RLS model for wallet addresses. | Data/Security | Engineering + Owner |
| P0-06 | Replace hardcoded portfolio price map with real price source. | Dashboard | Engineering + Owner |
| P0-07 | Add Vercel cron for `/api/bags/refresh`. | Ops | Engineering + Owner |
| P0-08 | Add production monitoring/alerts. | Ops | Engineering + Owner |
| P0-09 | Clean README and `.env.example` for BagFi production. | Docs/Ops | Engineering |
| P0-10 | Decide and document EVM contract status; remove from launch gates or fix failing tests. | Repo hygiene | Owner + Engineering |
| P0-11 | Complete legal review of Terms, Privacy, and risk disclosures. | Legal | Owner |
| P0-12 | Complete mainnet smoke tests with small funds. | QA | Owner + Engineering |

### P1: Strongly Recommended Before Wider Beta

| ID | Task | Area | Owner |
| --- | --- | --- | --- |
| P1-01 | Add mobile navigation. | UX | Engineering |
| P1-02 | Add Smart Bag minimum/maximum deposit settings. | Product Safety | Engineering + Owner |
| P1-03 | Add feature flags for Creator Lab and Partner Center. | Product Safety | Engineering |
| P1-04 | Add creator allowlist and metadata abuse policy. | Creator Lab | Owner + Engineering |
| P1-05 | Add partner allowlist and entitlement checks. | Partner Center | Owner + Engineering |
| P1-06 | Add e2e tests with Playwright for dashboard, deposit, swap, claim, and creator flows. | QA | Engineering |
| P1-07 | Add cache/admin health page. | Ops | Engineering |
| P1-08 | Replace raw `<img>` usage with `next/image` where appropriate. | Performance | Engineering |
| P1-09 | Add OpenGraph image and SEO metadata. | Brand | Owner + Engineering |
| P1-10 | Add incident runbook. | Ops | Owner + Engineering |

### P2: Post-Launch Hardening

| ID | Task | Area | Owner |
| --- | --- | --- | --- |
| P2-01 | Add advanced portfolio history and daily snapshots. | Dashboard | Engineering |
| P2-02 | Add token/bag performance analytics. | Analytics | Engineering |
| P2-03 | Add support export for failed transaction diagnostics. | Support | Engineering |
| P2-04 | Add admin tooling for bag template changes. | Ops/Product | Engineering |
| P2-05 | Add formal changelog and release notes. | Process | Engineering |

## 7. Manual Owner Task Guide

This section assigns manual work to the project owner and gives exact steps.

### Manual Task A: Production RPC Setup

Owner: Project owner

Why it matters:

- Public Solana RPC endpoints can fail or rate-limit during congestion.
- BagFi transactions need reliable simulation and confirmation.

Steps:

1. Choose provider:
   - Helius
   - Triton
   - QuickNode
   - Alchemy Solana
2. Create a production account.
3. Create a mainnet-beta RPC endpoint.
4. Enable WebSocket endpoint if available.
5. Enable enhanced APIs only if the engineering price/indexer work will use them.
6. Copy the HTTPS RPC URL.
7. Copy the WSS endpoint if available.
8. Add to Vercel production:
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
   - `NEXT_PUBLIC_SOLANA_WS_ENDPOINT`
9. Add to Vercel preview separately.
10. Set quota alerts in the RPC provider dashboard.
11. Record support contact and escalation plan.

Acceptance criteria:

- Dashboard balance fetch succeeds.
- Transaction simulation succeeds from production deployment.
- Provider alert emails are received by the owner.

### Manual Task B: Bags.fm Production API Access

Owner: Project owner

Why it matters:

- Quote, swap, discovery, creator, claim, and partner flows depend on Bags API.

Steps:

1. Request or confirm production `BAGS_API_KEY`.
2. Ask Bags.fm for:
   - production rate limits
   - allowed domains
   - expected response schemas for used endpoints
   - support escalation contact
3. Confirm whether BagFi domain must be whitelisted.
4. Add key to Vercel production as `BAGS_API_KEY`.
5. Add a separate key to preview if Bags.fm supports it.
6. Never expose the key as `NEXT_PUBLIC_*`.
7. Ask Bags.fm whether Creator Lab can be public.
8. Ask Bags.fm whether partner routes require partner approval.
9. Save contact and quota details in private operations notes.

Acceptance criteria:

- `/api/bags/quote` works in production.
- `/api/bags/refresh` can ingest data.
- Rate-limit headers appear in logs.

### Manual Task C: Supabase Production Project

Owner: Project owner

Why it matters:

- Discovery caches, sessions, analytics, and user data need a production database.

Steps:

1. Create a new Supabase project.
2. Choose production region near your users and Vercel deployment region.
3. Store these secrets:
   - project URL
   - anon key
   - service role key
   - database password
4. In SQL editor, enable required UUID extension or confirm `uuid_generate_v4()` works.
5. Run `supabase-schema.sql`.
6. Run `supabase-rls-policies.sql`.
7. Verify the 13 expected tables exist.
8. Verify RLS is enabled.
9. Add Vercel env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
10. Create database backup policy.
11. Schedule a restore drill.

Acceptance criteria:

- Discovery refresh writes to Bags cache tables.
- Public cache reads work through `/api/bags/discovery`.
- Private tables cannot be read by another wallet under the finalized auth model.

### Manual Task D: Vercel Production Setup

Owner: Project owner

Steps:

1. Create Vercel project from the GitHub repo.
2. Set framework preset to Next.js.
3. Confirm install command:
   - `npm install --legacy-peer-deps`
4. Confirm build command:
   - `npm run build`
5. Add production environment variables.
6. Add preview environment variables.
7. Add custom domain.
8. Configure DNS.
9. Wait for HTTPS certificate.
10. Deploy production.
11. Check build logs for:
   - no missing env variables
   - no secret leaks
   - no unexpected root inference warning after engineering fixes
12. Enable deployment notifications.

Acceptance criteria:

- Production deploy is green.
- Custom domain resolves over HTTPS.
- Build logs contain no critical warnings.

### Manual Task E: Refresh Cron Setup

Owner: Project owner with engineering support

Steps:

1. Generate secret:
   - `openssl rand -base64 32`
2. Add secret to Vercel:
   - `BAGS_CACHE_REFRESH_SECRET`
3. Engineering adds cron to `vercel.json`, or owner configures an external cron service.
4. Cron request must be:
   - method: `POST`
   - URL: `https://your-domain/api/bags/refresh`
   - header: `x-bags-cache-secret: <secret>`
5. Run manual refresh once.
6. Inspect response:
   - `success: true`
   - `data.discovery`
   - `meta.durationMs`
   - `meta.requestsUsed`
7. Check Supabase `bags_cache_state`.
8. Set alert if refresh has not run in 15 minutes.

Acceptance criteria:

- Cache refresh runs automatically.
- Cache state is fresh.
- Owner receives alert on failed refresh.

### Manual Task F: Legal Review

Owner: Project owner

Steps:

1. Choose legal counsel.
2. Send counsel:
   - current Terms page
   - current Privacy page
   - Smart Bag flow description
   - Swap flow description
   - Creator Lab flow description
   - Claim/Partner flow description
3. Ask for review of:
   - non-custodial disclaimers
   - no financial advice language
   - jurisdiction and governing law
   - data retention
   - risk acknowledgement
   - creator token launch liability
   - sanctions/geofencing obligations
4. Add official company/entity name.
5. Add contact email.
6. Approve final Terms and Privacy copy.
7. Decide whether users must accept Terms before transactions.

Acceptance criteria:

- Counsel-approved Terms and Privacy are deployed.
- User risk acknowledgment policy is documented.

### Manual Task G: Mainnet Smoke Test Wallet

Owner: Project owner

Steps:

1. Create a fresh test wallet.
2. Store seed phrase securely.
3. Fund it with a small amount of SOL.
4. Add small test amounts of supported tokens if needed.
5. Do not use treasury or personal high-value wallet.
6. Use this wallet for:
   - dashboard balance check
   - standalone swap smoke test
   - Smart Bag deposit smoke test
   - claim smoke test
   - creator launch smoke test if approved
7. Save every transaction signature in a QA record.

Acceptance criteria:

- Test wallet can complete all launch-approved flows.
- Every transaction has a Solscan link.
- Post-transaction dashboard state is correct.

### Manual Task H: Monitoring and Support Setup

Owner: Project owner

Steps:

1. Create Sentry or equivalent monitoring project.
2. Add owner and engineering emails.
3. Configure alert channels:
   - email
   - Slack/Discord if used
4. Define alert thresholds.
5. Create support inbox.
6. Create public status page or public incident post process.
7. Write basic user support templates:
   - failed simulation
   - wallet rejected transaction
   - transaction pending
   - claim failed
   - Smart Bag partial deposit
   - creator fee-share failed
8. Decide response hours and expected support SLA.

Acceptance criteria:

- Alerts reach the owner.
- Support path is visible to users.
- Incident severity process is written.

### Manual Task I: Launch Bag Approval

Owner: Project owner

Steps:

1. Review all launch Smart Bags.
2. Confirm every mint address.
3. Confirm every token is liquid enough for expected deposit sizes.
4. Decide max user deposit size per bag at launch.
5. Decide if high-risk bag should be hidden until beta.
6. Confirm risk copy.
7. Approve final list in writing.

Acceptance criteria:

- Launch bag list is approved.
- Any hidden/beta-only bags are feature flagged or removed from public UI.

### Manual Task J: Creator Lab Launch Decision

Owner: Project owner

Steps:

1. Decide one:
   - public at launch
   - allowlisted beta
   - hidden until later
2. If allowlisted:
   - collect wallet addresses
   - define approval criteria
   - decide who manages the list
3. Define metadata policy.
4. Define abuse report process.
5. Run a controlled test launch.
6. Save launch signature and token mint.

Acceptance criteria:

- Creator Lab visibility matches owner decision.
- Abuse policy exists if public.

### Manual Task K: Partner Center Launch Decision

Owner: Project owner

Steps:

1. Confirm if BagFi has production partner status with Bags.fm.
2. Decide visibility:
   - public Pro users
   - allowlisted partners only
   - hidden until later
3. Create partner allowlist if needed.
4. Test setup with a partner wallet.
5. Test claim with a partner wallet if fees exist.
6. Save transaction signatures.

Acceptance criteria:

- Partner Center does not expose unsupported actions to non-partners.
- At least one partner setup/claim path is verified or intentionally deferred.

### Manual Task L: Domain, Brand, and SEO

Owner: Project owner

Steps:

1. Buy or confirm production domain.
2. Add domain to Vercel.
3. Configure DNS.
4. Create OpenGraph image.
5. Decide title and description.
6. Replace placeholder social links.
7. Create support email.
8. Test link previews on X, Telegram, Discord, and Slack.

Acceptance criteria:

- Domain works.
- Link previews are correct.
- Users can find support contact.

## 8. Real-World End-to-End Flow Requirements

### Flow 1: New User Opens BagFi and Connects Wallet

Required production behavior:

1. User opens production domain.
2. App loads without console errors.
3. User connects Phantom or Solflare.
4. Dashboard fetches wallet balances.
5. Dashboard shows USD values using real price data.
6. Unknown tokens do not break the UI.
7. User can navigate on desktop and mobile.

Required before launch:

- Real RPC configured.
- Real price source configured.
- Mobile nav added or launch accepted as desktop-first.
- Legal/footer links final.

### Flow 2: User Deposits Into a Smart Bag

Required production behavior:

1. User opens Smart Bags.
2. User reviews bag risk, allocation, slippage, and non-custodial disclosure.
3. User enters deposit amount.
4. App validates min/max amount.
5. App prepares allocation splits.
6. App requests Bags quotes for each leg.
7. App creates swap transactions for each leg.
8. App shows quote snapshots, min outputs, price impact, and route.
9. App simulates each transaction.
10. User signs each transaction.
11. App sends and confirms each transaction.
12. App stores session and receipts in Supabase.
13. App refreshes wallet balances.
14. App allows user to resume or retry if a leg fails.

Required before launch:

- Supabase session persistence.
- Partial failure strategy.
- Mainnet smoke test.
- Support template for partial deposits.

### Flow 3: User Uses Standalone Swap

Required production behavior:

1. User opens Swap.
2. User selects input/output tokens.
3. App calls Bags quote route.
4. App shows output, min output, route, slippage, and price impact.
5. User opens review modal.
6. App creates transaction.
7. App simulates transaction.
8. User signs only after successful simulation.
9. App sends and confirms.
10. App refreshes dashboard balances.

Required before launch:

- Replace legacy `/api/quote` usage.
- Remove Li.Fi/EVM route or hide it.
- Integrate review modal.

### Flow 4: Background Discovery and Analytics Refresh

Required production behavior:

1. Cron calls `/api/bags/refresh`.
2. Route validates secret.
3. App refreshes discovery data.
4. App refreshes scores.
5. App refreshes analytics.
6. Supabase cache state is updated.
7. Pro Dashboard reads fresh cache.
8. Alerts fire if refresh fails.

Required before launch:

- Vercel cron configured.
- Production Supabase configured.
- Monitoring configured.

### Flow 5: User Claims Earnings

Required production behavior:

1. User opens Earnings.
2. User connects wallet.
3. App fetches claimable positions.
4. User chooses a claim.
5. App generates claim transaction.
6. App simulates transaction.
7. User signs transaction.
8. App sends and confirms.
9. App refreshes claimable positions.
10. App stores or logs receipt.

Required before launch:

- Mainnet wallet with claimable position for smoke test.
- Strict route validation.
- Receipt/telemetry completion.

### Flow 6: Creator Launches Token

Required production behavior:

1. Creator connects wallet.
2. Creator enters metadata.
3. App validates metadata server-side.
4. App creates metadata URI.
5. App saves draft.
6. Creator configures fee share.
7. App validates participants and total BPS.
8. Creator previews launch.
9. App generates launch transaction.
10. App simulates launch transaction.
11. Creator signs.
12. App confirms launch.
13. App configures fee share.
14. App handles fee-share failure explicitly.
15. App stores launch receipt.

Required before launch:

- Owner decision on public vs allowlist.
- Draft persistence.
- Abuse policy.
- Mainnet controlled test.

### Flow 7: Partner Uses Partner Center

Required production behavior:

1. Partner connects wallet.
2. App verifies partner eligibility.
3. App fetches partner stats.
4. Partner initializes config if needed.
5. App simulates setup transaction.
6. Partner signs setup transaction.
7. Partner claims fees when available.
8. App stores receipts and refreshes stats.

Required before launch:

- Partner allowlist or hide feature.
- Bags.fm partner confirmation.
- Mainnet partner test if applicable.

## 9. Recommended Launch Sequence

### Phase 0: Owner Decisions

Complete before engineering finalization:

1. Domain.
2. RPC provider.
3. Price provider.
4. Public vs allowlisted Creator Lab.
5. Public vs allowlisted Partner Center.
6. Launch Smart Bag list.
7. Legal counsel path.
8. EVM contracts decision.

### Phase 1: Engineering Fixes

Complete P0 engineering tasks:

1. Swap route replacement.
2. Swap review/simulation integration.
3. Supabase session persistence.
4. RLS/auth model.
5. Price provider.
6. Cron.
7. Monitoring.
8. Docs/env cleanup.
9. EVM archive or test fix.

### Phase 2: Production Infrastructure

Owner completes:

1. RPC.
2. Bags API.
3. Supabase.
4. Vercel env.
5. Domain.
6. Monitoring.

### Phase 3: Staging QA

Run:

1. `npm run lint`
2. `npm run test:ts`
3. `npm run build`
4. Relevant EVM test decision gate:
   - if EVM archived, remove from required gate
   - if EVM active, `npm run test` must pass
5. Playwright smoke tests.
6. Manual wallet QA on preview.

### Phase 4: Mainnet Dry Run

Use the test wallet:

1. Connect wallet.
2. Load dashboard.
3. Trigger discovery refresh.
4. Execute one small standalone swap.
5. Execute one small Smart Bag deposit.
6. Claim a small position if available.
7. Run Creator Lab test only if approved.
8. Run Partner Center test only if applicable.
9. Save all transaction signatures.
10. Confirm no critical alerts fire.

### Phase 5: Public Launch

1. Freeze code.
2. Tag release.
3. Deploy production.
4. Run production smoke test.
5. Enable public traffic.
6. Announce only after smoke test passes.

### Phase 6: First 48 Hours

Monitor:

1. Bags API errors.
2. RPC errors.
3. Transaction simulation failure rate.
4. Claim failures.
5. Smart Bag partial deposits.
6. Cron freshness.
7. Supabase errors.
8. Support inbox.

## 10. Current File-Level Issues To Track

| Issue | Evidence | Priority |
| --- | --- | --- |
| Swap terminal calls legacy route | `components/swap/swap-terminal.tsx:72` | P0 |
| Legacy quote route is EVM/Li.Fi | `app/api/quote/route.ts:1` through `app/api/quote/route.ts:64` | P0 |
| Swap simulation is not real in `SwapTerminal` | `components/swap/swap-terminal.tsx:119` | P0 |
| Smart Bag sessions are localStorage-only | `lib/smart-bags/session-engine.ts:285` | P0 |
| Creator draft save is not implemented | `app/api/bags/creator/metadata/route.ts:62` | P0/P1 |
| Hardcoded prices | `lib/solana/balances.ts:31` | P0 |
| Telemetry is not externalized | `lib/telemetry.ts:4` and `lib/telemetry.ts:36` | P0 |
| Vercel cron missing | `vercel.json:1` | P0 |
| README is boilerplate | `README.md:5` | P0 |
| Deprecated env vars remain | `.env.example:1` and `.env.example:76` | P0 |
| Supabase types incomplete | `lib/database.ts:4` through `lib/database.ts:57` vs `supabase-schema.sql:29` through `supabase-schema.sql:224` | P0 |
| Hardhat tests failing | `npm run test` output from 2026-05-24 | P0 decision |

## 11. Definition of Done For Real-World Launch

BagFi is ready for real-world launch only when all of these are true:

1. Next build passes.
2. Lint passes with no production-risk warnings.
3. Vitest passes.
4. EVM test gate is either passing or explicitly removed from production scope.
5. Standalone swap uses Solana/Bags routes only.
6. Smart Bag deposit has production session persistence.
7. Supabase RLS/auth model is verified.
8. Production RPC is configured.
9. Production Bags API key is configured.
10. Production Supabase is configured.
11. Refresh cron is active.
12. Monitoring and alerts are active.
13. Terms and Privacy are approved.
14. Smart Bag templates are owner-approved.
15. Creator Lab and Partner Center visibility decisions are enforced.
16. Mainnet smoke test is complete with saved transaction signatures.
17. Support and incident process exists.

## 12. Immediate Next Steps

Recommended order:

1. Owner decides EVM contract scope.
2. Owner decides Creator Lab and Partner Center visibility.
3. Engineering fixes standalone swap route mismatch.
4. Engineering adds Supabase session persistence and fixes auth/RLS model.
5. Owner provisions RPC, Bags API, Supabase, Vercel, domain, and monitoring.
6. Engineering cleans README, env, cron, and tracing root warning.
7. Owner completes legal review.
8. Team runs staging QA.
9. Owner funds test wallet.
10. Team completes mainnet dry run.

