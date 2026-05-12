# Production Readiness Research (Initial Deep Dive)

## Executive Findings

1. **Dependency graph is currently blocked**: `npm install` fails with a hard peer mismatch between RainbowKit `2.2.10` and Wagmi `3.x`, and also with registry access restrictions in this environment. This blocks build verification until dependency alignment and registry policy are resolved.
2. **Swap flow is prototype-level**: `SwapTerminal` currently calls Li.Fi directly from the browser, uses hardcoded chain/token values, and executes `transactionRequest` without server-side policy or route validation.
3. **Secrets/config safety gaps**: Supabase client is created even with empty env values, and there is no startup config validation layer.
4. **Smart contracts are scaffolded but not production-hardened**: strategy whitelist/permissions and risk controls are minimal; no tests or deployment pipeline are present in the repo.

## Key Risks by Area

| Area | Current State | Risk | Production Expectation |
|---|---|---|---|
| Package compatibility | RainbowKit + Wagmi versions incompatible | Build failures, runtime wallet issues | Pin compatible versions and lockfile refresh |
| Swap execution | Client-side quote+execution, hardcoded route | Wrong-chain tx, user-loss risk | Server-mediated route validation, chain/token selection guardrails |
| Config management | Env vars optional/fallback empty strings | Silent failures in prod | Strict runtime config schema validation |
| Data/backend | Supabase schema exists but no typed client or RLS checks in app | Data exposure or broken writes | Typed DB layer + enforced RLS + migration flow |
| Contract layer | ERC4626 vault skeleton only | Asset safety & governance risk | Audited strategy adapters, pausable controls, test coverage |
| Observability | No structured logging/metrics in repo | Slow incident response | Error tracking, analytics, SLO alerts |

## Recommended Workstreams

- **WS1 — Build & Dependency Stabilization**
- **WS2 — Environment/Secrets Hardening**
- **WS3 — Swap Engine Reliability & Security**
- **WS4 — Data Layer & Supabase Hardening**
- **WS5 — Smart Contract Safety Baseline**
- **WS6 — QA, CI/CD, and Observability**

## Immediate Priority (Task Started)

Start with **WS1** because all feature work depends on deterministic local/CI builds:
- Align RainbowKit/Wagmi/viem versions.
- Regenerate lockfile in a registry-permitted environment.
- Run `npm run build` and `npm run lint` gates.
