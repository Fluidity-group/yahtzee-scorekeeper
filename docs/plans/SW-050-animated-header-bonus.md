# SW-050: Animated upper-bonus header

20 October 2026 / owner: product owner / engineering: Codex.
Baseline: SW049 runtime d50ad05, deployed Pixel/web/room; implementation branch codex/sw050-header-bonus-graphic.
State: implementing; deployment and physical acceptance pending.

Owner reports lost bonus animation after compacting. Replace Scores/Aa in category header with an animated bonus dashboard: progress toward63, signed points above/below three-of-each pace, remaining open upper frames, clear four-dice reachability. Move text sizing exclusively to the existing menu. Preserve phone layout, hidden totals, category indicators, rules/Undo and all accounts/games/settings.

Reachability is arithmetic, not odds: fourDiceMaximum = accepted upper subtotal + sum(4 × face for each still-open upper frame). If below63 with frames open, mark “4-dice out”. Keep existing five-dice legal maximum separate, so a four-dice miss is not falsely called legally impossible. At exactly63 on the four-dice ceiling, stay reachable. Secured bonus takes precedence. Recompute after score, correction and Undo; disclose exact figures in details. Do not prohibit legal five-dice upper scores or change score/rule authority.

Restore a visible SVG progress arc (Playform previously globally hid ring elements), a signed pace badge/centered balance track, open-frame indicators and bounded accepted-score/bonus animation. Keep remaining-points display separate from the numerical upper total row to avoid repeating the same subtotal. Retain the header throughout scroll. Respect reduced motion; rerender/reconnect alone must not trigger accepted-score celebration. Shared-phone ownership follows the featured player; remote opponents remain read-only. Hidden active-game totals must reveal none of these derived values.

Acceptance: meaningful pure threshold tests (four-vs-five ceiling, exact edge, secured/open, correction/reopen), DOM header/menu/hidden/seat tests, pulse cleanup tests, phone320/393px light/dark/large-text review. Run Node24 gate before release. Preserve live fingerprints and app storage for any authorized test update; no backend rule change required. Separate automated build, deployment and owner physical acceptance.

## Implementation evidence — 20 October

Replaced Scores/Aa with a 72px SVG dashboard: visible animated ring, points remaining, signed pace/balance bar, open-frame tiles; “4-dice out” versus truly “Bonus out” versus “Secured”. The upper subtotal row retains only its total/award, removing the duplicate progress bar. Existing menu already had the persistent text-size setting; header shortcut removed. Hidden totals suppress the dashboard. No game authority, frozen rule, score, Undo or server contract change.

Added fourDiceMaximum/fourDiceReachable/fourDiceState to the derived progress helper, preserving existing legal five-dice maximum/state. Regression fixtures include subtotal33 with only Sixes open (four ceiling57, five ceiling63), exact four ceiling63, corrections/reopen, surplus compensation, secured bonus with open frames, seat mapping, hidden data and menu location. Accepted bonus pulses mark header and subtotal award together; upper score pulse only on accepted upper categories. Tests assert cleanup and reconnect suppression.

Focused checks33passed; actual Chrome local app320/393px: no overflow/errors, real local Aces3 handoff and centered scoring, header55.45px/first frame132.95px. Four-state SVG fixture reviewed; ring opacity1 verifies Playform no longer hides this arc. Found and fixed large positive pace label overlap and explicit warning/secured stroke color specificity. Artifacts/sw050 contains screenshot/JSON evidence. Full clean qualification and delivery remain to follow; no live game/account/settings changes made by implementation.
