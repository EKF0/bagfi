-- Run this in your Supabase SQL Editor

-- 1. Users Table
CREATE TABLE users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_pro boolean DEFAULT false,
  is_public_leaderboard boolean DEFAULT false
);

-- 2. Portfolio Snapshots (For historical charts)
CREATE TABLE portfolio_snapshots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address text REFERENCES users(wallet_address),
  total_value_usd numeric NOT NULL,
  snapshot_date timestamp with time zone DEFAULT now()
);

-- 3. Leaderboard view (To rank users)
CREATE VIEW yield_leaderboard AS
SELECT 
  wallet_address,
  is_public_leaderboard,
  created_at
FROM users
WHERE is_public_leaderboard = true;
