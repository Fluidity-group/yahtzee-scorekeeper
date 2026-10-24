# SW-055: Larger Home categories, tournament trophies and past opponents

23 October 2026. Requested by Amber's three browser comments. Engineering Codex. State: implemented and focused automated checks passed; Amber visual acceptance pending. Development branch `codex/amber-ui-lab`, starting checkpoint1cf9dfb.

## Requirements and acceptance

| ID | Requested outcome | Observable acceptance | Evidence |
|---|---|---|---|
| HOME-1 | Larger Play alone and similar category titles | All four titles increase from18px to22–26px,20px compact; no fixed title width or nested buttons | Implemented;53 focused checks include four distinct actions and no nested buttons; visual review pending |
| HOME-2 | Trophy counter for signed-in user's tournament wins | Count distinct fully completed tournaments where account wins points or games-won honours; ties included; show separate breakdown | Canonical standings and regression checks |
| HOME-3 | People/friends reachable through online multiplayer | List opponents from completed games, deduplicated by account UUID; counts games together; aliases update with latest played snapshot; self/unfinished excluded | Read-only history adapter and DOM checks |
| HOME-4 | Honest lab preview and account/error states | Fictional lab profile explicitly labelled; signed-out/loading/error never masquerade as zero wins; account switches discard stale data; no game/setup overwrite | Loader/account/late-response checks |

## Decisions and contracts

The existing product awards points and games-won honours independently. Proposed UI counting policy: one tournament won if either honour is earned, counted once even when both are earned. Ties count. Trophy detail explicitly explains this and preserves both independent counters. This is a reviewable UI definition, not a new tournament tie-break or rules change.

Use past opponents, not a fabricated mutual-friend relationship. Only finished shared game snapshots establish a played relationship. Accounts remain UUID-owned; same-name accounts remain distinct. No email disclosure, invitations, friend requests, presence claims or automatic messaging. Existing invitation flows remain separately accessible.

History comes from existing authenticated, member-scoped `sessions`, `history`, and `read` operations. Paginate both open and completed tables and full game history; current unfinished snapshots supersede stale archived copies. Verify the room revision after reads. Reject incomplete completed-tournament history rather than display a partial lifetime total. Reuse canonical `tournamentStandings`, not incremented local counters. Three concurrent read workers; repeated/nonadvancing cursors fail visibly. No backend migration or authority change.

The development-only lab entry injects an explicitly labelled fictional Alex profile, with three completed two-game tournaments and three past opponents. Normal product startup never sets the preview provider; signed-out users receive sign-in states. Production backend and paid voice remain disconnected in this lab.

## Verification and completion

53 checks in9 files passed on Node24.19.0/Vitest4.1.11 (`artifacts/amber-lab/home-checks.json`): canonical trophy semantics, points-only/games-only/tied winners, deduplication, alias identity, foreign-account exclusion, unfinished/reopened games, incomplete history, full pagination, repeated cursors, stale room revisions and account-switch responses; actual Home panel navigation and delayed-result setup preservation; adjacent multiplayer and scoring paths. These are fixture/DOM checks, not live-account integration acceptance.

Lab game compilation and standard web/PWA production compilation passed. Standard product asset scan confirmed no `sample-alex` lab fixture is present. The development-only entry supplies the sample profile; no real account was queried or modified. Existing mixed static/dynamic import warnings remain. The full engineering release/native gate has not been rerun because this is an unpromoted local UI review candidate.

Live LAN page/script/API and WebSocket source-update check passed (`artifacts/amber-lab/live-check.json`). Three requested changes were saved through the real local review API as Testing, without overwriting existing requests. Windows EPERM replacing requests.json was reproduced during the second save. Fixed with serialized writes, unique temporary files, bounded retries for transient file locks, and exclusion of generated review data from Vite's watcher. Added transient/permanent-lock and concurrent-write regressions. Restarted only the lab server and verified source HMR still operates; all three requests then saved successfully. An intermediate overbroad watcher pattern temporarily suppressed updates; replaced it with exact-root path checks and restarted before the final passing HMR check.

Browser automation was denied earlier in this chat; no alternative browser automation used. Visual readability/wrapping at320/393/448/714px and both themes remains Amber review. No public/native rollout, game-rule change, production data write or main-baseline promotion. Trophy counting policy remains an explicit design review choice, documented in its popup.
