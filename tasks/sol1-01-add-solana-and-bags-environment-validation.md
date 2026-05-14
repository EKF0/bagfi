# SOL1-01: Add Solana and Bags environment validation

## Workstream
Solana Foundation

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL0-02

## Details
- Objective: Add Solana and Bags environment validation
- Acceptance criteria: Server-only BAGS_API_KEY plus RPC, websocket, cluster, and optional indexer keys documented and validated
- Execution notes: Implementation complete

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Deliverables
- Updated `.env.example` with Solana and Bags configuration:
  - `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint
  - `NEXT_PUBLIC_SOLANA_NETWORK` - Cluster (mainnet-beta/devnet/testnet)
  - `NEXT_PUBLIC_SOLANA_WS_ENDPOINT` - Optional WebSocket endpoint
  - `BAGS_API_KEY` - Server-only Bags.fm API key
  - `SOLANA_INDEXER_URL` / `SOLANA_INDEXER_API_KEY` - Optional enhanced indexer
  - Marked EVM vars as deprecated
- Updated `lib/env.js` with:
  - Validation for all Solana required vars
  - Validation for Bags server-side vars
  - Network value validation (mainnet-beta/devnet/testnet)
  - Security check ensuring BAGS_API_KEY is never client-side
  - `validateServerEnvironment()` for API routes
- Updated `.env` with test values for build

## Notes
- Build currently shows RainbowKit errors due to ongoing EVM→Solana migration (pre-existing)
- Environment validation is working correctly
