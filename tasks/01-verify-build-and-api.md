# Task 01: Verify Build and API Keys

## Status Update (2026-05-12)

### What was checked
1. Attempted `npm run build` directly.
2. Attempted dependency installation via `npm install`.
3. Identified compatibility mismatch in wallet stack dependencies.

### Findings
- `npm run build` currently fails because Next.js binary is unavailable before install.
- `npm install` initially failed with peer conflict:
  - `@rainbow-me/rainbowkit@2.2.10` requires `wagmi@^2.9.0`
  - project had `wagmi@^3.6.5`
- After setting `wagmi` to `^2.19.5`, installation is still blocked in this environment by `403 Forbidden` fetching `@wagmi/connectors` from npm registry (policy/access restriction).

### Li.Fi API key recommendation
- For development: public endpoint can work but is rate-limited.
- For real usage: use a dedicated Li.Fi API key (and optional 1inch backup) and route requests through a server endpoint for quota control and policy enforcement.

### Next action
- Re-run `npm install` in an environment with npm registry access (or configured internal mirror), then run `npm run build` to complete verification.
