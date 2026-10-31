# SW074: Recover ROG features into the canonical fg-dev source

31 October 2026. Owner: Dan. Coordinator/integrator: Codex. Independent review unassigned.
Owner authorizes access to older ROG files and integration of needed work, and requests one canonical source on fg-dev for both Codex accounts. This task restores source; it does not authorize phone, cloud or database deployment or paid provider use.

## Baseline and provenance

Canonical repository: Fluidity-group/yahtzee-scorekeeper; master is the integration branch. Shared fg-dev checkout remains /srv/yahtzee/main at9179f73 during this work. Recovery branch codex/recover-rog-interface is based on13f6fdb (release safeguards PR #6), which depends on design PR #5. Preserve the shared checkout and each user's separate task folder. No independent permanent ROG fork is retained as an integration target.

Input: owner-attached artifacts.zip (9,647,570,863bytes;122,796 files). Only428 allowlisted source/test/configuration/documentation/public-sample files (3,260,523bytes) were extracted from artifacts/sw066/source into ignored artifacts/rog-recovery/sw066. No bulk extraction. Environment files, private/signing/credential paths, personal media, node_modules, caches, datasets and old binaries were excluded. Selected-code credential-pattern screening found no flags; this is not a claim that the entire archive contains no secrets. Keep the original attachment private and out of Git.

Recovered status describes the historical ROG SW070 deployed build70 and later SW071/72/73 UI candidates. Its recorded prior APK hash matches the pre-update APK preserved locally by fg-dev SW070. Its core game module matches the existing source after line-ending normalization. This resolves why a Git-matched fg-dev build could omit newer UI: the later ROG source/assets were never published on the available branches.

Historical ROG SW068–SW073 identifiers overlap later fg-dev SW068–SW072 identifiers. Always qualify them by host/topic/commit; do not overwrite their records or infer chronology from the number alone. This recovery uses SW074 to avoid another known collision. Selected-source inventory and hashes remain ignored at artifacts/rog-recovery/inventory.json; relevant source is now reviewed in Git, not maintained as another editable baseline.

## Requirements and integration

| ID | Owner outcome | Implementation/evidence | State |
|---|---|---|---|
| R1 | Recover screen sizing/preferences | Fit/pinch full-card sizing, category divider and labels, restored styling and preferences | Synthetic regression passed; visual phone acceptance open |
| R2 | Restore avatar functions and transfer source | Account-owned avatar refresh/preset/portrait UI, peer/lobby/results portrait paths and authenticated backend/storage source | Mocked UI/API plus SQL ownership tests passed; no fresh live account verification |
| R3 | Restore accepted-event animation source | Shared score presentations, reaction adapter/player, bounded nonvoice sounds and finale dashboard | Recovered regression passed; real video/audio/gesture acceptance open |
| R4 | Preserve fg-dev reliability work | Three-way merge against db094a4; immutable recovery journal and manual push=false retained byte-for-byte; session fences/late dialog cleanup retained | Existing regression suite passed |
| R5 | Preserve release completeness safeguards | About source identity and asset contract retained;4fictional portrait samples declared with hashes | Existing/new tests passed |
| R6 | One canonical source, safe concurrent work | GitHub master integration, separate task worktrees/branches, reviewed PRs | Runbook below; actual human handoff pending |

Only semantic differences were integrated; Windows CRLF differences were normalized, not treated as feature changes. Three-way integration required two manual conflict resolutions: preserve both recovered imports and About import in prototype.js; preserve new menu labels plus About navigation in clubhouse-home.js. Current account-session and persistence regressions remain present; tests were not deleted or weakened to accommodate recovery.

Recovered feature source includes profile/avatar modules, score presentation, portrait backend/cleanup code and three additive migrations with synthetic SQL harnesses. Generated portrait/room edge bundles derive from these sources. Their presence in Git does not establish deployed service identity, job activation or any renewed budget. Migration defaults deny paid generation with zero budget; no budget row was activated and no provider called. Historical deployed claims in supplied records were not freshly verified against live services.

Recovered avatar selection is account-backed, unlike the incomplete fg-dev placeholder. This is restoration of existing source, not approval for new paid generation or private-media transfers. Selected account avatars/reaction videos are not copied from the archive; only four fictional public style samples are included. Missing/offline portrait service must fall back safely; real same-account cross-phone acceptance remains a separate gate.

The historical four-second shared announcement window is recovered as an existing presentation capability, including server-side sequencing. It is not silently replaced by SW071's proposed future event architecture. Any redesign of that behavior requires explicit acceptance examples. Gameplay scoring/turn mode code is unchanged by recovery; outstanding future Competition/Accumulative decisions remain open.

The only product dependency addition is pinned @capacitor/haptics8.0.2. Android/iOS plugin registration is regenerated and manual iOS preparation validates the expanded exact plugin list. Candidate package metadata is74 on both platforms, greater than the previously installed fg-dev build71 and recovered development metadata73. This is source metadata only, not a signed/installed build. Existing source commit/hash identity remains separate from the native build number.

## Canonical source and two-account workflow

1. Both accounts use this GitHub repository and its reviewed master as their integration source. Never copy a laptop folder over master or use an old artifacts source tree as a second master.
2. Each developer/task uses an isolated worktree or clone with its own branch, dependencies and build output. Shared Git history does not imply simultaneous writes to one working folder are safe.
3. Start with identity/status/branch/fetch checks and current status/memory/design contracts. Stop on someone else's dirty/unexpected working branch. Preserve pre-existing work.
4. Assign file/interface ownership. One editor owns prototype.js at a time until engine/UI extraction removes the hotspot. Use one task/PR and normal integration; no force-push, history rewriting or own-PR agent merges.
5. Merge/reconcile design PR #5, safeguards PR #6 and this recovery in dependency order. Retarget/inspect stacked diffs after squash merges. Owners decide merges; no default-branch write is performed by this task.
6. After reviewed integration, developers update their clean task base normally and confirm commit/rules/build identity. Any subsequent phone candidate is built from that selected canonical commit and complete required assets; no local-only UI/ignored artwork shortcuts.

The shared master remains untouched until human PR integration. The recovered worktree is the review candidate, not a second permanent integration branch. ROG is an input archive/build workstation; future ROG or Mac builds must consume canonical reviewed source.

## Verification and remaining gates

Initial combined Node24.15.0 suite passed1,295tests/13optional camera skips across165passedfiles/1skipped. Recovered source tests plus fg-dev account/recovery/build-identity coverage all retained. Disposable PGlite0.5.11 checks passed portraits17, animation ownership/private-storage10, scheduler5. SQL scheduler uses fake local Vault/HTTP/cron boundaries; no system or hosted schedule created. No personal account/database data is used.

Ignored evidence: artifacts/sw074/recovery-tests.log, portrait-sql.log, animation-sql.log, scheduler-sql.log; source-local artifacts/sw068-portraits/{sql-report,scheduler-sql-report}.json and artifacts/sw070/animation-sql-report.json. Source selection inventory is ignored and not copied wholesale into Git.

Clean df130aa Node24.15.0 full gate passed:1,295tests/13optional camera skips, all configured builds including portrait/room bundles, clean/stable source. Source digest b84621105277c6b491f4b3cc521d0c1e625405b4c4bf747cc8a924368c69a8e2; evidence artifacts/engineering/2026-10-31T17-38-19-659Z-a4f82738/report.json in this isolated checkout. JDK21 Android testDebugUnitTest/assembleDebug passed19native tests;49manual public files match prepared source byte-for-byte in the APK, with build74 and clean df130aa identity verified. This is an offline compile check with no supplied backend configuration, not a rollout candidate. Native evidence artifacts/sw074/android-build.log and android-verification.json outside this source checkout. No new lint/type-check command exists beyond configured checks. iOS compilation/signing, actual video/audio/gesture/layout inspection, current backend byte comparison and same-account two-phone acceptance remain open. No devices updated, app data cleared, live tables mutated, provider called or deployment made. Source recovery is not product acceptance or approval of the engine redesign.
