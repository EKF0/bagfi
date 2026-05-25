# P0-10 Report: Migrate Legacy EVM Contract Suite to legacy/evm

Date: 2026-05-25
Task ID: P0-10
Area: Repository Hygiene & Smart Contract Engineering

## 1. Executive Summary

This task successfully resolves the repository hygiene gaps surrounding the deprecated Ethereum Virtual Machine (EVM) Solidity contracts. As BagFi has transitioned into a **Solana-first** non-custodial asset platform, the legacy Solidity zappers and vault contracts are no longer utilized by the Next.js production builds. 

To prevent legacy compilation and test failures from blocking automated developer pipelines, CI/CD gates, and local verification runs:
1. We migrated the Solidity contracts, Hardhat configuration, and JavaScript tests into a dedicated subfolder (`legacy/evm/`).
2. We decoupled Hardhat from the default `npm run test` gate, re-routing it to the TypeScript Solana-native **Vitest** test suite.
3. We enabled isolated, self-contained execution of the legacy EVM test suite via a new dedicated command (`npm run test:evm`).

---

## 2. Restructuring Actions

We relocated the following legacy assets into `legacy/evm/`:
- **Contracts**: `contracts/` directory moved to `legacy/evm/contracts/`
- **Configuration**: `hardhat.config.js` moved to `legacy/evm/hardhat.config.js`
- **Tests**: 
  - `test/BagFiZapper.test.cjs` moved to `legacy/evm/test/BagFiZapper.test.cjs`
  - `test/SmartBagVault.test.cjs` moved to `legacy/evm/test/SmartBagVault.test.cjs`

This aligns perfectly with Hardhat's relative resolution mechanics. Because paths inside `legacy/evm/hardhat.config.js` are configured relative to the configuration file, compiler cache and build artifacts will naturally compile under `legacy/evm/cache/` and `legacy/evm/artifacts/` without cluttering the root workspace.

---

## 3. Package & Script Updates

### Scripts Updated
In **[package.json](file:///Users/ekf/Downloads/Projects/bagfi/package.json)**, we updated the test scripts:
```json
"scripts": {
  "test": "vitest run",
  "test:ts": "vitest run",
  "test:evm": "hardhat test --config legacy/evm/hardhat.config.js"
}
```
- Running `npm run test` or `npm test` now executes the Solana Vitest suite directly.
- Running `npm run test:evm` executes the legacy EVM test suite in isolation.

### Documentation Updated
- **[README.md](file:///Users/ekf/Downloads/Projects/bagfi/legacy/evm/README.md) [NEW]**: Created a detailed readme inside the legacy folder detailing the deprecation status, structural directory mapping, and standalone testing steps.
- **[ARCHITECTURE.md](file:///Users/ekf/Downloads/Projects/bagfi/ARCHITECTURE.md)**: Updated testing and tech stack sections to represent the Vitest-first architecture and document the legacy EVM subfolder mapping.

---

## 4. Verification & Validation

- **Primary tests**: Run `npm run test` (which now runs vitest) - **26/26 tests passed** successfully.
- **Lint validation**: Run `npm run lint` - **0 errors**, passed.
- **Next.js compilation**: Run `npm run build` - compiled and optimized successfully.
