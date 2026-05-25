# P0-08 Report: Add Production Monitoring and Alerts

Date: 2026-05-25
Task ID: P0-08
Area: QA CI/CD Observability & Telemetry

---

## 1. Executive Summary

This task successfully integrates production-grade telemetry, structured logging, and robust alerting thresholds to ensure the operational safety of the BagFi platform. We incorporated the Sentry Next.js SDK for comprehensive client, server, and edge exception tracking, and implemented intelligent threshold-based alert triggers inside the centralized `lib/telemetry.ts` file. 

Furthermore, we established a secure server-side webhook dispatcher that sends alerts (e.g. to a Discord channel) and routes client-side events via a secure API proxy route, protecting webhook credentials from exposure to client bundles.

---

## 2. Technical Implementation Detail

### Sentry SDK Integration
- **SDK Dependencies**: Installed `@sentry/nextjs` to manage client, server, and edge monitoring.
- **Runtimes Initialization**: Set up `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` to initialize Sentry with traces sampling.
- **Build Instrumentation**: Wrapped `nextConfig` in `next.config.ts` using `withSentryConfig` to auto-instrument routes and handle production source-map uploads.

### Real-Time Alerting Rules & Thresholds
1. **Bags.fm API Error Spikes (429/5xx)**:
   - Tracked all Bags API requests within a sliding window of the last 10 requests.
   - Triggers a high-priority system alert if **3 or more failures** (either `429` Rate Limited or `5xx` Server Error) occur in a rolling 5-minute window.
   - Prevents alert spamming via an stateful active cooldown flag (`bagsSpikeAlertActive`), resetting only when errors clear.
2. **Transaction Simulation Failures**:
   - Triggers an **immediate critical alert** on any Solana pre-flight transaction simulation failure, attaching logs and error codes.
3. **Solana RPC Latency Breaches**:
   - Compares final transaction confirmation durations to a configurable limit (`NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS`, default `10,000ms`).
   - Alerts and captures a Sentry warning if latency exceeds the specified limit.
4. **Transaction Confirmation Failures**:
   - Alerts on failed transaction statuses (`failed` or `timeout`).

### Secure Client-Side Alert Proxy Route
- Created **`app/api/telemetry/alert/route.ts`**:
  - Securely accepts telemetry alert payloads from the frontend.
  - Resolves environment variables and dispatches alerts directly from the server to the Discord Webhook (`TELEMETRY_ALERT_WEBHOOK_URL`).
  - Keeps webhook integration tokens out of public client bundles.

---

## 3. Changes Made

### Core files modified:
- **[telemetry.ts](file:///Users/ekf/Downloads/Projects/bagfi/lib/telemetry.ts)**: Upgraded with Sentry capture bindings, sliding-window spike logic, latency checking, and webhook dispatching.
- **[env.js](file:///Users/ekf/Downloads/Projects/bagfi/lib/env.js)**: Expanded validation schemas for recommended monitoring variables and secure server-only webhook warnings.
- **[.env.example](file:///Users/ekf/Downloads/Projects/bagfi/.env.example)**: Added documentation for `NEXT_PUBLIC_SENTRY_DSN`, `TELEMETRY_ALERT_WEBHOOK_URL`, and `NEXT_PUBLIC_RPC_LATENCY_ALERT_THRESHOLD_MS`.
- **[next.config.ts](file:///Users/ekf/Downloads/Projects/bagfi/next.config.ts)**: Wrapped exports using Sentry's wrapper.

### New files added:
- **[sentry.client.config.ts](file:///Users/ekf/Downloads/Projects/bagfi/sentry.client.config.ts)**: Client init.
- **[sentry.server.config.ts](file:///Users/ekf/Downloads/Projects/bagfi/sentry.server.config.ts)**: Server init.
- **[sentry.edge.config.ts](file:///Users/ekf/Downloads/Projects/bagfi/sentry.edge.config.ts)**: Edge init.
- **[route.ts](file:///Users/ekf/Downloads/Projects/bagfi/app/api/telemetry/alert/route.ts)**: Client-side alert secure routing.
- **[telemetry.test.ts](file:///Users/ekf/Downloads/Projects/bagfi/test/telemetry.test.ts)**: Comprehensive Vitest suite.
- **[p0-08-production-monitoring.md](file:///Users/ekf/Downloads/Projects/bagfi/tasks/p0-08-production-monitoring.md)**: Local task tracker.

---

## 4. Verification and Test Results

### Automated Test Suite
Created `test/telemetry.test.ts` to cover all threshold alert cases. All tests passed with 100% success rate:
```bash
 ✓ test/telemetry.test.ts (7 tests) 9ms
   - should dispatch alert webhook and capture exception on trackError
   - should immediately alert and report to Sentry on Solana Simulation Failure
   - should log normally on successful Solana simulation without alerting
   - should trigger alert and Sentry on Solana transaction confirmation failure
   - should trigger RPC Latency Breach alert if confirmation exceeds threshold limit
   - should not trigger latency alert if confirmation is within threshold limits
   - should trigger Bags API Spike alert only when error count reaches 3 in sliding window
```

Overall test run output:
```bash
 Test Files  7 passed (7)
      Tests  33 passed (33)
   Duration  1.44s
```

### Build Status
Next.js production build (`npm run build`) and lint verification (`npm run lint`) passed successfully.
