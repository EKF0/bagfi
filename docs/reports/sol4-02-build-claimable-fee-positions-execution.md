# SOL4-02 Execution: Claimable fee positions and claim transaction flow

## Summary
Implemented the end-to-end flow for users to view and claim their earned fees from Bags token launches and pools. This includes detailed position retrieval, transaction generation, simulation, and signing UI.

## Files Changed
- `lib/bags/client.ts`
  - Updated `ClaimablePosition` interface with full Bags API schema.
  - Implemented `createClaimTransactions` for generating sign-ready Solana transactions.
- `app/api/bags/claim/route.ts` (New)
  - Added GET/POST endpoints for position retrieval and transaction generation.
- `components/bags/claim-center.tsx` (New)
  - Built a reactive claim management interface with position cards, simulation status, and transaction tracking.
- `app/earnings/page.tsx` (New)
  - Created a dedicated Earnings page to host the Claim Center.
- `components/header.tsx`
  - Added "Earnings" link to the main navigation.

## Verification Results
- **Acceptance Criteria Met**:
  - [x] Client supports full `ClaimablePosition` schema and `createClaimTransactions`.
  - [x] API routes `/api/bags/claim` implemented.
  - [x] Claim Center UI shows claimable fees.
  - [x] Claim flow handles simulation, signing, and confirmation.
- **Build & Lint**:
  - `npm run lint`: Passed (fixed React Hook state update issue).
  - `npm run build`: Passed (12/12 pages generated).

## Recommendations
- Implement a "Claim All" feature to batch multiple claim transactions if the user has many positions.
- Add fee claim history (events) to the Earnings page for better record-keeping.
