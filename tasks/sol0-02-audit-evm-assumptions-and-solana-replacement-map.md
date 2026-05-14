# SOL0-02: Audit EVM assumptions and Solana replacement map

## Workstream
Bags/Solana Product Alignment

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL0-01

## Details
- Objective: Audit EVM assumptions and create Solana replacement map
- Acceptance criteria: RainbowKit/Wagmi/LiFi/ERC4626 assumptions mapped to Solana wallet/Bags/RPC equivalents
- Execution notes: Comprehensive audit completed and documented

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Deliverables
- `docs/evm-to-solana-audit.md` - Comprehensive audit document covering:
  - 52 distinct EVM-specific items across 6 categories
  - Wallet/Connection (8 items) - RainbowKit → Solana Wallet Adapter
  - Blockchain Interaction (9 items) - viem/ethers → @solana/web3.js
  - Smart Contracts (12 items) - Solidity/ERC-4626 → Anchor/Rust
  - API/Quotes (8 items) - Li.Fi → Jupiter API
  - Data/Types (8 items) - EVM addresses → base58 Solana addresses
  - UI Components (12 items) - Chain badges, token selectors, terminology
  - File-by-file migration checklist
  - Recommended Solana dependency stack
  - 5 high-risk architecture decisions requiring team input

## Critical Findings
1. **lib/database.ts case-sensitivity bug** - `.toLowerCase()` on wallet addresses will corrupt base58 addresses
2. **swap-terminal.tsx requires major rewrite** - EVM transaction construction incompatible with Solana
3. **ERC-4626 vault is core IP** - No native Solana equivalent; requires architectural decision
4. **52 total items requiring migration** - 18 P0 critical, 22 P1 high, 12 P2 medium
