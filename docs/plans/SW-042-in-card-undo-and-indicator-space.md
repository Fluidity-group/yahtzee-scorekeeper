# SW-042: in-card Undo and smartphone space

Owner: product owner; implementation/review: Codex. Status: implemented, qualification pending. Baseline: SW041 a453348; isolated checkout artifacts/sw039/source. No backend/rule/schema change.

## Purpose and acceptance

- Remove the bottom Undo footer. Tap the latest recorded score for existing correction choices and Undo; Undo returns the turn and opens the category for replacement elsewhere. Retain authoritative latest-own-turn/next-completed-score cutoff, revisions and seat checks.
- Shared-phone scoring follows the next player; keep the preceding eligible score tappable in the comparison column. Online opponents remain read-only. Bonus-only/final-chain Undo remains in the Yahtzee-bonus row.
- Remove repeated paused explanation and paused metadata suffix. Purple game status remains. Host Resume is first and accented in both tournament and clubhouse menus, unavailable while disconnected/busy; guests cannot resume.
- Give category labels46%, owner scores36%, opponents18% of the card. Increase horizontal SVG indicators44→70px (14→22px high). Keep score targets at least44px and check320/390/402/440px layouts, text presets and reduced motion.

## Design and risks

CSS/SVG suffices; no engine/library required. Existing corrections and game authority remain unchanged; only Undo eligibility uses the latest-turn cutoff. No data migration, live score mutation or paid provider tests. Shared-phone tap exception is explicit and never passed for hosted opponents. Paused games stay paused until host action. Preserve games, profiles, settings and aliases.

## Verification and completion

Focused scoring/Undo/tournament/adapter/graphics regressions:32 passed before additional menu/cutoff assertions; further bonus/phone/Undo/menu run22 passed. First full gate caught a bonus-row regression (Undo replaced repeat-bonus entry), repaired by retaining both controls; shared-phone expectation updated for the explicit latest-frame exception. Browser synthetic320/390/402/440px: no page overflow;390px columns161/126/63px, indicator70px. Full gate and package/deployment state to be recorded separately. Physical two-phone acceptance remains open.
