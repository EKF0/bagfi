# SOL4-02: Build claimable fee positions and claim transaction flow

## Problem
Users need a way to view and claim their earned fees from Bags token launches and pools. This requires integrating the detailed claimable positions data and the claim transaction generation endpoint.

## Scope
- Update the Bags API client with the full claimable positions schema.
- Implement the claim transaction generation method in the client.
- Create API routes for retrieving claimable positions and generating claim transactions.
- Build a "Claim Center" UI component for managing fee claims.
- Implement the end-to-end claim flow: Fetch -> Generate -> Simulate -> Sign -> Confirm.

## Dependencies
- `SOL4-01`: Integrate Bags token creator and lifetime fee analytics (Completed)

## Acceptance Criteria
- [ ] `lib/bags/client.ts` supports full `ClaimablePosition` schema and `createClaimTransactions`.
- [ ] API routes `/api/bags/claimable` and `/api/bags/claim` implemented.
- [ ] Claim Center UI shows all tokens with claimable fees.
- [ ] Users can successfully claim fees with wallet signature and confirmation tracking.
- [ ] Build and lint pass.

## Implementation Plan
1.  **Bags Client**: Update `ClaimablePosition` and add `createClaimTransactions`.
2.  **API Routes**: Create endpoints for claim operations.
3.  **UI Components**: Build `ClaimCenter` and individual `ClaimPositionCard`.
4.  **Transaction Flow**: Integrate simulation and confirmation logic similar to the swap flow.
5.  **Integration**: Add access to Claim Center from the Dashboard.
6.  **Verification**: Manual QA with wallet interactions.
