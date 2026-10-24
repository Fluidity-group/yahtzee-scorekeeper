# SW-066: Amber UI core integration and manual-game dependability

24 October SW066 publication completed: owner explicitly authorized GitHub master publication. Normal fast-forward push e599b71 → fae7670358a7445a4d6de34140c9d46f402194cb succeeded and remote tip was independently read back. This supersedes the earlier remote-approval-pending statements below. Subsequent publication-record commit changes documentation only; reviewed application code, clean 1,192-test gate and native candidate bytes remain unchanged. No new handset installation or public web/backend/database deployment. Updated iOS signing/build and complete two-phone manual-game acceptance remain open; camera/voice deferred.

24 October 2026. Owner: Dan/Amber. Lead architect and implementation: Codex.
Independent agent reviewer: `/root/expert_ui_review`.
State: implemented and automatically verified; local and GitHub main promoted with explicit owner authorization. Physical acceptance remains open.

## Purpose and requirements

Owner requested expert review and merging Amber's updates into the core codebase, followed by a dependable manual-scoring Android/iOS build. Owner confirms Android and iOS versions are running; this is not evidence of a completed cross-phone game. Camera and voice development/qualification are explicitly deferred until the manual core works. Synchronize repository skills, memory and future-chat routing.

## Acceptance and verification

| Requirement | Observable criterion | Method | Actual evidence | State |
|---|---|---|---|---|
| SW066-1 | Integrate the complete qualified product baseline and Amber UI without disturbing old root changes | Isolated branch from master e599b71; merge Amber 7cd7b6c | Clean merge a34ebce; tree initially identical to Amber | Implemented |
| SW066-2 | Independent review of UI consistency/navigation/account summaries and preserved authority | Frozen Amber review versus SW052 1283973 | Expert reviewer: 15 focused files / 66 tests passed; one P2 queued-close bug found | Independently verified: 30 tests / 8 files |
| SW066-3 | Replacement avatar/venue/settings panels remain interactive after native queued close | Failing-before/passing-after DOM regression | New midnight-navigation-close test failed character-1 vs character-4 before fix; 4 focused files passed after fix | Verified |
| SW066-4 | Full configured Node24 tests and all builds pass with stable source | engineering-check verify | Clean db094a4 gate: 1,192 passed/13 optional skips/all builds/source stable; artifacts/engineering/2026-10-24T17-18-53-062Z-00d440ed/report.json | Verified |
| SW066-5 | Future chats find one authoritative source, current manual-only scope and honest device evidence | Skills/memory/status/handover reconciliation | Six skills byte-identical across integrated/root/Amber; synchronized status/memory/handover | Verified |
| SW066-6 | Both physical phones complete manual scoring, Undo, reconnect/background, Home/Resume and tournament continuation | Owner test of identified Android/iOS builds | Versions running confirmed; full played-game matrix not supplied | Open |

## Design and impact

Main was the original e599b71 product, far behind the current SW052/Amber native baseline. Integrate its full descendant history rather than transplanting UI onto missing game/account infrastructure. Worktree `C:/Codex/Yahtzee Game/artifacts/sw066/source`, branch `codex/sw066-amber-core-integration`. Preserve dirty root and Amber review worktrees. No scoring/server/database contract change and no migration/deployment is needed for the UI correction.

The dialog close event is queued. Navigation closes and reopens the shared dialog synchronously, then the old close event removes the new panel's listeners. Only clean on close when the dialog remains closed; openDialog already cleans the old panel synchronously. Regression covers avatar save, venue confirmation, repeated sound toggles, and photo-resource cleanup after a real close.

## Risks and execution bounds

- Preserve existing account UUID membership, tournament rules/scores and local storage. No live scoring/table commands, data clear or uninstall for qualification.
- No camera/voice reactivation; unchanged historical suites may still run in the configured gate.
- Shared venues/events, portrait provider/account sync and push delivery remain deferred; visible unavailable controls are not implemented features.
- npm is absent from this execution environment. Use a local junction to Amber's existing dependency tree with identical package/lock files; record this as reused dependencies, not a fresh npm-ci run. Initial gate attempt failed because dependencies were absent; retain its evidence.
- Native compilation/signing/installation and physical acceptance remain distinct from web-bundle checks. Last iPhone profile expires 28 October 2026; inspect signing freshly for a new iPhone package.

## Completion and decision

Independent fix recheck passed (30 tests / 8 files). Six skills and current routing reconciled across root, Amber and integrated checkouts. Initial full run c8bfc89a passed all 1,192 tests/13 optional camera skips and all builds, but correctly failed source stability after generated server files changed CRLF to LF. Repeat clean gate pending. No new handset installation or public/backend deployment performed by SW066.

### Final result

24 October SW066 completed locally: Amber history merged into core; independent expert found/fix-rechecked queued dialog-close navigation (30 tests/8 files). Clean Node24.19.0 gate at db094a4: 1,192 tests passed/13 optional camera skips/all configured builds/source stable. Evidence artifacts/engineering/2026-10-24T17-18-53-062Z-00d440ed/report.json. Android APK built and signature verified;46public assets match Android APK/synced iOS. iOS project/assets prepared, new Xcode signing/install pending. Owner confirms Android/iOS versions running; full manual played-game acceptance remains open. Camera/voice deferred until manual core works. Local master promoted; remote master remains e599b71. Automatic approval review rejected remote publishing (default-branch impact and unverified egress authorization); explicit owner publishing approval is required. No new device install/public/backend/database deployment or table command. Current source artifacts/sw066/source; skills/routing synchronized.

Native build attempts: initial default SDK path was absent in this tool environment; explicit SDK path worked. Fresh Gradle download was network-blocked, then cached offline build was sandbox-daemon-blocked; approved unsandboxed cached build succeeded (216 tasks). Capacitor-generated machine-specific dependency references were restored to their original portable paths before qualification. No source code changes followed the final gate.
