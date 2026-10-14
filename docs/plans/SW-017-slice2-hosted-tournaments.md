# SW-017 slice2: resumable hosted manual tournaments

Date: 13 October 2026. Owner/reviewer: Codex development review; product owner: user. State: implemented and locally verified, not deployed or physically accepted. Software scope; baseline is deployed slice1 on codex/sw017-hosted-rematch with existing dirty changes preserved. Product-change workflow continues. User requests development while testing deployed rematch; this authorizes local development, not replacing the test build during their game.

## Requirements and acceptance

| Requirement | Observable verification | Evidence/state |
|---|---|---|
| Host selects mode, 2–20 games, 2–8 players and title | Server rejects invalid targets; exact roster required to start; frozen settings | Pending |
| Same group continues at same invite | Everyone ready advances exactly once, winner starts, no game N+1 | Pending |
| Pause and next-day resume | Host pause blocks scoring/readiness; state and account membership survive authoritative reload; host resume restores exact game | Pending |
| Separate points and wins standings | Finished snapshots aggregate by account UUID, ties share wins, fixture has different champions; corrections recompute | Pending |
| Existing test build/ordinary rooms preserved | No live mutation/deployment; legacy ordinary rematch and scoring regressions pass | Pending |
| Shared web/Android interface | Create/lobby/game/results/dashboard render same tournament contract; tests include hidden totals during active play | Pending |

## Design and risks

Store bounded immutable tournament configuration/lifecycle in existing room JSON; separate game snapshots already supply durable unbounded history. This avoids a second independently mutable tournament pointer and uses the existing transactional archive/room commit. Stable room ID/code is tournament identity for this slice. Capability is separately probed through a service-only tournaments RPC; missing migration fails closed. All game authority remains server-owned. Roster is fixed at start; exiting a screen does not remove a member. Freeze full current v1 rules at creation/start; Competition v2 remains deferred pending rule decisions.

Keep existing deterministic tied-winner starter rotation from slice1. Display tied wins explicitly (one shared win each), co-leaders and co-champions; no arbitrary winner. These prototype defaults remain reviewable. Host-only explicit pause/resume, revision/game-ID bound; paused finished games retain readiness without advancing until resumed and reconfirmed. Account UUID owns stats; game-time names stay in snapshots. Standings only expose completed games, never current hidden totals. Derive from corrected snapshots, never incremental win counters.

Expert UI and DB subtasks run in isolated worktrees with non-overlapping ownership. Root owns pure domain and handler integration. Existing live slice1 is left available for user testing. No camera, AI, BLE, signup, bonus-chain or optional metric changes.

## Completion

Implementation, focused/database checks, configured Node24 gate and local APK completed as recorded below. Deployment/physical acceptance remains a separate step.

## Local qualification follow-up

13 October2026: slice2 implemented and locally qualified, not deployed. Pure tournament configuration validates 2–20 games/2–8 players/title, freezes full v1 rules and exact roster, pauses/resumes the current game and stops after the final scheduled game. Shared host/lobby/dashboard/banner/results UI exposes separate total-points and games-won standings. Account UUID owns aggregates; corrected completed snapshots supply totals/shared wins. Current active hidden totals excluded. Existing table membership/list/foreground recovery supports resume; actual next-day phones remain open.

Additive DB trigger guards existing atomic room/history commit and older writers: frozen rules/roster, paused game changes, bounded successor sequences, completed final state. Separate service-only tournament capability fails closed. No separate mutable tournament pointer/table needed. Ordinary games retained. Pause/resume uses durable actor/payload receipts even for already-selected state; standings rechecks room revision after history load and rejects stale client responses. Transient standings failures retry on authoritative refresh.

Expert UI/DB work delivered scoped files from isolated worktrees; read-only rules review caught no-op receipt and standings-read races, both fixed with regressions. Codex development review is not independent commercial/security acceptance.

- Final Node24.19.0 gate:532 tests/65 files, zero skips, web/native-web/room builds and unchanged source passed. artifacts/engineering/2026-10-14T00-21-21-592Z-c5d5f565/report.json; source SHA25678f5507d1b873da404f64f2105f497ccae938f78bdddd001980aa8078c886263, dirty preserved development baseline. Earlier531-test run superseded by final standings-recovery regression.
- Integrated disposable PostgreSQL16.15:20 checks passed, including earlier history/RLS/receipt/atomicity plus tournament capability/frozen configuration/roster/pause/ceiling/final history. artifacts/sw017-rematch/database-report.json. Cached timescale/timescaledb:2.29.2-pg16, no network/published ports, tmpfs synthetic DB; container removed. No Supabase mutation.
- Tournament migration SHA256059048973864e5b40d2a8f0f3e2fdd2619a008b01e64a61b326da34228499777. Generated backend SHA2563cabdef0bc0d2e0d4dc1983cdb4d5bb74d3d5ec20a1dbfa13d65490dfc0bec68.
- Local standard Android APK artifacts/sw017-tournaments/android-test-candidate.apk SHA2567e1241778ce920787393cadb72c941678ad7426e816ad8a8553ff18583ae9b22; offline Gradle successful15s,124 tasks/27 executed. Entry/client/UI/prototype match qualified dist-native bytes (apk-asset-check.json). No Java changes/native unit rerun/ADB/install/launch.
- Synthetic shared-component preview390x844 and768x1024 inspected: no horizontal overflow; tablet two leaderboard columns. results-phone.png/results-tablet.png under artifacts/sw017-tournaments. Initial local fixture CSS paths/asynchronous navigation failed; corrected static actual-component/CSS fixture verified. Synthetic fixture, not live/physical tournament acceptance. Server stopped, browser viewport reset.

Remaining: rollout manifest/task-specific authorization, live authenticated Android/Safari tournament, pause/reload/next-day resume, both-ready/reconnect/corrections/final ceiling. Deployed slice1 untouched during user testing. Shared-win/rotating tied starter remains reviewable prototype default. Nickname editing, account-wide chronology insights, manual metrics, Competition v2 and signup/invitation enhancements remain later work.

13 October SW-017 combined tournament/final-chain/pulse candidate deployed with explicit Pixel authorization and matching service/web rollout.575 tests/70 files/all builds/source consistency,23 isolated DB checks and local built phone/tablet manual chain exercise passed. First final-category Yahtzee50 earns repeated3-roll attempts, +100 success renews, only3 failures ends playerchain; newmanualCompetition version2, oldtables remain1. Livelier accepted score/turn/Yahtzee/full-house effects with reducedmotion and quiet reload/corrections. Pixel install-r preservingdata, exact installedAPKhash/launch; liveweb/backendbytes matched;9rooms/10games unchanged. New two-account tournament/chain/next-day physical acceptance open. Manifest: docs/releases/SW-017-2026-10-13-tournaments-final-chain.md.
