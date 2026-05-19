-- Row Level Security (RLS) Policies for BagFi Supabase Database
-- Run this in your Supabase SQL Editor after creating the tables

-- 1. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT
USING (auth.uid()::text = wallet_address OR wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
));

-- Policy: Users can insert their own profile (sign up)
CREATE POLICY "Users can insert own profile" ON users
FOR INSERT
WITH CHECK (true); -- Allow anyone to insert during signup

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE
USING (auth.uid()::text = wallet_address)
WITH CHECK (auth.uid()::text = wallet_address);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON users
FOR DELETE
USING (auth.uid()::text = wallet_address);

-- 2. Enable RLS on portfolio_snapshots table
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own portfolio snapshots
CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots
FOR SELECT
USING (wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
));

-- Policy: Users can insert their own portfolio snapshots
CREATE POLICY "Users can insert own portfolio snapshots" ON portfolio_snapshots
FOR INSERT
WITH CHECK (wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
));

-- Policy: Users can update their own portfolio snapshots
CREATE POLICY "Users can update own portfolio snapshots" ON portfolio_snapshots
FOR UPDATE
USING (wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
))
WITH CHECK (wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
));

-- Policy: Users can delete their own portfolio snapshots
CREATE POLICY "Users can delete own portfolio snapshots" ON portfolio_snapshots
FOR DELETE
USING (wallet_address IN (
  SELECT wallet_address FROM users WHERE auth.uid()::text = wallet_address
));

-- Optional: Create a helper function to get current user's wallet address
-- This makes policies cleaner if you prefer to use a function
/*
create or replace function get_current_user_wallet()
returns text language sql as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    (select wallet_address from users where auth.uid()::text = wallet_address limit 1)
  );
$$;
*/

-- Alternative approach using JWT claims directly (if you have wallet_address in JWT)
-- Policy example using JWT claims:
-- CREATE POLICY "Users can view own profile" ON users
-- FOR SELECT
-- USING (wallet_address = coalesce(nullif(current_setting('request.jwt.claims')::json ->> 'wallet_address', ''), ''));

-- 3. Bags public cache tables
-- These contain public Bags.fm discovery metadata. Clients may read them, but
-- only server-side service-role jobs should write refresh results.

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

-- 4. Bags analytics tables
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
