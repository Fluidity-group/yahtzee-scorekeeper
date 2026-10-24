# Amber YAHTZ UI review handover — 24 October 2026

## Active source and owner intent

Use branch `codex/amber-ui-lab`. On the ROG its active checkout is `C:/Codex/Yahtzee Game/artifacts/sw054/source`. The old `C:/Codex/Yahtzee Game` checkout is dirty and retained; its documentation routes here. Do not reset it or copy its old app files over the review branch. The SW052 worktree and Mac build are historical native candidates, not this UI runtime.

Latest owner decision: test Amber's version separately, then promote or hand to Dan after acceptance. Owner subsequently explicitly authorized both phone updates, Pixel first. SW064 records the reviewed Pixel APK installed and launched from the ROG on24October; iPhone is next and requires fresh Mac/device/signing checks. Source is pushed to the review branch; default `master` remains e599b71. Pixel native update is recorded in SW064; no new iPhone install, public web/backend deployment or live tournament command has been performed. Existing games/accounts/history must be preserved.

## Run and test surfaces

| Surface | Purpose | Account/data boundary |
|---|---|---|
| `http://192.168.1.148:8475/` / `/lab/` | Offline playable UI workbench, local review queue | Fictional Alex account/history explicitly labelled; cloud config blank |
| `http://192.168.1.148:8476/` | Same-Wi-Fi Safari/Chrome multiplayer sample | Real existing public backend/account membership; actual accepted user score commands save real progress |
| `http://192.168.1.148:8473/review/` | Earlier frozen iPhone screenshot reference | Historical reference, not current runtime evidence |

`lab/Start-Lab.ps1` and `preview/Start-Preview.ps1` start distinct servers; never stop unrelated processes. Preview uses the validated public-only `.env.ios-test.local` from the recorded phone source via YAHTZ_PREVIEW_CONFIG. Do not copy private environment/provider credentials into source or the Mac. See preview/README.md and SW061 release record. Each origin/native app has separate local storage; sign into the same account for existing online membership. No push worker, paid voice proxy or photo generator is enabled in either sample.

## Current approved UI and analytics

YAHTZ/exact slogan/Dan-and-Amber credits, original noir city/persona art, profile/venue/settings/theme ribbon, four direct choices in a flashy slot cabinet, compact expandable setup, Home/back navigation, dark legible score labels, upper-category positive-surplus-only steady glow and shared retro detailing. Reduced motion/forced colors preserve access. Rules, own-seat authority, revision checks, Undo and tournament Ready/Return contracts stay unchanged.

Trophies count a completed tournament once for either independent honour, with ties included. Razzie means lowest personal completed online score; distinct rule sets stay separate. Personal Best has independent highest-score and most-recorded-Yahtzee records. Manual play cannot establish unrecorded physical rolls; unknown history is not zero. No source data is fabricated outside the explicitly labelled lab fixtures.

Shared tournament venue, synchronized special-event presentation and generated/account-synced photo portraits remain excluded unresolved phases in SW056. The user aesthetic overrides earlier no-casino design proposals; it does not change scoring rules.

## Evidence and open gates

Initial reviewed baseline d8a8118 passed1,186tests. Final post-fix a73676b clean Node24.19.0 gate passed1,191tests/13optional camera skips/all configured builds/source stable, artifacts/engineering/2026-10-24T16-11-57-202Z-b531a766/report.json. Final lab/phone-preview builds and HTTP/HMR passed. Later completion-document commits leave application source unchanged.

SW063 independent agent review found two P2 issues (manual Yahtzee correction summaries and direct LAN lab artifact reads). Both are fixed and independently rechecked with26 passing focused tests. Read-only cloud probes returned Auth settings200, room preflight204, anonymous room read401 and commentary preflight204; these establish reachability/protection only, not authenticated continuity or deployed-byte identity. Final post-fix qualification is recorded in the SW063 plan.

No current full visual/touch acceptance: desktop observation approval timed out, Android adb had no device, previous Mac address192.168.1.184 was unreachable and mDNS unresolved. These are historical observations requiring fresh inspection before native work. Native app install IDs and prior evidence remain in SW052; development signing expiry must be checked freshly. Do not claim a two-phone game passed until owner evidence exists.

## Reading and workflow

Read AGENTS.md, docs/status.md and project-memory.md first; then only the needed domain contract/skill. Six project skills under `.agents/skills` are reusable workflows, not live device or deployment evidence. Node24 is required; older Node22/legacy README instructions are historical. Keep source and audit evidence distinct, report remaining gates, and obtain task-specific authorization for any future main/native/public deployment.

Native owner instructions are in 2026-10-24-native-owner-rollout.md. No Supabase functions/schema/RLS/migrations were deployed for the UI work; server/supabase source has no diff from recorded phone source1283973.

Latest Pixel runtime: SW064 APK90465fe14bae6c6dd922b19821758dff10fb42eb4747d7d52986587d26647640, source a73676b,46assets matched, same certificate/UID/first-install date, install-r Success and MainActivity launch Status ok. User account/tournament/visual acceptance pending. iPhone unchanged.
