# WS6-01: Create CI workflow for install-lint-build-test

## Objective
Create a GitHub Actions CI workflow that validates install, lint, build, and test processes.

## Acceptance Criteria
- [x] GitHub Actions workflow file created at `.github/workflows/ci.yml`
- [x] Workflow triggers on push/pull_request to main branch
- [x] Installs dependencies with `npm ci`
- [x] Runs linting with `npm run lint`
- [x] Runs build with `npm run build`
- [x] Runs tests with `npm run test`
- [x] Workflow completes successfully on current codebase
- [x] Dependencies aligned and package-lock.json regenerated
- [x] Environment validation in place
- [x] Build passes without errors

## Status
Completed

## Dependencies
- WS1-03: Build + lint verification

## Notes
- Fixed wagmi/core module resolution issue by ensuring proper dependency versions
- Added .env file with test values to allow build to succeed
- CI workflow now runs successfully