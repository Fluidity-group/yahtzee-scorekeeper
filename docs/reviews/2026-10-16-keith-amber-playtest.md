# Keith and Amber: spoken Yahtzee playtest

16 October 2026, America/Chicago. Owner requests listening and recording issues and desired changes during a game with Amber. Session open. Owner confirms Keith uses the installed Android app in tournament competition mode; Amber joins through the web interface on her iPhone. Clubhouse prototype is excluded. Exact APK, browser/version, tournament and game identifiers are unverified. Do not infer installed state from historical records.

Capture only observations conveyed in this conversation or separately verified evidence. User reports are not reproduced defects. No fixes, deployments, score entry or game data changes are authorized by this note-taking request. Existing SW038 UI implementation hold remains in force.

## Findings

### PT-01: put the next tournament game action first

- Speaker/source: Keith, spoken owner report; not independently reproduced.
- Context: Android tournament competition mode, completed-game results screen.
- Observed: useful statistics fill the page; reaching "Ready for next game" requires scrolling approximately two or three screenfuls.
- Requested behavior: show "Ready for next game" at the top as the primary next action; put additional options and statistics underneath. Retain the statistics.
- Impact: continuation of the tournament is difficult to discover/reach after a game. Proposed priority: high UX improvement for the core tournament flow; no scoring/data failure reported.
- Implementation/reproduction: pending; note-taking only during this playtest. When implemented, preserve readiness/seat checks and verify both Android host and iPhone web participant layouts without assuming both currently share the symptom.

For each finding retain: sequence, speaker if known, action/context, reported behavior, expected behavior or suggested change, impact, evidence source and unresolved details. Keep commentary wording/timing, scoring correctness and interaction usability distinct. Ask a short clarification only when needed; avoid interrupting play for optional details. At the end provide a prioritized review of fixes and design decisions, without claiming implementation.

### PT-02: improve scorecard text readability within the existing viewport

- Speaker/source: Keith, spoken owner report; not independently reproduced.
- Context: starting a game and viewing the players scorecard in the current tournament setup.
- Observed: scorecard/player information is a little difficult to read.
- Requested behavior: increase font sizes while retaining the current screen-size fit. Improve layout/spacing as needed rather than allowing larger text to overflow or clip.
- Scope clarification: exact labels/numbers and whether Amber sees the same issue on iPhone were not specified. Capture the current layout/viewport during later investigation; do not assume a requirement to squeeze every scorecard row into one screen if that is not the existing layout.
- Proposed priority: core usability improvement. Verification should cover both phone layouts, named player columns, readable scores/labels, touch targets and no horizontal overflow. Implementation pending; note-taking only.

### Session attribution and PT-02 clarification

- Owner confirms Amber reports her own iPhone interface in Safari; attribute her findings to iPhone/Safari rather than Android. Keith reports the Android app unless otherwise stated. Safari/iOS versions and iPhone model remain unverified.
- PT-02 owner clarification: readability and bigger/smaller sizing apply to either player. Provide an option to increase/decrease text size, with sizing/layout kept relative to the screen scale; retain readable, unclipped responsive fit on each phone. This supersedes PT-02 uncertainty about whether the requested improvement applies to both players. No setting has been implemented during note-taking.

### PT-02 screenshot evidence supplied

- Source: owner-attached 4168.jpg, `.codex-remote-attachments/01a13b9f-02fb-70f0-a65b-2738c89ed909/7f5c5732-a7ff-4837-9067-0117a66d2d46/1-4168.jpg`. Visible screenshot evidence only; app build and exact originating device not independently verified.
- Visible context: tournament game7of12, two players, Keith to play, new-game notice; scorecard beneath tournament controls. Own Keith column is highlighted; opponent header visibly truncates to "Mamd...". Do not equate that displayed label with Amber's profile without verification.
- Readability/layout evidence: opponent empty score outlines are very narrow despite available space to their right, own score column is compact, and the tournament control card occupies substantial vertical space before the scorecard. These are investigation/design observations, not a new owner instruction to remove controls or change player data.
- Use this as the baseline for responsive text sizing and column-width investigation. This is a new-game scorecard screenshot, not evidence of PT-01's completed-game next-action placement.

### PT-03: compact tournament heading and move secondary actions into a submenu

- Speaker/source: Keith, explicit spoken request, supported by supplied4168.jpg main-play screenshot.
- Context: tournament active-game scorecard, not completed-game results.
- Confirmed issue: oversized tournament header/control panel consumes too much vertical space, reducing visible scorecard rows. Owner confirms the screenshot's format needs correction.
- Requested behavior: retain tournament name, game count/progress and player count in a compact heading. Move Standings, Pause tournament, Invitation (QR/link), Exit to saved games and other secondary tournament links into an accessible submenu. Remove the large panel footprint rather than removing essential context or functionality.
- Impact/priority: high core-play usability; should increase scorecard visibility alongside PT-02 responsive readability/column sizing. Keep active turn and connection information usable.
- Verification pending: compare before/after same viewport, inspect extra scorecard rows visible, submenu discoverability/touch access and all existing actions, on Android and iPhone Safari. No production UI implementation performed. Existing clubhouse redesign hold does not erase these current-app improvement requests.

### PT-04: show upper/lower strategy and both players upper-bonus progress

- Speaker/source: Keith, explicit spoken request for next UI review; design exploration pending, no implementation during playtest.
- Requested behavior: visually distinguish upper section (Aces through Sixes) from lower section; graphically communicate each player's progress toward63 and the upper bonus, including opponent status.
- Owner strategic reference: three of each upper face gives63. Clarification for design correctness: this is a useful pace benchmark, not a requirement to have three in every category; higher scores in one can compensate for lower scores in another.
- Proposed review concepts: compact upper subtotal/63 progress meter for each player; points ahead/behind three-per-face pace across filled upper categories (sum(score - 3*face)); points still needed and open categories; bonus secured versus still reachable versus mathematically out of reach. Use text/icons alongside color. Do not label pace as probability or guarantee future rolls.
- Feasibility calculation proposal: current upper subtotal plus sum(5*face for unfilled upper categories) is a theoretical maximum for standard five-dice rules, not a prediction. Verify actual selected rules/bonus threshold before implementation. A full five-dice result and later category choice remain player's decisions.
- Keep own status legible and opponent status compact, aligned with scorecard roles. Compare phone layouts and avoid making the header tall again (PT-03). Show upper/lower subtotals clearly; no request to change rules or scoring recorded.
- Verification pending: above/below pace, compensating categories, exact63, bonus already secured, impossible remaining maximum, completed upper section, both Android/iPhone Safari, text scaling and non-color cues.

## Session close and next action

Owner ended this note-taking session and requested details for the next sprint, to approve before implementation. Scope/acceptance proposal: ../plans/SW-039-tournament-scorecard-usability-sprint.md. Four findings retained. No additional findings or independent runtime reproduction claimed. No implementation, deployment, account or game-data change during this session.
