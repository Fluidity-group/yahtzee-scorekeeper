# SW-017 UI/UX research and first implementation

13 October2026. User explicitly requested expert research AND implementation for shared web/Android UI. Expert ui_excitement_research reviewed existing UI/celebrations, primary platform/accessibility guidance and implemented the slice1 result renderer/style in an isolated worktree; root integrated and verified it. This is development review, not measured player preference.

## Implemented now

Persistent results card above finished scorecard: winner/tie, every player's final points and preserved silly names, verified next starter, own Play again/readiness withdrawal, named Ready/Waiting states. Up to3 highlights from this game's final scorecard: winning margin, upper bonus secured and fewest zero categories. No lifetime/personal-best claims without history and no guessed roll efficiency.48px controls, keyboard focus, reduced-motion styling, no blocking overlay/looping animation. Existing accepted-event celebrations remain intact and are not replayed merely by reconnecting.

## Next-slice recommendations

- Tournament progress strip with name/mode/Game2 of5 plus redundant decorative progress, and equally prominent points/wins championship cards.
- Up to3 relevant postgame highlights: positive category placement, fewest scoring turns to milestone, mode-scoped personal best, win streak. Scope clearly labelled This game / This tournament / Your Standard history. Explain corrections/projection in detail view.
- Next-game nickname field retains game-time memory while account ownership stays permanent and email private.
- Optional Log a combination drawer away from primary score actions, report source clearly player-entered, immediate Undo and no score/bonus/turn effect.
- No score-derived live lead/milestone message when totals are hidden. No wall-clock fastest claims during pauses, negative worst-player awards or missing-roll success percentages.
- Short optional successor transition only after server acceptance. Do not add automatic sound/countdown or simulated dice animation to physical manual play.

## Primary references and interpretation

- W3C status messages: stable polite announcements for accepted readiness/reconnection; do not announce an entire rerendered roster every poll. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- W3C target-size minimum: WCAG2.2 AA minimum24 CSSpx with exceptions; product48px controls are a deliberately larger target, not a misstatement of AA. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C animation from interactions: AAA reduced nonessential interaction motion adopted as product preference. https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- W3C pause/stop/hide: avoid distracting looping/blinking waiting cues. https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html
- Apple feedback/motion: reinforce outcome/status and preserve clarity. https://developer.apple.com/design/human-interface-guidelines/feedback and https://developer.apple.com/design/human-interface-guidelines/motion

Actual evidence:6 renderer tests plus3 shared integration DOM tests within500-test gate; synthetic390/768px screenshots in artifacts/sw017-rematch. Android APK built with same modules. Real Android/Safari/Home Screen usability remains acceptance, not inferred from screenshots.
