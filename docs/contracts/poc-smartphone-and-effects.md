# Fresh POC smartphone and accepted-effects contract

SW-024 Sprint1,14 October2026. Owner requirement: touchscreen first, centered current-style entry, fun premium clubhouse, stable anonymous peers. Source/research review by smartphone expert; local prototype checks by lead. Production integration belongs Sprint2. Lead starting recommendation: Mint + Signature; subject to owner review. No physical ergonomics/VoiceOver acceptance claimed.

## Scorecard and interaction

Assign table-global immutable seat labels Player A–H. Local viewer's own score field leads and may say You with its seat context. Viewer C sees A/B/D…; viewer H sees A–G. Do not renumber peers relative to the viewer. UUID/seat remains command authority; display labels never become identity keys. A rematch/return preserves table seat labels.

Category and own editable field stay fixed left. Smaller readonly peer fields appear to the right on the same category line, including bonus/progress rows where applicable.2 players show1peer;4 aim for3;8 use one synchronized rail offset for header/all rows. Supply44px Previous/Next buttons plus swipe and keyboard navigation; changing score or opening a drawer must preserve comparison position. Readonly peer cells may be27–32px visually, but must not be editable/click targets. No page-wide horizontal overflow.

Own category/field, dismissal, rail navigation and labelled settings switches target at least44×44 CSSpx; keypad keys at least52px high. These are project design targets, not a claim WCAG AA always requires44px.

## Centered score dialogs

- Native modal centered in dynamic viewport, safe-area-aware maximum height and internal scrolling on short screens. No bottom score-entry panel.
- Upper counts1–5/zero commit directly; fixed categories use score/zero actions; sums use0–30 keypad and explicit Save, matching current manual controls.
- Preserve mode-specific bonus/Joker/final-chain options during production integration; this visual refresh cannot flatten rules.
- Focus trap, category/player instructions, Escape/Close cancellation, useful focus restoration and no stacked modal contexts. Drawer closes before score modal opens. Cancel does not commit.
- A stale/disconnected/wrong-seat/paused command cannot show speculative accepted animation. An asynchronous invalidating game update closes/revalidates pending input under the authority contract.

Secondary Table/History/Style/Commentary features use drawers. Captions are compact/expandable; no permanent oversized panel crowding score entry. Commentary never takes scoring focus or blocks a command.

## Effects and audio

The shared accepted-event envelope has room/game/event/command identity, actor UUID/seat, rules/projection version and disclosure policy. Visual effects consume newly accepted outcomes; initial snapshots, duplicate retries/reconnect, corrections and Undo are quiet. Undo cancels obsolete effects rather than celebrating an invalid score. Zero receives neutral feedback.

Bounded everyday frame landing; category signatures; larger Yahtzee/upper-bonus moment. OS or explicit reduced motion disables nonessential movement while preserving facts. No animation/input blocking. Hidden totals suppress total/lead/standings cues and narration until permitted reveal.

Animation intensity, SFX mute, comedy intensity, speech frequency and profanity are independent controls. SFX starts muted in the audition prototype. Production voice enable/default policy follows separate owner choice; host playback/remote opt-in is a proposed contract. SFX ducks beneath speech or ends promptly, never adding a forced delay to the score action. Speech/caption label policy is reviewed before voice integration.

## Acceptance matrix

Production checks:2/4/8players; viewers A/C/H;320×568 and390×844, portrait/landscape/enlarged text; reachable categories and modal internals; peer scrolling/navigation with fixed own fields; count/fixed/keypad/zero/correction/bonus/final-chain variants; stale/racing/retry/offline/pause guards; reduced-motion/background/effect cleanup; no hidden-total leaks. Actual Android/iPhone touch, screen-reader and motion performance remain independent observations.

Local Sprint1 prototype results: viewerC fields A/B/D/E/F/G/H and viewerH fields A–G; arrow advances all14 rail offsets62px and scoring preserves62px; Fours16 accepted;390px viewport375px document. Centered modal/keypad was checked during SW-022 at390/320px. Settings hit-area now44px and accessible filled-frame text says review/correct. These checks do not establish authoritative multiplayer implementation.

References: [W3C enhanced targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), [W3C modal pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [W3C interaction motion](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
