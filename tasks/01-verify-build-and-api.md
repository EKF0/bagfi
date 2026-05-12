# Task 01: Verify Build and API Keys

## Status Update (2026-05-12)

### What was checked
1. Attempted `npm install` in agent environment.
2. Reconfirmed lockfile and manifest alignment for wallet dependencies.
3. Confirmed user report: Vercel deploy/install path is now working.

### Findings
- Local agent environment remains blocked by npm registry access (`403 Forbidden` on `wagmi` package fetch).
- Dependency mismatch issue itself is resolved in repository manifests (`wagmi` aligned with RainbowKit peer requirement).
- Because local install is blocked, local lint/build can’t be executed in this environment.

### Li.Fi API key recommendation
- Development: public endpoint is acceptable for prototype work.
- Production: use dedicated Li.Fi key (and optional 1inch fallback), route through server endpoint, and apply request quotas/policies.

### Next action
- Execute `npm install && npm run lint && npm run build` in the unrestricted/Vercel environment.
- If green, mark WS1-03 complete and proceed to WS2-01.
