# SOL7-02: Create Smart Bag safety and compliance review checklist

## Problem
As BagFi transitions to a production-ready Solana/Bags integration, we must ensure that all user interactions are safe, transparent, and compliant with non-custodial principles. A formal safety checklist is required to verify that no critical security or disclosure gaps exist.

## Scope
- Conduct a manual audit of the codebase for custodial risks (ensuring BagFi never touches private keys or user funds).
- Review all UI components for clear risk disclosures, especially for volatile Bags tokens.
- Verify that all transaction flows require explicit user approval and show simulation results.
- Create a comprehensive checklist document for the final launch readiness gate.
- Document any identified gaps and provide remediation plans.

## Dependencies
- `SOL3-03`: Design Solana Smart Bag catalog and allocation templates (Completed)

## Acceptance Criteria
- [ ] Safety and compliance checklist created and reviewed.
- [ ] Codebase audited for custodial risks (none found or remediated).
- [ ] UI provides clear risk warnings for all "High" risk bags.
- [ ] Simulation results are mandatory before signing in all flows (Swap/Deposit/Claim).
- [ ] Volatile token warnings implemented for discovery-driven assets.

## Implementation Plan
1.  **Safety Audit**: Review `lib/bags/client.ts`, `lib/smart-bags/session-engine.ts`, and component logic for any private key usage or central custody.
2.  **Compliance Review**: Audit UI for risk labels, APY transparency, and non-custodial language.
3.  **Checklist Creation**: Draft `docs/safety-compliance-checklist.md`.
4.  **UI Enhancements**: Add explicit risk warnings to the Pro Dashboard and Deposit Modal if missing.
5.  **Verification**: Final walkthrough of all integrated flows.
