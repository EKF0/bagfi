# SOL2-04 Execution: Smart Bag Deposit and Rebalance Sessions

## Changes
- Added typed Smart Bag session and allocation logic in `lib/smart-bags/session-engine.ts`.
- Added Solana Smart Bag catalog metadata in `lib/smart-bags/catalog.ts`.
- Updated `/bags` copy and Smart Bag cards to use Solana-native target allocation data.
- Reworked the deposit modal into a session flow that prepares allocation splits, captures Bags quote snapshots, creates swap transactions, simulates before signing, and stores receipts.
- Removed the macOS-only `@next/swc-darwin-arm64` package from normal dependencies to fix Vercel Linux install failures.
- Changed `vercel.json` so the build command only runs `npm run build`; dependency installation stays in `installCommand`.

## Validation
- `npm install --legacy-peer-deps --no-audit --no-fund` completed successfully.
- `npm run lint` passed with two existing anonymous default export warnings in config files.
- `npm run build` passed and generated all app routes.
- Vercel preview confirmed the original `EBADPLATFORM` error was gone; a follow-up config fix removed the redundant build-time reinstall that dropped `typescript`.
- Vercel preview `dpl_EPhoYn9DEcuEiRYeUmqG7ywrAx9m` reached `READY`: `https://bagfi-pk6pdm9ug-ehabkhedrfathy-2862s-projects.vercel.app`.

## Notes
- Quote/swap preparation requires a real Bags API key at runtime.
- Durable Smart Bag session tables remain part of SOL6.
