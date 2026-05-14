# Agent Skill Stack Research

Date: 2026-05-14

## Objective

Equip BagFi agents to execute the new Bags.fm + Solana roadmap faster and more consistently, then make the repo instructions force agents to follow that roadmap.

## Research Summary

- Checked the existing local skill inventory under `~/.agents/skills` and `.codex/skills`.
- Queried the official OpenAI curated skill list with the Codex `skill-installer` helper.
- Searched the open skills marketplace with `npx skills find` for Solana, Next.js, testing, security, Supabase, Playwright, and web3 skills.
- Verified that this environment already has strong local skills for Solana, Supabase, Next.js, React performance, frontend design, JavaScript testing, web app testing, web3 testing, security hardening, documentation, and planning.
- Found no stronger Solana-specific marketplace skill than the installed local `solana-dev` skill.
- Avoided installing low-trust or duplicate marketplace skills where equivalent local/project skills already exist.

## Installed Official Curated Skills

Installed with the Codex skill installer from `openai/skills`:

- `playwright` — browser automation and UI-flow debugging.
- `playwright-interactive` — persistent browser debugging when `js_repl` is available.
- `security-best-practices` — JavaScript/TypeScript and web security best-practice review.
- `security-threat-model` — repository-grounded threat modeling.
- `security-ownership-map` — git-history ownership and sensitive-code risk analysis.
- `sentry` — read-only production error and issue inspection.
- `vercel-deploy` — preview deployment workflow for Vercel apps.
- `screenshot` — OS-level screenshot capture when browser/tool screenshots are not enough.
- `gh-fix-ci` — GitHub Actions failure investigation and fix planning.
- `gh-address-comments` — GitHub PR review comment handling.
- `yeet` — commit, push, and PR flow when explicitly requested.

Installation destination: `~/.codex/skills`.

Restart Codex to make newly installed skills appear in the active skill list.

## Existing High-Value Local Skills

These were already present and should remain the first choice for roadmap work:

- `solana-dev` for all Solana wallet, transaction, RPC, signing, and safety work.
- `supabase` and `supabase-postgres-best-practices` for schema, RLS, cache tables, and ingestion.
- `nextjs`, `next-best-practices`, `vercel-react-best-practices`, and `vercel-composition-patterns` for App Router and React implementation.
- `frontend-design`, `ui-ux-pro-max`, and `web-design-guidelines` for Smart Bag UX work.
- `javascript-testing-patterns`, `webapp-testing`, and `web3-testing` for tests.
- `security-and-hardening`, `security-requirement-extraction`, and `legal-risk-assessment` for secure API, wallet, data, and release boundaries.
- `documentation` and `planning-and-task-breakdown` for task reports and roadmap execution.
- `web-perf` for frontend performance measurement.

## Required Routing

Agents must use `.AGENTS.md` as the routing source. The default roadmap is now `SOL0` through `SOL7` in `docs/production-readiness-plan.csv`; legacy `WS*` tasks are historical unless the user explicitly asks for them.

For every task, agents should load the minimal relevant skill set before research and implementation, then write `docs/reports/<task-id>-research.md` and `docs/reports/<task-id>-execution.md`.

## Source Notes

- Official curated skill list came from the local Codex skill installer against `openai/skills`: https://github.com/openai/skills/tree/main/skills/.curated
- Marketplace searches used `npx skills find` and the public catalog at https://skills.sh/
- Cross-checks included curated catalog mirrors/search pages that listed the same official OpenAI skills, including Playwright, Sentry, Vercel deploy, GitHub PR/CI helpers, and security skills.
