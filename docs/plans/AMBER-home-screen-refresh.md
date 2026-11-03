# Amber home-screen refresh

3 November 2026. Owner: Amber. Implementation: Codex. Reviewer: pending.
State: implemented and automatically verified; local development only. Owner visual acceptance and independent review pending.
Base: 11852da6b83361d5198edf1b262f44ea1792cf2a, PR #15.
Branch: amber/home-screen-refresh.

## Requirements and acceptance

- Remove “Four Ways to Play”; retain four direct mode choices with outlined dice.
- Add restrained title glow, a larger spherical lever handle and dimensional metallic cabinet treatment. Preserve keyboard/touch controls and reduced motion.
- Show a direct return shortcut for the current unfinished tournament. Read the same authenticated table/seat; never issue a resume command or change paused state merely by returning.
- Add an explicit venue-selection button beside the current venue.
- Feature the most recent accepted Yahtzee player at the current table (Amber's selected criterion), with their name and avatar. Exclude undone/excluded turns and scores corrected to zero; corrections do not invent a new scoring time. Never infer a physical Yahtzee from arbitrary manual category scores. Fall back to the owner's avatar when none exists.
- Current online table is the last visited table when still available to the same account, otherwise the latest updated account table; current tournament is that table when unfinished or the latest updated unfinished tournament. Local saved game provides the offline banner context.

## Impact and verification

Presentation and read-only account projections only; existing member-return path handles authentication and authoritative state. No rules, migrations, backend or phone deployment. Synthetic tests cover Undo/corrections, account exclusion, current-table selection, safe return controls and four mode actions. Run full Node24 engineering gate before PR. Chrome/phone visual acceptance remains Amber's responsibility.

## Completion

Tracks [issue #16](https://github.com/Fluidity-group/yahtzee-scorekeeper/issues/16). Implemented outlined dice, removed kicker, subtle title glow, dimensional CSS metal cabinet and enlarged spherical lever, explicit venue control, account-scoped tournament return and recent accepted Yahtzee banner. The banner reflects the current game at the selected table; prior tournament games are not searched. Current-table preference lasts for this app session; reload falls back to the latest updated/created account table. Peers are fetched read-only with expected-owner and stale-response checks.

Node24.22.2 focused checks: 28 tests passed across home projection, account loading, venue flow, lever controls and idle rendering; dedicated Home-to-paused-tournament integration test passed. Full gate passed 1,471 tests, 13 optional camera skips, all seven configured test/build stages, unchanged source during verification. Evidence: `artifacts/engineering/2026-11-03T22-09-50-714Z-83de68f8/report.json`. Locked Pi dependency installation passed (30 packages, zero reported vulnerabilities). Initial sandbox-only install/gate attempts failed with registry DNS/child-process EPERM; normal authorized host execution passed. `git diff --check` passed.

No real-account scoring, paid generation, device installation, backend or public-web deployment. Hyperrealistic visual quality, small-screen/large-text fit, real-account return and both-phone acceptance remain unverified. Owner can review the running localhost dev server in Chrome. No independent review or physical acceptance claimed.
