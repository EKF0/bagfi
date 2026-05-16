# SOL2-04: Build Smart Bag deposit and rebalance session engine

## Workstream
Bags Trade Engine

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL2-03

## Details
- Objective: Build Smart Bag deposit and rebalance session engine
- Acceptance criteria: Deposits split into target mint allocations with bounded slippage, stored quote snapshots, and signed transaction receipts
- Execution notes: Implemented typed Smart Bag templates, session split logic, quote snapshot capture, local session storage, and wallet execution receipt tracking.

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Deliverables
- Created `lib/smart-bags/session-engine.ts` with:
  - Base-unit decimal parsing and formatting
  - Allocation validation for 100% target templates
  - Exact deposit splitting by target mint allocation
  - Smart Bag deposit session, quote snapshot, and receipt types
  - Local session persistence for quote snapshots and signed receipts
- Created `lib/smart-bags/catalog.ts` with Solana-native Smart Bag templates and token metadata
- Updated Smart Bag catalog UI to remove stale EVM/ERC-4626 APY assumptions
- Updated `components/bags/deposit-modal.tsx` to:
  - Enforce per-bag slippage caps
  - Prepare quote snapshots through `/api/bags/quote`
  - Create swap transactions through `/api/bags/swap`
  - Simulate each swap before wallet signature
  - Store signed/confirmed receipts locally

## Validation
- `npm install --legacy-peer-deps --no-audit --no-fund` completed successfully
- `npm run lint` passed with existing config warnings only
- `npm run build` passed
- Vercel preview deployment `dpl_EPhoYn9DEcuEiRYeUmqG7ywrAx9m` reached `READY`

## Vercel Deploy Fix
- Latest failed Vercel deployment failed during install with `EBADPLATFORM` for `@next/swc-darwin-arm64`
- Removed `@next/swc-darwin-arm64` from normal dependencies so Vercel Linux builds do not install a macOS-only package
- Removed redundant `npm install` from `vercel.json` `buildCommand`; Vercel already runs `installCommand`, and the second install removed `typescript` before `next.config.ts` loaded
