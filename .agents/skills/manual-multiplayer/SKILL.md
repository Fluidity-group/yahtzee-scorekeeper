---
name: manual-multiplayer
description: Develop or investigate Dice Clubhouse hosted manual games, tournament return, score history, analytics and invitation flows while preserving account ownership and existing tables.
---

# Hosted manual multiplayer

Read `docs/project-memory.md`, current entries in `docs/status.md`, and the relevant SW task. Use `docs/handovers/2026-10-14-manual-multiplayer-tournaments.md` for SW-019 contracts and evidence; inspect current source/runtime separately. Scope camera, BLE and physical dice work only when requested.

Resolve legacy/migration obligations from current owner decisions. `docs/decisions/2026-10-14-fresh-poc-baseline.md` removes old-game/save migration and legacy compatibility from the fresh POC. Historical continuation contracts below apply only where the task actually continues such a table; use fresh fixtures for POC acceptance.

## Contracts that change implementation decisions

- Supabase Auth UUID owns membership and analytics. Email is an account label; game-time aliases are frozen snapshots. Do not reuse legacy name-keyed statistics for hosted identity.
- Returning opens the same table/game/seat with original aliases. It neither creates a replacement roster nor silently resumes a paused tournament. Existing members can return through their original invitation even when new-member admission has expired.
- Keep shared-link join intent separate from member-return destinations. Generic native/HTTPS table links open the explicit join form; addressed invite notifications open acceptance; play/ready or accepted-member destinations read the saved seat. Preserve this through sign-in and cold/warm launches. A link alone grants no seat or readiness. Regression coverage: `tests/social-links.test.js`, `tests/multiplayer-ui.dom.test.js`, `tests/invitation-journey.dom.test.js`, `tests/social-return.dom.test.js`.
- Commands require authenticated seat, exact current game and room revision. Keep immutable game logic separate from server authority and UI; commit room, archive and receipt atomically. Edit server sources, then generate the edge function; never make the generated function the source of truth.
- SW-040 supersedes the Standard-only Undo contract: allow the latest own completed turn in every current mode/source until another completed scoring/bonus turn supersedes it. Following unscored observations may be cancelled with their turn retained/excluded from analytics; require fresh dice capture. Never cascade Undo to older turns. Preserve appended history, seat/revision checks, capability gating and completion/readiness invalidation; restore Competition final-chain attempts and reverse attached/standalone bonuses. See `docs/plans/SW-040-tournament-insights-and-universal-last-turn-undo.md` for candidate evidence and deployment state.
- Tournaments keep fixed mode/roster/game ceiling, shared wins on ties, and separate cumulative-points/most-wins standings. Competition rules are versioned: preserve v1 tables; new manual Competition uses v2 final-category Yahtzee chains.
- Score chronology is accepted scoring order, not physical roll timing. Manual combination reports are optional self-reported observations, separate from scores and sensor-confirmed results. Define denominator, tie treatment, corrections/Undo and provenance before displaying a metric.

## Investigation and qualification

For a failed return, collect mode, phase, affected account/device, visible build and exact symptom. Inspect existing room/history read-only first; reproduce with synthetic fixtures before changing contracts. Preserve user games and app/browser data.

For web-update work, inspect the actual service-worker lifecycle and test an already-cached client through update, close/reopen and reconnect. Byte-matched publication alone does not establish cache activation. Native assets update through an APK, not the web worker. Show update state without interrupting unconfirmed input or applying a mixed build.

Use focused regression coverage for ownership, revision races, idempotent retries, paused return, pagination and reopened completion as relevant. Release preparation uses Node24 and the configured gate. Phone acceptance and installed/deployed identity are separate records; do not repeat an install solely because the chat changed.

When expert agents are authorized, assign explicit domain and file ownership. Read-only review can share the checkout; concurrent implementation needs isolated worktrees. Lead integrates sequentially and verifies shared contracts. Agent/self-review is development evidence, not independent release approval.

Separate in-app inbox availability from real APNs/FCM delivery. Test social SQL/RLS with `scripts/test-tournament-social-db.mjs` in its disposable local database. Native iOS storage is separate from Safari; native sign-in does not imply Safari preferences have migrated. Current build/setup evidence belongs in status/release records, not this skill.
