# SOL6-03 Execution: Add Solana and Bags observability

## Summary
Significantly enhanced the platform's observability by implementing granular telemetry for all Solana and Bags-specific operations. Expanded the telemetry service and integrated detailed tracking for API requests, transaction preflights (simulations), and network confirmations.

## Files Changed
- `lib/telemetry.ts`
  - Added `trackBagsRequest`: Captures method, status, duration, request ID, and rate limit health.
  - Added `trackSolanaSimulation`: Captures success/failure, compute units used, and execution logs (last 10 on failure).
  - Added `trackSolanaConfirmation`: Captures signature, latency, final status (confirmed/finalized/failed), and explorer URLs.
- `lib/bags/client.ts`
  - Integrated `trackBagsRequest` into the core `bagsRequest` wrapper.
  - Every external API call now emits a trace with a unique request ID and duration.
- `components/swap/transaction-review-modal.tsx`
  - Replaced basic simulation tracking with `trackSolanaSimulation` (capturing CU and logs).
  - Implemented `trackSolanaConfirmation` to measure end-to-end transaction latency.
- `components/bags/deposit-modal.tsx`
  - Integrated `trackSolanaSimulation` and `trackSolanaConfirmation` for every leg of a multi-step Smart Bag deposit.
  - Added session-level logging for success/failure of complex execution flows.
- `app/api/bags/refresh/route.ts`
  - Added `bags.refresh_cycle` telemetry to track background maintenance health and API consumption.

## Key Metrics Captured

| Metric | Source | Purpose |
| :--- | :--- | :--- |
| **Bags Request ID** | `lib/bags/client.ts` | Trace backend logs for specific user failures. |
| **Rate Limit Status** | `lib/bags/client.ts` | Monitor API health and trigger alerts before exhaustion. |
| **Compute Units (CU)** | `Transaction Modals` | Optimize transaction priority fees and detect heavy instructions. |
| **Confirmation Latency** | `Transaction Modals` | Measure RPC performance and network congestion UX. |
| **Simulation Logs** | `Transaction Modals` | Surface deep on-chain error reasons (e.g., custom program errors). |

## Verification Results
- **Acceptance Criteria Met**:
  - [x] Specialized telemetry methods implemented.
  - [x] Bags client emits metadata-rich traces.
  - [x] Modals capture simulation and confirmation metrics.
  - [x] confirmation latency is measured and logged.
- **Build & Lint**: Passed (12/12 pages prerendered).

## Recommendations
- Integrate these custom events into a Sentry dashboard for real-time monitoring.
- Alert on `rateLimitRemaining < 50` to prevent platform-wide service degradation.
