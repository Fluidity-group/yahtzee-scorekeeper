# SW-049: Compact scorecard and clear tournament Yahtzee turns

20 October 2026 / owner: product owner / engineering: Codex.
State: requirements gathered and source inspected; no implementation, deployment or physical acceptance.
Baseline: SW048 runtime 9424614, checkout artifacts/sw045/source, branch codex/sw048-tournament-moments. Preserve unrelated changes. Use a scoped branch for implementation.

## Purpose and owner playtest feedback

Current screenshot shows tournament “Cunt Cup v2”, game 8 of 12, code LQSVZ2YF, aliases Rollin/Malvin. This is screenshot evidence, not a fresh cloud observation; do not confuse it with the older completed L63GERUB tournament. Preserve both and inspect their identity read-only before testing.

Owner requests a compact phone scorecard and clear manual completion of repeat-Yahtzee turns. Current tournament and all memberships, scores, profiles and settings must remain intact. iOS installation stays on hold; notifications/worker/voice work remain deferred.

## Layout requirements

1. Put tournament name and compact game/player progress at the top. Consolidate branding/menu chrome rather than stacking three header rows.
2. Remove repeated “Malvin to play” strip: the active player's scorecard already highlights the turn. Keep an accessible turn announcement/label so color is not the only signal.
3. Replace visible “Online · code” text with a small connection indicator; connection state must also have a non-color label accessible on tap/to assistive technology. Put invitation code and sharing in the menu.
4. Remove tall Upper section/Lower section heading rows. Distinguish sections with restrained contrasting backgrounds while retaining semantic/accessible section labels.
5. Combine Bonus chase and Upper + bonus into one row using available width. Show upper subtotal once; at 63 points add the earned 35-point bonus to that row's total, with a brief award ribbon. Keep exact bonus status inspectable and honor hidden-total rules. No duplicated totals or tiny squeezed graphics.
6. Remove repeated grand total at the bottom; keep the scorecard header total authoritative and easy to see.
7. Preserve own-score priority, compact opponent column, readable horizontal per-category baseline/surplus indicators, latest-own-score edit/Undo and centered touch score dialogs. Respect saved text size, reduced motion and both light/dark appearances.

## Tournament rule requirements and unresolved decision

Owner confirms: first Yahtzee scores normally; subsequent Yahtzees award +100 and another turn. Tournament play uses **no Joker scoring**. Each successful final bonus attempt grants another three-roll attempt. If no Yahtzee is achieved in an attempt, that player's chain ends; the game finishes only after every remaining player's turns/attempts are resolved.

**One decision requires clarification before changing the first-final trigger:** on 18 October the owner specified a first final-category Yahtzee must NOT grant another series; SW048 implemented/tested/deployed that rule. Today's transcript describes a Yahtzee in the last turn granting another three rolls, without explicitly distinguishing first from repeat. Ask whether that includes the first-ever 50-point Yahtzee or only a repeat after an existing 50. Do not silently reverse SW048 or infer consent from elapsed time.

Expose clear actions during a manual final attempt: “Another Yahtzee” records +100 and renews the three-roll attempt; “No Yahtzee — finish turn” explicitly exhausts that attempt. No global End game control that bypasses opponents. Define the failed-attempt command/event rather than fabricating three physical dice observations; retain existing per-roll reporting compatibility and authoritative seat/revision/idempotency checks.

Source findings: src/game/core.js Competition defaults still contain joker:true; manual v2 sets finalChain/bonusRolls but inherits that setting. scoreOptions reports joker:repeat. final-chain-roll already tracks up to three reported rolls and renews on success. The final trigger was changed in SW048 to require repeat bonus. These are inspected source facts, not a reproduction of today's precise game. Reproduce with synthetic core/hosted fixtures before selecting a correction.

## Acceptance and verification

| Requirement | Observable criterion | Planned method | Actual state |
|---|---|---|---|
| Compact UI | Fewer header/section/summary rows, more score categories visible at the same viewport/text size; no clipped names or controls | Before/after 320/393/phone-sized browser captures, light/dark and large text | Pending |
| Bonus row | One upper total includes earned +35 exactly once; progress and surplus remain legible; no active hidden-score leak | DOM/pure scoring checks, threshold/Undo fixtures | Pending |
| Repeat turn | Repeat +100 grants another turn during play; no Joker category substitution | Core and authoritative hosted tests | Pending |
| Final attempt | Success renews; explicit failure ends only current player's attempt; remaining opponents continue; final game completion correct | Core/UI/server sequence and replay/idempotency tests | Pending |
| First-final rule | Trigger matches explicit owner clarification | Regression for first 50 and repeat, solo/two-player | Awaiting decision |
| Undo | Only latest own completed turn until next completed scoring turn; failure/success chain history remains consistent | Existing and new core/hosted Undo regressions | Pending |
| Preservation | No historical score replay, roster replacement, settings reset or silent paused-tournament resume | Protected read-only snapshots around any separately authorized rollout | Pending |

## Design, compatibility and execution bounds

No new graphics engine is needed for the requested compact DOM/SVG UI. Keep scoring pure and shared server authority intact. No Joker is a rules contract change, not a CSS change: determine versioning and handling of the already-started tournament explicitly. Do not rewrite frozen rules/history across all tables or replay past scores. Preserve old rule versions where required; if an active-table correction is necessary, prepare a narrowly scoped reviewed change with before/after identities before applying it.

Gathering requirements does not establish implementation/release completion. Implement after resolving the conflicting trigger. Run meaningful focused regressions plus the configured Node24 engineering gate for release preparation; regenerate server bundles if pure core changes. Pixel/web/server versions currently differ (SW048 Pixel/server, SW047 web); qualify a matching release before another rollout. Keep owner physical acceptance distinct from automated checks. No live score or cloud mutation occurred while preparing this plan.

## Implementation checkpoint — 20 October

Owner requested a testable version. Subsequent reply was interpreted back explicitly as: first or repeat Yahtzee on the final scoring turn opens a three-roll attempt, renew on each bonus success, end on a failed attempt. This supersedes SW048 repeat-only behavior prospectively; no historical games are replayed.

Implemented compact game header, accessible connection details, semantic upper/lower groups with background distinction, one wide upper-total/progress row including the +35 award ribbon and no repeated bottom grand total. Whole-attempt failure uses existing final-chain-roll command with finishAttempt:true; its durable event is explicitly scope:attempt with rollNumber:null, not three fabricated roll observations. Latest-turn Undo restores the attempt. Server advertises manualAttemptFinish so old servers cannot silently treat the new whole-attempt button as a single failed roll; legacy per-roll entry remains available.

New manual Competition rule snapshots use joker:false and scoreOptions now actually honors it for fixed-category substitution; existing stored rule objects remain unchanged. Rematch retains its exact prior rule snapshot. Thus existing tournaments with joker:true retain that stored contract until a separately reviewed change; do not claim those rules were migrated. New test games can exercise no-Joker immediately. First-final trigger correction is prospective command behavior and does not alter historical scores.

Focused core/DOM/HTTP checks cover turn handoff, actual confirmation, idempotency, ownership and Undo. Headless real Chrome local-only app test at320/393px: no page errors or width overflow; header55.45px, first frame124.45px; actual local Aces3 → Sam handoff and centered Sixes entry checked; reduced-motion reload checked. Evidence artifacts/sw049/browser-check.json and scorecard screenshots. CUA browser inventory unavailable; this is automated browser regression evidence, not owner physical acceptance. No live scores/settings/rooms edited.

Full engineering qualification, Android build and delivery evidence to follow. Pixel not reachable over ADB when freshly inspected; connection requested. No backend/web deployment, Pixel installation, iOS action or notification/paid provider call performed in this checkpoint.
