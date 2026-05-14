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