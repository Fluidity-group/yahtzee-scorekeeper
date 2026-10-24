# Yahtzee Git baseline review — 30 September 2026

## Scope and snapshot

Reviewed working-tree inventory, tracked diffs, component/build entry points, Git ignore rules and representative hardware/reference structure. This is a baseline triage, not a full code, security, licensing or electrical audit. No file was deleted, no source was staged/committed and no remote was changed.

Starting HEAD: `e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc`, branch `master`. Initial review found 13 modified tracked files and 658 untracked files. Adding the inventory script made the recorded inventory 672 files (13 tracked changes plus 659 untracked). This review document and later status edits postdate that snapshot.

Per-file paths, sizes, SHA256 hashes, proposed groups and dispositions: `artifacts/baseline-review/inventory.csv`. Counts and source identity: adjacent `summary.json`. Tracked-only binary diff retained as `tracked-changes.patch`. These are ignored local evidence, not a complete backup; preserve the original working folder and ignored dependencies. Two inaccessible Word-rendering temporary directories prevented complete enumeration of those temporary trees.

## Proposed commits

| Order | Proposed title | Contents and dependencies |
|---|---|---|
| 1 | Preserve connected-dice product software baseline | Root package/lockfiles, .env.example placeholders, Vite/Vitest config, bootstrap/prototype and shared/legacy UI, pure game/store logic, dice/camera transports, multiplayer client/server/migrations, Android source/Gradle wrapper, Capacitor config, Pi source/package lock/deployment scripts, related tests and build/evaluation tools. These components are coupled by imports: do not invent independent intermediate commits by merely splitting folders. |
| 2 | Record current product contracts and acceptance evidence | Software/UX/multiplayer/camera/Pi development documents and selected first-party supporting images. Preserve implemented-versus-planned statements and dated measured results. Some architecture/status documents also belong to the workflow commit; stage explicit files or hunks. |
| 3 | Add repository engineering memory and verification | AGENTS.md, four .agents skills, engineering.json, engineering-check.mjs, review-baseline.ps1, workflow YAML, current status/architecture/workflow/setup-results/baseline-review documents, and reviewed CLAUDE/README/ignore-rule hunks. Resolve the native clean-checkout blocker before claiming CI ready. |
| 4 | Preserve revisioned hardware design sources | Select authoritative mechanical generators, electrical native KiCad projects/libraries, BOM/wiring/component CSVs, validation/runbook records and their provenance. Review generated images/reports separately; this triage's 'source' group does not authorize every file for commit. |
| Separate artifact release | Publish selected hardware review/build packs | Select authoritative STEP/STL/GLB, fabrication and print packs, ZIPs and Word/PDF exports; create a manifest with revision, generating source/dependency identity and hashes. Store in suitable artifact storage or Git LFS after choosing that policy. Preserve superseded designs as identified archives rather than silently discarding them. |

The first commit is a reviewed snapshot of existing implementation, not a claim that it is commercially qualified. If feature-level history is desired, reconstruct and verify dependencies in an isolated worktree first; the current folder cannot establish historical feature boundaries automatically.

## Inventory triage

| Group | Files | Approximate size | Disposition |
|---|---:|---:|---|
| Product software baseline | 166 | 1.13 MiB | Review source/config/tests; retain lockfiles with packages |
| Product contracts/evidence | 22 | 2.21 MiB | Commit maintained first-party contracts and selected evidence |
| Engineering workflow | 13 | 0.02 MiB | Commit setup after clean-checkout correction |
| Hardware source candidates | 208 | 30.82 MiB | Review authority, generated material and exact revisions |
| Hardware delivery artifacts | 230 | 35.29 MiB | Hold for artifact manifest/storage decision |
| Supplier references | 12 | 4.73 MiB | Hold pending provenance and redistribution review |
| Temporary artifacts | 21 | 7.94 MiB | Keep local; propose exclusion without deletion |

Hardware accounts for 459 initial untracked files / approximately 74.05 MiB. Temporary cache/XML/Word-rendering files under `hardware/dice-vision-esp32/handover-2026-09-30/qa/tmp/` and the KiCad `.kicad_prl` local preferences file should not enter the baseline. Proposed ignore additions: `hardware/**/qa/tmp/` and `hardware/**/*.kicad_prl`. Not applied during this review. Final selected hardware packs and licensing notices need review before broad ignore rules are introduced.

Android's existing nested ignore rules already exclude SDK `local.properties`, Gradle build outputs and APKs. Root rules exclude credentials, signing keys, generated bundles, CAD virtualenv, camera runtimes and local GoDice evaluation code. Keep those protections. This review did not read ignored credential files or certify a complete secret scan.

## Findings that affect reproducibility

1. **Native clean-checkout blocker:** `vite.config.js` maps `#dice-panel` in native mode to `local-evaluation/godice/panel.js`; that directory is deliberately ignored. The configured engineering gate always builds native mode. Local success therefore does not prove clean CI success. Keep licensed/private evaluation code excluded. Decide a supported public native adapter path or a separately provisioned private evaluation job, then verify the appropriate gate from a clean source snapshot. Do not silently skip a required build and call it qualified.
2. **Optional vision evidence:** OpenCV/MediaPipe assets and local evaluation tests are ignored. Local results included those assets/tests; CI may skip vision tests and lack proprietary evaluations. Record the clean-checkout scope and keep a separate camera-enabled gate with dependency manifest identities.
3. **Generated room function:** `supabase/functions/game-room/index.ts` is generated by `scripts/build-room-function.mjs`. Keep generator/shared source and a generated-source consistency check together if the output stays versioned.
4. **Mixed historical instructions:** README and CLAUDE now route to current contracts, but historical product milestone statements remain. Review their current-state presentation before treating them as release documentation.
5. **Supplier licensing:** the copied Adafruit MOSFET reference README explicitly requires attribution/share-alike and retention of its text for redistribution. Preserve notices and inspect the actual referenced license and other supplier assets; no legal clearance is asserted.
6. **Device runtime gap:** software gate success does not verify Android Gradle/APK, Pi execution, cloud service behavior, physical camera recognition or hardware qualification. Preserve those acceptance gates.

## Verification and next action

Existing setup evidence: 292 local tests and web/native/room builds passed, with the final run's source consistency check passing. The native result is workstation-specific for the reason above. No product behavior changed during this review, so the full suite was not rerun. The new inventory script was executed successfully and produced its CSV/summary; Git's two temporary-directory warnings are retained as limitations.

Next engineering action: correct and verify the clean-checkout native/CI contract, then prepare explicitly scoped staging manifests for the software and workflow commits. Only after the source snapshot is reproducible should it be committed/pushed and its remote CI check made required. Physical acceptance and hardware artifact release remain separately tracked work.
