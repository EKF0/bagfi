# BagFi — Process & Progress Documentation

> **Every agent must read `.AGENTS.md` before working.**

## Project Vision
BagFi is a unified Web3 asset platform that consolidates fragmented crypto portfolios into automated, thematic "Smart Bags" (one-click yield-generating portfolios).

---

## Quick Reference
| Artifact | Path |
|----------|------|
| Agents Guide | `.AGENTS.md` |
| Plan CSV | `docs/production-readiness-plan.csv` |
| Task Files | `tasks/*.md` |
| Research Reports | `docs/reports/*-research.md` |
| Execution Reports | `docs/reports/*-execution.md` |

---

## Current Status (Updated: 2026-05-14)

| Task | Status | Notes |
|------|--------|-------|
| **WS1-01** | ✅ completed | Dependency alignment done |
| **WS1-02** | ✅ completed | Lockfile synced |
| **WS1-03** | ✅ completed | Build + lint verification |
| **WS2-01** | ✅ completed | Runtime env validation added |
| **WS2-02** | ✅ completed | .env.example expanded with Li.Fi/1inch variables |
| **WS3-01** | ✅ completed | Quote retrieval moved to server route |
| **WS3-02** | ✅ completed | Chain/token selectors and slippage/deadline controls added |
| **WS3-03** | ✅ completed | Transaction simulation and explicit risk warnings implemented |
| **WS4-01** | ✅ completed | Typed Supabase client and repository helpers introduced |
| **WS4-02** | ✅ completed | RLS policies audited and enforced for user tables |
| **WS5-01** | ✅ completed | Foundry/Hardhat tests added for vault deposits/withdrawals/strategy ops |
| **WS5-02** | ✅ completed | Pause/guardrails and strategy validation checks added |
| **WS6-01** | ✅ completed | CI workflow created and passing |
| **WS6-02** | ✅ completed | Error tracking and telemetry integrated into swap flow and quote requests |
| **SOL0-01** | ✅ completed | Smart Bag guardrails defined for Bags.fm integration |
| **SOL0-02** | ✅ completed | EVM assumptions audited, 52 items mapped to Solana equivalents |
| **SOL1-01** | ✅ completed | Solana and Bags environment validation added |
| **SOL1-02** | ✅ completed | Typed Bags API client with retries and rate limiting |
| **SOL1-03** | ✅ completed | Solana Wallet Adapter replacing RainbowKit/Wagmi |
| **SOL1-04** | ✅ completed | Solana wallet identity normalized across app and database |

---

## Log

### 2026-05-14 — Agent skill stack installed and roadmap enforcement updated
- Installed official curated Codex skills for Playwright/browser QA, security review/threat modeling, Sentry observability, Vercel deployment, screenshots, and GitHub PR/CI workflows
- Created `docs/reports/agent-skill-stack-research.md` to document the researched skill stack and why duplicate/low-trust marketplace skills were skipped
- Updated `.AGENTS.md` so future agents default to the `SOL0`-`SOL7` Bags/Solana roadmap and load the right skills before research/implementation

### 2026-05-14 — SOL1-04 completed
- Normalized Solana wallet identity across app and database:
  - Fixed critical bug: removed `.toLowerCase()` on base58 wallet addresses in lib/database.ts
  - Updated leaderboard.tsx: useWallet hook, base58 addresses, Solana tokens
  - Updated pro-dashboard.tsx: useWallet hook, SOL pricing instead of ETH
  - Updated swap-terminal.tsx: Solana tokens (SOL, USDC, USDT, BONK, JUP)
  - Updated net-worth.tsx: Solana chain badge, connect messaging
  - Updated asset-allocation.tsx: Solana tokens in chart
  - Updated holdings-table.tsx: Solana tokens and network
- All mock data now uses Solana base58 addresses
- Fixed address truncation for base58 format

### 2026-05-14 — SOL1-03 completed
- Installed Solana wallet adapter packages: @solana/web3.js, @solana/wallet-adapter-react, @solana/spl-token
- Replaced EVM wallet stack with Solana Wallet Standard:
  - app/providers.tsx: ConnectionProvider + WalletProvider (Phantom, Solflare)
  - app/layout.tsx: Solana wallet adapter CSS import
  - components/header.tsx: WalletMultiButton replacing RainbowKit ConnectButton
  - Deleted app/wagmi-config.ts
- Supports auto-connect and cluster configuration via env vars
- Wallet connect/disconnect working with Solana adapters

### 2026-05-14 — SOL1-02 completed
- Created `lib/bags/client.ts` with comprehensive typed Bags API client
- Implemented server-side only wrapper with `x-api-key` authentication
- Added exponential backoff retry logic (3 retries with 1s base delay)
- Rate limit tracking from response headers with warnings when low
- Success/error response normalization with `BagsApiError` class
- Request ID tracking for observability and debugging
- Implemented typed methods for 6 Bags API endpoints:
  - `getTradeQuote` - GET /trade/quote with slippage and route plan
  - `createSwapTransaction` - POST /trade/swap with base64 transaction
  - `getTokenLaunchFeed` - GET /token-launch/feed with pagination
  - `getBagsPools` - GET /solana/bags/pools with APR data
  - `getClaimablePositions` - GET /claimable-positions
  - `healthCheck` - GET /ping for connectivity
- All requests go through single `bagsRequest()` function
- Rate limit utilities: `getRateLimitStatus()`, `isRateLimitLow()`

### 2026-05-14 — SOL1-01 completed
- Updated `.env.example` with Solana and Bags.fm configuration variables
- Added `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_SOLANA_WS_ENDPOINT`
- Added `BAGS_API_KEY` (marked as server-only with security warnings)
- Added optional `SOLANA_INDEXER_URL` and `SOLANA_INDEXER_API_KEY`
- Marked EVM variables (WalletConnect, Li.Fi, 1inch) as deprecated
- Updated `lib/env.js` with comprehensive validation:
  - Validates Solana required vars and network values
  - Validates Bags server-side vars
  - Network value validation (mainnet-beta/devnet/testnet)
  - Security check ensures BAGS_API_KEY never exposed client-side
  - Added `validateServerEnvironment()` for API route usage
- Updated `.env` with test values for development

### 2026-05-14 — SOL0-02 completed
- Created `docs/evm-to-solana-audit.md` with comprehensive migration audit
- Audited 25+ source files across app/, components/, lib/, contracts/, test/
- Identified 52 distinct EVM-specific items requiring migration across 6 categories:
  - Wallet/Connection (8 items): RainbowKit/Wagmi → Solana Wallet Adapter
  - Blockchain Interaction (9 items): viem/ethers → @solana/web3.js
  - Smart Contracts (12 items): Solidity/ERC-4626 → Anchor/Rust programs
  - API/Quotes (8 items): Li.Fi → Jupiter API
  - Data/Types (8 items): EVM hex addresses → base58 Solana addresses
  - UI Components (12 items): Chain badges, token selectors, terminology updates
- Flagged critical data integrity issue: `.toLowerCase()` on wallet addresses in `lib/database.ts` will corrupt base58 addresses
- Documented 5 high-risk architecture decisions requiring team input
- Provided file-by-file migration checklist and recommended Solana dependency stack

### 2026-05-14 — SOL0-01 completed
- Created `docs/guardrails.md` with comprehensive Smart Bag guardrails for Bags.fm integration
- Defined core principles: curated portfolios only, no false APY, user wallet control
- Explicitly marked token launch tooling as non-MVP and separate from Smart Bags
- Established Bags.fm integration boundaries (discovery/trading vs portfolio/execution)
- Created implementation checklists for architecture, UX, data, and safety
- Documented what BagFi does NOT do (launch tokens, custody funds, autonomous trading)

### 2026-05-14 — Bags.fm + Solana transition research and plan
- Created `docs/reports/bags-solana-transition-research.md` with current Bags API, Solana wallet, transaction-safety, and product-guardrail research
- Appended a new SOL0-SOL7 roadmap to `docs/production-readiness-plan.csv` instead of replacing the existing production-hardening plan
- Core direction: keep BagFi as Smart Bags/portfolio automation, use Bags.fm for Solana-native trading/discovery/fee data, and keep token launch features optional and separate

### 2026-05-14 — WS6-01 completed
- Created GitHub Actions CI workflow at `.github/workflows/ci.yml`
- Workflow triggers on push/pull_request to main branch
- Installs dependencies with `npm ci`
- Runs linting with `npm run lint`
- Runs build with `npm run build`
- Runs tests with `npm run test`
- Workflow completes successfully on current codebase
- Fixed wagmi/core module resolution issue by ensuring proper dependency versions
- Added .env file with test values to allow build to succeed

### 2026-05-14 — WS6-02 completed
- Created telemetry service in `lib/telemetry.ts` with Sentry integration
- Integrated telemetry tracking into swap transaction flow
  - Tracks quote requests with chain, token, and amount details
  - Tracks transaction simulations with success/failure status
  - Tracks swap transactions with success/failure and transaction hash
- Integrated telemetry tracking into quote API route
  - Tracks API requests with endpoint, method, status, and duration
  - Tracks quote requests with parameters and success/failure
  - Tracks errors with context for debugging
- All key user flows now emit actionable traces and alerts
- Telemetry is conditional on SENTRY_DSN being configured

### 2026-05-13 — Agent management system created
- Created `.AGENTS.md` — agent guide & management workflow
- Created `docs/reports/` directory for research + execution reports
- Updated progress log with task status table
- Next: Pick the highest-priority pending task (WS1-03), do research, implement

### 2026-05-13 — WS4-02 completed
- Created RLS policies in `supabase-rls-policies.sql` for users and portfolio_snapshots tables
- Enabled Row Level Security on both tables
- Defined policies ensuring users can only access their own data
- Policies cover SELECT, INSERT, UPDATE, and DELETE operations
- Follows principle of least privilege for data access

### 2026-05-13 — WS4-01 completed
- Created typed Supabase client in `lib/database.ts` with proper TypeScript definitions
- Implemented repository helpers for users and portfolio snapshots with type-safe methods
- Updated `components/pro/pro-dashboard.tsx` to use typed database helpers
- Updated `components/leaderboard/leaderboard.tsx` to use typed database helpers
- Eliminated raw any-typed DB calls in UI components
- Follows Supabase best practices for type safety

### 2026-05-13 — WS3-03 completed
- Added explicit risk warnings display showing price impact, fees, gas cost, and slippage tolerance
- Enhanced transaction flow to include simulation step before actual submission
- Improved UI feedback throughout the transaction process
- All risk calculations based on actual Li.Fi API data via server route
- Implements security best practices by validating transaction data before submission

### 2026-05-13 — WS3-02 completed
- Added chain/token selectors for ETH, ARB, OP, BASE, POLYGON chains
- Added token selectors for ETH, USDC, USDT, DAI, WBTC, WETH tokens
- Added slippage tolerance control (0.1% to 50% range)
- Added transaction deadline control (1 to 120 minutes range)
- Added proper validation for all user inputs
- Modified quote fetching to include all new parameters as dependencies
- Updated API call to include slippage parameter
- Added token decimals mapping for different token precisions

### 2026-05-13 — WS3-01 completed
- Created `/app/api/quote/route.ts` server endpoint for quote retrieval
- Moved Li.Fi API call from client-side to server-side
- Added input validation for all parameters (chains, tokens, amounts, addresses)
- Modified `components/swap/swap-terminal.tsx` to call the new server endpoint
- Server endpoint processes Li.Fi response and formats it for client consumption
- Added proper error handling and HTTP status codes
- The app no longer makes direct browser calls to Li.Fi API for swap quotes

### 2026-05-13 — WS2-02 completed
- Expanded .env.example with Li.Fi and 1inch API key variables
- Added clear documentation for each variable's purpose and usage
- Li.Fi API key marked as optional but recommended for production
- 1inch API key marked as optional backup for Li.Fi
- Both variables include links to obtain API keys from respective providers

### 2026-05-13 — WS2-01 completed
- Added runtime environment validation for required public/server keys
- Created `lib/env.js` with validation logic
- Modified `app/providers.tsx` to validate env vars on client startup
- App now fails fast with clear error messages on missing critical env vars

### 2026-05-13 — WS1-03 completed
- Completed build and lint verification
- Created .env file with test values for required environment variables
- Successfully ran `npm run build` after installing dependencies
- Build completed successfully with all pages prerendered as static content

### 2026-05-12 — Initial verification
- WS1-01 completed, WS1-02 completed
- WS1-03 in progress (build/lint blocked in restricted environment)