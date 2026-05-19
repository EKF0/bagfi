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

-- 4. Bags token launch cache
CREATE TABLE IF NOT EXISTS bags_token_launches (
  token_mint text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  description text,
  image_url text,
  status text NOT NULL,
  twitter_url text,
  website_url text,
  launch_signature text,
  account_keys text[] NOT NULL DEFAULT '{}',
  num_required_signers integer,
  metadata_uri text,
  dbc_pool_key text,
  dbc_config_key text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_token_launches_status
  ON bags_token_launches(status);

CREATE INDEX IF NOT EXISTS idx_bags_token_launches_last_seen_at
  ON bags_token_launches(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_bags_token_launches_dbc_pool_key
  ON bags_token_launches(dbc_pool_key)
  WHERE dbc_pool_key IS NOT NULL;

-- 5. Bags pool state cache
CREATE TABLE IF NOT EXISTS bags_pools (
  token_mint text PRIMARY KEY,
  dbc_config_key text,
  dbc_pool_key text,
  damm_v2_pool_key text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_pools_dbc_pool_key
  ON bags_pools(dbc_pool_key)
  WHERE dbc_pool_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bags_pools_damm_v2_pool_key
  ON bags_pools(damm_v2_pool_key)
  WHERE damm_v2_pool_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bags_pools_last_seen_at
  ON bags_pools(last_seen_at DESC);

-- 6. Bags cache freshness metadata
CREATE TABLE IF NOT EXISTS bags_cache_state (
  cache_key text PRIMARY KEY,
  last_refreshed_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  source_request_ids text[] NOT NULL DEFAULT '{}',
  rate_limit_remaining integer,
  rate_limit_reset timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_cache_state_expires_at
  ON bags_cache_state(expires_at);

-- 7. Bags token risk and eligibility score cache
CREATE TABLE IF NOT EXISTS bags_token_scores (
  token_mint text PRIMARY KEY,
  is_eligible boolean NOT NULL DEFAULT false,
  risk_score integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_tier text NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'blocked')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reasons text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  creator_wallets text[] NOT NULL DEFAULT '{}',
  creator_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_impact_pct numeric,
  quote_request_id text,
  scored_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_token_scores_eligible_score
  ON bags_token_scores(is_eligible, risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_bags_token_scores_tier
  ON bags_token_scores(risk_tier);

CREATE INDEX IF NOT EXISTS idx_bags_token_scores_scored_at
  ON bags_token_scores(scored_at DESC);

-- 8. Bags token analytics (lifetime fees and claim stats)
CREATE TABLE IF NOT EXISTS bags_token_analytics (
  token_mint text PRIMARY KEY REFERENCES bags_token_launches(token_mint),
  lifetime_fees_lamports text NOT NULL DEFAULT '0',
  total_claimers integer NOT NULL DEFAULT 0,
  claim_stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_refreshed_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_token_analytics_last_refreshed_at
  ON bags_token_analytics(last_refreshed_at DESC);

-- 9. Bags token claim events
CREATE TABLE IF NOT EXISTS bags_token_claim_events (
  signature text PRIMARY KEY,
  token_mint text NOT NULL REFERENCES bags_token_launches(token_mint),
  wallet_address text NOT NULL,
  amount_lamports text NOT NULL,
  is_creator boolean NOT NULL DEFAULT false,
  event_timestamp timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_token_claim_events_token_mint_timestamp
  ON bags_token_claim_events(token_mint, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_bags_token_claim_events_wallet_address
  ON bags_token_claim_events(wallet_address);

-- 10. Smart Bag Sessions (Persistent user sessions)
CREATE TABLE IF NOT EXISTS smart_bag_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address text NOT NULL REFERENCES users(wallet_address),
  bag_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('idle', 'depositing', 'confirming', 'success', 'error')),
  deposit_amount text,
  deposit_mint text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_step_index integer NOT NULL DEFAULT 0,
  tx_signatures text[] NOT NULL DEFAULT '{}',
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_smart_bag_sessions_wallet_status
  ON smart_bag_sessions(wallet_address, status);

-- 11. Bags user fee positions cache
CREATE TABLE IF NOT EXISTS bags_user_fee_positions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address text NOT NULL REFERENCES users(wallet_address),
  token_mint text NOT NULL REFERENCES bags_token_launches(token_mint),
  claimable_lamports text NOT NULL DEFAULT '0',
  last_claim_at timestamp with time zone,
  total_claimed_lamports text NOT NULL DEFAULT '0',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(wallet_address, token_mint)
);

CREATE INDEX IF NOT EXISTS idx_bags_user_fee_positions_wallet
  ON bags_user_fee_positions(wallet_address);

-- 12. Bags Partner Stats (Cache for partner fees)
CREATE TABLE IF NOT EXISTS bags_partner_stats (
  partner_wallet text PRIMARY KEY REFERENCES users(wallet_address),
  claimed_lamports text NOT NULL DEFAULT '0',
  unclaimed_lamports text NOT NULL DEFAULT '0',
  last_refreshed_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bags_partner_stats_last_refreshed_at
  ON bags_partner_stats(last_refreshed_at DESC);
