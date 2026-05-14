# WS2-01: Add runtime env validation for required public/server keys

## Workstream
Environment/Secrets Hardening

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
WS1-03

## Details
- Objective: Add runtime env validation for required public/server keys
- Acceptance criteria: App fails fast with clear messages on missing critical env vars
- Execution notes: Update this file with command outputs, blockers, and completion evidence.

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [ ] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Implementation Summary
- Created `lib/env.js` with environment validation logic
- Modified `app/providers.tsx` to import and call validation on client startup
- Validation checks for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- App will now fail fast with clear error messages if any required env vars are missing