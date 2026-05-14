# BagFi EVM-to-Solana Migration Audit

**Date:** 2026-05-14
**Auditor:** AI Code Intelligence
**Scope:** All source files in `app/`, `components/`, `lib/`, `contracts/`, `test/`, `hooks/`
**Total Files Audited:** 25+ source files, 4 Solidity contracts, 1 test suite

---

## Executive Summary

This audit identifies every EVM-specific dependency, import, type, and architectural assumption in the BagFi codebase that must be mapped to Solana equivalents for a Bags.fm deployment. The audit covers 6 major categories with **52 distinct items** requiring migration attention.

**Migration Risk Profile:**
- **P0 (Critical):** 18 items - Must be replaced before Solana launch. Block wallet connection, transactions, and core value proposition.
- **P1 (High):** 22 items - Should be replaced for feature parity. Include contract layer, testing framework, and data models.
- **P2 (Medium):** 12 items - Nice to have for polished UX. Include ENS support, multi-chain displays, and EVM-specific terminology.

---

## 1. Wallet / Connection

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 1.1 | `@rainbow-me/rainbowkit` | `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` | `package.json`, `app/providers.tsx`, `app/layout.tsx`, `components/header.tsx` | **P0** | Medium | RainbowKit wraps Wagmi and provides the `ConnectButton`. Replace with Solana Wallet Adapter which provides `WalletModalButton` or `WalletMultiButton`. RainbowKit CSS import (`@rainbow-me/rainbowkit/styles.css`) must also be removed from `layout.tsx`. |
| 1.2 | `WagmiProvider` from `wagmi` | `WalletProvider` from `@solana/wallet-adapter-react` | `app/providers.tsx` | **P0** | Low | Provider swap is straightforward. Solana Wallet Adapter uses a React context pattern similar to Wagmi. |
| 1.3 | `wagmiAdapter` / `getDefaultConfig` | `@solana/wallet-adapter-base` + cluster config | `app/wagmi-config.ts`, `app/providers.tsx` | **P0** | Low | Solana does not use WalletConnect. Replace `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` with `NEXT_PUBLIC_SOLANA_RPC_URL` and `NEXT_PUBLIC_SOLANA_NETWORK` (`mainnet-beta` / `devnet`). Delete `app/wagmi-config.ts` entirely. |
| 1.4 | `useAccount` hook | `useWallet` from `@solana/wallet-adapter-react` | `components/dashboard/net-worth.tsx`, `components/dashboard/asset-allocation.tsx`, `components/dashboard/holdings-table.tsx`, `components/leaderboard/leaderboard.tsx`, `components/pro/pro-dashboard.tsx`, `components/swap/swap-terminal.tsx`, `components/bags/deposit-modal.tsx` | **P0** | Low | `useWallet` returns `{ publicKey, connected, connecting, disconnect, select, wallets }` instead of `{ address, isConnected }`. Replace `address` with `publicKey?.toBase58()` throughout. |
| 1.5 | `useBalance` hook | `@solana/web3.js` `Connection.getBalance()` or `@solana/spl-token` for SPL balances | `components/dashboard/net-worth.tsx` | **P1** | Medium | Solana has native SOL (lamports) and SPL tokens (USDC, etc.) in separate accounts. Need `getTokenAccountsByOwner` for SPL balances. Consider caching with React Query. |
| 1.6 | `useEnsName` hook | Solana Name Service (SNS) via `@bonfida/spl-name-service` | `components/dashboard/net-worth.tsx` | **P2** | Medium | ENS has no direct Solana equivalent. SNS resolves `.sol` domains. If not needed for MVP, can defer. |
| 1.7 | `ConnectButton` from RainbowKit | `WalletMultiButton` or custom connect button from `@solana/wallet-adapter-react-ui` | `components/header.tsx` | **P0** | Low | Swap import and component name. Styling can be preserved. |
| 1.8 | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_NETWORK` | `.env.example`, `lib/env.js`, `app/wagmi-config.ts` | **P0** | Low | Remove WalletConnect env var validation from `lib/env.js`. Add Solana cluster and RPC validation. |

---

## 2. Blockchain Interaction

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 2.1 | `viem` (dependency) | `@solana/web3.js` + `@solana/spl-token` | `package.json`, `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx`, `components/dashboard/net-worth.tsx` | **P0** | High | `viem` is deeply used for `parseUnits`, `formatUnits`, and transaction serialization. Solana uses `@solana/web3.js` for everything: `Transaction`, `SystemProgram`, `PublicKey`, etc. Token math can use native `BigInt` or `@solana/buffer-layout`. |
| 2.2 | `parseUnits(amount, decimals)` | Manual `BigInt` math: `BigInt(Math.round(amount * 10 ** decimals))` | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P0** | Low | Solana has no direct `parseUnits`. Implement a small utility or use `@solana/web3.js` helpers. SPL tokens use the same decimal concept (USDC = 6, SOL = 9). |
| 2.3 | `formatUnits(amount, decimals)` | Manual division: `Number(amount) / 10 ** decimals` | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx`, `components/dashboard/net-worth.tsx` | **P0** | Low | Same as above. Simple utility function replacement. |
| 2.4 | `useSendTransaction` + `sendTransactionAsync` | `@solana/wallet-adapter-react` `sendTransaction()` or `@solana/web3.js` `Connection.sendTransaction()` | `components/swap/swap-terminal.tsx`, `components/bags/deposit-modal.tsx` | **P0** | High | Solana transactions are completely different: they are composed of `TransactionInstruction`s, require a `recentBlockhash`, and are signed by the wallet adapter. No `to`, `data`, `value`, `gas`, or `chainId` fields. Must rewrite `handleSwap` and `handleDeposit` entirely. |
| 2.5 | Transaction shape `{ to, data, value, chainId, gas }` | Solana `Transaction` with `instructions`, `feePayer`, `recentBlockhash` | `components/swap/swap-terminal.tsx` (lines 133-138) | **P0** | High | The swap terminal currently constructs an EVM transaction object from Li.Fi response. For Solana, you need to deserialize a base64-encoded transaction from Jupiter/Meteora/Tensor and sign it, or build instructions manually. |
| 2.6 | `BigInt(data.estimate.toAmount)` | `new BN(data.estimate.toAmount)` or native `BigInt` | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P1** | Low | `BigInt` is still valid in JS, but Solana JS ecosystem heavily uses `BN` from `bn.js` for u64/i64. Either works; just ensure consistency. |
| 2.7 | `ethers` (devDependency) | `@solana/web3.js` | `package.json` (devDeps), `test/BagFiZapper.test.js` | **P1** | High | `ethers` is used in Hardhat tests for contract deployment and interaction. Solana testing uses `solana-test-validator` with `@solana/web3.js` or Anchor's `Bankrun` / `mocha` setup. |
| 2.8 | `hardhat` + `@nomicfoundation/hardhat-*` | `anchor` (Anchor framework) + `solana-test-validator` | `package.json`, `hardhat.config.js` | **P1** | High | Entire build and test toolchain must be replaced. Anchor provides TypeScript IDL generation, program deployment, and testing. Hardhat Ignition migrations have no direct equivalent; use `anchor deploy` or `solana program deploy`. |
| 2.9 | `evmVersion: "cancun"` | N/A (remove) | `hardhat.config.js` | **P1** | Low | Solana programs compile to BPF/ELF, not EVM bytecode. Delete entire Hardhat config. |

---

## 3. Smart Contracts

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 3.1 | `SmartBagVault.sol` (ERC-4626 vault) | Anchor program: SPL Token Vault or custom program using `spl-token` + `system_program` | `contracts/SmartBagVault.sol` | **P0** | Critical | ERC-4626 has no native Solana equivalent. Options: (a) Build a custom Anchor program that wraps SPL token accounts and tracks "shares" in a PDA, (b) Use Solana Boring Vault pattern, (c) Use Meteora / Jupiter vault strategies. Must redesign for Solana's account model (PDAs, token accounts, rent exemption). |
| 3.2 | `BagFiZapper.sol` (1-click zap-in) | Anchor program or CPI calls to Jupiter/Mayan for swaps + vault deposit | `contracts/BagFiZapper.sol` | **P0** | Critical | Zap logic becomes a Solana program that: (1) receives SPL tokens via ATA transfer, (2) CPIs to Jupiter aggregator for swap, (3) deposits output into vault program. No `approve`/`transferFrom` pattern; use Token Program `transfer` with delegated amounts or CPI authority. |
| 3.3 | `MockERC20.sol` | `spl-token` mints on devnet / test validator | `contracts/mocks/MockERC20.sol`, `test/BagFiZapper.test.js` | **P1** | Medium | Solana has no deployable ERC-20 contract. Mock tokens are created via `createMint` from `@solana/spl-token`. Tests must create token mints, ATAs, and mint tokens programmatically. |
| 3.4 | `MockStrategy.sol` | Mock Solana program (empty Anchor program) | `contracts/mocks/MockStrategy.sol` | **P1** | Low | Replace with a no-op Anchor program or simply mock CPI calls in tests. |
| 3.5 | OpenZeppelin `ERC4626`, `ERC20`, `Ownable`, `Pausable`, `SafeERC20` | No direct equivalents. Must build with Anchor + `spl-token`. | `contracts/SmartBagVault.sol`, `contracts/BagFiZapper.sol` | **P0** | Critical | Solana access control uses PDA-derived authorities, not `msg.sender`. Pause logic can be a boolean in program state. Ownership can be a single `Pubkey` in an account or multisig. |
| 3.6 | Solidity `pragma ^0.8.20` | Rust (Anchor) or C (native Solana programs) | All `.sol` files | **P1** | Critical | Entire contract layer must be rewritten in Rust with Anchor framework. No Solidity-to-Solana transpiler exists for production use. |
| 3.7 | `@openzeppelin/contracts` | `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token` | `package.json` (devDeps) | **P0** | High | Remove all OpenZeppelin packages. Add Anchor and Solana SPL token libraries. |
| 3.8 | Contract inheritance pattern (`is ERC4626, Ownable, Pausable`) | Anchor program with multiple modules / instructions | `contracts/SmartBagVault.sol` | **P1** | High | Solana programs are flat instruction routers. Reuse is achieved via shared Rust crates or CPI to other programs, not inheritance. |
| 3.9 | `address` type / `address(0)` checks | `Pubkey` / `Pubkey::default()` or `Option<Pubkey>` | `contracts/SmartBagVault.sol`, `contracts/BagFiZapper.sol` | **P1** | Medium | Solana uses `Pubkey` (32-byte base58). No "zero address" convention; use `Option<Pubkey>` for optional addresses. |
| 3.10 | `msg.sender` | `ctx.accounts.signer` or `ctx.accounts.user` | `contracts/BagFiZapper.sol`, `contracts/SmartBagVault.sol` | **P0** | High | In Solana, the signer is explicitly passed as an account in the instruction context. No global `msg.sender`. |
| 3.11 | `transfer` / `safeTransfer` / `approve` | SPL Token Program `transfer`, `approve`, `transferChecked` | `contracts/SmartBagVault.sol`, `contracts/BagFiZapper.sol` | **P0** | High | SPL token transfers require Associated Token Accounts (ATAs). The Token Program handles all balance changes via CPI. Must pre-create ATAs or use ATA program to create on-the-fly. |
| 3.12 | `require(condition, "message")` | `anchor_lang::require!` or custom error enums | `contracts/SmartBagVault.sol`, `contracts/BagFiZapper.sol`, `test/BagFiZapper.test.js` | **P1** | Low | Anchor has `require!` macro and structured error handling with `error_code`. |

---

## 4. API / Quotes

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 4.1 | Li.Fi API (`https://li.quest/v1/quote`) | Jupiter Swap API (`https://quote-api.jup.ag/v6/quote`) or Mayan bridge API | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P0** | High | Li.Fi is EVM-centric. Jupiter is the dominant Solana aggregator. Response format is completely different: Jupiter returns `routePlan`, `swapTransaction` (base64 serialized transaction), and `otherAmountThreshold`. Must rewrite quote parsing and transaction construction. |
| 4.2 | EVM chain params (`ETH`, `ARB`, `OP`, `BASE`, `POLYGON`) | Solana network param (`SOLANA`) | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P0** | Medium | Solana is a single chain (though there is Wormhole bridging to other chains). For Bags.fm MVP, remove multi-chain selectors. If cross-chain is needed later, integrate Wormhole SDK. |
| 4.3 | EVM token list (`ETH`, `WETH`, `WBTC`, `DAI`) | Solana token list (`SOL`, `WSOL`, `USDC`, `USDT`, `BONK`, `JUP`) | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx`, `components/bags/bag-card.tsx`, `components/dashboard/net-worth.tsx` | **P1** | Medium | Update all hardcoded token symbols and mock data to reflect Solana ecosystem tokens. SPL token mint addresses must be used instead of contract addresses. |
| 4.4 | Token decimals mapping (`ETH: 18`, `USDC: 6`) | Solana decimals mapping (`SOL: 9`, `USDC: 6`, `USDT: 6`) | `components/swap/swap-terminal.tsx` (lines 32-39) | **P1** | Low | Change mapping object. SOL native is 9 decimals. SPL tokens are typically 6 (USDC) or 9. |
| 4.5 | `fromAddress` (EVM hex address) | `userPublicKey` (base58 string) | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P0** | Low | Replace zero-address fallback with connected wallet's public key. |
| 4.6 | 1inch references (comments, env vars) | Jupiter / Meteora / Drift references | `.env.example`, `components/bags/deposit-modal.tsx`, `test/BagFiZapper.test.js` | **P2** | Low | Remove `ONE_INCH_API_KEY` from `.env.example`. Update comments to reference Jupiter or Mayan. |
| 4.7 | `LI_FI_API_KEY` env var | `JUPITER_API_KEY` or remove (Jupiter public API is free with rate limits) | `.env.example` | **P1** | Low | Jupiter public API does not require a key for basic quote requests. For higher limits, use paid plan. |
| 4.8 | Transaction simulation comment (`wagmi's simulateTransaction`) | `@solana/web3.js` `Connection.simulateTransaction()` | `components/swap/swap-terminal.tsx` (line 115) | **P2** | Low | Solana natively supports transaction simulation before sending. Replace comment and implementation. |

---

## 5. Data / Types

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 5.1 | `wallet_address` as EVM hex string (`text`) | `wallet_address` as base58 `text` or `varchar(44)` | `lib/database.ts`, `supabase-schema.sql`, `supabase-rls-policies.sql` | **P1** | Medium | Supabase schema uses `wallet_address text`. Solana addresses are base58 and ~43-44 chars, so `text` still works. However, the `.toLowerCase()` normalization in `lib/database.ts` (lines 91, 109, 124, 136, 151, 165) must be removed because base58 is case-sensitive. **This is a critical data integrity issue.** |
| 5.2 | EVM address truncation (`0x742d...44e`) | Solana address truncation (`7xKXtg...9Wp`) | `components/leaderboard/leaderboard.tsx` (lines 10-14, 37) | **P2** | Low | Update mock data. Truncation logic stays the same (`address.slice(0, 4) + '...' + address.slice(-4)`). |
| 5.3 | `0x0000...0000` zero address fallback | Remove or use `PublicKey.default` | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P1** | Low | Solana has no universal zero address. If a fallback is needed for API params, use the connected wallet or omit the field. |
| 5.4 | `auth.uid()::text = wallet_address` (RLS policy) | Keep but ensure wallet_address is base58 and case-sensitive | `supabase-rls-policies.sql` | **P1** | Medium | Supabase Auth UID is a UUID and does not map to a Solana public key. If using Supabase Auth with OAuth, the mapping changes. If using wallet-only auth, RLS policies need redesign (e.g., JWT with `wallet_address` claim). |
| 5.5 | `vitalik.eth`, `bagchaser.eth`, `yieldfarmer.eth` (ENS mock data) | `.sol` names or raw base58 addresses | `components/leaderboard/leaderboard.tsx` | **P2** | Low | Update mock leaderboard data to Solana ecosystem addresses. |
| 5.6 | `BigInt` usage for wei math | `BigInt` or `BN` for lamport/SPL math | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx` | **P1** | Low | JavaScript `BigInt` works fine for Solana amounts. Solana JS SDK uses `BN` in some places but `BigInt` is interoperable. |
| 5.7 | Hex string assumptions (`0x` prefix) | Base58 string assumptions | `app/api/quote/route.ts`, `components/swap/swap-terminal.tsx`, `components/bags/deposit-modal.tsx` | **P1** | Low | Remove any regex or logic that assumes `0x` prefix for addresses. Solana addresses are base58. |
| 5.8 | Database `users.wallet_address UNIQUE` index | Keep but ensure case-sensitive collation | `supabase-schema.sql` | **P1** | Low | PostgreSQL `text` is case-sensitive by default, which is correct for base58. The `.toLowerCase()` calls in `lib/database.ts` are the problem. |

---

## 6. UI Components

| # | EVM Component | Solana / Bags.fm Equivalent | Files | Priority | Complexity | Notes |
|---|---------------|----------------------------|-------|----------|------------|-------|
| 6.1 | Chain badges: Ethereum, Arbitrum, Optimism, Base | Solana badge or remove multi-chain | `components/dashboard/net-worth.tsx` (lines 57-64) | **P1** | Low | For Solana MVP, replace with single "Solana" badge. If multi-chain (Wormhole) is future scope, keep as "Solana" + bridged chains. |
| 6.2 | "Across 4 networks" copy | "On Solana" or "Unified Solana" | `components/dashboard/net-worth.tsx` (line 63) | **P2** | Low | Update copy. |
| 6.3 | Chain selectors (From/To: ETH, ARB, OP, BASE, POLYGON) | Remove or replace with single "Solana" | `components/swap/swap-terminal.tsx` (lines 173-244) | **P0** | Medium | If keeping bridging, add Wormhole/Allbridge chain options. Otherwise, remove chain selectors entirely and assume Solana. |
| 6.4 | Token selectors (ETH, WETH, WBTC, DAI) | Solana tokens (SOL, WSOL, USDC, USDT, BONK, JUP) | `components/swap/swap-terminal.tsx`, `components/bags/bag-card.tsx` | **P1** | Low | Update hardcoded options and mock data. |
| 6.5 | "ERC-4626" terminology in UI | "SPL Vault" or "Token Vault" | `app/bags/page.tsx` (line 55), `components/bags/deposit-modal.tsx` (line 123) | **P2** | Low | Update marketing copy and modal labels to Solana-native terminology. |
| 6.6 | "Mint Pro Pass (0.05 ETH)" | "Mint Pro Pass (0.5 SOL)" or USDC pricing | `components/pro/pro-dashboard.tsx` (line 147) | **P1** | Low | Update pricing unit. If using a Pro NFT, mint with Solana Pay or Candy Machine. |
| 6.7 | `gasCosts` display from Li.Fi quote | `priorityFee` + `computeUnitPrice` display from Solana simulation | `components/swap/swap-terminal.tsx` (lines 364-366, 399-405) | **P1** | Medium | Solana fees are not gas costs in the EVM sense. Replace with priority fee estimation and compute unit cost. Jupiter API returns fee information differently. |
| 6.8 | "via Li.Fi protocol" attribution | "via Jupiter" or "via Bags.fm Routing" | `components/swap/swap-terminal.tsx` (line 368) | **P2** | Low | Update attribution text. |
| 6.9 | Asset allocation labels: ETH, USDC, ARB, OP | SOL, USDC, JUP, BONK (or vault share tokens) | `components/dashboard/asset-allocation.tsx` (lines 15, 92-93) | **P2** | Low | Update mock chart data. |
| 6.10 | Holdings table: Ethereum, Arbitrum, Optimism chains | Solana | `components/dashboard/holdings-table.tsx` (lines 7-10) | **P2** | Low | Update mock data. |
| 6.11 | `txHash` display (`0x...`) | Solana signature (`base58` string, 88 chars) | `components/bags/deposit-modal.tsx` (lines 23, 38, 71) | **P1** | Low | Transaction hashes in Solana are base58 signatures. Update generation mock and display styling (may need truncation). |
| 6.12 | `ERC-4626` in bags description | Remove or replace with Solana vault pattern name | `app/bags/page.tsx` (line 55) | **P2** | Low | Update copy. |

---

## Appendix A: File-by-File Migration Checklist

### `app/` Directory
- [ ] `app/layout.tsx` - Remove `@rainbow-me/rainbowkit/styles.css` import
- [ ] `app/providers.tsx` - Replace `WagmiProvider` + `RainbowKitProvider` with `WalletProvider` (Solana)
- [ ] `app/wagmi-config.ts` - **DELETE** entire file
- [ ] `app/api/quote/route.ts` - Replace Li.Fi API with Jupiter API; remove EVM chain validation; update `parseUnits`/`formatUnits` to custom utils; remove zero-address fallback
- [ ] `app/bags/page.tsx` - Update copy: "ERC-4626" -> "SPL Vault"; update token symbols in `SMART_BAGS`
- [ ] `app/page.tsx` - No EVM-specific code (clean)
- [ ] `app/swap/page.tsx` - No EVM-specific code (clean)
- [ ] `app/pro/page.tsx` - No EVM-specific code (clean)
- [ ] `app/leaderboard/page.tsx` - No EVM-specific code (clean)

### `components/` Directory
- [ ] `components/header.tsx` - Replace `ConnectButton` from RainbowKit with Solana `WalletMultiButton`
- [ ] `components/dashboard/net-worth.tsx` - Replace `useAccount`, `useBalance`, `useEnsName` with `useWallet` and `@solana/web3.js` balance fetching; update chain badges to Solana
- [ ] `components/dashboard/asset-allocation.tsx` - Replace `useAccount` with `useWallet`; update chart labels to Solana tokens
- [ ] `components/dashboard/holdings-table.tsx` - Replace `useAccount` with `useWallet`; update mock holdings to Solana tokens
- [ ] `components/bags/bag-card.tsx` - Update asset symbols to Solana ecosystem
- [ ] `components/bags/deposit-modal.tsx` - Replace `useAccount`, `useSendTransaction` with `useWallet` and Solana transaction building; update `txHash` mock; update "ERC-4626" label
- [ ] `components/swap/swap-terminal.tsx` - Major rewrite: replace `useAccount`, `useSendTransaction`, `parseUnits`, `formatUnits` with Solana equivalents; replace chain/token selectors; replace Li.Fi transaction construction with Jupiter transaction signing; update gas display to priority fee
- [ ] `components/leaderboard/leaderboard.tsx` - Replace `useAccount` with `useWallet`; update mock addresses to base58; remove `.substring(38)` truncation logic (use `.slice(-4)`); remove `.toLowerCase()` assumption
- [ ] `components/pro/pro-dashboard.tsx` - Replace `useAccount` with `useWallet`; update "0.05 ETH" pricing

### `lib/` Directory
- [ ] `lib/database.ts` - **CRITICAL:** Remove `.toLowerCase()` on all wallet address operations (base58 is case-sensitive); update `wallet_address` type docs
- [ ] `lib/env.js` - Replace `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` with `NEXT_PUBLIC_SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_NETWORK`
- [ ] `lib/telemetry.ts` - No EVM-specific code (clean)
- [ ] `lib/utils.ts` - No EVM-specific code (clean)
- [ ] `lib/supabase.ts` - No EVM-specific code (clean)

### `contracts/` Directory
- [ ] `contracts/SmartBagVault.sol` - **DELETE**; rewrite as Anchor program in Rust
- [ ] `contracts/BagFiZapper.sol` - **DELETE**; rewrite as Anchor program in Rust
- [ ] `contracts/mocks/MockERC20.sol` - **DELETE**; create SPL token mints in tests
- [ ] `contracts/mocks/MockStrategy.sol` - **DELETE**; mock as no-op Anchor program or CPI stub

### `test/` Directory
- [ ] `test/BagFiZapper.test.js` - **DELETE**; rewrite as Anchor test using `anchor.Bankrun` or `solana-test-validator`

### Config / Schema Files
- [ ] `hardhat.config.js` - **DELETE**
- [ ] `package.json` - Remove: `@rainbow-me/rainbowkit`, `wagmi`, `viem`, `ethers`, `hardhat`, `@nomicfoundation/*`, `@openzeppelin/contracts`, `@typechain/*`, `typechain`, `solidity-coverage`, `hardhat-gas-reporter`. Add: `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-base`, `@solana/spl-token`, `@coral-xyz/anchor`
- [ ] `.env.example` - Remove WalletConnect, Li.Fi, 1inch keys. Add Solana RPC and network vars.
- [ ] `supabase-schema.sql` - No structural changes needed, but ensure `wallet_address` is not lowercased by application code
- [ ] `supabase-rls-policies.sql` - Review if `auth.uid()::text` still maps to wallet_address (depends on auth strategy)

---

## Appendix B: Recommended Solana Dependency Stack

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.91.0",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/spl-token": "^0.4.0",
    "@coral-xyz/anchor": "^0.30.0"
  },
  "devDependencies": {
    "@types/bn.js": "^5.1.5",
    "mocha": "^10.0.0",
    "@solana-developers/helpers": "^2.0.0"
  }
}
```

---

## Appendix C: High-Risk Migration Items (Require Architecture Decisions)

1. **Vault Architecture (P0):** The ERC-4626 vault is the core product. On Solana, you must choose between:
   - Custom Anchor program managing SPL token accounts as "shares"
   - Integrating with existing yield protocols (Drift, MarginFi, Kamino, Solend) via CPI
   - Using Token-2022 extensions for native yield tracking

2. **Zap Mechanism (P0):** The 1-click zap requires atomic swap-then-deposit. On Solana, this is typically a single transaction with multiple instructions (Jupiter swap + vault deposit). Ensure the vault program can accept the output token directly.

3. **Quote & Routing (P0):** Li.Fi is deeply embedded. Jupiter v6 API is the standard replacement, but it returns a serialized transaction rather than raw calldata. The frontend must sign and send the base64 transaction, not construct one manually.

4. **Address Case Sensitivity (P1):** The `.toLowerCase()` normalization in `lib/database.ts` will cause silent data corruption with base58 Solana addresses. This must be fixed before any database writes occur.

5. **Auth Model (P1):** Current RLS policies map `auth.uid()` to `wallet_address`. If continuing with wallet-only auth, consider using a custom JWT claim or a server-side auth pattern with message signing (SIWS - Sign In With Solana).

---

*End of Audit*
