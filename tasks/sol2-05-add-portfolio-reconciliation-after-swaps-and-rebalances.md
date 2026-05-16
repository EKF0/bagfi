# SOL2-05: Add portfolio reconciliation after swaps and rebalances

## Workstream
Bags Trade Engine

## Owner
AI

## Priority
P1

## Status
completed

## Dependencies
SOL2-04

## Details
- Objective: Replace all mock dashboard data with real on-chain wallet balances and auto-refresh after transactions
- Acceptance criteria: Wallet token balances and Smart Bag allocations refresh after confirmed signatures

## Checklist
- [x] Create `lib/solana/balances.ts` — wallet balance fetcher
- [x] Create `lib/stores/balance-store.ts` — Zustand refresh trigger
- [x] Create `hooks/use-wallet-balances.ts` — React hook with auto-refresh
- [x] Update `components/dashboard/holdings-table.tsx` — real balances
- [x] Update `components/dashboard/net-worth.tsx` — real total value
- [x] Update `components/dashboard/asset-allocation.tsx` — dynamic chart
- [x] Update `components/bags/deposit-modal.tsx` — post-tx refresh
- [x] Update `components/bags/bag-card.tsx` — position display
- [x] Build passes
- [x] Lint passes (0 errors)
- [x] No mock data remains

## Deliverables
- `lib/solana/balances.ts`: Fetches native SOL + all SPL tokens via Solana RPC, enriches with catalog metadata, filters dust
- `lib/stores/balance-store.ts`: Zustand store with refreshCounter for cross-component refresh signals
- `hooks/use-wallet-balances.ts`: React hook with auto-fetch on wallet change + Zustand counter subscription
- Dashboard components: All three wired to real data with loading skeletons and empty states
- Deposit modal: Calls `triggerRefresh()` after confirmed session
- Bag card: Shows "Your Position" with actual vs. target allocation and drift indicators

## Validation
- `npm run lint` — 0 errors, 2 pre-existing warnings
- `npm run build` — successful, all 11 pages generated
- `grep MOCK_HOLDINGS components/` — no results
- `grep 12450.75 components/` — no results
