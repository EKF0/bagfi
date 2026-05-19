# SOL3-03 Execution: Solana Smart Bag catalog and allocation templates

## Summary
Designed and implemented at least three thematic Solana Smart Bag templates with refined allocation targets, risk tiers, and rebalance rules. Expanded the catalog with additional Solana ecosystem tokens (PYTH, DRIFT, JTO, WIF) and verified mint addresses.

## Files Changed
- `lib/smart-bags/catalog.ts`
  - Expanded `SOLANA_TOKENS` with `PYTH`, `DRIFT`, `JTO`, and `WIF` (verified mint addresses).
  - Refined `SMART_BAGS` with three thematic templates:
    - **Solana Blue Chip Bag** (Medium Risk): SOL (40%), JitoSOL (30%), JUP (20%), USDC (10%).
    - **Solana DeFi Growth Bag** (High Risk): JUP (30%), PYTH (20%), DRIFT (20%), SOL (20%), JTO (10%).
    - **Stable Reserve Bag** (Low Risk): USDC (60%), USDT (30%), SOL (10%).
  - Ensure all allocations total 100% (10000 bps).
- `lib/solana/balances.ts`
  - Updated `PRICE_MAP` with the new tokens (`PYTH`, `DRIFT`, `JTO`, `WIF`) using realistic (simulated) prices for UI consistency.

## Verification Results
- **Acceptance Criteria Met**:
  - [x] At least three thematic Bags/Solana baskets designed.
  - [x] Target mints and allocation bps specified.
  - [x] Risk tiers (Low, Medium, High) assigned.
  - [x] Rebalance rules (drift thresholds) established.
  - [x] No fake APY claims.
- **Build & Lint**:
  - `npm run lint`: Passed (0 errors, 2 pre-existing warnings).
  - `npm run build`: Passed (11/11 pages prerendered).

## Recommendations
- The `SOLANA_TOKENS` list should be synchronized with the discovery cache in future tasks to ensure consistency between thematic bags and discovery-driven assets.
- Real-time pricing for the new assets should be integrated once the Jupiter Price API v2 or Bags price feed is implemented.
