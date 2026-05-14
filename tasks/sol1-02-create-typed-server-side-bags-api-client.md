# SOL1-02: Create typed server-side Bags API client

## Workstream
Solana Foundation

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL1-01

## Details
- Objective: Create typed server-side Bags API client
- Acceptance criteria: Bags requests go through one server wrapper with x-api-key auth, success/error normalization, retries, and rate-limit telemetry
- Execution notes: Implementation complete

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Deliverables
- Created `lib/bags/client.ts` with comprehensive Bags API client:
  - Server-side only (validates BAGS_API_KEY on every request)
  - x-api-key authentication header
  - Exponential backoff retry logic (3 retries)
  - Rate limit tracking from response headers
  - Success/error response normalization
  - Typed request/response interfaces for all endpoints
  - Request ID tracking for observability

### Typed API Methods Implemented
1. **getTradeQuote** - GET /trade/quote
   - Input: inputMint, outputMint, amount, slippageBps, userPublicKey
   - Output: routePlan, priceImpact, platformFee, slippageBps

2. **createSwapTransaction** - POST /trade/swap
   - Input: quoteResponse, userPublicKey, wrapAndUnwrapSol, prioritizationFeeLamports
   - Output: base64 swapTransaction, lastValidBlockHeight, computeUnitLimit

3. **getTokenLaunchFeed** - GET /token-launch/feed
   - Input: page, pageSize
   - Output: tokens array with liquidity, marketCap, volume, holders

4. **getBagsPools** - GET /solana/bags/pools
   - Output: pools array with reserves, liquidity, volume, APR

5. **getClaimablePositions** - GET /claimable-positions
   - Input: userPublicKey
   - Output: claimable positions with amounts and USD values

6. **healthCheck** - GET /ping
   - Simple connectivity check

### Error Handling
- `BagsApiError` class with statusCode, code, and requestId
- Automatic retry on 429 (rate limit) and 5xx errors
- Rate limit warnings when remaining < 100
- Request ID tracking for debugging

### Rate Limit Management
- Tracks x-ratelimit-remaining, x-ratelimit-reset, x-ratelimit-limit
- Warns when approaching limit
- `getRateLimitStatus()` and `isRateLimitLow()` utilities
