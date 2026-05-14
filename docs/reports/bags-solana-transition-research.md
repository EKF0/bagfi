# Bags.fm + Solana Transition Research

Date: 2026-05-14

## Objective

Move BagFi toward a Bags.fm API and Solana-native architecture without breaking the core idea: a unified Web3 asset platform that turns fragmented holdings into automated thematic Smart Bags. The product should not become a generic memecoin launcher. Bags.fm should power Solana-native discovery, trading, pool/fee data, and optional creator tooling while BagFi remains a portfolio, allocation, and execution layer.

## Current Codebase Context

- The app is currently EVM-first: RainbowKit/Wagmi/viem wallet stack, Li.Fi-style quote flow, Ethereum-style addresses, and Solidity ERC-4626 contracts.
- The user-facing shape already matches the intended product: dashboard, holdings, asset allocation, Smart Bag cards, deposit modal, swap terminal, leaderboard, and pro dashboard.
- The main mismatch is infrastructure: Smart Bags are expressed as EVM vault/yield concepts, while Bags.fm is Solana-native and centered on launches, swaps, pool state, creator fees, and claimable positions.

## Bags.fm API Findings

- Base URL: `https://public-api-v2.bags.fm/api/v1/`; health check `https://public-api-v2.bags.fm/ping` returned `{"message":"pong"}` locally.
- Authentication: API key in the `x-api-key` header. API keys are created in the Bags Developer Dashboard and must stay server-side.
- Public key format: Bags docs use Base58 Solana public keys for wallets, mints, and accounts.
- Rate limit: 1,000 requests/hour per user and IP across all API keys; BagFi needs server caching, debounced quotes, and background ingestion.
- Installed SDK target: official setup guide uses `@bagsfm/bags-sdk`, `@solana/web3.js`, and `bs58`. Current npm version checked: `@bagsfm/bags-sdk@1.3.7`.

Relevant endpoint groups:

- Trade: `GET /trade/quote` returns in/out amounts, min output, price impact, slippage bps, route plan, platform fee, transfer fee, and simulated compute units. `POST /trade/swap` turns a quote into a ready-to-sign swap transaction with compute unit and priority fee metadata.
- Token state/discovery: `GET /token-launch/feed`, `GET /solana/bags/pools`, and `GET /solana/bags/pools/token-mint` can populate the Bags token universe and pool metadata.
- Analytics: token creators, lifetime fees, claim stats, and claim events support creator/fee dashboards and risk scoring.
- Fee claiming: claimable positions and claim transaction generation can become a wallet-owned "claim center" flow.
- Token launch and fee share: useful as optional creator tooling, but should not be part of the first Smart Bag investing MVP.

## Solana Ecosystem Direction

- Prefer a Solana-native wallet layer over adapting RainbowKit/Wagmi. The current Solana docs recommend Next.js integration with `@solana/client`, `@solana/react-hooks`, and `@solana/kit`, using Wallet Standard discovery for wallets such as Phantom, Solflare, and Backpack.
- Keep `@solana/web3.js` as a boundary where Bags SDK or serialized `VersionedTransaction` handling requires it. Do not spread web3.js types throughout UI state.
- All signing stays in the user's wallet. The app should never ask for private keys, despite some Bags server-side scripting examples using `PRIVATE_KEY`.
- Preflight/safety: simulate returned transactions with Solana RPC `simulateTransaction`, show quote details and route plan, enforce slippage/price-impact limits, and display last-valid-block-height expiry.
- Default to explicit mainnet-beta handling for Bags interactions because Bags program IDs and pools are mainnet-beta. Use devnet/local only for wallet/provider plumbing and mocked API tests.

Current npm package checks:

- `@solana/client@1.7.0`
- `@solana/react-hooks@1.4.1`
- `@solana/kit@6.9.0`
- `@wallet-standard/app@1.1.0`

## Product Guardrails

- Preserve the "Smart Bags" promise: curated Solana portfolios, allocation targets, drift/rebalance UX, and clear execution receipts.
- Treat Bags-launched tokens as an asset source, not the whole product. Users should choose or inspect themes, risks, and allocations before signing.
- Avoid false APY claims. For Bags-native assets, use realized fees, lifetime fees, price movement, volume/liquidity, and historical basket performance instead of invented yield.
- Keep token launch features behind a separate Creator Lab route. They should be optional, reviewed, and clearly separated from investor Smart Bags.
- No custody and no autonomous mainnet trading in the MVP. Each transaction should require wallet review/signature.

## Recommended Architecture

1. Server-side Bags client
   - Create a typed fetch/SDK wrapper under `lib/bags`.
   - Validate inputs with Base58 public key checks and amount bounds.
   - Attach `x-api-key` only on the server.
   - Normalize Bags success/error envelopes and preserve rate-limit headers.

2. Solana wallet and transaction boundary
   - Replace EVM wallet assumptions with Solana wallet identity.
   - Add Wallet Standard connect/disconnect UI.
   - Deserialize Bags swap/claim transactions client-side, simulate through RPC, request wallet signature, then submit via RPC or Bags `send-transaction`.

3. Smart Bag execution engine
   - Define bag templates as Solana mint allocations.
   - For deposits/rebalances, quote each leg, enforce risk limits, and store a rebalance session.
   - Use sequential signed transactions initially. Consider batched/atomic composition later only after transaction size, LUT, and failure-mode testing.

4. Bags ingestion and scoring
   - Cache launch feed and pool data in Supabase.
   - Add score inputs: pool migration state, liquidity, creator/fee metadata, claim history, suspicious metadata flags, price impact thresholds, token age, and holder concentration if an external indexer is added.

5. Data and observability
   - Extend Supabase schema for Solana wallets, tokens, pools, Smart Bag templates, allocations, rebalance sessions, trade receipts, quote snapshots, and fee-claim records.
   - Use RLS for user-owned data and server-only access for cached market data ingestion.
   - Log Bags request IDs, rate-limit remaining/reset headers, transaction signatures, quote age, and simulation errors.

## Main Risks

- API rate pressure: the Bags limit is too low for uncontrolled live feed/quote polling.
- Quote staleness and Solana blockhash expiry: swap transactions must be signed quickly or regenerated.
- EVM remnants: Ethereum address validation, Wagmi hooks, ERC-4626 copy, and Solidity tests will mislead Solana users if left in active flows.
- Safety perception: Bags token launches are volatile; Smart Bag risk labeling must be stricter than the current mock APY/risk copy.
- Mainnet-only Bags workflows: devnet testing needs mocks and RPC simulation because real Bags pools/program IDs are mainnet-beta.

## Chosen Approach

Append a new Solana/Bags roadmap to the existing CSV instead of replacing the previous production-readiness plan. This keeps historical hardening work visible while creating a new implementation path:

- Phase 0: product guardrails and EVM-to-Solana audit.
- Phase 1: Solana wallet, env, and Bags client foundation.
- Phase 2: Bags trading and Smart Bag execution.
- Phase 3: discovery, scoring, and portfolio data.
- Phase 4: fee/creator features.
- Phase 5: optional Creator Lab.
- Phase 6: Supabase, rate limits, observability.
- Phase 7: testing, security, and launch readiness.

## Source Links

- Bags API introduction: https://docs.bags.fm/api-reference/introduction
- Bags docs index: https://docs.bags.fm/llms.txt
- Bags API key guidance: https://docs.bags.fm/faq/how-to-get-api-key
- Bags rate limits: https://docs.bags.fm/principles/rate-limits
- Bags trade quote: https://docs.bags.fm/api-reference/get-trade-quote
- Bags swap transaction: https://docs.bags.fm/api-reference/create-swap-transaction
- Bags token launch feed: https://docs.bags.fm/api-reference/get-token-launch-feed
- Bags pools: https://docs.bags.fm/api-reference/get-bags-pools
- Bags fee claiming: https://docs.bags.fm/api-reference/get-claimable-positions
- Bags TypeScript setup: https://docs.bags.fm/how-to-guides/typescript-node-setup
- Bags program IDs and LUT: https://docs.bags.fm/principles/program-ids
- Solana Next.js wallet integration: https://solana.com/docs/frontend/nextjs-solana
- Solana simulateTransaction: https://solana.com/docs/rpc/http/simulatetransaction
