# SOL2-04 Research: Smart Bag Deposit and Rebalance Sessions

## Scope
Build the first Smart Bag session layer for Solana/Bags deposits after SOL2-03 added wallet transaction review.

## Existing System
- Smart Bag cards and deposit modal were UI-only and still referenced EVM/ERC-4626 style copy and invented APY.
- Bags quote and swap transaction server routes already existed at `/api/bags/quote` and `/api/bags/swap`.
- SOL guardrails require explicit allocation targets, bounded slippage, quote snapshots, simulation, and wallet signatures.

## Implementation Direction
- Keep persistence local for SOL2-04 because durable Supabase schema work is scheduled under SOL6.
- Add a typed session engine that can later be moved behind a repository without changing UI semantics.
- Split deposits in base units to avoid decimal drift across target allocations.
- Treat same-mint allocation legs as direct deposits with stored snapshots but no swap transaction.
- Store quote snapshots and transaction receipts in `localStorage` as a bridge until the SOL6 data layer lands.

## Risks
- Real quote and swap calls depend on a valid `BAGS_API_KEY`.
- Multi-leg deposits require multiple wallet signatures until a batch execution route exists.
- Local receipt storage is not durable across devices and should be replaced by Supabase sessions in SOL6.
