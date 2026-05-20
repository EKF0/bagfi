# BagFi: Real-World Production Launch Guide

This guide outlines the critical non-technical and infrastructure steps required to transition BagFi from a "Ready-to-Deploy" state to a **live, real-world production environment** with real capital and users.

---

## 1. Infrastructure Hardening (Critical)

Currently, the app relies on public/default infrastructure. For a real launch, you must switch to high-performance providers.

### **A. Premium Solana RPC (Helius/Triton)**
Public RPCs will fail during high network volatility.
- [ ] Create a production account on [Helius](https://www.helius.dev/) or [Triton](https://triton.one/).
- [ ] Update `NEXT_PUBLIC_SOLANA_RPC_URL` in Vercel.
- [ ] Enable **Priority Fees** in the RPC settings to ensure your users' transactions land during congestion.

### **B. Production Bags.fm API Key**
- [ ] Ensure your `BAGS_API_KEY` is a production key with sufficient rate limits.
- [ ] Confirm with the Bags.fm team that your domain (`bagfi.app` or similar) is whitelisted for their backend.

### **C. Supabase Production Project**
- [ ] Create a **new** project in Supabase (do not reuse the development project).
- [ ] Run the finalized `supabase-schema.sql` and `supabase-rls-policies.sql`.
- [ ] **Important**: Disable the "Allow Anon Sign-ins" if not needed, and strictly audit that the `service_role` key is ONLY used in Vercel Environment Variables.

---

## 2. Environment Configuration (Vercel)

Ensure these variables are set in your **Vercel Production** environment (not Preview/Development):

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Your Premium Helius/Triton URL |
| `BAGS_API_KEY` | Your Production Bags API Key |
| `BAGS_CACHE_REFRESH_SECRET` | A long, random string (e.g. `openssl rand -base64 32`) |
| `DATABASE_URL` | Your Production Supabase connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Production Supabase Service Key |

---

## 3. Operational Setup (The Maintenance Loop)

The platform requires a heartbeat to keep discovery and analytics fresh.

- [ ] **Configure Vercel Cron**:
    - Update `vercel.json` or use an external service (like [Upstash](https://upstash.com/)) to call `POST https://yourdomain.com/api/bags/refresh` every 5 minutes.
    - Headers: `x-bags-cache-secret: [Your BAGS_CACHE_REFRESH_SECRET]`.
- [ ] **Monitor Telemetry**:
    - Check your logs for "Bags API rate limit low" warnings.
    - If remaining limits consistently drop below 100, contact Bags.fm to increase your tier.

---

## 4. Legal & Compliance (Risk Management)

Real users require real protections.

- [ ] **Terms of Service**: Add a `terms` page and link it in the footer. Explicitly state that BagFi is a non-custodial interface and is not responsible for token volatility or protocol-level failures.
- [ ] **Privacy Policy**: Standard requirement for GDPR/CCPA.
- [ ] **Risk Disclaimer Modal**: (Optional but Recommended) Implement a one-time popup for new users that they must accept before using the "Creator Lab" or "Smart Bags" features.

---

## 5. Security & Safety Verification

Before sharing the URL:

- [ ] **Verify RLS**: Manually attempt to access the `/api/bags/claim` endpoint with a different wallet's public key in the params; ensure it returns empty or unauthorized for private data.
- [ ] **Simulate on Mainnet**: Use a real wallet with a small amount of SOL (e.g., 0.1 SOL) to perform a "Real World" swap and deposit. Verify the simulation results match the on-chain outcome.
- [ ] **Check Social Meta**: Update `metadata.json` or your root layout with real SEO titles, descriptions, and OpenGraph images so links look professional on Twitter/X.

---

## 6. The Launch Sequence

1.  **Deployment**: Push to `main` and verify the Vercel build is successful.
2.  **Smoke Test**: Perform one real "Smart Bag" deposit and one "Fee Claim" on Mainnet.
3.  **Analytics Sync**: Trigger a manual refresh (`POST /api/bags/refresh`) and verify that the `bags_token_launches` table in Supabase starts populating with real Mainnet tokens.
4.  **Announce**: Open the gates.

---

**Technical Support**: Every feature has an execution report in `docs/reports/` for deep-dive troubleshooting.
