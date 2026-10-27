# Amber YAHTZ UI review handover — 24 October 2026

27 October continuity override: Amber sample checkout/branch instructions below are historical; SW066 integrated that UI into published core. On fg-dev use the repository at /srv/yahtzee/main, branching from current published master (d3d8037 reviewed in SW068). Read docs/project-memory.md and docs/plans/SW-068-architecture-phone-readiness.md for current contracts and open findings. SW067 remains the latest recorded native installation; physical acceptance and fresh signing inspection remain open.

24 October SW067 both-phone update completed under explicit owner authorization. Integrated source06db45a/applicationdb094a4 installed and launched on Pixel11ProXL and iPhone17Pro; all46public assets match. Pixel installed APK f95f3e1114ef97bf42e26364486df90363dbb42e4d9e59402809aca7a2f28de9 read back exactly, same signer/UID10531/first-install date. iPhone same-ID/team signed Xcode build/profile/assets verified and devicectl install/launch succeeded; data-container metadata path changed, private contents not read. No uninstall/data clear or backend/DB/public web deployment/table command. iOS profile expires28October2026 at14:09America/Chicago. New-build account/tournament return and full manual game acceptance remain pending owner observation. Camera/voice stay deferred. See integrated docs/releases/SW-067-core-manual-phone-update.md and docs/plans/SW-067-core-manual-phone-update.md. This supersedes older native-update-pending notes below.

Current SW066 core integration: use `C:/Codex/Yahtzee Game/artifacts/sw066/source` and read `docs/handovers/2026-10-24-core-manual-integration.md` plus `docs/status.md`. Owner requests core promotion and lead-architect review. Manual scoring/local/online tournaments on Android and iOS take priority; camera and voice are deferred until the manual core works. Both platform versions run per owner; complete cross-phone gameplay remains unverified. Preserve the dirty root checkout and existing accounts/tables. Older separate-sample/main-unchanged notes below are historical; SW066 records actual qualification/promotion.

## Active source and owner intent

Use branch `codex/amber-ui-lab`. On the ROG its active checkout is `C:/Codex/Yahtzee Game/artifacts/sw054/source`. The old `C:/Codex/Yahtzee Game` checkout is dirty and retained; its documentation routes here. Do not reset it or copy its old app files over the review branch. The SW052 worktree and Mac build are historical native candidates, not this UI runtime.

Latest owner decision: test Amber's version separately, then promote or hand to Dan after acceptance. Owner subsequently explicitly authorized both phone updates, Pixel first. SW064 records the reviewed Pixel APK installed and launched from the ROG on24October; SW065 now records matching signed iPhone installation/launch and owner-confirmed Home/account/tournament return on both phones. Source is pushed to the review branch; default `master` remains e599b71. Pixel native update is recorded in SW064; iPhone update is in SW065; no public web/backend deployment or live tournament command has been performed. Existing games/accounts/history must be preserved.

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

Latest native state supersedes the earlier preparation observations: both phones updated/launch verified in SW064/SW065, source a73676b and46identical public assets; owner confirmed same-account existing tournament visibility. iPhone signing expires28October2026; full played-game acceptance remains open. No Supabase/database migration or server deployment.
