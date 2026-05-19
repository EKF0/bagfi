# SOL6-03: Add Solana and Bags observability

## Problem
While basic telemetry exists, it doesn't capture the depth of metadata required for diagnosing issues in the Solana/Bags stack. Specifically, we need to track Bags request IDs for debugging, rate limit health for scaling, and confirmation latency for UX monitoring.

## Scope
- Expand `lib/telemetry.ts` with specialized Bags and Solana tracking methods.
- Integrate request ID and rate limit tracking into `lib/bags/client.ts`.
- Integrate simulation logs and compute unit tracking into `transaction-review-modal.tsx`.
- Add confirmation latency and signature tracking to all transaction flows.
- Implement "Quote Age" tracking to identify stale data.

## Dependencies
- `SOL2-03`: Implement Solana transaction review and simulation UX (Completed)

## Acceptance Criteria
- [ ] `lib/telemetry.ts` supports `trackBagsRequest`, `trackSolanaSimulation`, and `trackSolanaConfirmation`.
- [ ] Bags API client emits telemetry for all external calls with request IDs.
- [ ] Swap and Deposit modals track simulation metrics (success, units, logs on failure).
- [ ] Transaction confirmation latency is measured and logged.
- [ ] Build and lint pass.

## Implementation Plan
1.  **Telemetry Service**: Add specialized methods to `lib/telemetry.ts`.
2.  **API Client Integration**: Update `bagsRequest` in `lib/bags/client.ts`.
3.  **Simulation Integration**: Update `transaction-review-modal.tsx` and `deposit-modal.tsx`.
4.  **Confirmation Integration**: Track signatures and confirmation times.
5.  **Quote Tracking**: Log quote age in the swap flow.
6.  **Verification**: Manual verification of console logs and build.
