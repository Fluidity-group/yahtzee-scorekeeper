# Amber's playable UI lab

**Open http://192.168.1.148:8475/lab/**. This is a real, playable source copy, not the frozen SW053 gallery. Use **Play full screen** for normal game testing. The ROG must be awake and reachable on the same LAN. No new firewall change is made by this setup.

Current review: SW055 enlarges all four Home category titles, adds a tournament trophy counter/detail, and opens past opponents through Online multiplayer / People you've played. The lab explicitly labels a fictional Alex profile (three wins, three opponents); these are not real account statistics. Normal production entry does not load this fixture. The three requests are saved as Testing for Amber's visual decision. See `docs/plans/SW-055-home-readability-trophies-people.md`.

## Review and edit workflow

1. Play a solo or shared-phone local game. Score categories, inspect the bonus guide, change a score, Undo and resume games. All real scoring and persistence code is retained. The lab uses its own browser origin/port, so its test games and preferences are separate.
2. Describe a change in chat, naming the screen, or save it under **Request a change**. Requests include UI/playability/bug type, expected behaviour, acceptance criteria, and Proposed/Testing/Accepted/Rejected status. Click a saved request to edit it. Save updates on the ROG so they are accessible across lab browsers; export them for a portable copy.
3. Ask Codex to read the queue and implement the selected request. Source changes happen in this worktree on `codex/amber-ui-lab`. Vite updates CSS live and reloads the game for JavaScript edits. Accepted scores persist; finish or cancel unconfirmed input before code edits because JavaScript reloads can close dialogs.
4. Retest and mark the request Accepted when the change feels right. That status records your design decision; it does not merge code or certify automated checks.
5. When ready, ask to prepare the accepted changes for promotion. We review the diff and evidence, run the full engineering gate on the final candidate, and promote only the accepted product changes to the chosen main development baseline. Public deployment and device installation are separate actions.

The frozen **Current reference** gallery remains at http://192.168.1.148:8473/review/. It represents the recorded 21 October iPhone build. Native safe areas, keyboard, touch and device-specific integrations still need phone testing.

## Boundaries

The clone starts at recorded source `1283973c170651292f87db154d65ae20d1c31529`, corresponding to iPhone runtime `0bc8ca04c237af7dfa7ce0c8af62c93b14451327`. The older dirty root checkout is not the promotion target by default. The qualified SW052 worktree and its source remain unchanged.

Live cloud accounts, multiplayer backend and paid voice are disconnected in `lab/vite.config.js`; no production `.env` is loaded or copied. Local solo/shared-phone games are playable now. Testing real cross-device invitations/tournaments requires a separately configured test backend; it must not silently use the live account database. Lab mode mirrors the iPhone voice deferral. Product scoring/rules, bootstrap and normal build config have not been altered for this tooling.

LAN HTTP may lack `crypto.randomUUID`. The laboratory-only entry installs an RFC4122 UUID helper using `crypto.getRandomValues` before loading the unchanged app. This helper is not injected into normal native/release builds.

The workbench is development tooling, not a proposed product screen. Do not include it in a native/public product package. The default production build uses the original Vite config and entry; the lab config has no PWA or provider proxy. No automatic push, merge or publication is configured.

## Developer paths and commands

- Actual app UI: `src/prototype.js`, `src/prototype.css`, `src/ui/playform.css`, `src/ui/phone-scorecard.js`, `src/ui/phone-scorecard.css`.
- Gameplay rules: `src/game/core.js`, `src/game/scoring.js`; behaviour changes need explicit acceptance and regression coverage.
- Workbench and restricted feedback API: `lab/`.
- Saved requests: `artifacts/amber-lab/requests.json` (ignored; no real account data).
- Evidence: `artifacts/amber-lab/`; task record: `docs/plans/SW-054-amber-playable-ui-lab.md`.

From this worktree:

```powershell
& ./lab/Start-Lab.ps1
node node_modules/vitest/vitest.mjs run tests/amber-lab.test.js tests/prototype-bonus.dom.test.js tests/undo-scorecard-ui.dom.test.js tests/phone-scorecard.dom.test.js
git diff 1283973 -- src
```

Dependencies are linked to the existing pinned SW052 node_modules for this local setup; they are not copied into Git. For a standalone checkout install Node24 and run `npm ci` (and `npm ci --prefix device/pi` for the full gate).

## Promotion checklist

- Review each included request and acceptance criteria; resolve or explicitly defer unrelated proposals.
- Commit only intended lab/product changes on this branch and identify the exact baseline and final candidate.
- Run relevant regression checks and the configured Node24 engineering gate for release preparation; report optional camera skips.
- Confirm which branch/check-out is the destination. Apply accepted scoped product commits; do not overwrite the dirty old root tree or import generated files, requests, credentials, node_modules, or development-only `lab/` into the app's runtime path.
- Keep an identified rollback point. Obtain the requested promotion/deployment decision and record the new baseline in status, project memory and release evidence.
