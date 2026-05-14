# BagFi Smart Bag Guardrails for Bags.fm Integration

## Product Vision
BagFi is a unified Web3 asset platform that consolidates fragmented crypto portfolios into automated, thematic "Smart Bags" (one-click curated portfolios). With Bags.fm integration, we extend this vision to Solana-native assets while maintaining strict product guardrails.

## Core Principles

### 1. Smart Bags Are Curated Portfolios
- Smart Bags are thematic baskets of Solana tokens, not individual token launches
- Each bag has target allocations, risk tiers, and rebalance rules
- Users understand they're buying into a portfolio strategy, not a single asset
- Bags.fm-launched tokens are treated as asset sources, not the entire product

### 2. No False APY or Yield Claims
- Do not display invented APY percentages for Bags-native assets
- Use real metrics: realized fees, lifetime fees, price movement, volume/liquidity
- Show historical basket performance where available
- Be transparent about risk and volatility

### 3. Token Launch Tooling Is Non-MVP
- Token launch features are explicitly out of scope for the first Smart Bag investing MVP
- Creator Lab (token launch/fee share) is a separate, optional feature set
- Keep launch tooling behind distinct routes with clear separation from investor flows
- If added later, require manual review gates and warnings

### 4. User Control and Wallet Ownership
- No custody: BagFi never holds user funds or private keys
- Every transaction requires explicit wallet review and signature
- No autonomous mainnet trading in MVP
- Users see full transaction details (route plan, min output, price impact, fees) before signing

### 5. Risk Transparency
- Smart Bag risk labeling must be stricter than generic DeFi protocols
- Bags token launches are volatile; display clear risk warnings
- Show slippage tolerance, price impact, and priority fees prominently
- Include "this is experimental" warnings for new/volatile tokens

### 6. Bags.fm Integration Boundaries
- Bags.fm powers: discovery, trading, pool/fee data, and optional creator tooling
- BagFi remains: portfolio layer, allocation engine, execution layer, user experience
- Server-side Bags client handles API auth, rate limiting, and caching
- Never expose Bags API keys client-side

## Implementation Checklist

### Architecture Boundaries
- [ ] Smart Bag templates define target mint allocations, not individual token specs
- [ ] Rebalance sessions track quote snapshots and signed transaction receipts
- [ ] Portfolio reconciliation runs after confirmed signatures
- [ ] Bags data cached in Supabase with refresh cadence respecting rate limits

### UX Boundaries
- [ ] Smart Bag catalog shows risk tiers, allocation targets, and rebalance rules
- [ ] Swap/rebalance UX shows route plan, min output, price impact, priority fee
- [ ] Simulation result displayed before signature request
- [ ] No one-click "invest everything" without review

### Data Boundaries
- [ ] Supabase schema covers wallets, bag templates, allocations, sessions, trades
- [ ] RLS ensures users only access their own data
- [ ] Market data ingestion is server-only with visible rate-limit backoff
- [ ] Quote staleness and blockhash expiry handled gracefully

### Safety Checklist
- [ ] All transactions simulated before signature request
- [ ] Slippage and price-impact limits enforced
- [ ] Last-valid-block-height expiry displayed
- [ ] Rate limit telemetry visible in logs
- [ ] Emergency pause mechanisms available for smart contracts

## What BagFi Does NOT Do

1. **Launch tokens**: Token creation is not part of the Smart Bag MVP
2. **Guarantee returns**: No APY promises, only historical/realized data
3. **Custody funds**: Users maintain full wallet control
4. **Autonomous trading**: Every action requires explicit user signature
5. **Expose API keys**: All Bags API calls go through server-side wrapper
6. **Skip risk warnings**: Volatile tokens require explicit acknowledgment

## Success Criteria

- [ ] Product spec clearly separates Smart Bag investing from Creator Lab
- [ ] All user flows require explicit wallet signature
- [ ] Risk warnings are prominent and cannot be dismissed permanently
- [ ] No false yield/APY claims in any UI copy
- [ ] Bags API keys remain server-side only
- [ ] Token launch features are gated behind separate routes with warnings
