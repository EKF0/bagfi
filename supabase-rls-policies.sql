-- Row Level Security (RLS) policies for BagFi.
--
-- Current production auth model:
-- - Browser clients do not write private tables directly with the Supabase anon key.
-- - Wallet-owned mutations go through Next.js API routes.
-- - Next.js routes verify wallet message signatures where user intent is required.
-- - Server routes use the Supabase service role key.
--
-- This intentionally avoids auth.uid()::text = wallet_address. Supabase Auth user IDs are
-- UUIDs and do not equal Solana public keys unless a custom wallet-JWT model is added.

-- 0. Make Data API exposure explicit for projects that still have broad default grants.
-- Public cache tables are granted SELECT below. Private tables are service-role-only.
REVOKE ALL ON TABLE users FROM anon, authenticated;
REVOKE ALL ON TABLE portfolio_snapshots FROM anon, authenticated;
REVOKE ALL ON TABLE smart_bag_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE bags_user_fee_positions FROM anon, authenticated;
REVOKE ALL ON TABLE bags_partner_stats FROM anon, authenticated;
REVOKE ALL ON TABLE bags_creator_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE yield_leaderboard FROM anon, authenticated;

-- 1. Private user/profile tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_bag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_user_fee_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_partner_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_creator_drafts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE portfolio_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE smart_bag_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_user_fee_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_partner_stats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_creator_drafts TO service_role;
GRANT SELECT ON TABLE yield_leaderboard TO service_role;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can insert own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can update own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can delete own portfolio snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Service role can manage portfolio snapshots" ON portfolio_snapshots;
CREATE POLICY "Service role can manage portfolio snapshots" ON portfolio_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own sessions" ON smart_bag_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON smart_bag_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON smart_bag_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON smart_bag_sessions;
CREATE POLICY "Service role can manage all sessions" ON smart_bag_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own fee positions" ON bags_user_fee_positions;
DROP POLICY IF EXISTS "Service role can manage all fee positions" ON bags_user_fee_positions;
CREATE POLICY "Service role can manage all fee positions" ON bags_user_fee_positions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own partner stats" ON bags_partner_stats;
DROP POLICY IF EXISTS "Service role can manage all partner stats" ON bags_partner_stats;
CREATE POLICY "Service role can manage all partner stats" ON bags_partner_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own drafts" ON bags_creator_drafts;
DROP POLICY IF EXISTS "Service role can manage creator drafts" ON bags_creator_drafts;
CREATE POLICY "Service role can manage creator drafts" ON bags_creator_drafts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Public Bags discovery/cache tables
ALTER TABLE bags_token_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_cache_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_token_scores ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE bags_token_launches TO anon, authenticated;
GRANT SELECT ON TABLE bags_pools TO anon, authenticated;
GRANT SELECT ON TABLE bags_cache_state TO anon, authenticated;
GRANT SELECT ON TABLE bags_token_scores TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_token_launches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_pools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_cache_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_token_scores TO service_role;

DROP POLICY IF EXISTS "Public can view Bags token launches" ON bags_token_launches;
CREATE POLICY "Public can view Bags token launches" ON bags_token_launches
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view Bags pools" ON bags_pools;
CREATE POLICY "Public can view Bags pools" ON bags_pools
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view Bags cache state" ON bags_cache_state;
CREATE POLICY "Public can view Bags cache state" ON bags_cache_state
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view Bags token scores" ON bags_token_scores;
CREATE POLICY "Public can view Bags token scores" ON bags_token_scores
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role can manage Bags token launches" ON bags_token_launches;
CREATE POLICY "Service role can manage Bags token launches" ON bags_token_launches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage Bags pools" ON bags_pools;
CREATE POLICY "Service role can manage Bags pools" ON bags_pools
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage Bags cache state" ON bags_cache_state;
CREATE POLICY "Service role can manage Bags cache state" ON bags_cache_state
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage Bags token scores" ON bags_token_scores;
CREATE POLICY "Service role can manage Bags token scores" ON bags_token_scores
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Public on-chain analytics tables
ALTER TABLE bags_token_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags_token_claim_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE bags_token_analytics TO anon, authenticated;
GRANT SELECT ON TABLE bags_token_claim_events TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_token_analytics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bags_token_claim_events TO service_role;

DROP POLICY IF EXISTS "Public can view Bags token analytics" ON bags_token_analytics;
CREATE POLICY "Public can view Bags token analytics" ON bags_token_analytics
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view Bags token claim events" ON bags_token_claim_events;
CREATE POLICY "Public can view Bags token claim events" ON bags_token_claim_events
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role can manage Bags token analytics" ON bags_token_analytics;
CREATE POLICY "Service role can manage Bags token analytics" ON bags_token_analytics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage Bags token claim events" ON bags_token_claim_events;
CREATE POLICY "Service role can manage Bags token claim events" ON bags_token_claim_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
