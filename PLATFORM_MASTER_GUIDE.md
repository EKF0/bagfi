# BagFi: Platform Master Guide (The Owner's Manual)

Welcome to the internal master guide for BagFi. This document provides a 360-degree technical and operational understanding of the platform you have built.

---

## 1. Core Architecture
BagFi is a **Hybrid Decentralized Application**.
*   **Frontend**: Next.js 15 (App Router). Built for speed and SEO.
*   **Database**: Supabase (PostgreSQL). Stores public discovery data and private user metadata.
*   **Economic Layer**: Bags.fm API v1. We act as a professional proxy/interface for their liquidity and launching protocols.
*   **Blockchain**: Solana Mainnet-Beta. All transactions happen on-chain.

### **The "No-Touch" Security Model**
BagFi is strictly **non-custodial**.
*   The platform **never** sees or stores private keys.
*   All transactions are generated on the server, returned to the browser, and signed in the user's wallet (Phantom/Solflare).

---

## 2. Feature Deep-Dive

### **A. Smart Bags (Curated Portfolios)**
Located in `lib/smart-bags/`. These are thematic baskets defined by BPS (Basis Points, where 10,000 = 100%).
*   **The Session Engine**: When a user deposits 10 SOL, the engine calculates the split based on the bag's template. It fetches quotes for each "leg" of the journey and prepares a multi-step session.
*   **Persistence**: Sessions are saved in Local Storage and mirrored in the `smart_bag_sessions` database table for cross-device tracking.

### **B. Bags Discovery & Risk Scoring**
Located in `lib/bags/discovery-cache.ts` and `lib/bags/risk-scoring.ts`.
*   **The Cache**: We don't call the Bags API directly for the UI. Instead, we maintain a server-side cache in Supabase.
*   **The Safety Filter**: Every new token in the feed is scored from 0-100. Tokens with scores < 70 are hidden from "Eligible" views. We filter for missing pools, high price impact, and suspicious creator history.

### **C. Creator Lab (The Launchpad)**
Located in `components/bags/launch-wizard.tsx`.
*   A 3-step wizard for launching tokens.
*   **Step 2 (Economics)**: Allows creators to set up "Fee Sharing." This is a unique feature that generates a second on-chain transaction immediately after launch to distribute revenues.

### **D. Partner Center**
Located in `components/pro/partner-center.tsx`.
*   A dedicated dashboard for stakeholders to see their SOL earnings in real-time and withdraw them without leaving the platform.

---

## 3. Operational Maintenance (The "Heartbeat")

BagFi requires a periodic "Refresh Cycle" to stay accurate.

### **The Unified Refresh API**
*   **Endpoint**: `POST /api/bags/refresh`
*   **Secret**: Protected by `BAGS_CACHE_REFRESH_SECRET`.
*   **Cycle**:
    1.  **Discovery (5m)**: Refresh token feed and pool state.
    2.  **Scoring (15m)**: Re-calculate risk scores for the latest 20 candidates.
    3.  **Analytics (30m)**: Refresh lifetime fees and creator stats for eligible tokens.

---

## 4. Debugging & Observability

If a user reports an error, follow these steps:

1.  **Check Telemetry**: Look at the `solana.simulation` and `bags.api` logs in your monitoring dashboard.
2.  **Bags Request ID**: Every Bags API call has a unique ID (e.g., `bags-17792...`). Provide this to the Bags.fm team if an API call fails consistently.
3.  **Simulation Logs**: If a swap fails, the telemetry captures the last 10 lines of the Solana program logs. This usually explains *why* (e.g., "Slippage tolerance exceeded").

---

## 5. Scalability & Limits

*   **Rate Limits**: The Bags API limit is **1,000 requests per hour**. Our discovery coordinator is configured to stay well below this by using sequential, cached updates.
*   **RPC Reliability**: Your Solana RPC provider is your single point of failure for transactions. If users report "Transaction not found," upgrade your RPC tier immediately.

---

## 6. Key File Reference for Owners

*   `lib/smart-bags/catalog.ts`: Edit this to change bag allocations or add new thematic portfolios.
*   `lib/bags/risk-scoring.ts`: Edit this to adjust the safety filters (e.g., lower the score threshold).
*   `supabase-schema.sql`: Your source of truth for the database structure.
*   `CLAUDE.md`: The technical "Memory" for AI assistants working on this repo.

---

**BagFi is a professional-grade bridge to the Solana future. Use this guide to lead the development and community.**
