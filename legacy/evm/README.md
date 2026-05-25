# Legacy EVM Contracts & Hardhat Suite

This directory contains the legacy Ethereum Virtual Machine (EVM) smart contracts and testing suite for BagFi.

## ⚠️ Deprecation Status

As of **May 2026**, the BagFi platform has successfully migrated to a **Solana-first, non-custodial** architecture. 
The core automated yield-generating "Smart Bags" are executed directly on the Solana mainnet, leveraging **Bags.fm** proxy layers and the **Jupiter API** for trades and allocations.

As a result:
- The solidity contracts inside this directory are **deprecated** and not used by the production Next.js frontend.
- These contracts are preserved here for historical reference, auditing context, and potential future multi-chain expansions.
- Hardhat tests have been decoupled from the primary CI/CD build pipelines and local launch gates.

---

## 📂 Directory Layout

*   `contracts/` — Legacy ERC-4626 vault and zap-in contracts:
    *   `SmartBagVault.sol` — Standard ERC-4626 portfolio vault.
    *   `BagFiZapper.sol` — 1-click swap and deposit zapper.
*   `test/` — JavaScript Hardhat test suites.
*   `hardhat.config.js` — Hardhat compilation and path configurations.

---

## 🧪 Running EVM Tests

To run the Hardhat test suite, execute the following command from the **root** of the repository:

```bash
npm run test:evm
```

This is a wrapper that executes:
```bash
npx hardhat test --config legacy/evm/hardhat.config.js
```
All relative paths inside `hardhat.config.js` resolve relative to this directory, allowing compilation caches and artifacts to generate cleanly under `legacy/evm/cache/` and `legacy/evm/artifacts/`.
