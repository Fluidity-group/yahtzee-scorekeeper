# SW-039: tournament flow, readable scorecards and upper-bonus progress

16 October 2026. Product owner: Keith; participants: Keith on Android app, Amber on iPhone Safari. Lead: Codex. State: implementation approved and completed for review; live deployment and physical acceptance pending. Evidence: [spoken playtest](../reviews/2026-10-16-keith-amber-playtest.md) and attached4168.jpg. SW038 clubhouse direction stays on hold. Existing games/accounts/settings must be preserved.

## Outcome and scope

Improve the current app's tournament flow and strategic readability on both phones. Keep its present visual identity and centered score-entry interaction. Four acceptance-driven deliverables, mapped directly to PT01–04. No engine/framework rewrite, commentary/provider change, glasses/camera work, score/rule change or database migration planned.

### S39-01: next-game action first (PT01)

On a completed nonfinal tournament game, show compact result context followed immediately by the primary Ready for next game action and readable readiness state, before highlights/statistics/standings. A player who is already ready can withdraw; waiting names remain visible. On final game show tournament completion/final standings instead of an extra-game action. Paused, offline, unsupported, nonmember and busy states retain current restrictions. Keep all existing statistics below. Fix any surrounding page order that still forces scrolling through the full finished scorecard to reach continuation.

Acceptance: at normal supported phone portrait viewports the eligible readiness action is in the first visible results viewport, without scrolling past statistics. Test two authenticated seats, readiness/withdraw, all-ready single transition, final ceiling, pause/reconnect and reopened completion where currently supported. Reordering does not create an automatic next game or bypass server checks.

### S39-02: compact tournament bar and action drawer (PT03)

Replace the tall tournament action card with a compact heading: tournament name, Game7of12,2players, Tournament actions button. Long names may wrap safely. Move Standings, Pause/Resume (host only), Invitation QR/link and Exit to saved games into a themed drawer consistent with existing app controls. Keep turn and connection states legible. Essential pause/offline state must not disappear into a closed menu. Do not hide actionable recovery behind a disabled control.

Acceptance: screenshot comparison at the same viewport shows more usable scorecard space and a smaller tournament region; record measurements. All previous actions remain available with original role/state restrictions. Drawer supports touch, accessible name/expanded state, focus containment/return, Escape and Android Back through existing dialog routing, safe areas and background-scroll control. No accidental backdrop scoring or orphaned modal state during remote updates.

### S39-03: readable, adjustable scorecard (PT02)

Increase default label/score legibility. Offer Compact, Comfortable (default), Large as initial proposed text-size presets in display settings; keep values adjustable during implementation after phone review. Save this nonsecret preference on each device using existing preferences conventions, without changing another player's display or cloud game state. Respect browser/OS text scaling and zoom; do not disable zoom to force fit.

Use available table width deliberately: own score fields dominant, named opponent fields compact but readable and aligned on the same category row. Remove the thin opponent field/unused-space symptom visible in4168.jpg. Show full names through safe wrapping or an accessible detail affordance. At small widths trade decorative padding/secondary detail before shrinking essential text. Category labels may wrap. Vertically scroll the scorecard; do not promise all13rows on one phone screen. For larger rosters retain explicit comparison scrolling/selection instead of compressing every player into tiny columns.

Acceptance: all three sizes on320/360/390/430px widths, desktop, landscape and actual Pixel/iPhone Safari; no page-wide horizontal overflow, clipped required text, overlapping columns or undersized interaction targets (proposed44CSSpx minimum). Input remains centered and usable with keyboard/safe areas. Preference survives reload/restart and does not change scores, account, voice settings or remote user's preference. Eight-player comparison remains accessible; common two-player view gets priority.

### S39-04: upper/lower hierarchy and graphical bonus status (PT04)

Introduce clear Upper section and Lower section boundaries. Show upper subtotal and bonus status near the Aces–Sixes section, lower subtotal at the lower boundary and unambiguous grand total. Put graphical bonus progress inside the scorecard structure, avoiding a new tall page-top card. Each player gets a compact meter/text; own information prominent, opponent information smaller in the corresponding column.

Proposed first design:

- Meter: 48/63, caption 15 needed, +35 bonus at63.
- Pace: +3 versus three-of-each for filled upper categories. Offer a short explanation on tap rather than permanent paragraphs.
- State: Still possible / Bonus secured +35 / Out of reach. Text/icon accompanies color. No probability or prediction language.

Compute from accepted current sheets using pure derived facts, not independent stored totals. Threshold63 and award35 match current scoring.js; share existing rule constants/helpers rather than invent separate scoring authority. Three per category is a benchmark, never a per-category requirement. Pace = current upper sum minus sum(3×face for filled upper boxes). Zero is filled, undefined is open. Example: filled Aces–Fives totaling48 are+3 against45; Sixes remain,15points needed. Theoretical remaining maximum = sum(5×face for unfilled upper boxes) under the current five-dice rules. Below63 with upper+remaining_max<63 is out of reach; otherwise still possible. At or above63 is secured. A completed upper section below63 cannot earn the bonus.

Acceptance: fixtures for empty sheets, exact63, over63, compensating strong/weak categories, scratched zero, incomplete-but-impossible, completed-and-missed, correction and supported Undo, remote update and reconnect. No double-counted bonus in grand total. All facts must respect existing hidden-total modes: do not leak opponent upper subtotal/pace or reveal concealed information. Verify Competition v2 final-category bonus chain display and controls remain usable; this UI sprint does not extend Standard-only Undo into Competition.

## Source baseline and implementation boundaries

Read-only current-root inspection16October: src/ui/hosted-results.js renders continuation after final scores, highlights and tournament standings. src/ui/tournament.js renders all tournament actions inline. src/prototype.js renders the core score table with categories and bonus rows; src/prototype.css owns compact columns. src/game/scoring.js computes upper>=63→35. These explain source ordering/structure; exact installed APK and cached iPhone build remain unverified. Root has pre-existing unrelated edits; use a scoped source baseline/worktree once implementation is approved, preserving all current work.

Expected ownership: UI/results/tournament modules and prototype styles/rendering; small pure derived bonus-progress helper; existing preference layer; focused tests. No authoritative room/server modification expected. If source investigation reveals a required authority change, record it as separate scope before proceeding.

## Delivery sequence and gates

1. Capture current Android/iPhone layouts, exact versions and viewport; establish scoped source baseline and fixtures. No need to finish or alter the owner's live game.
2. Implement top continuation and compact tournament menu with role/state regressions.
3. Implement responsive scorecard/text presets and upper/lower/bonus design. Retain source-backed screenshots for comparison.
4. Run meaningful pure/DOM regressions, browser interaction and responsive checks. Node24 engineering verify before release preparation; report optional camera skips separately. No tests merely asserting CSS implementation details.
5. Bring review captures and measured acceptance results back; prepare identified APK/web artifacts. Install/publish only with task-specific authorization. Fresh Pixel inspection, data-preserving install and actual iPhone cached-client activation are separate deployment evidence.
6. Owner retests a two-phone tournament: play, see bonus status update on each seat, finish, ready/withdraw, next game and final completion. Actual iPhone Safari touch/zoom and Pixel readability are physical acceptance, not inferred from Chromium emulation.

## Risks and safeguards

- More/larger text can reduce rows visible: combine header-space recovery with flexible columns; preserve vertical scrolling and show before/after at each size.
- Progress graphics could reveal hidden scores: honor visibility contract per viewer; test suppression, including tooltips/accessibility text.
- Reordered readiness can retain stale state: derive from exact game/revision; preserve busy/disconnect and server idempotency fences.
- Menu rerenders can discard focus or leave overlays: verify remote changes, Back/Escape, dismiss and focus restoration.
- Existing cached iPhone assets may delay acceptance: test real service-worker update without clearing account/game data or interrupting pending input.

## Completion record

Planning completed16October: playtest findings mapped, current source inspected, proposed implementation/acceptance documented. Tests/builds/deployment/physical acceptance not performed for this sprint. Owner approval of this scope is the next gate. No automatic sprint start, account action, provider usage or game-data changes.

## Approved implementation and review candidate — 16 October

Owner approved with "Yes continue". All four scoped items implemented in isolated codex/sw039-tournament-usability from43f16a7. Runtime source uses existing authoritative commands; no game data/provider/deployment changes. Release candidate and detailed checks: [SW039 review record](../releases/SW-039-tournament-scorecard-usability.md). Initial full gate1,084passed/13optionalcamera skips/all configured builds; APKc9621a2a/38matchednativeassets. Clean committed-source audit is tracked in the ignored release manifest. Real Pixel/iPhone Safari acceptance, native Back and cached-client activation remain open; live update needs the separately scoped owner authorization. SW038 redesign remains on hold.
