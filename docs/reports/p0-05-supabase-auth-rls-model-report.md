# P0-05 Report: Supabase Auth/RLS Model

Date: 2026-05-25

## Task Completed

Moved BagFi's current production data access model away from the unsafe assumption that `auth.uid()::text` equals a Solana wallet address.

The implemented model is:

- Browser clients do not write private Supabase tables directly.
- Wallet-owned mutations go through Next.js API routes.
- API routes verify wallet message signatures where user intent is required.
- Server routes use the Supabase service role key.
- Private tables are RLS-protected and service-role-only until a full Supabase Auth wallet-JWT model is added.

## Files Changed

- `app/api/users/profile/route.ts`
  - Added profile read and wallet-signed leaderboard visibility update.
- `app/api/users/leaderboard/route.ts`
  - Added service-route-backed public leaderboard reader.
- `lib/users/profile-repository.ts`
  - Added service-role Supabase repository for `users`.
- `lib/users/profile-signing.ts`
  - Added deterministic signing message for user profile updates.
- `components/leaderboard/leaderboard.tsx`
  - Removed direct browser Supabase writes.
  - Added wallet message signing before public leaderboard updates.
- `components/pro/pro-dashboard.tsx`
  - Removed direct browser Supabase writes.
  - Removed the insecure demo-mode "instant grant Pro" write path.
- `supabase-rls-policies.sql`
  - Rewrote RLS around service-route-only private access.
  - Removed wallet-address policies based on `auth.uid()::text`.
- `supabase-schema.sql`
  - Changed `yield_leaderboard` to a `security_invoker` view.

## Behavior Added/Changed

- Leaderboard opt-in now requires the connected wallet to sign a BagFi profile update message.
- The profile update API verifies the Ed25519 wallet signature before writing `is_public_leaderboard`.
- Public leaderboard reads now go through `/api/users/leaderboard`.
- Pro status reads now go through `/api/users/profile`.
- The Pro pass demo button no longer grants `is_pro` from the browser.
- Private Supabase tables are no longer granted direct anon/authenticated access in the RLS policy file.

## Manual Tasks

1. Run `supabase-schema.sql` in the Supabase SQL editor.
2. Run `supabase-rls-policies.sql` after the schema completes.
3. Verify the Supabase project has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in Vercel only as server environment variables.
4. Confirm the frontend never receives `SUPABASE_SERVICE_ROLE_KEY`.
5. Manually test leaderboard opt-in with Phantom or Solflare:
   - Connect wallet.
   - Open `/leaderboard`.
   - Click `Make Public & Opt-in`.
   - Approve the message signature.
   - Confirm the row appears in the `users` table with `is_public_leaderboard = true`.
6. Decide the final Pro entitlement source:
   - NFT ownership check.
   - Subscription provider.
   - Manual allowlist.
   - Keep Pro hidden until entitlement infrastructure exists.

## Verification Run

- `npm run lint`: passed with the existing 5 warnings.
- `npm run test:ts`: passed, 5 files and 22 tests.
- `npm run build`: passed.
- GitNexus pre-edit impact:
  - `ProDashboard`: LOW, direct caller `ProPage`.
  - `Leaderboard`: LOW, direct caller `LeaderboardPage`.
  - Existing `db`/`supabase` exports: LOW in GitNexus, with browser usages removed by this task.
- GitNexus post-change detection:
  - Reports CRITICAL aggregate risk because the worktree includes all previous API/swap/session changes plus this task.

## Known Risks / Remaining Gaps

- This is not a full Supabase Auth wallet-JWT implementation. It intentionally uses service-route-only writes.
- `/api/users/profile` exposes public-safe profile fields for a queried wallet. A future privacy pass can require signatures for reads if Pro status must be private.
- Pro entitlement is now read-only; production entitlement verification still needs implementation.
- The old `lib/database.ts` and `lib/supabase.ts` files remain for future cleanup, but current Pro/Leaderboard browser writes no longer depend on them.

## References Checked

- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security guidance: https://supabase.com/docs/guides/api/securing-your-api
- Supabase changelog: https://supabase.com/changelog
