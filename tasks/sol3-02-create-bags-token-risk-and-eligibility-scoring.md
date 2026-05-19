# SOL3-02: Create Bags token risk and eligibility scoring

## Workstream
Bags Discovery & Scoring

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
SOL3-01

## Details
- Objective: Create deterministic risk and eligibility scoring for Bags token candidates
- Acceptance criteria: Smart Bag catalog excludes unsafe assets using pool, liquidity, creator, metadata, and price-impact filters
- Execution notes: Implemented cached token score rows and eligible-only discovery reads. Scoring uses Bags creator lookup plus a small USDC quote probe for price-impact/liquidity checks.

## Checklist
- [x] Verify current Bags docs for creator and quote response shapes
- [x] Run GitNexus impact analysis before modifying existing Bags client symbols
- [x] Normalize Bags quote envelopes while preserving current UI-facing quote fields
- [x] Add Bags token creator lookup
- [x] Add risk scoring engine
- [x] Persist risk scores in Supabase
- [x] Add RLS for public reads and service-role writes
- [x] Expose eligible-only discovery data
- [x] Update roadmap and progress docs
- [x] Run lint and build
- [x] Run GitNexus change detection

## Deliverables
- `lib/bags/client.ts`: Quote envelope normalization and `getTokenLaunchCreators`
- `lib/bags/risk-scoring.ts`: Metadata, pool/liquidity, creator, and price-impact risk scoring
- `lib/bags/discovery-cache.ts`: Score refresh, score persistence, and eligible launch filtering
- `app/api/bags/discovery/route.ts`: `eligibleOnly` reads and `score=true` refresh support
- `supabase-schema.sql`: `bags_token_scores`
- `supabase-rls-policies.sql`: public read and service-role write policies for scores
- `.env.example`: scoring cadence and probe amount configuration

## Validation
- `npm run lint` — 0 errors, 2 pre-existing warnings
- `npm run build` — successful, all 11 pages generated
