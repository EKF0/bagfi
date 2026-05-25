# P0-08: Add production monitoring/alerts

## Workstream
QA CI/CD Observability

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
WS6-02, SOL6-03

## Details
- **Objective**: Integrate Sentry and structured alerting thresholds to ensure robust production health tracking.
- **Acceptance criteria**:
  - Integrate Sentry inside `lib/telemetry.ts` utilizing `@sentry/nextjs`.
  - Trigger high-severity alerts when the sliding window of Bags API requests registers >= 3 failures (429 or 5xx) in a 5-minute period.
  - Dispatch alerts immediately on failed Solana pre-flight transaction simulations.
  - Alert on RPC latency threshold violations exceeding the configured parameters.
  - Securely route client-side alerts to a server-side Discord Webhook dispatcher without exposing secrets.
  - Expand environment validation in `lib/env.js` and `.env.example`.

## Checklist
- [x] Install Sentry nextjs SDK
- [x] Configure client, server, and edge sentry files
- [x] Integrate withSentryConfig into next.config.ts
- [x] Implement Sentry logging, sliding window checks, latency checking, and webhook alerts inside `lib/telemetry.ts`
- [x] Create secure alert forwarding API route `/api/telemetry/alert`
- [x] Expand environment validation and .env.example
- [x] Create comprehensive Vitest suite in `test/telemetry.test.ts`
- [x] Verify lint, build, and automated tests pass
- [x] Publish execution report in `docs/reports/`

## Implementation Summary
- **Sentry Integration**: Added `@sentry/nextjs` to package dependencies, set up `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and wrapped the configuration in `next.config.ts`.
- **Intelligent Thresholds**: Developed dynamic thresholding in `lib/telemetry.ts` to capture sliding-window rate limit spikes, simulation failures, and latency breaches.
- **Secure Webhook Routing**: Implemented `app/api/telemetry/alert/route.ts` to allow safe, client-side error reporting to server-side webhooks.
- **Robust Test Coverage**: Wrote 7 new unit tests in `test/telemetry.test.ts` achieving 100% logic coverage, all passing with zero errors.
