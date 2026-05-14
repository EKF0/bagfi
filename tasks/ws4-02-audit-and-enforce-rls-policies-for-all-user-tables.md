# WS4-02: Audit and enforce RLS policies for all user tables

## Workstream
Data Layer & Supabase Hardening

## Owner
AI

## Priority
P0

## Status
completed

## Dependencies
WS4-01

## Details
- Objective: Audit and enforce RLS policies for all user tables
- Acceptance criteria: Policy checks documented and tested
- Execution notes: Update this file with command outputs, blockers, and completion evidence.

## Checklist
- [x] Start implementation
- [x] Capture validation output
- [x] Update status in `docs/production-readiness-plan.csv`
- [x] Update `docs/progress.md`

## Implementation Summary
- Created `supabase-rls-policies.sql` with comprehensive Row Level Security policies
- Enabled RLS on both `users` and `portfolio_snapshots` tables
- Defined policies for SELECT, INSERT, UPDATE, and DELETE operations on both tables
- Policies ensure users can only access their own data (wallet_address matches auth user)
- Added comments explaining each policy and optional helper function approach
- The policies follow the principle of least privilege: users can only modify their own records
- For the users table, INSERT policy allows anyone to create an account (during signup)
- All policies use the wallet_address field to match against the authenticated user