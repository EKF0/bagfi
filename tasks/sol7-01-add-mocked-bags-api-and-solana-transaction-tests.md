# SOL7-01: Add mocked Bags API and Solana transaction tests

## Problem
The Bags/Solana integration lacks comprehensive automated tests. Relying on manual QA with real wallets is slow and doesn't cover edge cases (API failures, simulation errors, invalid quotes). We need a robust test suite to ensure the stability of the trade engine and discovery cache.

## Scope
- Set up a mocking framework for Bags API responses.
- Implement unit tests for `lib/bags/client.ts`.
- Implement integration tests for Bags API routes (`/api/bags/quote`, `/api/bags/swap`, `/api/bags/discovery`).
- Test Smart Bag session engine (`lib/smart-bags/session-engine.ts`) with mocked quotes and simulation results.
- Cover edge cases: rate limits, 500 errors, invalid base58 addresses, and simulation failures.

## Dependencies
- `SOL2-04`: Build Smart Bag deposit and rebalance session engine (Completed)

## Acceptance Criteria
- [ ] Mocking utility for Bags API is available in the test suite.
- [ ] `client.ts` methods are covered by unit tests (success and error paths).
- [ ] API routes for quote and swap are tested with mocked responses.
- [ ] Session engine correctly handles split deposits and failed legs.
- [ ] All tests pass in the CI environment.

## Implementation Plan
1.  **Mock Setup**: Choose a mocking library (e.g., `msw` or `jest-fetch-mock`).
2.  **Client Tests**: Test `bagsRequest` logic, retries, and normalization.
3.  **Route Tests**: Test input validation and Bags API error handling in Next.js routes.
4.  **Session Engine Tests**: Verify BPS allocation logic and multi-step transaction preparation.
5.  **Edge Case Tests**: Simulate network failures and Bags-specific error envelopes.
6.  **Verification**: Run `npm test` and ensure coverage for critical paths.
