# SW-022: Premium clubhouse motion and color review

Date: 14 October 2026. Owner: product owner. Lead designer/developer: Codex.
State: interactive local concept implemented and browser-checked; premium clubhouse direction selected by user. Detailed design agreement and production implementation pending. No deployment or gameplay acceptance advanced.
Project/gate: SW design review / proposed G1 criteria; no gate pass inferred from a concept.
Baseline: existing SW-019 manual multiplayer implementation; shared `src/ui/pulse.js`, `pulse.css` and `src/game/celebrations.js` reviewed. Dirty checkout preserved. SW-021 commentary research remains a separate workstream and was not overwritten.

## Purpose and requirements

User requests more color, animation, excitement and category-specific anticipation, followed by the next development sprint once the UI direction is agreed. User explicitly selected premium clubhouse: glowing colors, satisfying pulses and special big-score moments.

Scope now: executable design review, proposed motion language and sprint preparation. App integration begins after design agreement; deployment still requires task-specific authorization. No live tables, account data, paid sound generation or camera/AI recognition changed.

## Acceptance and verification

| ID | Observable criterion | Actual evidence | State |
|---|---|---|---|
| SW022-R1 | A usable interactive premium-color prototype | `docs/reviews/2026-10-14-clubhouse-pulse.html`; mint/violet/sunset palette controls and Calm/Signature/Showtime controls | Implemented |
| SW022-R2 | Accepted demo scores produce differentiated frame/category effects | Browser: Full House25 shows five 3+2 emblems, Yahtzee50 headline/five emblems/28 Signature particles; Showtime64 particles; upper fixture48 + Fives15 reaches63 + bonus35 =98 | Checked |
| SW022-R3 | Replay changes no score; correction/Undo remain quiet | Browser: FullHouse25 + Yahtzee50 =75; replay stays75; Yahtzee correction0 gives25/zero particles; demo Undo restores75/zero particles | Checked |
| SW022-R4 | Reduced motion retains facts without moving effects; zero is neutral | Browser: reduced LargeStraight40 gives static title, no `fx` class or particles; zero reports next frame without particles | Checked |
| SW022-R5 | Phone layout and rendering are reviewable | Desktop and390×844 viewport rendered; phone document375px within390px viewport; FullHouse accepted from scorecard and visible at celebration stage. No browser error/warning logs in focused run | Checked / physical open |
| SW022-R6 | Production sprint boundaries and choices are explicit | Proposed sequence below; no application source edits | Designed / owner review pending |

## Design and impact

Use existing confirmed-event hooks rather than replacing pure rules or room authority. Proposed motion hierarchy:

- Everyday accepted score: frame landing, one ring, small total emphasis,450–800ms.
- Full House:3+2 dice formation; straights:ordered sequence; three/four kind:matching groups,700–1500ms.
- Yahtzee:gold headline, five emblem dice, contained particles; upper bonus:distinct +35 reveal,1200–2200ms.
- Zero/scratch:neutral recorded state and encouraging next-frame text; no failure shake or reward burst.
- Correction/Undo/reload/reconnect:quiet, authoritative update. Demo Replay is a design tool, not a proposed production command.

Demo deliberately does not model multiplayer turns, receipts, Competition chains or the complete game. Dice are category emblems, not physical-roll observations. Scores live in memory only and do not persist through reload. Loading the upper-bonus fixture resets illustrative scores. Demo Undo can restore a demo correction; production retains existing Standard latest-own-score eligibility/revision guards.

Sound is an opt-in synthetic chime audition, muted by default; no voice/provider call. Listening quality is not accepted. Production needs coordinated audio priority/mute behavior with SW-021 commentary, visibility cancellation and a separate listening review.

Research: [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) supports disabling nonessential interaction motion; [web.dev performance guidance](https://web.dev/articles/animations-guide) recommends transform/opacity where possible. Prototype uses transform/opacity for bursts/emblems; progress width is a small layout-affecting transition. Performance and timings are proposals, not measured phone frame-rate acceptance.

## Proposed next sprint after agreement

1. Record owner choices for default intensity, palette, signatures, celebration prominence and sound. Premium clubhouse is selected; finer choices remain for review.
2. Close or reproduce SW-019 two-account return/Undo and existing cached-client activation. Keep original accounts/games; prepare synthetic reproductions when defects appear. This acceptance work does not require changing scoring for visual excitement.
3. Implement shared bounded effects through existing accepted-event/celebration boundaries; own-frame anchor, no hidden-total leaks, no input blocking, no replay on reconnect/correction/Undo. Deduplicate receipts/events and cancel obsolete effects when a score is undone.
4. Integrate home/return wording and consolidated routes as a separate scoped slice. Keep the agreed gameplay/motion changes reviewable independently.
5. Focused regressions cover event selection, duplicate observations, undo/correction cancellation, hidden totals, reduced motion and cleanup. Run Node24 configured gate for the production candidate, build identities and safe update qualification.
6. Observe exact Android and iPhone browser/Home Screen builds at2/4/8 players, text scaling, background/return, rapid consecutive accepted scores and commentary coexistence. Record physical visual/audio acceptance separately. Deploy/install only with the applicable authorization.

Chronology/invitations follow the SW-020 direction in separate increments. No camera recognition scope added. A production implementation task ID will be assigned at sprint start; SW-022 is the review artifact.

## Risks and execution bounds

| Risk | Consequence / rationale | Mitigation / closure | Owner/state |
|---|---|---|---|
| SW022-K1 | Celebration claims unobserved roll or replayed achievement | Fact-based accepted score hooks; emblems labeled; correction/Undo/duplicate fixtures | Lead / production open |
| SW022-K2 | Motion hides controls, blocks entry or discomfort | Contained stage, no persistent motion, OS preference + toggle; mobile/rapid-input acceptance | Lead / concept checked |
| SW022-K3 | Wide special effects exceed device resources | Bounded particle counts/lifetimes, transform/opacity; measure actual phone before acceptance | Lead / physical open |
| SW022-K4 | Sound competes with commentary or starts unexpectedly | Off default, opt-in, future common audio priority; listening review | Lead / open |
| SW022-K5 | Prototype agreement mistaken for deployment authorization | Explicit local-only concept and pending sprint decision | Lead / controlled |

## Completion and decision

Delivered interactive self-contained HTML with no external rendering assets, score review, sample fixtures, category effects, three intensity controls, three accents, optional local synthesized sound, reduced motion, quiet correction/Undo and replay-without-score-mutation.

Actual browser results recorded above and in ignored `artifacts/sw022-motion-review/browser-checks.json`. Browser checks were development checks, not a test of authoritative multiplayer or phone rendering performance. Production source unchanged; no configured gameplay gate rerun for this local prototype. HTML syntax/links checked separately at completion. No subagents or external messaging used in this turn.

Final refinement: sticky celebration stage keeps the accepted frame and category choreography visible together. Desktop FullHouse frame/stage positions observed at405px/12px; phone Yahtzee frame/stage at392px/12px without page overflow. Fixed first-score Replay enablement discovered during browser review; fresh first-score replay then stayed25 with no extra points. Inline JavaScript syntax/local links passed in `artifacts/sw022-motion-review/html-check.json`. Saved visual preview: `artifacts/sw022-motion-review/pulse-preview.png`. Browser left on a freshly reloaded design for owner audition. Prototype sound generation is available, but no listening acceptance claimed.

Next action: owner auditions FullHouse, Straight, Yahtzee, upper bonus and Calm/Signature/Showtime, then agrees the detailed feel. Lead starts the production sprint within those choices. Acceptance thresholds/timing and independent release approvals remain open.

## Touch / multiplayer follow-up and coordinated scope

User confirmed smartphone touch as the primary interaction, centered score dialogs matching the current app (no bottom score-entry panel), secondary drawers/submenus, and stable anonymous opponent labels. Prototype now uses native centered modal dialogs: direct upper-count choices, fixed score/zero actions and0–30 total keypad with52px keys. Own category buttons remain dominant; smaller read-only B/C/D…H scores share each row to their right. Table drawer selects2/4/8 illustrative players; larger rosters use synchronized horizontal score rails. Opponent identities remain account-owned in production; display labels do not change authority. Prototype does not connect to real multiplayer.

Browser checks: Fours four-count records16 and closes modal; Chance keypad2/4 records24 (total40). Fixed correction stays quiet. Four-player390px layout has no page overflow; eight-player layout supplies seven readonly fields per row and preserves synchronized rail position after scoring. Drawers close before score modal opens, avoiding stacked modal contexts.320×568 keypad dialog stays within top16/bottom552 with internal scrolling and52px buttons.390×844 count modal centered at272–572. Actual finger gestures/VoiceOver and phone performance remain open.

Saved previews: `artifacts/sw022-motion-review/touch-score-dialog.png`, `anonymous-score-rows.png`. Inline script/local-link validation passed after refinement. No application source changed.

User subsequently requested the live AI commentary handover/skill be included in coordinated POC scope. Read `docs/handovers/2026-10-14-live-ai-commentary.md` and `.agents/skills/live-commentary/SKILL.md` plus SW-021 architecture/adaptive controls. SW-021 remains its own implementation track but joins the overall POC proposal; it is no longer outside the coordinated sprint scope. Paid audition, migration/deployment, real audio acceptance and retention decisions remain separate gates. Six-sprint scope/agent contracts are in SW-023; earlier sequence here is superseded by that coordinated proposal.
