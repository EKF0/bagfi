# SOL1-04: Normalize Solana wallet identity across app and database

## Workstream
Solana Foundation

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL1-03

## Details
- Objective: Normalize Solana wallet identity across app and database
- Acceptance criteria: Base58 wallet addresses replace Ethereum address assumptions in user and portfolio flows
- Execution notes: Implementation complete

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Deliverables
- Updated `lib/database.ts`: removed all `.toLowerCase()` calls on wallet addresses (base58 is case-sensitive)
- Updated all components to use `@solana/wallet-adapter-react`:
  - `leaderboard.tsx`: useWallet hook, base58 addresses, proper truncation
  - `pro-dashboard.tsx`: useWallet hook, SOL pricing instead of ETH
  - `swap-terminal.tsx`: Solana tokens (SOL, USDC, USDT, BONK, JUP), VersionedTransaction signing
  - `net-worth.tsx`: Solana chain badge, connect messaging
  - `asset-allocation.tsx`: Solana tokens (SOL, USDC, JUP, BONK)
  - `holdings-table.tsx`: Solana tokens and network
- Updated mock data to use Solana base58 addresses and tokens
- Fixed address truncation for base58 format (slice instead of substring)

## Critical Fix
- **Database case-sensitivity**: Removed `.toLowerCase()` on wallet addresses which would corrupt base58 addresses
