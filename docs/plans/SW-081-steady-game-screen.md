# SW081: Stop idle game-screen redraws

3 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. Software defect fix; implemented and automatically qualified; physical acceptance pending. Isolated `codex/sw081-steady-game-screen` at `artifacts/sw081/source`, based on stack tip `bc1db15` (`codex/sw080-pixel-build79`, PR #13). Amber's worktree/branch are untouched. Installed phones remain build79; no deployment is authorised by this fix task.

## Report and reproduction

Owner reports constant graphical redrawing on both Android/iOS and is unsure whether it also affects local games. Both recorded packages contain shared web source3ff068b. A synthetic DOM reproduction using the real product and multiplayer controller fails on the baseline: after three ordinary three-second refreshes, the scorecard and portrait are replaced, with only the image URL token changing. Evidence: ignored `../reproduction.log` under the task artifact root. A65-second local-game idle control stays mounted; the reported local-game variant is not independently reproduced. Physical phone observation remains pending.

## Root cause and bounded change

`refreshTableAvatars` returned true for every successful request. The online controller interprets true as changed graphics and forces a full root render every three seconds on reaction-capable rooms, even at the same room/game revision. Signed portrait URLs also renew tokens for the same image. Additionally, repeated disconnected callbacks redraw the same disconnected screen.

Avatar setters now distinguish visible identity (owner/kind/preset/avatar ID/image origin and path) from refreshed credentials and metadata. They still retain the latest accepted revision and URL, and reject stale revisions. Peer refresh reports an actual appearance change; unchanged own-avatar reads no longer notify Home. Clearing account/peer scope still notifies once. Connection callbacks render only when connectivity changes. Visible own-avatar changes also update their current local/shared scorecard; account clearing is still handled by the existing account-session boundary. Polling frequency, authoritative revisions/seat checks, real score/reaction updates, account boundaries, popup timing and persistence are unchanged. No framework/rendering rewrite, dependency or native change.

## Acceptance and verification

- UI1: repeated successful idle polls retain scorecard/portrait nodes and focused unsaved score input, including renewed signed URLs. Integrated DOM reproduction fails before the fix and passes after it.
- UI2: genuine new portraits/image availability and real room revisions still display; offline/reconnect still blocks/restores scoring, repeated offline polls do not redraw. Covered in the product-controller regression.
- UI3: local manual scorecard remains mounted over65seconds; own/peer caches retain renewed URLs and newest revisions, account clear/replacement still works, failed avatar requests preserve saved graphics. Seven focused avatar-cache tests plus the integrated idle test. Review additionally reproduced a delayed own-avatar display after suppressing forced polls; real own-avatar changes now refresh the relevant scorecard while unchanged reads remain silent. The integrated local/shared-avatar assertions fail without this follow-up; evidence: `../own-avatar-reproduction.log`.
- Focused gate:67tests across11files passed, including avatar stability/animation, account-session, scoring, reactions, lobby and commentary wiring. Evidence: `../focused.log`; synthetic fixtures only, no live requests or phone data.
- Clean `1f5bbad3202a24a97295683d755254e0dc52467e` Node24.15.0 full gate passed: **1,464 tests,13 optional camera skips, all configured web/native-web/Edge builds, unchanged source**. Source digest `60658be529536111c459720797bfb1f04b4e569db3d161dadc59beab51b05fde`; evidence `artifacts/engineering/2026-11-03T15-12-59-145Z-47e85dc0/report.json`. No native compilation or physical phone testing was performed for this shared-JavaScript fix. Physical iOS/Android idle graphics, scoring and reconnect acceptance remains required after an independently authorised build/install.

## Completion and rollback

Current changes are three shared source files and eight new behavioral regression cases; status/memory/handover record this candidate separately from installed build79. Native adapters, game rules/storage, backend/web and update feed are unchanged. Reverting this scoped source change through a reviewed PR restores previous rendering behavior; do not uninstall/clear data for rollback. No independent review or physical acceptance is implied by Codex self-review.
