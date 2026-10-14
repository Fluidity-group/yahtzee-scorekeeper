# Manual multiplayer and tournament development handover

Updated 14 October 2026 after SW-019 implementation, qualification, matching backend/web publication and verified Pixel installation. Read this with `AGENTS.md`, `docs/status.md` and `docs/projects/software.md`. This document describes evidence, not current device connectivity. Inspect the Pixel freshly before any install.

## Immediate state and next action

SW-019 adds manual Standard Undo and a prominent, graphical saved-session hub for both host and guest. Backend and web are published and byte-verified. Android APK is built and its packaged assets match the qualified native bundle. **SW-019 is now installed on the Pixel.** After the user confirmed wireless readiness, fresh discovery connected the Pixel11 Pro XL. Install-r succeeded, installed APK SHA256 matched the candidate and MainActivity launch returned Status ok. Login/app data were preserved. This confirms installation, not gameplay acceptance.

The next engineer should verify current device/build state, then help the user test Standard Undo and a paused partial tournament across Android and Amber's iPhone browser. Use the same accounts to return to existing tables. No new room or roster should be created when resuming.

Start with these priorities:

1. Confirm both devices show SW-019, especially the guest's cached web app. The Pixel install itself is already complete; do not rebuild/reinstall merely because this is a new chat.
2. Help the user test own-score Undo and exit/reopen of a tournament after only three or four categories. Record the exact symptom, mode, game phase and which account/device is affected if a test fails.
3. Investigate any failure against the existing room and event history using read-only access first. Reproduce with synthetic fixtures before altering scoring or return contracts. Existing user games must remain intact.
4. Once that journey is accepted, continue the pending chronology/metrics/invitation scope in small qualified increments. No camera/AI work is part of this sprint.

The public browser tabs retained an older entry asset during refresh checks, even though public HTTP readback matched all new assets. A fresh local preview origin loaded and exercised SW-019 correctly. **Existing PWA/Safari cache activation is an open acceptance item**; confirm the visible Resume entry before claiming Amber is using SW-019. Do not clear account/browser/app data to fix caching. Investigate the update lifecycle if ordinary close/reopen/refresh does not activate the published build.

## Repository and working state

- Workspace: `C:\Codex\Yahtzee Game`, Windows PowerShell; engineering runtime Node 24.19.0.
- Branch: `codex/sw017-hosted-rematch`; HEAD `e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc`.
- Large pre-existing dirty checkout is intentional and was preserved. Source branch was not staged, committed or pushed for this rollout. Do not reset, clean, bulk-stage, force-push or call the dirty checkout a reproducible commercial release.
- SW-019 qualified software source SHA256: `514cca1a0525e147c8aa6861cd7c8363278c624927ba5ef479ce995aa3ed74cb`. Engineering gate captured unchanged before/after source. Documentation records written afterward are completion evidence.
- Root coordinated core, UI and session-card expert work in isolated `artifacts/sw019-*` directories. Their work is integrated; do not recopy their staging core/client/server dependencies over the final root files.
- Product owner is the user; Codex implementation/self-review is not independent review or commercial acceptance.

## User intent and confirmed scope

Testing is manual scoring only, with Android host and an iPhone guest joining a web link/QR. No Camera or AI recognition acceptance is requested.

Hosted rematches keep the same table and players. Each player marks themselves ready; all ready starts the next game. Previous winner starts next; shared winners use the existing deterministic winner choice. New games have distinct IDs and archived predecessor snapshots.

Tournaments have a name, fixed mode, 2–20 games and 2–8 players. Exact configured roster is required before starting. Progress is durable; host can pause, leave and return later. Two independent standings award highest cumulative points and most game wins; these can be different people. Ties share game wins. The final game ceiling prevents an extra tournament game.

Player identity follows the signed-in Supabase Auth UUID, whose account is identified to the user by email. **Email text and funny names are not primary keys.** Game-time names are frozen in player snapshots for historical display. Authentication/ownership/analytics must follow UUID even if names or email change.

The user wants every category score and chronological scoring order preserved, plus later richer cross-game/tournament statistics, encouraging highlights and a manual combo logger for combinations rolled even after that category is scored. Existing archived events provide part of that foundation; the complete requested metrics/onboarding scope is not finished.

Competition manual rules version 2: scoring a Yahtzee on the player's last open-category turn grants a three-roll bonus attempt, including the first Yahtzee scored for 50 in that final category. During bonus attempts each reported Yahtzee adds 100 and starts a fresh three-roll attempt; three failed rolls end that player's chain. Other unfinished players still complete their turns. Existing Competition version 1 tables remain version 1; creating new manual Competition games selects version 2. Do not silently rewrite old games.

## SW-019 behavior and boundaries

### Undo

Manual **Standard** games expose `Undo last score` to the original score owner, even immediately after automatic turn handoff. A filled eligible category also offers Undo in its correction panel. Confirmation reopens the category and returns the turn to the score owner so they can choose a different category.

Only the latest eligible current-game score can be undone, before another meaningful gameplay action. An empty automatically started manual turn does not close the window. Another accepted score/roll/bonus does. Corrections to that score do not close the window. Older archived games, another player's scores, Competition/Accumulative/hardware scoring and arbitrary historical turn rollback are excluded. Paused tournaments require host resume first; reconnecting/unsupported clients cannot issue Undo.

`score-undo` is an appended audit event, not deletion of history. The score's attached bonus is reversed; original turn and any empty following turn are marked undone/excluded. Sheet/category projection is reopened, active seat restored and ended time cleared. Corrections to an undone event are rejected; a rescored category targets the newest non-undone score for future corrections.

Hosted Undo requires authenticated original seat, exact current game ID and room revision. Durable transaction updates room, archived game and receipt together. If the last score reopened a completed game/tournament, stale rematch readiness is cleared and standings exclude that now-incomplete game. A racing next-player score is protected by revision checks; no lost score or cross-seat rollback.

Future chronological analytics must ignore undone score targets and excluded turns in award projections while retaining their audit records. Category totals currently derive from the corrected sheets; do not count the original undone category as an achievement.

### Saved-session return

The opening screen and signed-in online home show **Resume saved games & tournaments**. The hub has Open and Completed views, labeled/color-coded cards for Paused, In progress, Between games, Waiting for players and Completed, plus game/tournament badges, mode, game progress, player aliases, category completion counts, host/guest role and turn clues. Totals stay hidden where configured; color is supplemented by text.

Both players sign in with their original accounts and select the same saved table. Returning reads existing room state; it does not create a room, change seats/names/host or unpause the tournament. Host chooses Resume tournament explicitly. The guest can reopen before the host and see saved progress while waiting. Existing member rejoin through the original link works even if the invitation is expired for new joiners.

An active/paused table can show its original QR and copy invitation link again. This is an alternative to the account-owned Resume list. QR Join still requires explicit confirmation; do not turn a scanned link into an automatic membership mutation.

The new sessions endpoint independently pages unfinished and completed member-owned tables, avoiding the old recent-30-table limit. Open tournament sorting is paused first on the assembled UI list. Each page is at most 20 with strict `(created_at,id)` cursor. Old `Your tournaments` and recent list paths remain for compatibility.

## Code map

| Area | Files and contracts |
|---|---|
| Pure game/rules | `src/game/core.js`: immutable commands, `undoableScore`, `undo-score`, correction audit, Competition final chain; `src/game/categories.js`, `src/game/scoring.js`: category definitions/totals |
| Room authority | `src/multiplayer/room.js`: authenticated member/seat, current game/revision/rules guards, Undo ownership, completion; `src/multiplayer/rematch.js`: own readiness/all-ready successor/winner starts |
| Tournaments | `src/multiplayer/tournament.js`: immutable configuration, pause/resume, cumulative standings, exclusion of reopened current game |
| HTTP service | `server/rooms/handler.js`: operations, auth/guards/capabilities, sessions endpoint; `server/rooms/supabase-adapter.js`: service-only store, member filters, strict paging, atomic history/receipts commit |
| Generated deployable | `scripts/build-room-function.mjs` generates `supabase/functions/game-room/index.ts`; never patch generated file as the source of truth |
| Online transport | `src/multiplayer/client.js`: Supabase Auth/recovery/config, requests/validation/watch; `src/multiplayer/ui.js`: sign-in destination, saved lists/rejoin/stable invitation |
| Shared web/native screen | `src/prototype.js`: scorecard, own Undo/confirmation, final-chain manual controls, invitation panel, clearing incorrect celebrations; `src/ui/tournament.js`: tournament banner/results/actions |
| Saved-session design | `src/multiplayer/session-cards.js`, `session-cards.css`: escaped account-owned cards, state labels, counts/turn clues and prominent entry |
| Results/energy | `src/ui/hosted-results.js`, `hosted-results.css`; `src/game/celebrations.js`; `src/ui/pulse.js`, `pulse.css`. Accepted scores animate; reload/correction/Undo do not replay awards; reduced motion supported |
| Local persistence | `src/core-store.js`: IndexedDB/recovery storage, separate from authoritative hosted data |
| Android | Capacitor shared assets in `dist-native`; package `com.fluiditygroup.diceclubhouse.dev`, MainActivity. Native distribution disables PWA service-worker updates and requires APK install |

## Backend/schema

Supabase project `ezgawsdmvuoqrxlfbgen`, Dice Clubhouse Dev, edge function `game-room`. Authenticated membership remains checked in the application. Legacy gateway JWT setting was already off and was not changed during this rollout. No credentials belong in this document or Git.

Deployed migrations:

1. `supabase/migrations/202609160001_rooms.sql`: rooms/member access.
2. `202610130001_hosted_game_history.sql`: full archived game snapshots, durable receipts and trusted transaction.
3. `202610140001_hosted_tournaments.sql`: frozen tournament contract/capability.
4. `202610140002_competition_final_chain.sql`: version-2 capability.

SW-018 and SW-019 need no additional migration. Existing game/history records are preserved. Full snapshots include category scores, bonuses, turns, score/correction/undo ordering and game-time player aliases. Category-only manual scoring does not measure physical dice rolls or elapsed physical decision time; bonus-chain reports are explicitly player-reported.

New request: `{operation:'sessions',view:'open'|'completed',before?:{createdAt,id}}` → `{rooms,nextBefore}`. Store filters authenticated membership server-side; body user ID is not trusted. Completion classification uses tournament completion for tournament tables and game/table completion for ordinary games. Cursor rejects malformed timestamps/UUIDs. Own Undo is capability-gated by manual Standard mode and durable-history backend support.

## Qualification and exact deliverables

| Item | Identity / evidence |
|---|---|
| Full configured gate | 624 tests, 76 files, no skips; web/native/function builds and unchanged source passed. `artifacts/engineering/2026-10-14T17-45-26-816Z-9ae29f37/report.json` |
| Initial gate retry | Restrictive sandbox caused EPERM resolving installed dependencies. Retried configured gate outside that sandbox and passed. Initial failure is not a regression pass |
| Disposable database | PostgreSQL 16.15, 24 checks passed; `artifacts/sw017-rematch/database-report.json`. Includes completed Standard tournament Undo, archive ended time, history/receipt transaction and standings |
| Backend deployed | LF-normalized SHA256 `78713e106f2e53aff44c5d818597a03a07d9875de4ba535ae5fa474531ae2672`; dashboard fresh reload/source readback matched. `artifacts/sw019-undo-return/backend-deployed.png` |
| Published web | gh-pages `92cf4891fb8c9b8970b3e20db711b7c03107f08e`; https://fluiditygroup-git.github.io/yahtzee-scorekeeper/ |
| Public web readback | index SHA256 `2577b07023ec6be01053b6557c7ff243aed42e9e6c176e40eb6ca19f11b30338`; index/entry/prototype/UI/client HTTP200, all byte matched. `artifacts/sw019-undo-return/web-asset-readback.json` |
| Auth smoke | Unsigned sessions request returned 401; no user scores or memberships mutated to smoke-test |
| Android candidate | `artifacts/sw019-undo-return/android-test-candidate.apk`; SHA256 `53ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36`; offline Gradle successful, 124 tasks/27 executed; package assets match. `apk-asset-check.json` |
| Pixel install | **Installed and verified after wireless readiness confirmation.** SW019 installed SHA256 matches the candidate and launch Status ok. Predecessor SW018 candidate SHA256 `95c28dfb51ab754ee1ee1e2702955af2db543ee56107e5cd344f4277b0f5c8a6` is historical evidence only |
| Built UI exercise | Fresh local preview: synthetic Standard two-player Yahtzee50 → turn handoff → Undo → original turn/Yahtzee open/0points → FullHouse25 → next player. Reload preserved replacement and did not replay celebrations. Screenshots `resume-entry.png`, `undo-confirmation.png` in SW019 artifact folder |

Meaningful regression coverage: `tests/score-undo.test.js`, `score-undo-http.test.js`, `undo-scorecard-ui.dom.test.js`, `saved-session-rejoin-ui.dom.test.js`, `session-cards.test.js`, adapter/open-list/tournament/rematch tests. Guest mocked rejoin after seven accepted scores preserves account seat, original alias, game identity, scorecard and host; paused return waits for host; pagination/auth destination/stable QR tested. Actual signed-in PostgREST paging and two-device testing remain open.

Task/release records: `docs/plans/SW-019-score-undo-session-return.md`, `docs/releases/SW-019-2026-10-14-undo-session-return.md`. Prior rollout: `docs/releases/SW-018-2026-10-13-open-tournament-return.md`; wider roadmap: `docs/plans/SW-017-sprint-design.md`.

The scoped software source/config/test backup is `artifacts/sw019-undo-return/software-source.zip`, SHA256 `5a8d0e72d0dc48950c08d71a1344637d04c455e8efb9f8cee1699f6ee3c8d46b`. It excludes environment files, secrets and ignored player data. It is a development backup, not a substitute for a reviewed source release.

The installation follow-up freshly identified the Pixel11 Pro XL and verified its predecessor installed hash against SW-018 before updating. `adb install -r` returned `Success`; the installed base APK hash then matched `53ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36`. `am start -W` for `com.fluiditygroup.diceclubhouse.dev/.MainActivity` returned `Status: ok`. No uninstall, data clear, account change or hosted gameplay mutation was performed. Connection IP/ports are deliberately omitted because they are ephemeral; discover them freshly.

## Safe verification, installation and rollback

Run Node24 `node scripts/engineering-check.mjs inspect` for inventory, `node scripts/build-room-function.mjs` before final gate when backend sources change, then `node scripts/engineering-check.mjs verify`. Do not edit source while the gate captures identity. Logs are ignored under `artifacts/engineering/`. Clean setup uses `npm ci` and `npm ci --prefix device/pi`; optional camera assets must be reported when omitted, not downloaded for this manual task.

Android: build native bundle, `node node_modules/@capacitor/cli/bin/capacitor sync android`, then existing JDK21/SDK/Gradle offline cache. Standard APK, not private hardware evaluation distribution. Data-preserving install only; do not uninstall, clear data or change permissions to solve an update.

ADB executable last used: `C:/Users/Fluid/AppData/Local/Android/Sdk/platform-tools/adb.exe`. Run `devices -l` freshly. Wireless pairing port differs from connection port; codes expire. Do not reuse old codes or publish them. After reconnect verify model/Android/package, capture predecessor APK identity, install exact candidate, verify installed base APK SHA256 and launch MainActivity. Record physical test results separately from successful installation.

Backend deploy uses the authenticated dashboard Code editor: save prior source privately, paste exact generated source via clipboard, normalize clipboard CRLF for SHA comparison, deploy only matching candidate, reload and verify deployed source. Do not read/copy service secrets or extract bearer tokens from browser storage. Web publishing uses `scripts/publish-test-web.mjs` and isolated ignored `artifacts/pages-publish`; it publishes built assets only, not the dirty source branch.

SW019 rollback baseline: previous backend LF SHA256 `67637dd6d23301d2f5a2736632f457b56d07dd519b82eb23ef89b45f18d24e8a`, saved raw clipboard `artifacts/sw019-undo-return/function-before.ts` SHA256 `6c0ae9540841571e51a3fa430f30a3e81f863a6a8e510a05b61bb09279d2d840`; previous Pages commit `69b13ed99419cb4142cbafd5044cb3c5784a5505`; prior SW018 APK retained in `artifacts/sw018-return`. Roll back as a compatible set while preserving schema/data. Never restore a pre-history writer or remove history/receipts/tournaments. Existing history-capable predecessor can retain new Undo audit records but does not expose the new Undo/session UI.

## Phone acceptance checklist

1. Confirm Pixel still has the verified SW019 APK; confirm guest web visibly shows Resume and current build. Sign in with original accounts, not funny names or a newly created account.
2. In manual Standard, deliberately select wrong Yahtzee50. Before the opponent scores, original owner undoes it; both screens must reopen Yahtzee and return the original turn. Score FullHouse25 instead. Opponent cannot undo owner's score.
3. Check next accepted opponent score closes the previous Undo window; a stale confirmation cannot overwrite it. Refresh/reconnect must show authoritative scores; retry does not duplicate Undo.
4. Start a three-game/two-player tournament; enter three or four categories per player. Host pauses; both leave/close. Reopen next day via Resume from either account. Cards show Paused, correct game number, original aliases/category counts and next-turn clue. Both open same table; guest sees original score/turn and waits until host resumes.
5. View original QR/link from resumed table and rejoin as existing guest; roster remains two, aliases/host/game unchanged. Completed tab shows completed games/tournaments distinctly; older unfinished tournament remains discoverable.
6. Complete one tournament game; both Play again at same table; winner starts. Verify cumulative points and wins agree with saved finished games. Undo eligible final Standard score before readiness advances; game/tournament reopen and standings remove incomplete game.
7. In a new Competition2 table, guest's final-category first Yahtzee50 opens three-roll bonus attempt. Failed roll1/2 stay active; Yahtzee renews +100/three rolls; three failures end only that player's chain. Preserve other unfinished player turns.

No physical acceptance for these new SW019 flows has been claimed. User previously reported three manual games worked except guest final Yahtzee chain; that defect was reproduced in saved results and addressed in SW017. Existing partial games are not disposable test data.

## Remaining development scope

- Account-wide hosted chronology/achievement analytics; tournament “who scored first/late” highlights with correct Undo/correction handling and explicit ties/measurement semantics.
- Manual metrics logger for rolled specialties even when category already filled; distinguish self-reported roll occurrence from scoring and avoid double counting.
- Player nickname editing for future games/tournaments with immutable game-time snapshots.
- Easier new-player registration/invitation/share via native share sheet/text/email drafts; sending messages requires explicit user authorization. Do not assume all-email delivery or exposed service credentials.
- Actual iPhone Safari/Add to Home Screen standalone acceptance and reliable update activation for existing cached clients.
- Broader analytics encouragement UI; avoid inventing “missed turns” or timing from unrecorded physical rolls. Define metrics before presenting them as facts.
- Camera/AI recognition, physical dice/BLE and commercial/independent review remain separate workstreams.

## Suggested first message for a fresh chat

“Continue the manual Yahtzee multiplayer/tournament work in C:\Codex\Yahtzee Game. Read AGENTS.md, docs/status.md and docs/handovers/2026-10-14-manual-multiplayer-tournaments.md. Preserve the dirty checkout. SW019 backend/web are deployed; APK is qualified and installed on the Pixel with its data preserved. First verify actual build/device state and help us test Standard Undo plus both-account partial tournament resume. Then continue the pending analytics/invitation work; do not change camera/AI recognition.”

