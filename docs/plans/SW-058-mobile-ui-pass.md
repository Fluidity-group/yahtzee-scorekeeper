# SW-058: Compact setup and mobile readability

Date: 23 October 2026. Owner/requester: Amber/Dan. Developer/reviewer: Codex (self-review only).
State: implemented; automated verification passed. Device/visual acceptance open.
Project: software, isolated codex/amber-ui-lab; source baseline 3c9ee0f. No deployment or main promotion.

## Purpose and requirements

Continue the approved YAHTZ Midnight Casino aesthetic and review user annotations against the existing application. Keep the homepage expressive and play/setup surfaces readable. Preserve rules, scores, saved tables, authority, theme and device display preferences.

| Requirement | Acceptance | Evidence/state |
|---|---|---|
| SW058-1 | Solo/local setup exposes names and Start first; game and commentary options expand on demand. | New local-setup DOM flow passed. Actual mobile geometry pending. |
| SW058-2 | Typed names/profile survive player-count changes; collapsed choices submit Competition v2/manual/hidden totals correctly. | Integration regression passed; actual saved object asserted. |
| SW058-3 | Category column yields space to own/peer scores; upper indicator remains readable and accessible. | Category/own/peer widths 40/40/20, phone indicator stacked at unchanged 70x22 size; semantic scoring/bonus/peer tests passed. Physical readability pending. |
| SW058-4 | Shared dialogs, lobby, results/history and Home support readable text, long names and keyboard focus. | Scoped CSS review; existing flows passed. Light/dark, keyboard and touch visual acceptance pending. |

## Design and impact

Extract setup renderer from controller; retain existing form names, creation handlers, device availability checks and optional profile fields. Native details provide progressive disclosure with keyboard support; collapsed controls remain enabled. Initial setup one column with a 480px content cap. No changes to scoring or account/backend contracts.

Scorecard keeps user-selected text-size variables and true upper bonus semantics. Stack label/indicator below 600px rather than shrinking the graphic; return inline at wider sizes. Own scores receive 40%, peers 20%. Dialog inputs/selects/textarea use 16px to avoid small-text phone zoom. Preserve static neon art, existing theme tokens and reduced-motion handling; body/play labels use system typography. Online/results list text wraps, secondary Home/lobby descriptions enlarged. No change to ready commands or multiplayer authority.

## Risks and bounds

SW058-R1: Narrow columns and long/localized names can crowd real phones. Moderate usability risk; retain size controls and comparison navigation, require Amber touch/visual review at 320/393/448px in both themes and with large text. No browser automation workaround: earlier browser access was denied; source/DOM/HTTP evidence does not establish pixel geometry.

SW058-R2: Collapsed options could silently lose selected rules/player context. Mitigated by integration test submitting collapsed advanced options and asserting saved game. Hardware/camera availability checks unchanged; no physical tests claimed.

## Completion and decision

61 focused tests passed across setup, local/online scorecards, bonus, Home/Resume, multiplayer UI, Midnight preferences and venue selection. First sandbox Vitest attempt failed before test collection due temporary-cache rename EPERM; same checks outside sandbox passed. Full Node24.19.0 gate passed:1,175 tests passed/13 optional camera skips; all configured web/native/iOS/edge/room builds and source-stability check passed. Evidence artifacts/engineering/2026-10-24T04-03-21-474Z-3a5f0fa4/report.json. Isolated lab build and LAN/HMR passed. Only completion records changed after verification; application source unchanged. User review still required for on-device visual quality, keyboard/safe areas and touch targets. Existing shared location/avatar provider/event phases remain separate unresolved work; this pass does not invent their requirements.

## Slot-machine cabinet follow-up — 23 October

Amber requested a recognizable slot-machine design for the game chooser. Replaced the plain header with a bulb-trimmed marquee; added four inset reel windows, larger mode symbols, static decorative lever and payout tray. Existing four buttons/actions, labels, keyboard focus and theme tokens retained. No randomized selection, timers, flashing effects or game-rule changes. Decorations are aria-hidden and lever ignores pointer events. Five focused tests across four Home/setup flow files passed; isolated lab build passed. LAN/HMR check passed. This visual-only follow-up has focused evidence; the earlier full-gate result applies to 04b0dfc, not this later styling revision. Phone visual/touch acceptance remains open.
