# SOL4-01 Research: Bags token creator and lifetime fee analytics

## Scope
Research and plan the integration of Bags analytics endpoints for token creators, lifetime fees, claim stats, and claim events.

## Findings

### API Endpoints
Based on Bags API documentation:

1.  **Get Token Lifetime Fees**
    - `GET /token-launch/lifetime-fees?tokenMint={mint}`
    - Response: `{ success: true, response: "lamports" }` (lamports as string)

2.  **Get Token Claim Stats**
    - `GET /token-launch/claim-stats?tokenMint={mint}`
    - Response: `{ success: true, response: Array<ClaimStat> }`
    - `ClaimStat` includes: `username`, `pfp`, `royaltyBps`, `isCreator`, `wallet`, `totalClaimed`, `provider`, etc.

3.  **Get Token Claim Events**
    - `GET /fee-share/token/claim-events?tokenMint={mint}&mode=offset&limit=100`
    - Response: `{ success: true, response: { events: Array<ClaimEvent> } }`
    - `ClaimEvent` includes: `wallet`, `isCreator`, `amount`, `signature`, `timestamp`.

### Database Mapping
We need two new tables in Supabase:

1.  **`bags_token_analytics`**:
    - `token_mint` (PK, references `bags_token_launches`)
    - `lifetime_fees_lamports` (text/bigint)
    - `total_claimers` (int)
    - `last_refreshed_at` (timestamptz)
    - `updated_at` (timestamptz)

2.  **`bags_token_claim_events`**:
    - `signature` (PK)
    - `token_mint` (references `bags_token_launches`)
    - `wallet_address` (text)
    - `amount_lamports` (text/bigint)
    - `is_creator` (boolean)
    - `event_timestamp` (timestamptz)
    - `created_at` (timestamptz)

### Rate Limit & Ingestion Strategy
- Analytics are less volatile than price/pool state. A refresh cadence of **30-60 minutes** for eligible tokens is sufficient.
- For each "eligible" token (scored > 70 in SOL3-02), we will fetch:
    1. Lifetime fees (1 call)
    2. Claim stats (1 call)
    3. Claim events (1 call, initially just latest 100)
- Total 3 calls per eligible token per refresh.
- If we have 20 eligible tokens, that's 60 calls.
- At a 30-minute cadence, that's 120 calls/hour, well within the 1000/hour limit.

### UI Integration
- **Pro Dashboard**: Add a "Bags Ecosystem Analytics" section.
- Allow users to select a token (from eligible list) to see its:
    - Total Fees Generated (USD equivalent)
    - Top Claimers list (Creators vs Community)
    - Recent Claim History (Live feed)
