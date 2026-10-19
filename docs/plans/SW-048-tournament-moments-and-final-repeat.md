# SW-048: Tournament milestones and repeat-only final Yahtzee

18 October 2026 / owner: product owner / engineering: Codex; independent reviewer unassigned.
State: implemented and development-verified; no deployment or physical acceptance.
Baseline: runtime b9ed275; continuation checkout artifacts/sw045/source, branch codex/sw048-tournament-moments.

## Purpose and requirements

Owner completed their tournament without a clear final-game notice or tournament winner explanation. Owner also reports the first Yahtzee on a final turn incorrectly opening more rolls. Confirmed rule: only a repeat after an already-recorded 50 qualifies for another three-roll series; each further Yahtzee renews it. First Yahtzee scores normally and play passes/finishes normally.

## Acceptance and verification

| Requirement | Observable criterion | Method | Actual evidence / state |
|---|---|---|---|
| R1 | First final-category Yahtzee scores 50 without an extra series; unfinished opponents continue | Core and hosted UI regressions | Pending |
| R2 | Repeat final-turn Yahtzee scores its category/+100 before three-roll series; success renews; three failures end it | Core/UI/authority regressions, Undo | Pending |
| R3 | Final scheduled game and game count are clear during play and before readiness | Tournament banner/results DOM | Pending |
| R4 | Completed tournament prominently explains points and games-won winners, ties and margins | Synthetic standings/UI tests | Pending |
| R5 | Bounded game celebration explains score/margin; tournament outcome persists after refresh | UI/unit checks and browser review | Pending |
| R6 | Preserve real tournament, accounts, history/settings; iOS/push/voice remain deferred | No cloud/storage writes; scoped changes | In progress |

## Design and impact

Fix prospective v2 command behavior, preserving frozen rule objects and historical events/scores. Existing stored final attempts remain finishable. Do not replay or migrate completed games. Update visible rule wording and meaningful tests that previously enshrined the first-Yahtzee trigger. Shared pure core feeds hosted generated function; live backend/client rollout requires separate authorization and matched qualification.

Use persistent final-game/completion cards and independent points/wins summaries from authoritative completed-game standings. Never infer a single overall winner or expose hidden active-game totals. Show loading rather than invented winners while standings refresh. Reduced-motion must keep readable result facts without effects. No APNs/FCM notifications, worker, paid voice generation or iOS build/install.

## Completion and decision

Open. Root-cause source evidence: src/game/core.js finalYahtzee condition explicitly accepts a first final-category Yahtzee; tests/competition-final-chain.test.js and final-chain-ui.dom.test.js require that behavior. Tournament completion currently appears below the individual game heading and has no prominent winner explanation. Preserve pre-existing root changes. No release gate passed by this record.


## Execution evidence — 18 October

- New first-final-Yahtzee regression failed twice on the baseline: expected no chain but received seat0/attempt1, for solo and two-player cases. Corrected trigger requires options.bonus>0. Repeat, renewal, failure, seat/protocol/idempotency and Undo tests use genuine repeat fixtures; synthetic commentary replay/outbox fixtures adjusted only, no commentary runtime feature work.
- Live read-only observations under artifacts/sw048: tournament-observation.json and completed-results.json. Revision359, all12games completed; original memberships present. Keith2,887points/5wins; Mamdami2,853points/7wins. Saved games contain no first-final-category-50 chain trigger; the exact owner interaction is not reconstructed from this data. Code-level rule mismatch is reproduced independently. No cloud/storage writes.
- Node24.19.0:1,129 tests passed,13 optional camera skips; web/native/iOS-web/room/commentary builds passed. Initial gate artifacts/engineering/2026-10-18T21-27-05-572Z-b4912992 is not a pass: generated tracked server bundles changed its source hash. Stable rerun passed: artifacts/engineering/2026-10-18T22-14-11-265Z-ee91520f/report.json. Worktree is a development candidate, not a clean qualified release.
- Synthetic real-Chrome component review:320/393px, complete/final/next-game surfaces, no width overflow/page errors; reduced-motion facts remain visible. artifacts/sw048/browser-check.json and six PNGs. This is component/layout evidence, not actual two-account phone acceptance or native install evidence.
- R1–R4/R6 covered by source regressions/no live writes; R5 game-winner/margin/tie facts tested, persistent awards reviewed. Physical celebration feel, screen-reader announcement and two-phone acceptance remain open.
- No Android APK build/install, web/backend deployment, iOS build/install, push delivery, worker start or paid provider request. Any matching client/server rollout requires task-specific authorization and exact manifests. Existing completed tournament will not be rewritten.


Completion: stable Node24 development gate passed (1,129 tests/13 optional camera skips/all configured builds); source SHA256 0c22373ce1574370de0df24e042daf96fa01771e9e566acf023951b59213e2d1. Source unchanged during that run. Subsequent edits are these evidence/status records only. git diff --check passed. Shared core plus generated room/commentary bundles are prepared locally; live backend/web/Pixel remain unchanged. Screenshot visually reviewed: artifacts/sw048/complete-393.png. Preview server stopped. Independent release/phone acceptance remains open.


18 October SW048 follow-up: saved scratched scores now show one large diagonal cross across the frame, with no visible 0/SCRATCH label or warning tint; own and opponent scorecards retain accessible zero-point labels and existing edit behavior. Existing scorecard checks:20 passed. Display-only source change after the prior full gate; not deployed, release gate/phone visual acceptance pending.


## Authorized rollout — 19 October

19 October SW048 installed/deployed under explicit owner authorization: clean9424614/Node24 gate1,129passed/13optional skips/all builds; Android49assets matched. Pixel install-r/readback hash/launch verified; app-private storage byte-preserved before launch. game-room ACTIVEv11/readback canonical match/unsigned401; commentary remainsv10. Full room/game/profile-settings/account fingerprints preserved4rooms/15games/4accounts; completed tournament12/12/revision359/bothmemberships intact. Web unchanged, iOS on hold, push/worker off. Physical phone acceptance open (black screenshot). See docs/releases/SW-048-2026-10-19-pixel-and-room.md.
Implementation, clean qualification, Pixel install and backend deployment are now verified. Earlier not-deployed/development-candidate entries are historical. Physical acceptance remains open; see the exact release record.
