# Responsive UI slice — review notes

16 September 2026. This is the first UX slice of Stage 1, not the completed new game core.

## Delivered

- Removed the narrow-screen rotation blocker.
- Phone layout: compact two-player overview, sticky turn prompt, vertically stacked scorecard sections, and bottom-sheet entry.
- Tablet/desktop layout: side-by-side sections, named player columns, and centred entry dialog. Content can scroll on short displays.
- Score buttons support keyboard activation and announce player/category/value. Entry panels support close, Escape, focus return, and focus containment.
- Touch targets, safe-area padding, input font sizes, and overflow behaviour improved. The unused coin is hidden until a random starter is selected.
- Updated local startup instructions to the actual checkout, Node installation, ports, and WSL file polling.

## Validation

- 124 tests passed; production build and PWA generation passed.
- Browser layout measurements at 360, 390, 430, 768, 1024, and 1280 CSS pixels showed no horizontal page overflow. Score targets were at least 44px tall.
- Inspected phone scorecard/entry sheet and tablet scorecard visually.
- Entering four threes recorded 12 points and advanced the active player.
- A pending numeric score of 25 survived resizing from tablet to phone before confirmation.
- Settings close control verified. Browser console showed no errors during the checked flow.
- Physical Pixel/iPhone/tablet testing remains pending. Browser resizing does not validate mobile keyboards or native touch behaviour.

## Follow-up

The existing 250ms debounced save can lose a just-entered score if the page is immediately reloaded before persistence runs. This was observed during testing and should be addressed in the durability/game-core slice. Normal completed autosaves resume separately from this edge case.

This slice retains the existing two-player rules and local data model. Mode selection, accounts, multiplayer transport, GoDice, 1–8 players, and commercial commentary are not yet implemented. No unrelated Claude Code processes or global settings were changed.
