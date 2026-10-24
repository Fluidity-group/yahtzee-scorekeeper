# CLAUDE.md — Yahtzee Scorekeeper

Current SW066 core integration: use `C:/Codex/Yahtzee Game/artifacts/sw066/source` and read `docs/handovers/2026-10-24-core-manual-integration.md` plus `docs/status.md`. Owner requests core promotion and lead-architect review. Manual scoring/local/online tournaments on Android and iOS take priority; camera and voice are deferred until the manual core works. Both platform versions run per owner; complete cross-phone gameplay remains unverified. Preserve the dirty root checkout and existing accounts/tables. Older separate-sample/main-unchanged notes below are historical; SW066 records actual qualification/promotion.

Current YAHTZ UI/sample continuity: read docs/handovers/2026-10-24-amber-ui-review.md and docs/status.md before assuming a native, root-checkout or main deployment state.

Current shared engineering instructions: read `AGENTS.md` and `docs/status.md`.
The original instructions below are preserved as historical context for the
legacy product. Their old folder, scope, no-backend assumptions and phased
workflow do not override current product contracts or the user's task.

## What this is
A two-player Yahtzee **scorekeeper** PWA. Players roll **physical dice**; this app only
records scores — it is NOT a dice roller. Full requirements live in **yahtzee-build-spec.md**
(read it first, it is the source of truth). **yahtzee-scorekeeper-v3.html** is the working UI
mockup to port: its look, layout, entry flow, synthesized sounds, and celebration system.

## Before you build — react to the plan first
Read yahtzee-build-spec.md end to end, then give me YOUR take before writing any code:
what you would simplify, risks or gaps you see, a better structure, and anything you would
do differently. Propose changes — do not just follow the spec blindly. Note the open questions
in section 13. Once we have agreed on the approach, build phase by phase per section 11 and
**stop after each phase** so I can test on my phone before continuing.

## Environment (important)
- This folder is `C:\Yahtzee game` on Windows = `/mnt/c/Yahtzee game` inside WSL.
- **Node lives in WSL only** (Node 22). Run every npm / vite / vitest command from WSL:
    cd "/mnt/c/Yahtzee game" && npm install && npm run dev
- Git is available; commit after each phase with a clear message.

## How we work
- **TDD** the pure logic (scoring + rules): write a failing test, make it pass, refactor.
  The house rules in section 3 (bonus-Yahtzee extra turn, explicit scratch, edit-does-not-pass-turn,
  last-box flag) are the high-value cases — cover them.
- **Verify before saying done**: actually run the tests and the app; do not just assert it works.
- **Keep it simple**: smallest change that meets the spec; no extra dependencies or features
  beyond the chosen stack without asking.
- Keep scoring.js and rules.js pure and DOM-free so they are testable and reusable.
- If something is ambiguous, ask rather than guess.

## Stack (chosen — do not swap without asking)
Vite + vanilla JS, vite-plugin-pwa, Dexie (IndexedDB), Vitest. No backend in v1; structure the
data layer (one row per score entry, with order + timestamp) so a Supabase sync can be added later.
