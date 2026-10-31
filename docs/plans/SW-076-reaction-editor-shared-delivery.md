# SW076: Table reaction editor and shared score popups

31 October 2026. Owner: Dan. Implementer: Codex (fluidity on fg-dev). Independent development-agent review: independent_engine_avatar_review; findings/recheck recorded below. Human release approval is separate.

State: implemented, focused verification in progress; not deployed or physically accepted.
Baseline: bbfdec4630bc676d700b241bef2b8870d0a0c414 on codex/yahtzee-integration. Isolated implementation: codex/sw076-reaction-editor-delivery in artifacts/sw076/source. Shared coordination checkout stays untouched. Parent review is draft PR #8; master remains9179f73 until owner-approved Android/iOS testing.

## Requirements and acceptance

| ID | Observable requirement | Verification / actual evidence |
|---|---|---|
| RX1 | Author chooses scorer UUID, frame and any/exact/at-least/at-most/inclusive-range score condition. Chance=23 supports “Michael Jordan’s number!”. | configurable-reactions.test.js and reaction-editor.dom.test.js cover exact23/neighbours, range boundaries, invalid bounds and actual form payload. |
| RX2 | One score popup contains scorer/frame/value and scorer avatar. Selected accounts receive custom caption/animation/sound; other members retain standard popup. | reaction-delivery.dom.test.js uses the production renderer with synthetic members; no separate custom popup system. |
| RX3 | Settings survive reads/reloads and table rematches; future-only configuration revisions. Each member edits/removes only its own rules; host can pause all custom reactions. | room-reactions.test.js real HTTP handler, actual SQL persistence/RLS script; rematch coverage to be recorded. |
| RX4 | Accepted score and delivery intents commit atomically with history and durable request receipt. Reject stale game/room/config, unauthorised actor and changed-payload retries. Corrections/Undo cancel rather than re-trigger. | room-reactions.test.js; scripts/test-room-reactions-db.mjs passes6disposable PostgreSQL checks. |
| RX5 | Delivery retires on room/account/game/visibility changes; repeated snapshots/reloads cannot repeat a claimed popup. Explicit silent/still choices and device mute/reduced motion apply. | reaction-delivery.dom.test.js; avatar-video-presentation.dom.test.js; multiplayer-ui.dom.test.js. |
| RX6 | Run full configured gate, preserve phone/backend state and report actual platform limits. | Pending final clean-source engineering gate. No device/backend/provider actions authorised or performed. |

## Design and boundaries

src/experience/reactions.js compiles immutable definitions and evaluates accepted facts without DOM/network/score mutation. Exact values and inclusive min/max conditions are independent of score legality; the existing game engine remains authoritative. The game-rule builder/versioned gameplay interpreter from SW075 is still a later slice, not implemented by this editor.

src/experience/room-reactions.js applies authenticated ownership and config/room/game revision checks. server/rooms/handler.js validates the request, obtains a durable receipt, then commits room settings or accepted-score popup/intents through the existing room/history/receipt transaction. No schema migration, second database, realtime channel or client write permission is added. The generated game-room bundle is rebuilt from server sources. Competition v2 requests retain the current rulesVersion contract.

Settings belong to the table, survive its next games and are bounded to32rules with at most one action of each type. Account UUIDs determine author/scorer/audience; aliases are display labels. Supported audiences: scorer, all others, everyone, selected members. All members can read shared room settings; targeted playback is not confidential messaging. Last saved matching action wins per action type in deterministic rule order. Delete/disable/host pause cancels pending custom actions while retaining default score presentation. Edits otherwise affect future accepted scores only.

One renderer supplies both standard and customised popups, retaining the scorer/frame/value line and bonus/completion information. Ordinary score popups do not add a scoring lock; recovered special announcements keep their existing four-second authoritative pacing. The editor previews text/avatar locally without posting a score, creating media or invoking paid providers. Registered existing avatar clips are optional; a static avatar/motion fallback remains usable when a clip is unavailable. Sound and reduced-motion preferences remain local.

Persistent claim-before-play stores only event identifiers and expiry locally, scoped per authenticated account/device. It establishes at-most-once attempts, not exactly-once audible output or offline push delivery. No browser autoplay, network or OS guarantee is invented. Fail closed on unavailable claim storage. Realtime carries the shared state; updated clients poll every3seconds as fallback rather than the older15second interval.

## Evidence and remaining gates

Focused editor/handler/pure matcher/delivery/multiplayer tests:51passed before final review changes. Actual SQL via PGlite0.5.11 and existing room/history/tournament migrations:6checks passed (config/receipt, score/popup/intents atomicity, replay collisions, stale-CAS no-write, member read/nonmember denial, client write/RPC denial). Synthetic data only; no hosted database touched. Report: artifacts/sw076/reaction-sql-report.json in the task worktree.

Initial unrestricted-scope Vitest attempt under the sandbox passed1,336tests/13optional camera skips but failed4existing HTTP/Git boundary tests because listeners/child Git were denied. This is not a passing full gate. Re-run with the required reviewed execution permissions; do not weaken tests or change their timeouts.

Independent review identified a Competition v2 request missing rulesVersion; the mutation adapter now sends the current game’s version, with handler and client regressions. Review/recheck and final clean-source gate identities are pending completion.

Android APK compilation, iOS Xcode/signing, real cross-phone animation/audio/account return and complete played-game acceptance remain distinct. No phone installation, account/avatar generation, backend function publication, database migration or provider configuration occurred. Owner holds deployment; Mac secure access is not ready.
